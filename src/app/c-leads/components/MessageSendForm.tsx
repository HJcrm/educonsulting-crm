"use client";

import { useState } from "react";
import { Send, AlertCircle } from "lucide-react";
import { useToast } from "@/app/db/components/Toast";
import type { CLeadMessage } from "@/types/c-leads";

interface Props {
  leadId: string;
  recipientPhone: string;
  onMessageSent: (message: CLeadMessage) => void;
}

// SMS 90byte 기준
const SMS_BYTE_LIMIT = 90;

export function MessageSendForm({ leadId, recipientPhone, onMessageSent }: Props) {
  const { addToast } = useToast();
  const [content, setContent] = useState("");
  const [sending, setSending] = useState(false);

  // 바이트 수 계산 (한글 2byte, 영문/숫자 1byte 기준)
  const getByteLength = (text: string): number => {
    let byteLength = 0;
    for (let i = 0; i < text.length; i++) {
      const charCode = text.charCodeAt(i);
      // 한글: 2byte, 그 외: 1byte (간단한 계산)
      if (charCode > 127) {
        byteLength += 2;
      } else {
        byteLength += 1;
      }
    }
    return byteLength;
  };

  const byteLength = getByteLength(content);
  const isLMS = byteLength > SMS_BYTE_LIMIT;
  const messageType = isLMS ? "LMS" : "SMS";

  // 발송
  const handleSend = async () => {
    if (!content.trim()) {
      addToast("메시지 내용을 입력해주세요.", "error");
      return;
    }

    setSending(true);
    try {
      const res = await fetch(`/api/c-leads/${leadId}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: content.trim() }),
      });

      const result = await res.json();

      if (res.ok && result.success) {
        addToast(`${messageType} 발송 완료!`, "success");
        setContent("");

        // 발송된 메시지 정보 콜백
        const newMessage: CLeadMessage = {
          id: result.messageId,
          c_lead_id: leadId,
          created_at: new Date().toISOString(),
          message_type: result.messageType,
          recipient_phone: recipientPhone,
          content: content.trim(),
          status: "SENT",
          external_message_id: result.externalMessageId,
          error_message: null,
          sent_at: new Date().toISOString(),
        };
        onMessageSent(newMessage);
      } else {
        addToast(result.error || "발송에 실패했습니다.", "error");
      }
    } catch (error) {
      console.error("Failed to send message:", error);
      addToast("발송 중 오류가 발생했습니다.", "error");
    } finally {
      setSending(false);
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
    <div className="space-y-3">
      {/* 수신자 정보 */}
      <div className="text-sm text-gray-600">
        수신자: <span className="font-medium">{formatPhone(recipientPhone)}</span>
      </div>

      {/* 메시지 입력 */}
      <div className="relative">
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          rows={4}
          placeholder="메시지 내용을 입력하세요..."
          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 resize-none"
        />
      </div>

      {/* 글자수 / 타입 표시 */}
      <div className="flex items-center justify-between text-xs">
        <div className="flex items-center gap-2">
          <span
            className={`px-2 py-0.5 rounded font-medium ${
              isLMS
                ? "bg-orange-100 text-orange-700"
                : "bg-blue-100 text-blue-700"
            }`}
          >
            {messageType}
          </span>
          <span className="text-gray-500">
            {byteLength}byte {isLMS && "(90byte 초과)"}
          </span>
        </div>
        {isLMS && (
          <div className="flex items-center gap-1 text-orange-600">
            <AlertCircle className="w-3 h-3" />
            <span>LMS로 발송됩니다</span>
          </div>
        )}
      </div>

      {/* 발송 버튼 */}
      <div className="flex justify-end">
        <button
          onClick={handleSend}
          disabled={sending || !content.trim()}
          className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          <Send className="w-4 h-4" />
          {sending ? "발송 중..." : `${messageType} 발송`}
        </button>
      </div>
    </div>
  );
}
