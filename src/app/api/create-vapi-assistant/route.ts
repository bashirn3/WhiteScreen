import { logger } from "@/lib/logger";
import { NextResponse } from "next/server";
import axios from "axios";

const VAPI_PRIVATE_KEY = process.env.VAPI_PRIVATE_API_KEY || "f5a1ec6a-b7f6-4350-bb17-b0362bd5c8e2";

// Base system prompt template for Vapi (English version)
const VAPI_ASSISTANT_PROMPT = `You are a friendly and professional interviewer conducting a focused interview with {{candidateName}}.

IMPORTANT: Conduct the ENTIRE interview in English. All questions, responses, and conversation must be in English.

Your main goal is to evaluate the candidate in line with: {{interviewObjective}}.
You'll reference the {{jobContext}} to briefly introduce the role and guide your conversation.

Interview Duration: {{interviewDuration}} minutes
Practice Mode: {{isPractice}} (if "true", remind them this is a practice session)

Interview Structure & Guidelines:

1. Warm, Concise Welcome:
   Start with a warm greeting using only the first name extracted from {{candidateName}}, and briefly describe the role in one sentence from {{jobContext}}.
   Example: "Thank you for joining us today! Let me briefly introduce the role - at our company, this position focuses on [one-sentence job summary from jobContext]."

2. Invite Questions:
   Naturally invite the candidate to ask initial questions:
   "Before we begin, do you have any questions about the role or company? I'm happy to answer them."

3. Answer Briefly (40 Words or Less):
   Use the job context information to respond in a helpful, concise way. Keep it conversational. Answer 2-3 questions naturally before moving forward.
   IMPORTANT: Don't jump to the skills interview after just one question, even if the candidate pauses.
   
   If the candidate asks more than 3 questions, say:
   "Great questions! If anything else comes to mind, feel free to reach out via email."

4. Transition into Interview:
   Smoothly transition to the skills discussion:
   "Now, let's talk about your background and experience."

5. Structured Interview using {{interviewQuestions}}:

   - Ask questions one at a time from {{interviewQuestions}}
   - Keep each question open-ended and under 30 words
   - After each response, ask relevant follow-up questions to dig deeper, but place them in a subtle conversational tone
   
   IMPORTANT - Hard Limits on Follow-up Questions (must be strictly enforced):
   - Follow the follow_up_count and max follow-ups specified in each question
   - Low depth (follow_up_count: 1): Maximum 3 follow-ups. No more.
   - Medium depth (follow_up_count: 2): Maximum 5 follow-ups. No more.
   - High depth (follow_up_count: 3): Maximum 7 follow-ups. No more.
   
   These are absolute hard limits. Once you reach the question limit, move immediately to the next main question.
   
   - Use the candidate's name regularly to maintain a natural, human tone

6. Keep it On-Track:
   Focus only on the interview objective and provided questions. Avoid unrelated topics.

7. Closing:
   IMPORTANT: Only end the call AFTER the candidate has answered ALL questions from {{interviewQuestions}}.
   DO NOT end the call early. Make sure to ask every single question.
   Once the candidate has answered all questions, thank them for their time and wish them a good day.

Style Guidelines:
- Do NOT use em dashes (—). Use periods or split into two sentences.
- Keep each question open-ended and under 30 words.
- Be conversational and encouraging
- Listen actively and respond naturally

Example: "Let's get started. This role focuses on X." — Not "Let's get started—this role focuses on X."`;

export async function POST(req: Request) {
  try {
    logger.info("create-vapi-assistant request received");

    // Create a Vapi assistant via their API
    const response = await axios.post(
      "https://api.vapi.ai/assistant",
      {
        name: "RapidScreen Interview Assistant",
        model: {
          provider: "openai",
          model: "gpt-4o",
          temperature: 0.7,
          maxTokens: 250,
          emotionRecognitionEnabled: false,
          systemPrompt: VAPI_ASSISTANT_PROMPT,
          messages: [],
        },
        voice: {
          provider: "playht",
          voiceId: "jennifer", // PlayHT's Jennifer - reliable English female voice
          speed: 1.0,
        },
        firstMessage: "Hello {{candidateName}}! Thank you for joining today. Let me tell you about the role we're discussing.",
        endCallMessage: "Thank you for your time. Have a great day!",
        endCallPhrases: [], // Remove auto-end phrases - let assistant control the flow
        transcriber: {
          provider: "deepgram",
          model: "nova-2",
          language: "en",
        },
        silenceTimeoutSeconds: 30, // Give user 30 seconds to respond before ending
        maxDurationSeconds: 1800, // 30 minutes max duration
        responseDelaySeconds: 0.4, // Small delay before responding
        numWordsToInterruptAssistant: 2, // Allow user to interrupt after 2 words
        backgroundSound: "off",
        backchannelingEnabled: false,
        endCallFunctionEnabled: true,
        clientMessages: [
          "transcript",
          "hang",
          "function-call",
          "speech-update",
          "metadata",
          "conversation-update",
        ],
        serverMessages: [
          "end-of-call-report",
          "status-update",
          "hang",
          "function-call",
        ],
      },
      {
        headers: {
          Authorization: `Bearer ${VAPI_PRIVATE_KEY}`,
          "Content-Type": "application/json",
        },
      }
    );

    const assistantId = response.data.id;
    logger.info(`Vapi assistant created successfully: ${assistantId}`);

    return NextResponse.json(
      {
        success: true,
        assistant_id: assistantId,
        message: `Created Vapi assistant: ${assistantId}. Update your interviewers in the database with this ID.`,
        sql_command: `UPDATE interviewer SET agent_id = '${assistantId}';`,
      },
      { status: 200 }
    );
  } catch (error) {
    logger.error("Error creating Vapi assistant:", error);
    
    if (axios.isAxiosError(error)) {
      logger.error("Vapi API error details:", error.response?.data);
      return NextResponse.json(
        { 
          error: "Failed to create Vapi assistant", 
          details: error.response?.data || error.message 
        },
        { status: error.response?.status || 500 }
      );
    }

    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

