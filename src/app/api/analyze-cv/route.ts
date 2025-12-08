import { NextResponse } from "next/server";
import { OpenAI } from "openai";
import { nanoid } from "nanoid";
import { parseCV, extractCandidateInfo } from "@/lib/cv-parser";
import { CV_ANALYSIS_SYSTEM_PROMPT, getCVAnalysisPrompt } from "@/lib/prompts/cv-analysis";
import { InterviewService } from "@/services/interviews.service";
import { ResponseService } from "@/services/responses.service";
import { logger } from "@/lib/logger";

/**
 * Recursively sanitize an object to remove problematic characters from all strings
 */
function sanitizeForDatabase(obj: any): any {
  if (obj === null || obj === undefined) {
    return obj;
  }
  
  if (typeof obj === "string") {
    return obj
      .replace(/\0/g, "")
      .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, "")
      .replace(/[\uFFFD\uFFFE\uFFFF]/g, "")
      .replace(/[\uD800-\uDFFF]/g, "")
      .replace(/[\u200B-\u200D\uFEFF]/g, "");
  }
  
  if (Array.isArray(obj)) {
    return obj.map(sanitizeForDatabase);
  }
  
  if (typeof obj === "object") {
    const sanitized: any = {};
    for (const key of Object.keys(obj)) {
      sanitized[key] = sanitizeForDatabase(obj[key]);
    }
    return sanitized;
  }
  
  return obj;
}

export const runtime = "nodejs";
export const maxDuration = 120; // Allow up to 2 minutes for processing

interface CVUploadResult {
  fileName: string;
  success: boolean;
  candidateName?: string;
  candidateEmail?: string;
  analytics?: any;
  error?: string;
}

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const interviewId = formData.get("interviewId") as string;
    const files = formData.getAll("files") as File[];

    console.log("CV Upload - interviewId:", interviewId);
    console.log("CV Upload - files count:", files?.length);
    console.log("CV Upload - files:", files?.map(f => ({ name: f.name, size: f.size, type: f.type })));

    if (!interviewId) {
      console.log("CV Upload Error: No interview ID");
      return NextResponse.json(
        { error: "Interview ID is required" },
        { status: 400 }
      );
    }

    if (!files || files.length === 0) {
      console.log("CV Upload Error: No files provided");
      return NextResponse.json(
        { error: "At least one CV file is required" },
        { status: 400 }
      );
    }
    
    // Check if files are actually File objects with content
    const validFiles = files.filter(f => f instanceof File && f.size > 0);
    if (validFiles.length === 0) {
      console.log("CV Upload Error: No valid files (files may be empty or invalid)");
      return NextResponse.json(
        { error: "No valid CV files provided. Files may be empty or corrupted." },
        { status: 400 }
      );
    }

    // Fetch interview details for context
    const interview = await InterviewService.getInterviewById(interviewId);
    if (!interview) {
      return NextResponse.json(
        { error: "Interview not found" },
        { status: 404 }
      );
    }

    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
      maxRetries: 2,
    });

    const results: CVUploadResult[] = [];

    // Process each valid CV file
    for (const file of validFiles) {
      try {
        logger.info(`Processing CV: ${file.name}`);

        // Parse the CV file
        const parseResult = await parseCV(file);
        
        if (!parseResult.success || !parseResult.text) {
          results.push({
            fileName: file.name,
            success: false,
            error: parseResult.error || "Failed to parse CV",
          });
          continue;
        }

        // Extract candidate info
        const candidateInfo = extractCandidateInfo(parseResult.text);
        
        // Generate analysis using OpenAI
        const prompt = getCVAnalysisPrompt(
          parseResult.text,
          interview.objective,
          interview.job_context,
          interview.custom_metrics || []
        );

        const completion = await openai.chat.completions.create({
          model: "gpt-4o",
          messages: [
            { role: "system", content: CV_ANALYSIS_SYSTEM_PROMPT },
            { role: "user", content: prompt },
          ],
          response_format: { type: "json_object" },
          temperature: 0.3,
        });

        const analysisContent = completion.choices[0]?.message?.content;
        
        if (!analysisContent) {
          results.push({
            fileName: file.name,
            success: false,
            error: "Failed to generate analysis",
          });
          continue;
        }

        const analytics = JSON.parse(analysisContent);

        // Use AI-extracted name, fall back to regex-extracted, then filename
        const finalCandidateName = analytics.candidateName || candidateInfo.name || `CV: ${file.name}`;
        const finalCandidateEmail = analytics.candidateEmail || candidateInfo.email || "";

        // Map CV analytics to match the existing Analytics structure
        const mappedAnalytics = {
          overallScore: analytics.overallScore,
          overallFeedback: analytics.overallFeedback,
          communication: analytics.skills || { score: 0, feedback: "N/A - CV Analysis" },
          softSkillSummary: analytics.experienceSummary,
          questionSummaries: [], // No questions for CV analysis
          customMetrics: analytics.customMetrics,
          weightedOverallScore: analytics.weightedOverallScore,
          // CV-specific fields
          cvAnalysis: {
            yearsOfExperience: analytics.yearsOfExperience,
            keySkills: analytics.keySkills,
            education: analytics.education,
            skills: analytics.skills,
            // Store the formatted display analysis
            cvAnalysisDisplay: analytics.cvAnalysisDisplay,
          },
        };

        // Create a unique call_id for this CV submission
        const cvCallId = `cv_${nanoid(10)}`;

        // Save to database as a response
        const responsePayload = {
          interview_id: interviewId,
          name: finalCandidateName,
          email: finalCandidateEmail,
          call_id: cvCallId,
          duration: 0,
          is_analysed: true,
          is_ended: true,
          is_viewed: false,
          candidate_status: "no_status",
          tab_switch_count: 0,
          profile_type: "cv", // Mark as CV submission
          cv_url: null, // Could store the CV URL if we upload to storage
          details: {
            source: "cv_upload",
            fileName: file.name,
            cvText: parseResult.text.substring(0, 5000), // Store first 5000 chars
            extractedInfo: {
              ...candidateInfo,
              // Override with AI-extracted info
              name: finalCandidateName,
              email: finalCandidateEmail,
              phone: analytics.candidatePhone || candidateInfo.phone,
            },
            call_analysis: {
              call_summary: analytics.experienceSummary,
              user_sentiment: "Neutral",
            },
          },
          analytics: mappedAnalytics,
        };

        // Sanitize the entire payload before saving to database
        const sanitizedPayload = sanitizeForDatabase(responsePayload);
        
        await ResponseService.createResponse(sanitizedPayload);

        results.push({
          fileName: file.name,
          success: true,
          candidateName: finalCandidateName,
          candidateEmail: finalCandidateEmail,
          analytics: mappedAnalytics,
        });

        logger.info(`Successfully processed CV: ${file.name}`);
      } catch (fileError) {
        logger.error(`Error processing file ${file.name}:`, fileError as Error);
        results.push({
          fileName: file.name,
          success: false,
          error: fileError instanceof Error ? fileError.message : "Unknown error",
        });
      }
    }

    const successCount = results.filter((r) => r.success).length;
    const failCount = results.filter((r) => !r.success).length;

    return NextResponse.json(
      {
        success: true,
        message: `Processed ${successCount} CV(s) successfully${failCount > 0 ? `, ${failCount} failed` : ""}`,
        results,
      },
      { status: 200 }
    );
  } catch (error) {
    logger.error("Error in CV analysis:", error as Error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

