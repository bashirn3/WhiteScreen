import { logger } from "@/lib/logger";
import { generateInterviewAnalytics } from "@/services/analytics.service";
import { ResponseService } from "@/services/responses.service";
import { Response } from "@/types/response";
import { NextResponse } from "next/server";
import { VapiClient } from "@vapi-ai/server-sdk";

const vapiClient = new VapiClient({
  token: process.env.VAPI_API_KEY || "",
});

export const maxDuration = 59;

export async function POST(req: Request, res: Response) {
  logger.info("get-call request received");
  const body = await req.json();

  const callDetails: Response = await ResponseService.getResponseByCallId(
    body.id,
  );
  let callResponse = callDetails.details;
  
  if (callDetails.is_analysed) {
    return NextResponse.json(
      {
        callResponse,
        analytics: callDetails.analytics,
      },
      { status: 200 },
    );
  }
  
  // Retrieve call from Vapi
  const vapiCall = await vapiClient.calls.get(body.id);
  const interviewId = callDetails?.interview_id;
  
  // Transform Vapi response to match expected structure
  const startTime = vapiCall.startedAt ? new Date(vapiCall.startedAt).getTime() : Date.now();
  const endTime = vapiCall.endedAt ? new Date(vapiCall.endedAt).getTime() : Date.now();
  
  callResponse = {
    call_id: vapiCall.id,
    start_timestamp: startTime,
    end_timestamp: endTime,
    
    // Vapi provides transcript as array of messages or as a string
    transcript: vapiCall.transcript || 
      (vapiCall.messages?.map((msg: any) => `${msg.role}: ${msg.content}`).join('\n')) || "",
    
    // Recording URLs
    recording_url: vapiCall.recordingUrl,
    stereo_recording_url: vapiCall.stereoRecordingUrl,
    public_log_url: vapiCall.artifact?.transcript?.url || vapiCall.recordingUrl,
    
    // Call analysis from Vapi
    call_analysis: {
      call_summary: vapiCall.summary || vapiCall.analysis?.summary || "",
      user_sentiment: vapiCall.analysis?.sentiment || "neutral",
    },
    
    // Preserve other Vapi data
    ...vapiCall,
  };
  
  const duration = Math.round((endTime - startTime) / 1000);

  const payload = {
    callId: body.id,
    interviewId: interviewId,
    transcript: callResponse.transcript,
  };
  
  const result = await generateInterviewAnalytics(payload);

  if (result.error) {
    logger.error(
      `Failed to generate analytics for call ${body.id}: ${result.error}`,
    );
    return NextResponse.json(
      {
        error: "Failed to generate call analytics",
        details: result.error,
      },
      { status: 500 },
    );
  }

  const analytics = result.analytics;

  await ResponseService.saveResponse(
    {
      details: callResponse,
      is_analysed: true,
      duration: duration,
      analytics: analytics,
    },
    body.id,
  );

  logger.info("Call analysed successfully");

  return NextResponse.json(
    {
      callResponse,
      analytics,
    },
    { status: 200 },
  );
}
