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
      
      // Model configuration (matches original Retell LLM settings)
      model: {
        provider: "openai",
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content: VAPI_ASSISTANT_SYSTEM_PROMPT,
          },
        ],
        // No temperature - let it default to 1.0 like Retell
      },
      
      // Voice configuration (using original Retell voice ID)
      voice: {
        provider: "11labs" as const,
        voiceId: INTERVIEWERS.LISA.voiceId,
      },
      
      // First message mode - let model generate greeting from system prompt
      firstMessageMode: "assistant-speaks-first-with-model-generated-message",
      
      // Transcription settings
      transcriber: {
        provider: "deepgram",
        model: "nova-2",
        language: "en",
      },
      
      // Call behavior (matches original Retell end_call tool)
      endCallPhrases: ["goodbye", "bye", "have a nice day", "thank you bye"],
      maxDurationSeconds: 3600,
      
      // Backchannel disabled (matches original Retell setting)
      backgroundSound: "off",
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
        // No temperature - let it default to 1.0 like Retell
      },
      
      voice: {
        provider: "11labs" as const,
        voiceId: INTERVIEWERS.BOB.voiceId,
      },
      
      // First message mode - let model generate greeting from system prompt
      firstMessageMode: "assistant-speaks-first-with-model-generated-message",
      
      transcriber: {
        provider: "deepgram",
        model: "nova-2",
        language: "en",
      },
      
      endCallPhrases: ["goodbye", "bye", "have a nice day", "thank you bye"],
      maxDurationSeconds: 3600,
      
      // Backchannel disabled (matches original Retell setting)
      backgroundSound: "off",
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
