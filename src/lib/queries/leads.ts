import { createServiceClient } from "@/lib/supabase/server";
import type { Lead, LeadWithRelations, Interaction, Appointment } from "@/types/database";

export interface LeadsQuery {
  search?: string;
  page?: number;
  pageSize?: number;
}

export interface LeadsResult {
  data: Lead[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

/**
 * 리드 목록 조회 (검색, 페이지네이션 지원)
 */
export async function getLeads({
  search,
  page = 1,
  pageSize = 20,
}: LeadsQuery = {}): Promise<LeadsResult> {
  const supabase = createServiceClient();
  const offset = (page - 1) * pageSize;

  let query = supabase
    .from("leads")
    .select("*", { count: "exact" })
    .order("updated_at", { ascending: false })
    .range(offset, offset + pageSize - 1);

  // 검색어가 있으면 여러 필드에 대해 OR 검색
  if (search && search.trim()) {
    const searchTerm = `%${search.trim()}%`;
    query = query.or(
      `parent_name.ilike.${searchTerm},parent_phone.ilike.${searchTerm},question_context.ilike.${searchTerm},utm_source.ilike.${searchTerm},utm_medium.ilike.${searchTerm},utm_campaign.ilike.${searchTerm}`
    );
  }

  const { data, count, error } = await query;

  if (error) {
    console.error("Error fetching leads:", error);
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
    data: data || [],
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize),
  };
}

/**
 * 단일 리드 조회 (상세 정보 + 관계 데이터)
 */
export async function getLeadById(id: string): Promise<LeadWithRelations | null> {
  const supabase = createServiceClient();

  // 리드 기본 정보
  const { data: lead, error: leadError } = await supabase
    .from("leads")
    .select("*")
    .eq("id", id)
    .single();

  if (leadError || !lead) {
    console.error("Error fetching lead:", leadError);
    return null;
  }

  // 상담 기록
  const { data: interactions } = await supabase
    .from("interactions")
    .select("*")
    .eq("lead_id", id)
    .order("created_at", { ascending: false });

  // 예약 정보
  const { data: appointments } = await supabase
    .from("appointments")
    .select("*")
    .eq("lead_id", id)
    .order("scheduled_at", { ascending: true });

  return {
    ...lead,
    interactions: interactions || [],
    appointments: appointments || [],
  };
}

/**
 * 리드 단계 업데이트
 */
export async function updateLeadStage(
  id: string,
  stage: Lead["stage"]
): Promise<Lead | null> {
  const supabase = createServiceClient();

  const { data, error } = await supabase
    .from("leads")
    .update({ stage })
    .eq("id", id)
    .select()
    .single();

  if (error) {
    console.error("Error updating lead stage:", error);
    return null;
  }

  return data;
}

/**
 * 메모 추가
 */
export async function addInteraction(
  leadId: string,
  content: string,
  type: Interaction["type"] = "MEMO"
): Promise<Interaction | null> {
  const supabase = createServiceClient();

  const { data, error } = await supabase
    .from("interactions")
    .insert({
      lead_id: leadId,
      content,
      type,
    })
    .select()
    .single();

  if (error) {
    console.error("Error adding interaction:", error);
    return null;
  }

  return data;
}

/**
 * 예약 추가
 */
export async function addAppointment(
  leadId: string,
  scheduledAt: string,
  notes?: string
): Promise<Appointment | null> {
  const supabase = createServiceClient();

  const { data, error } = await supabase
    .from("appointments")
    .insert({
      lead_id: leadId,
      scheduled_at: scheduledAt,
      notes,
    })
    .select()
    .single();

  if (error) {
    console.error("Error adding appointment:", error);
    return null;
  }

  return data;
}
