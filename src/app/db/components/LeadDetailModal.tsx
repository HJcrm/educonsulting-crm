"use client";

import { useState, useEffect } from "react";
import { X, Save, Plus, Calendar, MessageSquare } from "lucide-react";
import {
  STAGE_LABELS,
  STAGE_COLORS,
  type Lead,
  type LeadStage,
  type Interaction,
  type Appointment,
} from "@/types/database";

// 네이티브 날짜 포맷 함수
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
  lead: Lead;
  onClose: (refreshNeeded?: boolean) => void;
}

interface LeadDetail extends Lead {
  interactions: Interaction[];
  appointments: Appointment[];
}

const STAGES: LeadStage[] = [
  "NEW",
  "CONTACTED",
  "BOOKED",
  "CONSULTED",
  "PAID",
  "LOST",
];

export function LeadDetailModal({ lead, onClose }: Props) {
  const [detail, setDetail] = useState<LeadDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [stage, setStage] = useState<LeadStage>(lead.stage);
  const [saving, setSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  // 메모 폼
  const [newMemo, setNewMemo] = useState("");
  const [addingMemo, setAddingMemo] = useState(false);

  // 예약 폼
  const [showAppointmentForm, setShowAppointmentForm] = useState(false);
  const [appointmentDate, setAppointmentDate] = useState("");
  const [appointmentTime, setAppointmentTime] = useState("");
  const [appointmentNotes, setAppointmentNotes] = useState("");
  const [addingAppointment, setAddingAppointment] = useState(false);

  // 상세 데이터 fetch
  useEffect(() => {
    async function fetchDetail() {
      setLoading(true);
      try {
        const res = await fetch(`/api/leads/${lead.id}`);
        if (res.ok) {
          const data = await res.json();
          setDetail(data);
          setStage(data.stage);
        }
      } catch (error) {
        console.error("Failed to fetch lead detail:", error);
      } finally {
        setLoading(false);
      }
    }
    fetchDetail();
  }, [lead.id]);

  // 단계 변경 감지
  useEffect(() => {
    setHasChanges(stage !== (detail?.stage || lead.stage));
  }, [stage, detail?.stage, lead.stage]);

  // 단계 저장
  const handleSaveStage = async () => {
    setSaving(true);
    try {
      const res = await fetch(`/api/leads/${lead.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ stage }),
      });
      if (res.ok) {
        setDetail((prev) => (prev ? { ...prev, stage } : null));
        setHasChanges(false);
      }
    } catch (error) {
      console.error("Failed to update stage:", error);
    } finally {
      setSaving(false);
    }
  };

  // 메모 추가
  const handleAddMemo = async () => {
    if (!newMemo.trim()) return;
    setAddingMemo(true);
    try {
      const res = await fetch(`/api/leads/${lead.id}/interactions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "MEMO",
          content: newMemo.trim(),
        }),
      });
      if (res.ok) {
        const interaction = await res.json();
        setDetail((prev) =>
          prev
            ? { ...prev, interactions: [interaction, ...prev.interactions] }
            : null
        );
        setNewMemo("");
      }
    } catch (error) {
      console.error("Failed to add memo:", error);
    } finally {
      setAddingMemo(false);
    }
  };

  // 예약 추가
  const handleAddAppointment = async () => {
    if (!appointmentDate || !appointmentTime) return;
    setAddingAppointment(true);
    try {
      const scheduledAt = `${appointmentDate}T${appointmentTime}:00`;
      const res = await fetch(`/api/leads/${lead.id}/appointments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          scheduledAt,
          notes: appointmentNotes || null,
        }),
      });
      if (res.ok) {
        const appointment = await res.json();
        setDetail((prev) =>
          prev
            ? { ...prev, appointments: [appointment, ...prev.appointments] }
            : null
        );
        setShowAppointmentForm(false);
        setAppointmentDate("");
        setAppointmentTime("");
        setAppointmentNotes("");
      }
    } catch (error) {
      console.error("Failed to add appointment:", error);
    } finally {
      setAddingAppointment(false);
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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Overlay */}
      <div
        className="absolute inset-0 bg-black/50"
        onClick={() => onClose(hasChanges)}
      />

      {/* Modal */}
      <div className="relative bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col mx-4">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <h2 className="text-lg font-semibold text-gray-900">
            {lead.parent_name}
          </h2>
          <button
            onClick={() => onClose(hasChanges)}
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
                  <span className="text-gray-500">상담 희망시기</span>
                  <p className="font-medium text-gray-900">
                    {detail.desired_timing || "-"}
                  </p>
                </div>
                <div>
                  <span className="text-gray-500">유입채널</span>
                  <p className="font-medium text-gray-900 text-xs">
                    {[
                      detail.utm_source,
                      detail.utm_medium,
                      detail.utm_campaign,
                    ]
                      .filter(Boolean)
                      .join(" / ") || "-"}
                  </p>
                </div>
                <div className="col-span-2">
                  <span className="text-gray-500">궁금한 상황</span>
                  <p className="font-medium text-gray-900 whitespace-pre-wrap">
                    {detail.question_context || "-"}
                  </p>
                </div>
                <div>
                  <span className="text-gray-500">등록일</span>
                  <p className="font-medium text-gray-900">
                    {formatDateTime(detail.created_at)}
                  </p>
                </div>
              </div>

              {/* 단계 변경 */}
              <div className="border-t pt-4">
                <label className="block text-sm text-gray-500 mb-2">
                  거래 단계
                </label>
                <div className="flex items-center gap-3">
                  <select
                    value={stage}
                    onChange={(e) => setStage(e.target.value as LeadStage)}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                  >
                    {STAGES.map((s) => (
                      <option key={s} value={s}>
                        {STAGE_LABELS[s]}
                      </option>
                    ))}
                  </select>
                  {hasChanges && (
                    <button
                      onClick={handleSaveStage}
                      disabled={saving}
                      className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 transition-colors"
                    >
                      <Save className="w-4 h-4" />
                      저장
                    </button>
                  )}
                </div>
                <div className="mt-2 flex gap-1">
                  {STAGES.map((s) => (
                    <span
                      key={s}
                      className={`px-2 py-0.5 rounded text-xs ${
                        s === stage
                          ? STAGE_COLORS[s]
                          : "bg-gray-100 text-gray-400"
                      }`}
                    >
                      {STAGE_LABELS[s]}
                    </span>
                  ))}
                </div>
              </div>

              {/* 상담 예약 */}
              <div className="border-t pt-4">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-medium text-gray-900 flex items-center gap-2">
                    <Calendar className="w-4 h-4" />
                    상담 예약
                  </h3>
                  {!showAppointmentForm && (
                    <button
                      onClick={() => setShowAppointmentForm(true)}
                      className="text-sm text-primary-600 hover:text-primary-700"
                    >
                      <Plus className="w-4 h-4 inline" /> 추가
                    </button>
                  )}
                </div>

                {showAppointmentForm && (
                  <div className="mb-4 p-3 bg-gray-50 rounded-lg space-y-3">
                    <div className="flex gap-3">
                      <input
                        type="date"
                        value={appointmentDate}
                        onChange={(e) => setAppointmentDate(e.target.value)}
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm"
                      />
                      <input
                        type="time"
                        value={appointmentTime}
                        onChange={(e) => setAppointmentTime(e.target.value)}
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm"
                      />
                    </div>
                    <input
                      type="text"
                      placeholder="메모 (선택)"
                      value={appointmentNotes}
                      onChange={(e) => setAppointmentNotes(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                    />
                    <div className="flex justify-end gap-2">
                      <button
                        onClick={() => setShowAppointmentForm(false)}
                        className="px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-200 rounded-lg"
                      >
                        취소
                      </button>
                      <button
                        onClick={handleAddAppointment}
                        disabled={addingAppointment || !appointmentDate || !appointmentTime}
                        className="px-3 py-1.5 text-sm bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50"
                      >
                        예약 추가
                      </button>
                    </div>
                  </div>
                )}

                {detail.appointments.length > 0 ? (
                  <div className="space-y-2">
                    {detail.appointments.map((apt) => (
                      <div
                        key={apt.id}
                        className="flex items-center justify-between p-2 bg-gray-50 rounded-lg text-sm"
                      >
                        <div>
                          <span className="font-medium">
                            {formatDateTime(apt.scheduled_at)}
                          </span>
                          {apt.notes && (
                            <span className="ml-2 text-gray-500">
                              {apt.notes}
                            </span>
                          )}
                        </div>
                        <span
                          className={`text-xs px-2 py-0.5 rounded ${
                            apt.status === "BOOKED"
                              ? "bg-purple-100 text-purple-700"
                              : apt.status === "DONE"
                              ? "bg-green-100 text-green-700"
                              : "bg-gray-100 text-gray-500"
                          }`}
                        >
                          {apt.status === "BOOKED"
                            ? "예약됨"
                            : apt.status === "DONE"
                            ? "완료"
                            : "취소"}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-gray-400">예약 내역 없음</p>
                )}
              </div>

              {/* 메모/상담기록 */}
              <div className="border-t pt-4">
                <h3 className="font-medium text-gray-900 mb-3 flex items-center gap-2">
                  <MessageSquare className="w-4 h-4" />
                  메모 / 상담기록
                </h3>

                {/* 메모 입력 */}
                <div className="flex gap-2 mb-4">
                  <input
                    type="text"
                    placeholder="메모를 입력하세요..."
                    value={newMemo}
                    onChange={(e) => setNewMemo(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        handleAddMemo();
                      }
                    }}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                  <button
                    onClick={handleAddMemo}
                    disabled={addingMemo || !newMemo.trim()}
                    className="px-4 py-2 bg-gray-800 text-white rounded-lg hover:bg-gray-900 disabled:opacity-50 transition-colors text-sm"
                  >
                    추가
                  </button>
                </div>

                {/* 메모 목록 */}
                {detail.interactions.length > 0 ? (
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {detail.interactions.map((interaction) => (
                      <div
                        key={interaction.id}
                        className="p-3 bg-gray-50 rounded-lg text-sm"
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs text-gray-500">
                            {formatDateTime(interaction.created_at)}
                          </span>
                          <span className="text-xs px-2 py-0.5 rounded bg-gray-200 text-gray-600">
                            {interaction.type}
                          </span>
                        </div>
                        <p className="text-gray-700 whitespace-pre-wrap">
                          {interaction.content}
                        </p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-gray-400">기록된 메모 없음</p>
                )}
              </div>
            </>
          ) : (
            <p className="text-gray-500">데이터를 불러올 수 없습니다.</p>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t bg-gray-50">
          <button
            onClick={() => onClose(hasChanges)}
            className="w-full py-2 text-gray-600 hover:bg-gray-200 rounded-lg transition-colors"
          >
            닫기
          </button>
        </div>
      </div>
    </div>
  );
}
