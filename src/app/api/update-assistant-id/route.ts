import { InterviewerService } from "@/services/interviewers.service";
import { NextResponse } from "next/server";
import { logger } from "@/lib/logger";
import { createClient } from "@supabase/supabase-js";

export async function POST(req: Request) {
  try {
    const { assistant_id } = await req.json();
    
    if (!assistant_id) {
      return NextResponse.json(
        { error: "assistant_id is required" },
        { status: 400 }
      );
    }

    // Use Supabase URL and anon key (public access with RLS)
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseAnonKey) {
      logger.error("Missing Supabase credentials");
      return NextResponse.json(
        { error: "Server configuration error - check .env" },
        { status: 500 }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseAnonKey);

    // Update all interviewers with the new assistant ID
    const { data, error } = await supabase
      .from("interviewer")
      .update({ agent_id: assistant_id })
      .neq('id', 0) // Update all rows
      .select();

    if (error) {
      logger.error("Error updating interviewer agent_id:", error);
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }

    logger.info(`Updated ${data?.length || 0} interviewers with assistant_id: ${assistant_id}`);

    return NextResponse.json(
      {
        success: true,
        message: `Updated ${data?.length || 0} interviewers`,
        updated_count: data?.length || 0,
      },
      { status: 200 }
    );
  } catch (error) {
    logger.error("Error in update-assistant-id:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

