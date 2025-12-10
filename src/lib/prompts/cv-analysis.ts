import { CustomMetric } from "@/types/interview";

export const CV_ANALYSIS_SYSTEM_PROMPT = `You are an expert HR professional and talent acquisition specialist. Your task is to analyze CV/resume documents and evaluate candidates based on their qualifications, experience, and fit for the role. Be thorough, fair, and objective in your assessment.`;

// Helper to generate custom metrics section for CV analysis
const generateCVCustomMetricsPromptSection = (customMetrics: CustomMetric[]): string => {
  if (!customMetrics || customMetrics.length === 0) {
    return "";
  }

  const metricsInstructions = customMetrics.map((metric, index) => {
    const metricType = (metric as any).type || "scale";
    if (metricType === "boolean") {
      return `   ${index + 1}. "${metric.title}" (Weight: ${metric.weight}/10) [BOOLEAN - Yes/No]:
      - ${metric.description}
      - This is a YES/NO question. Score MUST be either 10 (YES, the criterion is met based on CV) or 1 (NO, not evident from CV)
      - If there is NO evidence in the CV to determine this, score MUST be 1`;
    }
    return `   ${index + 1}. "${metric.title}" (Weight: ${metric.weight}/10) [SCALE 0-10]:
      - ${metric.description}
      - Score from 0-10 based ONLY on evidence found in the CV
      - CRITICAL: If there is NO evidence or insufficient information to evaluate this metric, the score MUST be 1 or 2
      - Only give high scores (7-10) if there is CLEAR, STRONG evidence in the CV`;
  }).join("\n");

  return `
4. CUSTOM METRICS EVALUATION:
   Evaluate the candidate on the following custom metrics defined by the employer.
   
   ⚠️ CRITICAL SCORING RULES:
   - Base scores ONLY on what is explicitly stated in the CV
   - If a metric cannot be evaluated due to lack of information, give a LOW score (1-2)
   - Do NOT assume or infer qualities that are not demonstrated
   - Do NOT give average scores (4-6) just because you're unsure
   
${metricsInstructions}

   For each custom metric, provide:
   - metricId: The exact metric ID provided
   - title: The metric title
   - score: A score (see type above)
   - feedback: Brief feedback explaining the score based on CV evidence
   - weight: The metric weight
   - type: "scale" or "boolean"

5. WEIGHTED OVERALL SCORE:
   Calculate the weighted overall score based on the custom metrics:
   - Each custom metric contributes (metric_score * metric_weight / total_weight) to the final score
   - Convert to a 0-100 scale`;
};

// Helper to generate custom metrics JSON structure
const generateCVCustomMetricsJsonStructure = (customMetrics: CustomMetric[]): string => {
  if (!customMetrics || customMetrics.length === 0) {
    return "";
  }

  return `,
  "customMetrics": [
    {
      "metricId": string,
      "title": string,
      "score": number,
      "feedback": string,
      "weight": number,
      "type": string
    }
  ],
  "weightedOverallScore": number`;
};

export const getCVAnalysisPrompt = (
  cvText: string,
  jobObjective: string,
  jobContext?: string,
  customMetrics?: CustomMetric[],
) => {
  const hasCustomMetrics = customMetrics && customMetrics.length > 0;
  const customMetricsSection = generateCVCustomMetricsPromptSection(customMetrics || []);
  const customMetricsJson = generateCVCustomMetricsJsonStructure(customMetrics || []);

  // Provide metric IDs to the AI for reference
  const metricIdsReference = hasCustomMetrics 
    ? `\n\nCustom Metric IDs for reference:\n${customMetrics!.map(m => `- "${m.title}": ID = "${m.id}"`).join("\n")}\n`
    : "";

  return `Analyze the following CV/Resume and evaluate the candidate for the role described below:

###
CV/Resume Content:
${cvText}

###
Job/Role Information:
Objective: ${jobObjective}
${jobContext ? `Context: ${jobContext}` : ""}
${metricIdsReference}

Based on this CV and the job requirements, generate the following analytics in JSON format:

0. CANDIDATE INFORMATION (CRITICAL - Extract from CV):
   - candidateName: Extract the candidate's FULL NAME from the CV. Look at the top of the document, headers, or contact sections. This is usually one of the first things in a CV/Resume.
   - candidateEmail: Extract the email address if present
   - candidatePhone: Extract phone number if present

1. OVERALL SCORE (0-100) and OVERALL FEEDBACK (60 words max):
   Consider the following factors when scoring:
   - Relevance of Experience: How well does their experience match the role requirements?
   - Skills Match: Do they have the required technical/soft skills?
   - Education & Certifications: Relevant qualifications for the role
   - Career Progression: Professional growth and achievements
   - Industry Experience: Experience in relevant industries/domains
   - Years of Experience: Appropriate level of experience for the role

2. SKILLS ASSESSMENT: Score (0-10) and Feedback (40 words max)
   Evaluate the candidate's skills demonstrated in the CV:
   - Technical skills relevant to the role
   - Soft skills evident from experience descriptions
   - Tools and technologies mentioned
   - Certifications and training

3. EXPERIENCE SUMMARY (50 words max):
   A brief summary of the candidate's relevant experience and how it relates to the job.

4. DETAILED CV ANALYSIS (for display):
   Generate a well-formatted analysis of the CV with the following sections:
   - profileSummary: A 2-3 sentence professional summary of who this candidate is
   - workHistory: Array of their most relevant work experiences (max 5), each with: company, role, duration, highlights (key achievements)
   - educationDetails: Array of educational qualifications with: institution, degree, year (if available)
   - technicalSkills: Categorized list of technical skills (e.g., languages, frameworks, tools)
   - achievements: Array of notable achievements or certifications (max 5)
   - strengths: 3-4 key strengths relevant to the role
   - areasOfConcern: Any gaps or potential concerns (be honest but constructive)
${customMetricsSection}

Ensure the output is in valid JSON format with the following structure:
{
  "candidateName": string,
  "candidateEmail": string | null,
  "candidatePhone": string | null,
  "overallScore": number,
  "overallFeedback": string,
  "skills": { "score": number, "feedback": string },
  "experienceSummary": string,
  "yearsOfExperience": number | null,
  "keySkills": string[],
  "education": string | null,
  "cvAnalysisDisplay": {
    "profileSummary": string,
    "workHistory": [{ "company": string, "role": string, "duration": string, "highlights": string[] }],
    "educationDetails": [{ "institution": string, "degree": string, "year": string | null }],
    "technicalSkills": { "category": string, "skills": string[] }[],
    "achievements": string[],
    "strengths": string[],
    "areasOfConcern": string[]
  }${customMetricsJson}
}

IMPORTANT:
- EXTRACT THE CANDIDATE NAME - This is critical. Look for the name at the top of the CV or in contact section.
- Be objective and base scores only on CV content
- If information is missing, give lower scores rather than assuming
- Extract key skills as an array of strings (max 10 most relevant)
- Estimate years of experience if possible, otherwise null
- Extract highest education level if mentioned
- The cvAnalysisDisplay is what will be shown to users, make it comprehensive and well-organized${hasCustomMetrics ? "\n- You MUST evaluate ALL custom metrics provided and include them in the response. Use the exact metric IDs provided." : ""}`;
};

