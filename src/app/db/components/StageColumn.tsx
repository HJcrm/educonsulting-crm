"use client";

import { memo } from "react";
import { useDroppable } from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { Lead, LeadStage, STAGE_LABELS, STAGE_COLORS } from "@/types/database";
import { DraggableLeadCard } from "./LeadCard";

interface StageColumnProps {
  stage: LeadStage;
  leads: Lead[];
  stats: { total: number; today: number };
  onLeadClick: (lead: Lead) => void;
  onCall: (lead: Lead) => void;
  onMessage: (lead: Lead) => void;
}

function StageColumnComponent({
  stage,
  leads,
  stats,
  onLeadClick,
  onCall,
  onMessage,
}: StageColumnProps) {
  const { setNodeRef, isOver } = useDroppable({
    id: `column-${stage}`,
    data: {
      type: "column",
      stage,
    },
  });

  // 각 단계별 헤더 배경색
  const headerColors: Record<LeadStage, string> = {
    NEW: "bg-blue-50 border-blue-200",
    CONTACTED: "bg-yellow-50 border-yellow-200",
    BOOKED: "bg-purple-50 border-purple-200",
    CONSULTED: "bg-green-50 border-green-200",
    PAID: "bg-emerald-50 border-emerald-200",
    LOST: "bg-gray-50 border-gray-200",
  };

  return (
    <div
      className={`
        flex flex-col bg-gray-50 rounded-lg min-w-[300px] max-w-[300px]
        transition-all duration-200
        ${isOver ? "ring-2 ring-primary-400 bg-primary-50" : ""}
      `}
    >
      {/* 컬럼 헤더 */}
      <div
        className={`p-3 rounded-t-lg border-b ${headerColors[stage]}`}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span
              className={`px-2 py-1 rounded text-sm font-medium ${STAGE_COLORS[stage]}`}
            >
              {STAGE_LABELS[stage]}
            </span>
            <span className="text-sm font-semibold text-gray-700">
              {stats.total}
            </span>
          </div>
          {stats.today > 0 && (
            <span className="text-xs px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full">
              오늘 +{stats.today}
            </span>
          )}
        </div>
      </div>

      {/* 카드 영역 */}
      <div
        ref={setNodeRef}
        className="flex-1 p-2 overflow-y-auto min-h-[200px] max-h-[calc(100vh-280px)]"
      >
        <SortableContext
          items={leads.map((lead) => lead.id)}
          strategy={verticalListSortingStrategy}
        >
          <div className="space-y-2">
            {leads.length > 0 ? (
              leads.map((lead) => (
                <DraggableLeadCard
                  key={lead.id}
                  lead={lead}
                  onClick={() => onLeadClick(lead)}
                  onCall={() => onCall(lead)}
                  onMessage={() => onMessage(lead)}
                />
              ))
            ) : (
              <div className="flex flex-col items-center justify-center py-8 text-gray-400">
                <p className="text-sm">해당 단계 리드 없음</p>
              </div>
            )}
          </div>
        </SortableContext>
      </div>
    </div>
  );
}

export const StageColumn = memo(StageColumnComponent);

// 로딩 스켈레톤
export function StageColumnSkeleton() {
  return (
    <div className="flex flex-col bg-gray-50 rounded-lg min-w-[300px] max-w-[300px] animate-pulse">
      <div className="p-3 border-b bg-gray-100 rounded-t-lg">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-16 h-6 bg-gray-200 rounded" />
            <div className="w-6 h-6 bg-gray-200 rounded" />
          </div>
        </div>
      </div>
      <div className="p-2 space-y-2">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="bg-white rounded-lg border p-3 space-y-2">
            <div className="flex items-center justify-between">
              <div className="w-24 h-5 bg-gray-200 rounded" />
              <div className="flex gap-1">
                <div className="w-6 h-6 bg-gray-200 rounded" />
                <div className="w-6 h-6 bg-gray-200 rounded" />
              </div>
            </div>
            <div className="w-full h-4 bg-gray-200 rounded" />
            <div className="w-3/4 h-4 bg-gray-200 rounded" />
            <div className="flex justify-between pt-2">
              <div className="w-16 h-4 bg-gray-200 rounded" />
              <div className="w-12 h-4 bg-gray-200 rounded" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
