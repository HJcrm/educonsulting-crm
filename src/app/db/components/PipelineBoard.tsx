"use client";

import { useState, useCallback, useMemo } from "react";
import {
  DndContext,
  DragOverlay,
  closestCorners,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragStartEvent,
  DragEndEvent,
  DragOverEvent,
} from "@dnd-kit/core";
import { sortableKeyboardCoordinates } from "@dnd-kit/sortable";
import { Lead, LeadStage } from "@/types/database";
import { useLeads } from "../hooks/useLeads";
import { useUpdateLeadStage } from "../hooks/useUpdateLeadStage";
import { StageColumn, StageColumnSkeleton } from "./StageColumn";
import { LeadCardOverlay } from "./LeadCard";
import { PipelineFilters } from "./PipelineFilters";
import { LeadDetailModal } from "./LeadDetailModal";
import { useToast } from "./Toast";

const STAGES: LeadStage[] = [
  "NEW",
  "CONTACTED",
  "BOOKED",
  "CONSULTED",
  "PAID",
  "LOST",
];

export function PipelineBoard() {
  const { addToast } = useToast();
  const {
    leads,
    leadsByStage,
    stageStats,
    loading,
    error,
    filters,
    setFilters,
    uniqueValues,
    updateLeadLocally,
    refetch,
  } = useLeads();

  const { updateStage } = useUpdateLeadStage();

  const [activeLead, setActiveLead] = useState<Lead | null>(null);
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);

  // 드래그 센서 설정
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8, // 8px 이상 움직여야 드래그 시작
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // 드래그 시작
  const handleDragStart = useCallback(
    (event: DragStartEvent) => {
      const { active } = event;
      const leadId = active.id as string;
      const lead = leads.find((l) => l.id === leadId);
      if (lead) {
        setActiveLead(lead);
      }
    },
    [leads]
  );

  // 드래그 종료 - 단계 변경
  const handleDragEnd = useCallback(
    async (event: DragEndEvent) => {
      const { active, over } = event;

      setActiveLead(null);

      if (!over) return;

      const leadId = active.id as string;
      const overId = over.id as string;

      // 드롭된 위치에서 stage 추출
      let targetStage: LeadStage | null = null;

      if (overId.startsWith("column-")) {
        targetStage = overId.replace("column-", "") as LeadStage;
      } else {
        // 카드 위에 드롭된 경우 - 해당 카드의 stage 찾기
        const targetLead = leads.find((l) => l.id === overId);
        if (targetLead) {
          targetStage = targetLead.stage;
        }
      }

      if (!targetStage) return;

      const currentLead = leads.find((l) => l.id === leadId);
      if (!currentLead || currentLead.stage === targetStage) return;

      // Optimistic update
      const previousStage = currentLead.stage;
      updateLeadLocally(leadId, { stage: targetStage });

      // API 호출
      const success = await updateStage(leadId, targetStage);

      if (success) {
        addToast(
          `${currentLead.parent_name} 리드가 "${getStageLabel(targetStage)}" 단계로 이동되었습니다.`,
          "success"
        );
      } else {
        // 실패 시 롤백
        updateLeadLocally(leadId, { stage: previousStage });
        addToast("단계 변경에 실패했습니다. 다시 시도해주세요.", "error");
      }
    },
    [leads, updateLeadLocally, updateStage, addToast]
  );

  // 한국 전화번호를 국제 형식으로 변환 (010-1234-5678 → +82-10-1234-5678)
  const formatKoreanPhone = useCallback((phone: string): string => {
    const cleaned = phone.replace(/\D/g, "");
    // 앞의 0을 제거하고 +82 추가
    if (cleaned.startsWith("0")) {
      return `+82-${cleaned.slice(1)}`;
    }
    // 이미 82로 시작하면 +만 추가
    if (cleaned.startsWith("82")) {
      return `+${cleaned}`;
    }
    return `+82-${cleaned}`;
  }, []);

  // 전화 액션
  const handleCall = useCallback((lead: Lead) => {
    const phone = formatKoreanPhone(lead.parent_phone);
    window.location.href = `tel:${phone}`;
  }, [formatKoreanPhone]);

  // 문자 액션
  const handleMessage = useCallback((lead: Lead) => {
    const phone = formatKoreanPhone(lead.parent_phone);
    window.location.href = `sms:${phone}`;
  }, [formatKoreanPhone]);

  // 모달 닫기
  const handleModalClose = useCallback(
    (refreshNeeded?: boolean) => {
      setSelectedLead(null);
      if (refreshNeeded) {
        refetch();
      }
    },
    [refetch]
  );

  if (error) {
    return (
      <div className="bg-white rounded-xl shadow p-8 text-center">
        <p className="text-red-500 mb-4">{error}</p>
        <button
          onClick={refetch}
          className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
        >
          다시 시도
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* 필터 */}
      <PipelineFilters
        filters={filters}
        onFiltersChange={setFilters}
        uniqueValues={uniqueValues}
        totalCount={leads.length}
      />

      {/* 파이프라인 보드 */}
      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <div className="overflow-x-auto pb-4">
          <div className="flex gap-4 min-w-max">
            {loading
              ? STAGES.map((stage) => <StageColumnSkeleton key={stage} />)
              : STAGES.map((stage) => (
                  <StageColumn
                    key={stage}
                    stage={stage}
                    leads={leadsByStage[stage]}
                    stats={stageStats[stage]}
                    onLeadClick={setSelectedLead}
                    onCall={handleCall}
                    onMessage={handleMessage}
                  />
                ))}
          </div>
        </div>

        {/* 드래그 오버레이 */}
        <DragOverlay>
          {activeLead ? <LeadCardOverlay lead={activeLead} /> : null}
        </DragOverlay>
      </DndContext>

      {/* 상세 모달 */}
      {selectedLead && (
        <LeadDetailModal lead={selectedLead} onClose={handleModalClose} />
      )}
    </div>
  );
}

function getStageLabel(stage: LeadStage): string {
  const labels: Record<LeadStage, string> = {
    NEW: "신규",
    CONTACTED: "연락완료",
    BOOKED: "상담예약",
    CONSULTED: "상담완료",
    PAID: "결제완료",
    LOST: "이탈",
  };
  return labels[stage];
}
