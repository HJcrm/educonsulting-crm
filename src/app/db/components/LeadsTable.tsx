"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Search, ChevronLeft, ChevronRight, Star } from "lucide-react";
import {
  STAGE_LABELS,
  STAGE_COLORS,
  type Lead,
  type LeadStage,
} from "@/types/database";
import { LeadDetailModal } from "./LeadDetailModal";
import { useToast } from "./Toast";

// dayjs 대신 네이티브 날짜 포맷 함수 사용
function formatDate(dateString: string): string {
  const date = new Date(dateString);
  const yy = String(date.getFullYear()).slice(2);
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const dd = String(date.getDate()).padStart(2, "0");
  const hh = String(date.getHours()).padStart(2, "0");
  const min = String(date.getMinutes()).padStart(2, "0");
  return `${yy}.${mm}.${dd} ${hh}:${min}`;
}

interface Props {
  initialSearch: string;
  initialPage: number;
}

interface PaginatedResult {
  data: Lead[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

const PAGE_SIZE = 20;

export function LeadsTable({ initialSearch, initialPage }: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { addToast } = useToast();

  const [search, setSearch] = useState(initialSearch);
  const [debouncedSearch, setDebouncedSearch] = useState(initialSearch);
  const [page, setPage] = useState(initialPage);
  const [result, setResult] = useState<PaginatedResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);

  // 검색어 debounce
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  // 데이터 fetch
  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (debouncedSearch) params.set("search", debouncedSearch);
      params.set("page", String(page));
      params.set("pageSize", String(PAGE_SIZE));

      const res = await fetch(`/api/leads?${params.toString()}`);
      if (res.ok) {
        const json = await res.json();
        setResult(json);
      }
    } catch (error) {
      console.error("Failed to fetch leads:", error);
    } finally {
      setLoading(false);
    }
  }, [debouncedSearch, page]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // URL 업데이트
  useEffect(() => {
    const params = new URLSearchParams();
    if (debouncedSearch) params.set("search", debouncedSearch);
    if (page > 1) params.set("page", String(page));

    const newUrl = params.toString() ? `/db?${params.toString()}` : "/db";
    router.replace(newUrl, { scroll: false });
  }, [debouncedSearch, page, router]);

  // 전화번호 포맷
  const formatPhone = (phone: string) => {
    const cleaned = phone.replace(/\D/g, "");
    if (cleaned.length === 11) {
      return `${cleaned.slice(0, 3)}-${cleaned.slice(3, 7)}-${cleaned.slice(7)}`;
    }
    if (cleaned.length === 10) {
      return `${cleaned.slice(0, 3)}-${cleaned.slice(3, 6)}-${cleaned.slice(6)}`;
    }
    return phone;
  };

  // UTM 요약
  const getUtmSummary = (lead: Lead) => {
    const parts = [lead.utm_source, lead.utm_medium, lead.utm_campaign].filter(
      Boolean
    );
    return parts.length > 0 ? parts.join(" / ") : "-";
  };

  // 모달 닫기 후 새로고침
  const handleModalClose = (refreshNeeded?: boolean) => {
    setSelectedLead(null);
    if (refreshNeeded) {
      fetchData();
    }
  };

  // 고관여 토글
  const handleToggleHighInterest = async (lead: Lead, checked: boolean) => {
    // Optimistic update
    setResult((prev) =>
      prev
        ? {
            ...prev,
            data: prev.data.map((l) =>
              l.id === lead.id ? { ...l, is_high_interest: checked } as Lead : l
            ),
          }
        : null
    );

    try {
      const res = await fetch(`/api/leads/${lead.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_high_interest: checked }),
      });

      if (res.ok) {
        addToast(
          checked
            ? `${lead.parent_name} 리드를 고관여로 표시했습니다.`
            : `${lead.parent_name} 리드의 고관여 표시를 해제했습니다.`,
          "success"
        );
      } else {
        throw new Error("Failed to update");
      }
    } catch {
      // 실패 시 롤백
      setResult((prev) =>
        prev
          ? {
              ...prev,
              data: prev.data.map((l) =>
                l.id === lead.id ? { ...l, is_high_interest: !checked } as Lead : l
              ),
            }
          : null
      );
      addToast("고관여 상태 변경에 실패했습니다.", "error");
    }
  };

  return (
    <div className="bg-white rounded-xl shadow overflow-hidden">
      {/* Search bar */}
      <div className="p-4 border-b flex items-center gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="이름, 전화번호, 메모, UTM으로 검색..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
          />
        </div>
        {result && (
          <span className="text-sm text-gray-500">
            총 {result.total}건
          </span>
        )}
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-gray-600">
            <tr>
              <th className="text-center px-3 py-3 font-medium w-12">
                <Star className="w-4 h-4 mx-auto text-gray-400" />
              </th>
              <th className="text-left px-4 py-3 font-medium">학부모명</th>
              <th className="text-left px-4 py-3 font-medium">전화번호</th>
              <th className="text-left px-4 py-3 font-medium">학년</th>
              <th className="text-left px-4 py-3 font-medium">희망계열</th>
              <th className="text-left px-4 py-3 font-medium">단계</th>
              <th className="text-left px-4 py-3 font-medium">담당자</th>
              <th className="text-left px-4 py-3 font-medium">상담시기</th>
              <th className="text-left px-4 py-3 font-medium max-w-[200px]">
                궁금한 상황
              </th>
              <th className="text-left px-4 py-3 font-medium">유입채널</th>
              <th className="text-left px-4 py-3 font-medium">생성일</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {loading ? (
              Array.from({ length: 10 }).map((_, i) => (
                <tr key={i}>
                  {Array.from({ length: 11 }).map((_, j) => (
                    <td key={j} className="px-4 py-3">
                      <div className="h-4 bg-gray-100 rounded animate-pulse" />
                    </td>
                  ))}
                </tr>
              ))
            ) : result?.data.length === 0 ? (
              <tr>
                <td colSpan={11} className="px-4 py-12 text-center text-gray-500">
                  {debouncedSearch
                    ? "검색 결과가 없습니다."
                    : "등록된 리드가 없습니다."}
                </td>
              </tr>
            ) : (
              result?.data.map((lead) => {
                const isHighInterest = (lead as any).is_high_interest as boolean | undefined;
                return (
                  <tr
                    key={lead.id}
                    onClick={() => setSelectedLead(lead)}
                    className={`hover:bg-gray-50 cursor-pointer transition-colors ${
                      isHighInterest ? "bg-yellow-50/50" : ""
                    }`}
                  >
                    <td className="px-3 py-3 text-center">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleToggleHighInterest(lead, !isHighInterest);
                        }}
                        className={`p-1 rounded transition-colors ${
                          isHighInterest
                            ? "text-yellow-500 hover:text-yellow-600"
                            : "text-gray-300 hover:text-yellow-400"
                        }`}
                        title={isHighInterest ? "고관여 해제" : "고관여 표시"}
                      >
                        <Star className={`w-4 h-4 ${isHighInterest ? "fill-current" : ""}`} />
                      </button>
                    </td>
                    <td className="px-4 py-3 font-medium text-gray-900">
                      {lead.parent_name}
                    </td>
                    <td className="px-4 py-3 text-gray-600">
                      {formatPhone(lead.parent_phone)}
                    </td>
                    <td className="px-4 py-3 text-gray-600">
                      {lead.student_grade || "-"}
                    </td>
                    <td className="px-4 py-3 text-gray-600">
                      {lead.desired_track || "-"}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-block px-2 py-1 rounded text-xs font-medium ${
                          STAGE_COLORS[lead.stage as LeadStage]
                        }`}
                      >
                        {STAGE_LABELS[lead.stage as LeadStage]}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-600">
                      {(lead as any).assignee || "-"}
                    </td>
                    <td className="px-4 py-3 text-gray-600">
                      {lead.desired_timing || "-"}
                    </td>
                    <td className="px-4 py-3 text-gray-600 max-w-[200px] truncate">
                      {lead.question_context || "-"}
                    </td>
                    <td className="px-4 py-3 text-gray-500 text-xs">
                      {getUtmSummary(lead)}
                    </td>
                    <td className="px-4 py-3 text-gray-500 text-xs">
                      {formatDate(lead.created_at)}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {result && result.totalPages > 1 && (
        <div className="px-4 py-3 border-t flex items-center justify-between">
          <div className="text-sm text-gray-500">
            {(page - 1) * PAGE_SIZE + 1} -{" "}
            {Math.min(page * PAGE_SIZE, result.total)} / {result.total}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="p-2 rounded-lg hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="text-sm text-gray-600 min-w-[80px] text-center">
              {page} / {result.totalPages}
            </span>
            <button
              onClick={() => setPage((p) => Math.min(result.totalPages, p + 1))}
              disabled={page === result.totalPages}
              className="p-2 rounded-lg hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Detail Modal */}
      {selectedLead && (
        <LeadDetailModal lead={selectedLead} onClose={handleModalClose} />
      )}
    </div>
  );
}
