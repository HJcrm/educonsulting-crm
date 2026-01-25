import { createServerClient } from "@/lib/supabase/server";
import dayjs from "dayjs";
import type { LeadStage } from "@/types/database";

export type DateFilter = "7d" | "30d" | "all";

/**
 * 기간 필터에 따른 시작일 계산
 */
function getStartDate(filter: DateFilter): string | null {
  if (filter === "all") return null;
  const days = filter === "7d" ? 7 : 30;
  return dayjs().subtract(days, "day").startOf("day").toISOString();
}

/**
 * 전환율 계산 (상담완료 이상 / 전체 리드)
 */
export async function getConversionRate(filter: DateFilter = "all") {
  const supabase = createServerClient();
  const startDate = getStartDate(filter);

  let query = supabase.from("leads").select("stage", { count: "exact" });

  if (startDate) {
    query = query.gte("created_at", startDate);
  }

  const { data, count, error } = await query;

  if (error) {
    console.error("Error fetching conversion rate:", error);
    return { rate: 0, consulted: 0, total: 0 };
  }

  const total = count || 0;
  const consulted =
    data?.filter((lead) =>
      ["CONSULTED", "PAID"].includes(lead.stage as string)
    ).length || 0;

  return {
    rate: total > 0 ? Math.round((consulted / total) * 100) : 0,
    consulted,
    total,
  };
}

/**
 * 기간별 리드 수
 */
export async function getLeadCount(filter: DateFilter = "7d") {
  const supabase = createServerClient();
  const startDate = getStartDate(filter);

  let query = supabase.from("leads").select("created_at", { count: "exact" });

  if (startDate) {
    query = query.gte("created_at", startDate);
  }

  const { data, count, error } = await query;

  if (error) {
    console.error("Error fetching lead count:", error);
    return { count: 0, trend: [] };
  }

  // 일별 추이 계산
  const trendMap = new Map<string, number>();
  const days = filter === "7d" ? 7 : filter === "30d" ? 30 : 30; // all일 경우 최근 30일만 표시

  // 최근 N일 초기화
  for (let i = days - 1; i >= 0; i--) {
    const date = dayjs().subtract(i, "day").format("MM/DD");
    trendMap.set(date, 0);
  }

  // 데이터 집계
  data?.forEach((lead) => {
    const date = dayjs(lead.created_at).format("MM/DD");
    if (trendMap.has(date)) {
      trendMap.set(date, (trendMap.get(date) || 0) + 1);
    }
  });

  const trend = Array.from(trendMap.entries()).map(([date, value]) => ({
    date,
    count: value,
  }));

  return { count: count || 0, trend };
}

/**
 * 지역별 분포 (상위 5개)
 */
export async function getRegionDistribution(filter: DateFilter = "all") {
  const supabase = createServerClient();
  const startDate = getStartDate(filter);

  let query = supabase.from("leads").select("region");

  if (startDate) {
    query = query.gte("created_at", startDate);
  }

  const { data, error } = await query;

  if (error) {
    console.error("Error fetching region distribution:", error);
    return [];
  }

  // 지역별 집계
  const regionMap = new Map<string, number>();
  data?.forEach((lead) => {
    const region = lead.region || "미입력";
    regionMap.set(region, (regionMap.get(region) || 0) + 1);
  });

  // 상위 5개 정렬
  return Array.from(regionMap.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([region, count]) => ({ region, count }));
}

/**
 * 학년별 분포
 */
export async function getGradeDistribution(filter: DateFilter = "all") {
  const supabase = createServerClient();
  const startDate = getStartDate(filter);

  let query = supabase.from("leads").select("student_grade");

  if (startDate) {
    query = query.gte("created_at", startDate);
  }

  const { data, error } = await query;

  if (error) {
    console.error("Error fetching grade distribution:", error);
    return [];
  }

  // 학년별 집계
  const gradeMap = new Map<string, number>();
  data?.forEach((lead) => {
    const grade = lead.student_grade || "미입력";
    gradeMap.set(grade, (gradeMap.get(grade) || 0) + 1);
  });

  // 정렬 (학년순)
  const gradeOrder = [
    "초1",
    "초2",
    "초3",
    "초4",
    "초5",
    "초6",
    "중1",
    "중2",
    "중3",
    "고1",
    "고2",
    "고3",
    "N수",
    "미입력",
  ];

  return Array.from(gradeMap.entries())
    .sort((a, b) => {
      const aIdx = gradeOrder.indexOf(a[0]);
      const bIdx = gradeOrder.indexOf(b[0]);
      if (aIdx === -1 && bIdx === -1) return a[0].localeCompare(b[0]);
      if (aIdx === -1) return 1;
      if (bIdx === -1) return -1;
      return aIdx - bIdx;
    })
    .map(([grade, count]) => ({ grade, count }));
}

/**
 * 단계별 파이프라인 분포
 */
export async function getStagePipeline(filter: DateFilter = "all") {
  const supabase = createServerClient();
  const startDate = getStartDate(filter);

  let query = supabase.from("leads").select("stage");

  if (startDate) {
    query = query.gte("created_at", startDate);
  }

  const { data, error } = await query;

  if (error) {
    console.error("Error fetching stage pipeline:", error);
    return [];
  }

  // 단계별 집계
  const stageMap = new Map<LeadStage, number>();
  const stageOrder: LeadStage[] = [
    "NEW",
    "CONTACTED",
    "BOOKED",
    "CONSULTED",
    "PAID",
    "LOST",
  ];

  // 초기화
  stageOrder.forEach((stage) => stageMap.set(stage, 0));

  // 집계
  data?.forEach((lead) => {
    const stage = lead.stage as LeadStage;
    stageMap.set(stage, (stageMap.get(stage) || 0) + 1);
  });

  return stageOrder.map((stage) => ({
    stage,
    count: stageMap.get(stage) || 0,
  }));
}

/**
 * 대시보드 전체 데이터 조회
 */
export async function getDashboardData(filter: DateFilter = "7d") {
  const [conversionRate, leadCount, regionDist, gradeDist, stagePipeline] =
    await Promise.all([
      getConversionRate(filter),
      getLeadCount(filter),
      getRegionDistribution(filter),
      getGradeDistribution(filter),
      getStagePipeline(filter),
    ]);

  return {
    conversionRate,
    leadCount,
    regionDistribution: regionDist,
    gradeDistribution: gradeDist,
    stagePipeline,
  };
}
