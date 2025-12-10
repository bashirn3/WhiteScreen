import { NextResponse } from "next/server";
import { reEvaluateInterviewResponses } from "@/services/analytics.service";
import { logger } from "@/lib/logger";

export const maxDuration = 300; // 5 minutes max for re-evaluation

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { interviewId } = body;

    if (!interviewId) {
      return NextResponse.json(
        { error: "Interview ID is required" },
        { status: 400 }
      );
    }

    logger.info(`Starting re-evaluation for interview: ${interviewId}`);

    const result = await reEvaluateInterviewResponses(interviewId);

    if (result.error) {
      logger.error(`Re-evaluation failed: ${result.error}`);
      return NextResponse.json(
        { error: result.error },
        { status: result.status || 500 }
      );
    }

    logger.info(`Re-evaluation completed for interview: ${interviewId}`);

    return NextResponse.json(
      { 
        success: true, 
        results: result.results,
        message: `Re-evaluated ${result.results?.length || 0} responses`
      },
      { status: 200 }
    );
  } catch (error) {
    logger.error("Re-evaluation API error", error as Error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

