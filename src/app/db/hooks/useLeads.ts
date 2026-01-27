"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Lead, LeadStage } from "@/types/database";

export interface LeadsFilter {
  search?: string;
  assignee?: string;
  grade?: string;
  track?: string;
  dateRange?: "today" | "7days" | "30days" | "all";
  sortBy?: "createdAt" | "lastContactAt";
}

interface PaginatedResult {
  data: Lead[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export function useLeads() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // URL에서 필터 상태 읽기
  const getInitialFilters = (): LeadsFilter => ({
    search: searchParams.get("search") || "",
    assignee: searchParams.get("assignee") || "",
    grade: searchParams.get("grade") || "",
    track: searchParams.get("track") || "",
    dateRange: (searchParams.get("dateRange") as LeadsFilter["dateRange"]) || "all",
    sortBy: (searchParams.get("sortBy") as LeadsFilter["sortBy"]) || "createdAt",
  });

  const [filters, setFilters] = useState<LeadsFilter>(getInitialFilters);
  const [debouncedSearch, setDebouncedSearch] = useState(filters.search || "");
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // 검색어 debounce
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(filters.search || "");
    }, 300);
    return () => clearTimeout(timer);
  }, [filters.search]);

  // URL 업데이트
  useEffect(() => {
    const params = new URLSearchParams();
    if (filters.search) params.set("search", filters.search);
    if (filters.assignee) params.set("assignee", filters.assignee);
    if (filters.grade) params.set("grade", filters.grade);
    if (filters.track) params.set("track", filters.track);
    if (filters.dateRange && filters.dateRange !== "all") {
      params.set("dateRange", filters.dateRange);
    }
    if (filters.sortBy && filters.sortBy !== "createdAt") {
      params.set("sortBy", filters.sortBy);
    }

    const newUrl = params.toString() ? `/db?${params.toString()}` : "/db";
    router.replace(newUrl, { scroll: false });
  }, [filters, router]);

  // 데이터 fetch (전체 리드 - 파이프라인용)
  const fetchLeads = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (debouncedSearch) params.set("search", debouncedSearch);
      // 파이프라인에서는 전체 데이터를 가져오므로 pageSize를 크게 설정
      params.set("pageSize", "1000");

      const res = await fetch(`/api/leads?${params.toString()}`);
      if (!res.ok) throw new Error("Failed to fetch leads");

      const json: PaginatedResult = await res.json();
      setLeads(json.data);
    } catch (err) {
      console.error("Failed to fetch leads:", err);
      setError("리드를 불러오는데 실패했습니다.");
    } finally {
      setLoading(false);
    }
  }, [debouncedSearch]);

  useEffect(() => {
    fetchLeads();
  }, [fetchLeads]);

  // 클라이언트 필터링
  const filteredLeads = useMemo(() => {
    let result = [...leads];

    // 담당자 필터
    if (filters.assignee) {
      result = result.filter((lead) => {
        const assignee = (lead as any).assignee;
        return assignee === filters.assignee;
      });
    }

    // 학년 필터
    if (filters.grade) {
      result = result.filter((lead) => lead.student_grade === filters.grade);
    }

    // 희망계열 필터
    if (filters.track) {
      result = result.filter((lead) => lead.desired_track === filters.track);
    }

    // 날짜 필터
    if (filters.dateRange && filters.dateRange !== "all") {
      const now = new Date();
      const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());

      let cutoffDate: Date;
      if (filters.dateRange === "today") {
        cutoffDate = startOfToday;
      } else if (filters.dateRange === "7days") {
        cutoffDate = new Date(startOfToday.getTime() - 7 * 24 * 60 * 60 * 1000);
      } else {
        cutoffDate = new Date(startOfToday.getTime() - 30 * 24 * 60 * 60 * 1000);
      }

      result = result.filter((lead) => new Date(lead.created_at) >= cutoffDate);
    }

    // 정렬
    result.sort((a, b) => {
      const dateA = new Date(a.created_at).getTime();
      const dateB = new Date(b.created_at).getTime();
      return dateB - dateA; // 최신순
    });

    return result;
  }, [leads, filters]);

  // 단계별로 그룹화
  const leadsByStage = useMemo(() => {
    const stages: LeadStage[] = ["NEW", "CONTACTED", "BOOKED", "CONSULTED", "PAID", "LOST"];
    const grouped: Record<LeadStage, Lead[]> = {
      NEW: [],
      CONTACTED: [],
      BOOKED: [],
      CONSULTED: [],
      PAID: [],
      LOST: [],
    };

    filteredLeads.forEach((lead) => {
      if (grouped[lead.stage]) {
        grouped[lead.stage].push(lead);
      }
    });

    return grouped;
  }, [filteredLeads]);

  // 단계별 통계
  const stageStats = useMemo(() => {
    const stages: LeadStage[] = ["NEW", "CONTACTED", "BOOKED", "CONSULTED", "PAID", "LOST"];
    const today = new Date();
    const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate());

    return stages.reduce((acc, stage) => {
      const stageLeads = leadsByStage[stage];
      const todayCount = stageLeads.filter(
        (lead) => new Date(lead.created_at) >= startOfToday
      ).length;

      acc[stage] = {
        total: stageLeads.length,
        today: todayCount,
      };
      return acc;
    }, {} as Record<LeadStage, { total: number; today: number }>);
  }, [leadsByStage]);

  // 고유 값 목록 (필터 옵션용)
  const uniqueValues = useMemo(() => {
    const assignees = new Set<string>();
    const grades = new Set<string>();
    const tracks = new Set<string>();

    leads.forEach((lead) => {
      const assignee = (lead as any).assignee;
      if (assignee) assignees.add(assignee);
      if (lead.student_grade) grades.add(lead.student_grade);
      if (lead.desired_track) tracks.add(lead.desired_track);
    });

    return {
      assignees: Array.from(assignees).sort(),
      grades: Array.from(grades).sort(),
      tracks: Array.from(tracks).sort(),
    };
  }, [leads]);

  // 로컬 상태 업데이트 (optimistic update용)
  const updateLeadLocally = useCallback((leadId: string, updates: Partial<Lead>) => {
    setLeads((prev) =>
      prev.map((lead) =>
        lead.id === leadId ? { ...lead, ...updates } : lead
      )
    );
  }, []);

  return {
    leads: filteredLeads,
    leadsByStage,
    stageStats,
    loading,
    error,
    filters,
    setFilters,
    uniqueValues,
    refetch: fetchLeads,
    updateLeadLocally,
  };
}
