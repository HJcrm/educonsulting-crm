import { createServiceClient } from "@/lib/supabase/server";
import type {
  CLead,
  CLeadInsert,
  CLeadUpdate,
  CLeadMessage,
  CLeadMessageInsert,
  CLeadWithMessages,
} from "@/types/c-leads";

export interface CLeadsQuery {
  search?: string;
  page?: number;
  pageSize?: number;
  status?: string;
}

export interface CLeadsResult {
  data: CLead[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

/**
 * C레벨 리드 목록 조회 (검색, 페이지네이션 지원)
 */
export async function getCLeads({
  search,
  page = 1,
  pageSize = 20,
  status,
}: CLeadsQuery = {}): Promise<CLeadsResult> {
  const supabase = createServiceClient();
  const offset = (page - 1) * pageSize;

  let query = supabase
    .from("c_leads")
    .select("*", { count: "exact" })
    .order("created_at", { ascending: false })
    .range(offset, offset + pageSize - 1);

  // 상태 필터
  if (status) {
    query = query.eq("status", status);
  }

  // 검색어가 있으면 여러 필드에 대해 OR 검색
  if (search && search.trim()) {
    const searchTerm = `%${search.trim()}%`;
    query = query.or(
      `parent_name.ilike.${searchTerm},parent_phone.ilike.${searchTerm},question_context.ilike.${searchTerm}`
    );
  }

  const { data, count, error } = await query;

  if (error) {
    console.error("Error fetching c_leads:", error);
    return {
      data: [],
      total: 0,
      page,
      pageSize,
      totalPages: 0,
    };
  }

  const total = count || 0;

  return {
    data: (data as CLead[]) || [],
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize),
  };
}

/**
 * 단일 C레벨 리드 조회 (메시지 이력 포함)
 */
export async function getCLeadById(id: string): Promise<CLeadWithMessages | null> {
  const supabase = createServiceClient();

  // 리드 기본 정보
  const { data: lead, error: leadError } = await supabase
    .from("c_leads")
    .select("*")
    .eq("id", id)
    .single();

  if (leadError || !lead) {
    console.error("Error fetching c_lead:", leadError);
    return null;
  }

  // 메시지 이력
  const { data: messages } = await supabase
    .from("c_lead_messages")
    .select("*")
    .eq("c_lead_id", id)
    .order("created_at", { ascending: false });

  // 마지막 발송일
  const lastMessage = messages && messages.length > 0 ? messages[0] : null;

  return {
    ...(lead as CLead),
    messages: (messages as CLeadMessage[]) || [],
    lastMessageAt: lastMessage?.sent_at || lastMessage?.created_at || null,
  };
}

/**
 * C레벨 리드 생성
 */
export async function createCLead(data: CLeadInsert): Promise<CLead | null> {
  const supabase = createServiceClient();

  const { data: lead, error } = await supabase
    .from("c_leads")
    .insert(data)
    .select()
    .single();

  if (error) {
    console.error("Error creating c_lead:", error);
    return null;
  }

  return lead as CLead;
}

/**
 * C레벨 리드 업데이트
 */
export async function updateCLead(
  id: string,
  updates: CLeadUpdate
): Promise<CLead | null> {
  const supabase = createServiceClient();

  const { data, error } = await supabase
    .from("c_leads")
    .update(updates)
    .eq("id", id)
    .select()
    .single();

  if (error) {
    console.error("Error updating c_lead:", error);
    return null;
  }

  return data as CLead;
}

/**
 * 메시지 이력 조회
 */
export async function getCLeadMessages(cLeadId: string): Promise<CLeadMessage[]> {
  const supabase = createServiceClient();

  const { data, error } = await supabase
    .from("c_lead_messages")
    .select("*")
    .eq("c_lead_id", cLeadId)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching messages:", error);
    return [];
  }

  return (data as CLeadMessage[]) || [];
}

/**
 * 메시지 이력 생성
 */
export async function createCLeadMessage(
  data: CLeadMessageInsert
): Promise<CLeadMessage | null> {
  const supabase = createServiceClient();

  const { data: message, error } = await supabase
    .from("c_lead_messages")
    .insert(data)
    .select()
    .single();

  if (error) {
    console.error("Error creating message:", error);
    return null;
  }

  return message as CLeadMessage;
}

/**
 * 메시지 상태 업데이트
 */
export async function updateCLeadMessage(
  id: string,
  updates: Partial<CLeadMessage>
): Promise<CLeadMessage | null> {
  const supabase = createServiceClient();

  const { data, error } = await supabase
    .from("c_lead_messages")
    .update(updates)
    .eq("id", id)
    .select()
    .single();

  if (error) {
    console.error("Error updating message:", error);
    return null;
  }

  return data as CLeadMessage;
}
