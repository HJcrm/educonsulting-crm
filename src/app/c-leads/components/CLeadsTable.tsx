"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Search, ChevronLeft, ChevronRight, MessageSquare } from "lucide-react";
import { STATUS_LABELS, STATUS_COLORS, type CLead, type CLeadStatus } from "@/types/c-leads";
import { CLeadDetailModal } from "./CLeadDetailModal";

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
  data: CLead[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

const PAGE_SIZE = 20;

export function CLeadsTable({ initialSearch, initialPage }: Props) {
  const router = useRouter();

  const [search, setSearch] = useState(initialSearch);
  const [debouncedSearch, setDebouncedSearch] = useState(initialSearch);
  const [page, setPage] = useState(initialPage);
  const [result, setResult] = useState<PaginatedResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedLead, setSelectedLead] = useState<CLead | null>(null);

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

      const res = await fetch(`/api/c-leads?${params.toString()}`);
      if (res.ok) {
        const json = await res.json();
        setResult(json);
      }
    } catch (error) {
      console.error("Failed to fetch c-leads:", error);
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

    const newUrl = params.toString() ? `/c-leads?${params.toString()}` : "/c-leads";
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

  // 모달 닫기 후 새로고침
  const handleModalClose = (refreshNeeded?: boolean) => {
    setSelectedLead(null);
    if (refreshNeeded) {
      fetchData();
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
            placeholder="이름, 전화번호, 문의내용으로 검색..."
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
              <th className="text-left px-4 py-3 font-medium">학부모명</th>
              <th className="text-left px-4 py-3 font-medium">전화번호</th>
              <th className="text-left px-4 py-3 font-medium">학년</th>
              <th className="text-left px-4 py-3 font-medium">지역</th>
              <th className="text-left px-4 py-3 font-medium">상태</th>
              <th className="text-left px-4 py-3 font-medium max-w-[200px]">
                문의내용
              </th>
              <th className="text-left px-4 py-3 font-medium">생성일</th>
              <th className="text-center px-4 py-3 font-medium w-16">
                <MessageSquare className="w-4 h-4 mx-auto text-gray-400" />
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {loading ? (
              Array.from({ length: 10 }).map((_, i) => (
                <tr key={i}>
                  {Array.from({ length: 8 }).map((_, j) => (
                    <td key={j} className="px-4 py-3">
                      <div className="h-4 bg-gray-100 rounded animate-pulse" />
                    </td>
                  ))}
                </tr>
              ))
            ) : result?.data.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-4 py-12 text-center text-gray-500">
                  {debouncedSearch
                    ? "검색 결과가 없습니다."
                    : "등록된 리드가 없습니다."}
                </td>
              </tr>
            ) : (
              result?.data.map((lead) => (
                <tr
                  key={lead.id}
                  onClick={() => setSelectedLead(lead)}
                  className="hover:bg-gray-50 cursor-pointer transition-colors"
                >
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
                    {lead.region || "-"}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-block px-2 py-1 rounded text-xs font-medium ${
                        STATUS_COLORS[lead.status as CLeadStatus]
                      }`}
                    >
                      {STATUS_LABELS[lead.status as CLeadStatus]}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-600 max-w-[200px] truncate">
                    {lead.question_context || "-"}
                  </td>
                  <td className="px-4 py-3 text-gray-500 text-xs">
                    {formatDate(lead.created_at)}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedLead(lead);
                      }}
                      className="p-1 text-gray-400 hover:text-primary-600 transition-colors"
                      title="메시지 발송"
                    >
                      <MessageSquare className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))
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
        <CLeadDetailModal lead={selectedLead} onClose={handleModalClose} />
      )}
    </div>
  );
}
