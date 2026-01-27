"use client";

import { memo } from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Phone, MessageSquare, Eye, GripVertical, Star } from "lucide-react";
import { Lead } from "@/types/database";

interface LeadCardProps {
  lead: Lead;
  onClick?: () => void;
  onCall?: () => void;
  onMessage?: () => void;
  onToggleHighInterest?: (checked: boolean) => void;
  isDragging?: boolean;
}

// 상대 시간 포맷
function formatRelativeTime(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffMins < 1) return "방금 전";
  if (diffMins < 60) return `${diffMins}분 전`;
  if (diffHours < 24) return `${diffHours}시간 전`;
  if (diffDays < 7) return `${diffDays}일 전`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)}주 전`;

  const yy = String(date.getFullYear()).slice(2);
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const dd = String(date.getDate()).padStart(2, "0");
  return `${yy}.${mm}.${dd}`;
}

function LeadCardComponent({
  lead,
  onClick,
  onCall,
  onMessage,
  onToggleHighInterest,
  isDragging = false,
}: LeadCardProps) {
  const assignee = (lead as any).assignee as string | null;
  const isHighInterest = (lead as any).is_high_interest as boolean | undefined;

  return (
    <div
      className={`
        bg-white rounded-lg border p-3 shadow-sm
        hover:shadow-md transition-all cursor-pointer
        ${isDragging ? "shadow-lg ring-2 ring-primary-500 ring-opacity-50" : ""}
        ${isHighInterest ? "border-yellow-400 bg-yellow-50/50" : "border-gray-200 hover:border-gray-300"}
      `}
      onClick={onClick}
    >
      {/* 상단: 고관여 체크 + 이름 + 빠른 액션 */}
      <div className="flex items-start justify-between mb-2">
        <div className="flex items-start gap-2 flex-1 min-w-0">
          {/* 고관여 체크박스 */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              onToggleHighInterest?.(!isHighInterest);
            }}
            className={`mt-0.5 p-1 rounded transition-colors ${
              isHighInterest
                ? "text-yellow-500 hover:text-yellow-600"
                : "text-gray-300 hover:text-yellow-400"
            }`}
            title={isHighInterest ? "고관여 해제" : "고관여 표시"}
            aria-label={isHighInterest ? "고관여 해제" : "고관여 표시"}
          >
            <Star className={`w-4 h-4 ${isHighInterest ? "fill-current" : ""}`} />
          </button>
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-gray-900 truncate">
              {lead.parent_name}
            </h3>
            <p className="text-xs text-gray-500 truncate">
              {lead.student_grade || "학년 미입력"}{" "}
              {lead.desired_track && `· ${lead.desired_track}`}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1 ml-2">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onCall?.();
            }}
            className="p-1.5 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded transition-colors"
            title="전화걸기"
            aria-label={`${lead.parent_name}에게 전화`}
          >
            <Phone className="w-4 h-4" />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onMessage?.();
            }}
            className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
            title="문자보내기"
            aria-label={`${lead.parent_name}에게 문자`}
          >
            <MessageSquare className="w-4 h-4" />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onClick?.();
            }}
            className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded transition-colors"
            title="상세보기"
            aria-label={`${lead.parent_name} 상세보기`}
          >
            <Eye className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* 중단: 궁금한 상황 */}
      {lead.question_context && (
        <p className="text-sm text-gray-600 mb-2 line-clamp-2">
          {lead.question_context}
        </p>
      )}

      {/* 하단: 담당자, 상담시기, 생성일 */}
      <div className="flex items-center justify-between text-xs text-gray-500 pt-2 border-t border-gray-100">
        <div className="flex items-center gap-2">
          <span
            className={`px-1.5 py-0.5 rounded ${
              assignee
                ? "bg-primary-50 text-primary-700"
                : "bg-gray-100 text-gray-500"
            }`}
          >
            {assignee || "미배정"}
          </span>
          {lead.desired_timing && (
            <span className="text-gray-400">{lead.desired_timing}</span>
          )}
        </div>
        <span className="text-gray-400">
          {formatRelativeTime(lead.created_at)}
        </span>
      </div>
    </div>
  );
}

// 드래그 가능한 카드
export function DraggableLeadCard({
  lead,
  onClick,
  onCall,
  onMessage,
  onToggleHighInterest,
}: LeadCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: lead.id,
    data: {
      type: "lead",
      lead,
    },
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 1000 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      className="relative group"
    >
      {/* 드래그 핸들 */}
      <div
        {...listeners}
        className="absolute left-0 top-0 bottom-0 w-6 flex items-center justify-center cursor-grab active:cursor-grabbing opacity-0 group-hover:opacity-100 transition-opacity"
        aria-label="드래그하여 이동"
      >
        <GripVertical className="w-4 h-4 text-gray-400" />
      </div>
      <div className="ml-4">
        <LeadCardComponent
          lead={lead}
          onClick={onClick}
          onCall={onCall}
          onMessage={onMessage}
          onToggleHighInterest={onToggleHighInterest}
          isDragging={isDragging}
        />
      </div>
    </div>
  );
}

// 드래그 오버레이용 카드 (드래그 중 보이는 카드)
export const LeadCardOverlay = memo(function LeadCardOverlay({
  lead,
}: {
  lead: Lead;
}) {
  return (
    <div className="w-72 rotate-3">
      <LeadCardComponent lead={lead} isDragging />
    </div>
  );
});

export const LeadCard = memo(LeadCardComponent);
