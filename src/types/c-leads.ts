/**
 * C레벨 리드 타입 정의
 */

export type CLeadStatus = "ACTIVE" | "INACTIVE";

export type MessageType = "SMS" | "LMS";

export type MessageStatus = "PENDING" | "SENT" | "FAILED";

export interface CLead {
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
  question_context: string | null;
  status: CLeadStatus;
  notes: string | null;
  utm_source: string | null;
  utm_medium: string | null;
  utm_campaign: string | null;
  raw_payload: Record<string, unknown>;
}

export interface CLeadInsert {
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
  question_context?: string | null;
  status?: CLeadStatus;
  notes?: string | null;
  utm_source?: string | null;
  utm_medium?: string | null;
  utm_campaign?: string | null;
  raw_payload: Record<string, unknown>;
}

export interface CLeadUpdate {
  parent_name?: string;
  parent_phone?: string;
  student_grade?: string | null;
  region?: string | null;
  question_context?: string | null;
  status?: CLeadStatus;
  notes?: string | null;
}

export interface CLeadMessage {
  id: string;
  c_lead_id: string;
  created_at: string;
  message_type: MessageType;
  recipient_phone: string;
  content: string;
  status: MessageStatus;
  external_message_id: string | null;
  error_message: string | null;
  sent_at: string | null;
}

export interface CLeadMessageInsert {
  id?: string;
  c_lead_id: string;
  created_at?: string;
  message_type: MessageType;
  recipient_phone: string;
  content: string;
  status?: MessageStatus;
  external_message_id?: string | null;
  error_message?: string | null;
  sent_at?: string | null;
}

export interface CLeadWithMessages extends CLead {
  messages: CLeadMessage[];
  lastMessageAt: string | null;
}

// 상태 라벨
export const STATUS_LABELS: Record<CLeadStatus, string> = {
  ACTIVE: "활성",
  INACTIVE: "비활성",
};

// 상태 색상 (Tailwind)
export const STATUS_COLORS: Record<CLeadStatus, string> = {
  ACTIVE: "bg-green-100 text-green-800",
  INACTIVE: "bg-gray-100 text-gray-600",
};

// 메시지 상태 라벨
export const MESSAGE_STATUS_LABELS: Record<MessageStatus, string> = {
  PENDING: "대기",
  SENT: "발송완료",
  FAILED: "실패",
};

// 메시지 상태 색상
export const MESSAGE_STATUS_COLORS: Record<MessageStatus, string> = {
  PENDING: "bg-yellow-100 text-yellow-800",
  SENT: "bg-green-100 text-green-800",
  FAILED: "bg-red-100 text-red-800",
};
