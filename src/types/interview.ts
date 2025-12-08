export interface Question {
  id: string;
  question: string;
  follow_up_count: number;
}

export interface Quote {
  quote: string;
  call_id: string;
}

// Custom metric types
export type MetricType = "scale" | "boolean";

// Custom metric definition for interview evaluation
export interface CustomMetric {
  id: string;
  title: string;
  description: string;
  weight: number; // Weight from 0-10, all weights should sum to 10
  type: MetricType; // "scale" (0-10) or "boolean" (yes=10, no=1)
}

export interface InterviewBase {
  user_id: string;
  organization_id: string;
  name: string;
  interviewer_id: bigint;
  objective: string;
  question_count: number;
  time_duration: string;
  is_anonymous: boolean;
  questions: Question[];
  description: string;
  response_count: bigint;
  job_context?: string;
  logo_url?: string | null;
  custom_metrics?: CustomMetric[]; // Custom evaluation metrics
}

export interface InterviewDetails {
  id: string;
  created_at: Date;
  url: string | null;
  insights: string[];
  quotes: Quote[];
  details: any;
  is_active: boolean;
  theme_color: string;
  logo_url?: string | null;
  respondents: string[];
  readable_slug: string;
  show_feedback_form?: boolean;
}

export interface Interview extends InterviewBase, InterviewDetails {}
