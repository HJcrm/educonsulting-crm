"use client";

import { Search, Filter, X } from "lucide-react";
import { LeadsFilter } from "../hooks/useLeads";

interface PipelineFiltersProps {
  filters: LeadsFilter;
  onFiltersChange: (filters: LeadsFilter) => void;
  uniqueValues: {
    assignees: string[];
    grades: string[];
    tracks: string[];
  };
  totalCount: number;
}

export function PipelineFilters({
  filters,
  onFiltersChange,
  uniqueValues,
  totalCount,
}: PipelineFiltersProps) {
  const hasActiveFilters =
    filters.assignee ||
    filters.grade ||
    filters.track ||
    (filters.dateRange && filters.dateRange !== "all");

  const clearFilters = () => {
    onFiltersChange({
      ...filters,
      assignee: "",
      grade: "",
      track: "",
      dateRange: "all",
    });
  };

  return (
    <div className="bg-white rounded-lg shadow p-4 mb-4">
      <div className="flex flex-wrap items-center gap-3">
        {/* 검색 */}
        <div className="relative flex-1 min-w-[200px] max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="이름, 전화번호, 메모, UTM 검색..."
            value={filters.search || ""}
            onChange={(e) =>
              onFiltersChange({ ...filters, search: e.target.value })
            }
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent text-sm"
          />
        </div>

        {/* 담당자 */}
        <select
          value={filters.assignee || ""}
          onChange={(e) =>
            onFiltersChange({ ...filters, assignee: e.target.value })
          }
          className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
        >
          <option value="">담당자 전체</option>
          {uniqueValues.assignees.map((a) => (
            <option key={a} value={a}>
              {a}
            </option>
          ))}
        </select>

        {/* 학년 */}
        <select
          value={filters.grade || ""}
          onChange={(e) =>
            onFiltersChange({ ...filters, grade: e.target.value })
          }
          className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
        >
          <option value="">학년 전체</option>
          {uniqueValues.grades.map((g) => (
            <option key={g} value={g}>
              {g}
            </option>
          ))}
        </select>

        {/* 희망계열 */}
        <select
          value={filters.track || ""}
          onChange={(e) =>
            onFiltersChange({ ...filters, track: e.target.value })
          }
          className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
        >
          <option value="">계열 전체</option>
          {uniqueValues.tracks.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>

        {/* 날짜 범위 */}
        <select
          value={filters.dateRange || "all"}
          onChange={(e) =>
            onFiltersChange({
              ...filters,
              dateRange: e.target.value as LeadsFilter["dateRange"],
            })
          }
          className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
        >
          <option value="all">전체 기간</option>
          <option value="today">오늘</option>
          <option value="7days">최근 7일</option>
          <option value="30days">최근 30일</option>
        </select>

        {/* 필터 초기화 */}
        {hasActiveFilters && (
          <button
            onClick={clearFilters}
            className="flex items-center gap-1 px-3 py-2 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-4 h-4" />
            필터 초기화
          </button>
        )}

        {/* 총 건수 */}
        <div className="ml-auto text-sm text-gray-500">
          총 <span className="font-semibold text-gray-700">{totalCount}</span>건
        </div>
      </div>
    </div>
  );
}
