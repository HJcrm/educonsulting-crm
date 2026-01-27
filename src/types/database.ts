/**
 * Supabase Database 타입 정의
 */

export type LeadStage =
  | "NEW"
  | "CONTACTED"
  | "BOOKED"
  | "CONSULTED"
  | "PAID"
  | "LOST";

export type InteractionType = "CALL" | "KAKAO" | "SMS" | "MEETING" | "MEMO";

export type AppointmentStatus = "BOOKED" | "DONE" | "CANCELLED";

export interface Database {
  public: {
    Tables: {
      leads: {
        Row: {
          id: string;
          created_at: string;
          updated_at: string;
          source: string;
          form_submission_id: string | null;
          parent_name: string;
          parent_phone: string;
          student_grade: string | null;
          desired_track: string | null;
          region: string | null;
          desired_timing: string | null;
          question_context: string | null;
          stage: LeadStage;
          is_high_interest: boolean;
          utm_source: string | null;
          utm_medium: string | null;
          utm_campaign: string | null;
          utm_term: string | null;
          utm_content: string | null;
          raw_payload: Record<string, unknown>;
        };
        Insert: {
          id?: string;
          created_at?: string;
          updated_at?: string;
          source?: string;
          form_submission_id?: string | null;
          parent_name: string;
          parent_phone: string;
          student_grade?: string | null;
          desired_track?: string | null;
          region?: string | null;
          desired_timing?: string | null;
          question_context?: string | null;
          stage?: LeadStage;
          is_high_interest?: boolean;
          utm_source?: string | null;
          utm_medium?: string | null;
          utm_campaign?: string | null;
          utm_term?: string | null;
          utm_content?: string | null;
          raw_payload: Record<string, unknown>;
        };
        Update: {
          id?: string;
          created_at?: string;
          updated_at?: string;
          source?: string;
          form_submission_id?: string | null;
          parent_name?: string;
          parent_phone?: string;
          student_grade?: string | null;
          desired_track?: string | null;
          region?: string | null;
          desired_timing?: string | null;
          question_context?: string | null;
          stage?: LeadStage;
          is_high_interest?: boolean;
          utm_source?: string | null;
          utm_medium?: string | null;
          utm_campaign?: string | null;
          utm_term?: string | null;
          utm_content?: string | null;
          raw_payload?: Record<string, unknown>;
        };
      };
      interactions: {
        Row: {
          id: string;
          lead_id: string;
          created_at: string;
          type: InteractionType;
          content: string;
          created_by: string | null;
        };
        Insert: {
          id?: string;
          lead_id: string;
          created_at?: string;
          type?: InteractionType;
          content: string;
          created_by?: string | null;
        };
        Update: {
          id?: string;
          lead_id?: string;
          created_at?: string;
          type?: InteractionType;
          content?: string;
          created_by?: string | null;
        };
      };
      appointments: {
        Row: {
          id: string;
          lead_id: string;
          created_at: string;
          scheduled_at: string;
          status: AppointmentStatus;
          notes: string | null;
        };
        Insert: {
          id?: string;
          lead_id: string;
          created_at?: string;
          scheduled_at: string;
          status?: AppointmentStatus;
          notes?: string | null;
        };
        Update: {
          id?: string;
          lead_id?: string;
          created_at?: string;
          scheduled_at?: string;
          status?: AppointmentStatus;
          notes?: string | null;
        };
      };
    };
    Views: {
      v_leads_by_stage: {
        Row: {
          stage: LeadStage;
          count: number;
        };
      };
      v_leads_daily: {
        Row: {
          date: string;
          count: number;
        };
      };
    };
    Enums: {
      lead_stage: LeadStage;
      interaction_type: InteractionType;
      appointment_status: AppointmentStatus;
    };
    Functions: Record<string, never>;
  };
}

// 편의를 위한 타입 별칭
export type Lead = Database["public"]["Tables"]["leads"]["Row"];
export type LeadInsert = Database["public"]["Tables"]["leads"]["Insert"];
export type LeadUpdate = Database["public"]["Tables"]["leads"]["Update"];

export type Interaction = Database["public"]["Tables"]["interactions"]["Row"];
export type InteractionInsert =
  Database["public"]["Tables"]["interactions"]["Insert"];

export type Appointment = Database["public"]["Tables"]["appointments"]["Row"];
export type AppointmentInsert =
  Database["public"]["Tables"]["appointments"]["Insert"];

// 담당자
export interface Assignee {
  id: string;
  name: string;
  created_at: string;
}

// 이전 리드 요약 정보
export interface PreviousLead {
  id: string;
  parent_name: string;
  stage: LeadStage;
  created_at: string;
  question_context: string | null;
  student_grade: string | null;
  desired_track: string | null;
}

// 리드 + 관계 데이터
export interface LeadWithRelations extends Lead {
  interactions?: Interaction[];
  appointments?: Appointment[];
  previousLeads?: PreviousLead[];
}

// 단계별 라벨
export const STAGE_LABELS: Record<LeadStage, string> = {
  NEW: "신규",
  CONTACTED: "연락완료",
  BOOKED: "상담예약",
  CONSULTED: "상담완료",
  PAID: "결제완료",
  LOST: "이탈",
};

// 단계별 색상 (Tailwind)
export const STAGE_COLORS: Record<LeadStage, string> = {
  NEW: "bg-blue-100 text-blue-800",
  CONTACTED: "bg-yellow-100 text-yellow-800",
  BOOKED: "bg-purple-100 text-purple-800",
  CONSULTED: "bg-green-100 text-green-800",
  PAID: "bg-emerald-100 text-emerald-800",
  LOST: "bg-gray-100 text-gray-800",
};
