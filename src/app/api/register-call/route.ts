import { logger } from "@/lib/logger";
import { InterviewerService } from "@/services/interviewers.service";
import { NextResponse } from "next/server";

export async function POST(req: Request, res: Response) {
  try {
    logger.info("register-call request received (Vapi)");

    const body = await req.json();

    const interviewerId = body.interviewer_id;
    const dynamicData = body.dynamic_data;
    const isPractice = body.is_practice || false;
    
    if (!interviewerId) {
      logger.error("Missing interviewer_id in request");
      return NextResponse.json(
        { error: "Interviewer ID is required" },
        { status: 400 },
      );
    }

    logger.info(`Fetching interviewer with ID: ${interviewerId}`);
    const interviewer = await InterviewerService.getInterviewer(interviewerId);

    if (!interviewer) {
      logger.error(`Interviewer not found with ID: ${interviewerId}`);
      return NextResponse.json(
        { error: `Interviewer not found with ID: ${interviewerId}` },
        { status: 404 },
      );
    }

    if (!interviewer.agent_id) {
      logger.error(`Interviewer ${interviewerId} has no agent_id (assistant_id)`);
      return NextResponse.json(
        { error: "Interviewer has no assistant configured" },
        { status: 500 },
      );
    }

    // Log the assistant ID for debugging
    logger.info(`Using assistant_id: ${interviewer.agent_id}`);
    
    // Note: If you're migrating from Retell, you need to:
    // 1. Create assistants in Vapi dashboard (https://dashboard.vapi.ai)
    // 2. Update the interviewer.agent_id field with the new Vapi assistant ID
    // Vapi assistant IDs typically look like: "asst_xxxxxxxxxxxxx" or similar format

    // Build the assistant options with dynamic variables
    // Vapi allows passing variables directly in the assistant configuration
    const assistantOverrides: any = {
      variableValues: {
        candidateName: dynamicData?.name || "Candidate",
        interviewDuration: dynamicData?.mins || "10",
        interviewObjective: dynamicData?.objective || "General interview",
        interviewQuestions: dynamicData?.questions || "",
        jobContext: dynamicData?.job_context || "No specific context",
        isPractice: isPractice ? "true" : "false",
      },
    };

    logger.info(`Creating Vapi web call for assistant: ${interviewer.agent_id}`);
    
    // For Vapi, we can either:
    // 1. Return the assistant ID and public key (simpler, less secure)
    // 2. Create a temporary web token (more secure)
    // We'll use approach #1 for simplicity, but you can switch to #2 if needed
    
    const registerCallResponse = {
      assistant_id: interviewer.agent_id,
      assistant_overrides: assistantOverrides,
      // We'll use the public key directly in the frontend
      // If you want more security, you can create a temporary token here using:
      // const webToken = await vapiClient.calls.createWebToken({ assistantId: interviewer.agent_id });
    };

    logger.info("Call registration prepared successfully for Vapi");

    return NextResponse.json(
      {
        registerCallResponse,
      },
      { status: 200 },
    );
  } catch (error) {
    logger.error("Error in register-call (Vapi):", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 },
    );
  }
}
