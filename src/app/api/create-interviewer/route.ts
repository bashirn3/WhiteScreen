import { logger } from "@/lib/logger";
import { InterviewerService } from "@/services/interviewers.service";
import { NextResponse, NextRequest } from "next/server";
import { VapiClient } from "@vapi-ai/server-sdk";
import { INTERVIEWERS, VAPI_ASSISTANT_SYSTEM_PROMPT } from "@/lib/constants";

const vapiClient = new VapiClient({
  token: process.env.VAPI_API_KEY || "",
});

export async function GET(res: NextRequest) {
  logger.info("create-interviewer request received");

  try {
    // Create Lisa Assistant (Vapi combines LLM + Agent into one Assistant)
    const lisaAssistant = await vapiClient.assistants.create({
      name: INTERVIEWERS.LISA.name,
      
      // Model configuration (replaces Retell's LLM)
      model: {
        provider: "openai",
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content: VAPI_ASSISTANT_SYSTEM_PROMPT,
          },
        ],
        temperature: 0.7,
      },
      
      // Voice configuration (replaces Retell's voice_id)
      voice: {
        provider: "11labs" as const,
        voiceId: INTERVIEWERS.LISA.voiceId,
      },
      
      // First message when call starts
      firstMessage: INTERVIEWERS.LISA.firstMessage,
      
      // Transcription settings
      transcriber: {
        provider: "deepgram",
        model: "nova-2",
        language: "en",
      },
      
      // Call behavior
      endCallPhrases: ["goodbye", "bye", "have a nice day", "thank you bye"],
      maxDurationSeconds: 3600,
    });

    const newInterviewer = await InterviewerService.createInterviewer({
      agent_id: lisaAssistant.id,
      name: INTERVIEWERS.LISA.name,
      description: INTERVIEWERS.LISA.description,
      image: INTERVIEWERS.LISA.image,
      audio: INTERVIEWERS.LISA.audio,
      empathy: INTERVIEWERS.LISA.empathy,
      exploration: INTERVIEWERS.LISA.exploration,
      rapport: INTERVIEWERS.LISA.rapport,
      speed: INTERVIEWERS.LISA.speed,
    });

    // Create Bob Assistant
    const bobAssistant = await vapiClient.assistants.create({
      name: INTERVIEWERS.BOB.name,
      
      model: {
        provider: "openai",
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content: VAPI_ASSISTANT_SYSTEM_PROMPT,
          },
        ],
        temperature: 0.7,
      },
      
      voice: {
        provider: "11labs" as const,
        voiceId: INTERVIEWERS.BOB.voiceId,
      },
      
      firstMessage: INTERVIEWERS.BOB.firstMessage,
      
      transcriber: {
        provider: "deepgram",
        model: "nova-2",
        language: "en",
      },
      
      endCallPhrases: ["goodbye", "bye", "have a nice day", "thank you bye"],
      maxDurationSeconds: 3600,
    });

    const newSecondInterviewer = await InterviewerService.createInterviewer({
      agent_id: bobAssistant.id,
      name: INTERVIEWERS.BOB.name,
      description: INTERVIEWERS.BOB.description,
      image: INTERVIEWERS.BOB.image,
      audio: INTERVIEWERS.BOB.audio,
      empathy: INTERVIEWERS.BOB.empathy,
      exploration: INTERVIEWERS.BOB.exploration,
      rapport: INTERVIEWERS.BOB.rapport,
      speed: INTERVIEWERS.BOB.speed,
    });

    logger.info("Vapi assistants created successfully");

    return NextResponse.json(
      {
        newInterviewer,
        newSecondInterviewer,
      },
      { status: 200 },
    );
  } catch (error) {
    logger.error("Error creating interviewers:", error instanceof Error ? error : String(error));

    return NextResponse.json(
      { error: "Failed to create interviewers" },
      { status: 500 },
    );
  }
}
