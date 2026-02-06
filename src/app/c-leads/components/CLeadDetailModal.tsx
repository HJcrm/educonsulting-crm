"use client";

import { useState, useEffect } from "react";
import { X, Save, User, MessageSquare, Clock } from "lucide-react";
import {
  STATUS_LABELS,
  STATUS_COLORS,
  type CLead,
  type CLeadStatus,
  type CLeadMessage,
} from "@/types/c-leads";
import { MessageSendForm } from "./MessageSendForm";
import { MessageHistory } from "./MessageHistory";
import { useToast } from "@/app/db/components/Toast";

function formatDateTime(dateString: string): string {
  const date = new Date(dateString);
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const dd = String(date.getDate()).padStart(2, "0");
  const hh = String(date.getHours()).padStart(2, "0");
  const min = String(date.getMinutes()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd} ${hh}:${min}`;
}

interface Props {
  lead: CLead;
  onClose: (refreshNeeded?: boolean) => void;
}

interface CLeadDetail extends CLead {
  messages: CLeadMessage[];
  lastMessageAt: string | null;
}

const STATUSES: CLeadStatus[] = ["ACTIVE", "INACTIVE"];

export function CLeadDetailModal({ lead, onClose }: Props) {
  const { addToast } = useToast();
  const [detail, setDetail] = useState<CLeadDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState<CLeadStatus>(lead.status as CLeadStatus);
  const [notes, setNotes] = useState(lead.notes || "");
  const [saving, setSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [hasAnyChanges, setHasAnyChanges] = useState(false);

  // 상세 데이터 fetch
  useEffect(() => {
    async function fetchDetail() {
      setLoading(true);
      try {
        const res = await fetch(`/api/c-leads/${lead.id}`);
        if (res.ok) {
          const data = await res.json();
          setDetail(data);
          setStatus(data.status);
          setNotes(data.notes || "");
        }
      } catch (error) {
        console.error("Failed to fetch c-lead detail:", error);
      } finally {
        setLoading(false);
      }
    }
    fetchDetail();
  }, [lead.id]);

  // 변경사항 감지
  useEffect(() => {
    const statusChanged = status !== (detail?.status || lead.status);
    const notesChanged = notes !== (detail?.notes || lead.notes || "");
    setHasChanges(statusChanged || notesChanged);
  }, [status, notes, detail?.status, detail?.notes, lead.status, lead.notes]);

  // 저장
  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch(`/api/c-leads/${lead.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status, notes }),
      });
      if (res.ok) {
        const updated = await res.json();
        setDetail((prev) => (prev ? { ...prev, ...updated } : null));
        setHasChanges(false);
        setHasAnyChanges(true);
        addToast("저장되었습니다.", "success");
      }
    } catch (error) {
      console.error("Failed to update:", error);
      addToast("저장에 실패했습니다.", "error");
    } finally {
      setSaving(false);
    }
  };

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

  // 메시지 발송 후 콜백
  const handleMessageSent = (message: CLeadMessage) => {
    setDetail((prev) =>
      prev
        ? {
            ...prev,
            messages: [message, ...prev.messages],
            lastMessageAt: message.sent_at || message.created_at,
          }
        : null
    );
    setHasAnyChanges(true);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Overlay */}
      <div
        className="absolute inset-0 bg-black/50"
        onClick={() => onClose(hasAnyChanges)}
      />

      {/* Modal */}
      <div className="relative bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col mx-4">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <h2 className="text-lg font-semibold text-gray-900">
            {lead.parent_name}
          </h2>
          <button
            onClick={() => onClose(hasAnyChanges)}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {loading ? (
            <div className="space-y-4">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="h-6 bg-gray-100 rounded animate-pulse" />
              ))}
            </div>
          ) : detail ? (
            <>
              {/* 기본 정보 */}
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-gray-500">전화번호</span>
                  <p className="font-medium text-gray-900">
                    {formatPhone(detail.parent_phone)}
                  </p>
                </div>
                <div>
                  <span className="text-gray-500">학년</span>
                  <p className="font-medium text-gray-900">
                    {detail.student_grade || "-"}
                  </p>
                </div>
                <div>
                  <span className="text-gray-500">희망계열</span>
                  <p className="font-medium text-gray-900">
                    {detail.desired_track || "-"}
                  </p>
                </div>
                <div>
                  <span className="text-gray-500">등록일</span>
                  <p className="font-medium text-gray-900">
                    {formatDateTime(detail.created_at)}
                  </p>
                </div>
                {detail.lastMessageAt && (
                  <div className="col-span-2">
                    <span className="text-gray-500 flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      마지막 발송
                    </span>
                    <p className="font-medium text-gray-900">
                      {formatDateTime(detail.lastMessageAt)}
                    </p>
                  </div>
                )}
              </div>

              {/* 상태 변경 */}
              <div className="border-t pt-4">
                <label className="block text-sm text-gray-500 mb-2 flex items-center gap-2">
                  <User className="w-4 h-4" />
                  상태
                </label>
                <div className="flex items-center gap-3">
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value as CLeadStatus)}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                  >
                    {STATUSES.map((s) => (
                      <option key={s} value={s}>
                        {STATUS_LABELS[s]}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="mt-2 flex gap-1">
                  {STATUSES.map((s) => (
                    <span
                      key={s}
                      className={`px-2 py-0.5 rounded text-xs ${
                        s === status
                          ? STATUS_COLORS[s]
                          : "bg-gray-100 text-gray-400"
                      }`}
                    >
                      {STATUS_LABELS[s]}
                    </span>
                  ))}
                </div>
              </div>

              {/* 메모 */}
              <div className="border-t pt-4">
                <label className="block text-sm text-gray-500 mb-2">
                  메모
                </label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={3}
                  placeholder="메모를 입력하세요..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 resize-none"
                />
              </div>

              {/* 저장 버튼 */}
              {hasChanges && (
                <div className="flex justify-end">
                  <button
                    onClick={handleSave}
                    disabled={saving}
                    className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 transition-colors"
                  >
                    <Save className="w-4 h-4" />
                    저장
                  </button>
                </div>
              )}

              {/* 메시지 발송 */}
              <div className="border-t pt-4">
                <h3 className="font-medium text-gray-900 mb-3 flex items-center gap-2">
                  <MessageSquare className="w-4 h-4" />
                  메시지 발송
                </h3>
                <MessageSendForm
                  leadId={lead.id}
                  recipientPhone={detail.parent_phone}
                  onMessageSent={handleMessageSent}
                />
              </div>

              {/* 발송 이력 */}
              <div className="border-t pt-4">
                <MessageHistory messages={detail.messages} />
              </div>
            </>
          ) : (
            <p className="text-gray-500">데이터를 불러올 수 없습니다.</p>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t bg-gray-50">
          <button
            onClick={() => onClose(hasAnyChanges)}
            className="w-full py-2 text-gray-600 hover:bg-gray-200 rounded-lg transition-colors"
          >
            닫기
          </button>
        </div>
      </div>
    </div>
  );
}
