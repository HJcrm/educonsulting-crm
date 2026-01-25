"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  TrendingUp,
  Users,
  MapPin,
  GitBranch,
} from "lucide-react";
import { STAGE_LABELS, STAGE_COLORS, type LeadStage } from "@/types/database";
import type { DateFilter } from "@/lib/queries/dashboard";

interface DashboardData {
  conversionRate: {
    rate: number;
    consulted: number;
    total: number;
  };
  leadCount: {
    count: number;
    trend: { date: string; count: number }[];
  };
  regionDistribution: { region: string; count: number }[];
  gradeDistribution: { grade: string; count: number }[];
  stagePipeline: { stage: LeadStage; count: number }[];
}

interface Props {
  initialFilter: DateFilter;
}

export function DashboardContent({ initialFilter }: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const [filter, setFilter] = useState<DateFilter>(initialFilter);
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  const filterOptions: { value: DateFilter; label: string }[] = [
    { value: "7d", label: "최근 7일" },
    { value: "30d", label: "최근 30일" },
    { value: "all", label: "전체" },
  ];

  // 데이터 fetch
  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      try {
        const res = await fetch(`/api/dashboard?filter=${filter}`);
        if (res.ok) {
          const json = await res.json();
          setData(json);
        }
      } catch (error) {
        console.error("Failed to fetch dashboard data:", error);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [filter]);

  // 필터 변경
  const handleFilterChange = (newFilter: DateFilter) => {
    setFilter(newFilter);
    startTransition(() => {
      const params = new URLSearchParams(searchParams.toString());
      params.set("filter", newFilter);
      router.push(`/dashboard?${params.toString()}`);
    });
  };

  if (loading || !data) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600" />
      </div>
    );
  }

  const totalForPipeline = data.stagePipeline.reduce((sum, s) => sum + s.count, 0);

  return (
    <div className="space-y-6">
      {/* Filter */}
      <div className="flex gap-2">
        {filterOptions.map((option) => (
          <button
            key={option.value}
            onClick={() => handleFilterChange(option.value)}
            disabled={isPending}
            className={`px-4 py-2 rounded-lg font-medium text-sm transition-colors ${
              filter === option.value
                ? "bg-primary-600 text-white"
                : "bg-white text-gray-600 hover:bg-gray-100"
            }`}
          >
            {option.label}
          </button>
        ))}
      </div>

      {/* Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* 1. 전환율 */}
        <div className="bg-white rounded-xl shadow p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-green-100 rounded-lg">
              <TrendingUp className="w-5 h-5 text-green-600" />
            </div>
            <h3 className="font-semibold text-gray-700">전환율</h3>
          </div>
          <div className="flex items-end gap-2">
            <span className="text-4xl font-bold text-gray-900">
              {data.conversionRate.rate}%
            </span>
            <span className="text-sm text-gray-500 mb-1">
              ({data.conversionRate.consulted} / {data.conversionRate.total})
            </span>
          </div>
          <p className="text-sm text-gray-500 mt-2">
            상담완료 이상 / 전체 리드
          </p>
        </div>

        {/* 2. 리드 수 */}
        <div className="bg-white rounded-xl shadow p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Users className="w-5 h-5 text-blue-600" />
            </div>
            <h3 className="font-semibold text-gray-700">리드 유입</h3>
          </div>
          <div className="flex items-end gap-2">
            <span className="text-4xl font-bold text-gray-900">
              {data.leadCount.count}
            </span>
            <span className="text-sm text-gray-500 mb-1">건</span>
          </div>

          {/* Mini trend chart */}
          {data.leadCount.trend.length > 0 && (
            <div className="mt-4 flex items-end gap-1 h-12">
              {data.leadCount.trend.slice(-14).map((item, idx) => {
                const max = Math.max(...data.leadCount.trend.map((t) => t.count), 1);
                const height = (item.count / max) * 100;
                return (
                  <div
                    key={idx}
                    className="flex-1 bg-blue-200 rounded-t hover:bg-blue-300 transition-colors"
                    style={{ height: `${Math.max(height, 4)}%` }}
                    title={`${item.date}: ${item.count}건`}
                  />
                );
              })}
            </div>
          )}
        </div>

        {/* 3. 지역/학년 분포 */}
        <div className="bg-white rounded-xl shadow p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-purple-100 rounded-lg">
              <MapPin className="w-5 h-5 text-purple-600" />
            </div>
            <h3 className="font-semibold text-gray-700">지역 / 학년 분포</h3>
          </div>

          <div className="grid grid-cols-2 gap-4">
            {/* 지역 */}
            <div>
              <h4 className="text-xs font-medium text-gray-500 mb-2">
                지역 (상위 5)
              </h4>
              <ul className="space-y-1">
                {data.regionDistribution.length > 0 ? (
                  data.regionDistribution.map((item) => (
                    <li
                      key={item.region}
                      className="flex justify-between text-sm"
                    >
                      <span className="text-gray-700">{item.region}</span>
                      <span className="text-gray-500">{item.count}</span>
                    </li>
                  ))
                ) : (
                  <li className="text-sm text-gray-400">데이터 없음</li>
                )}
              </ul>
            </div>

            {/* 학년 */}
            <div>
              <h4 className="text-xs font-medium text-gray-500 mb-2">학년</h4>
              <ul className="space-y-1">
                {data.gradeDistribution.length > 0 ? (
                  data.gradeDistribution.slice(0, 5).map((item) => (
                    <li
                      key={item.grade}
                      className="flex justify-between text-sm"
                    >
                      <span className="text-gray-700">{item.grade}</span>
                      <span className="text-gray-500">{item.count}</span>
                    </li>
                  ))
                ) : (
                  <li className="text-sm text-gray-400">데이터 없음</li>
                )}
              </ul>
            </div>
          </div>
        </div>

        {/* 4. 파이프라인 분포 */}
        <div className="bg-white rounded-xl shadow p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-orange-100 rounded-lg">
              <GitBranch className="w-5 h-5 text-orange-600" />
            </div>
            <h3 className="font-semibold text-gray-700">파이프라인</h3>
          </div>

          <div className="space-y-3">
            {data.stagePipeline.map((item) => {
              const percentage =
                totalForPipeline > 0
                  ? Math.round((item.count / totalForPipeline) * 100)
                  : 0;
              return (
                <div key={item.stage}>
                  <div className="flex justify-between text-sm mb-1">
                    <span
                      className={`px-2 py-0.5 rounded text-xs font-medium ${
                        STAGE_COLORS[item.stage]
                      }`}
                    >
                      {STAGE_LABELS[item.stage]}
                    </span>
                    <span className="text-gray-600">
                      {item.count} ({percentage}%)
                    </span>
                  </div>
                  <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-primary-500 rounded-full transition-all"
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
