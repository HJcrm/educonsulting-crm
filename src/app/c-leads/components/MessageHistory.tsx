"use client";

import { History, CheckCircle, XCircle, Clock } from "lucide-react";
import {
  MESSAGE_STATUS_LABELS,
  MESSAGE_STATUS_COLORS,
  type CLeadMessage,
  type MessageStatus,
} from "@/types/c-leads";

interface Props {
  messages: CLeadMessage[];
}

function formatDateTime(dateString: string): string {
  const date = new Date(dateString);
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const dd = String(date.getDate()).padStart(2, "0");
  const hh = String(date.getHours()).padStart(2, "0");
  const min = String(date.getMinutes()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd} ${hh}:${min}`;
}

export function MessageHistory({ messages }: Props) {
  const getStatusIcon = (status: MessageStatus) => {
    switch (status) {
      case "SENT":
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case "FAILED":
        return <XCircle className="w-4 h-4 text-red-500" />;
      default:
        return <Clock className="w-4 h-4 text-yellow-500" />;
    }
  };

  return (
    <div>
      <h4 className="text-sm font-medium text-gray-700 mb-3 flex items-center gap-2">
        <History className="w-4 h-4" />
        발송 이력
        {messages.length > 0 && (
          <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">
            {messages.length}건
          </span>
        )}
      </h4>

      {messages.length === 0 ? (
        <p className="text-sm text-gray-400">발송 이력이 없습니다.</p>
      ) : (
        <div className="space-y-2 max-h-64 overflow-y-auto">
          {messages.map((message) => (
            <div
              key={message.id}
              className="p-3 bg-gray-50 rounded-lg text-sm border border-gray-100"
            >
              {/* 헤더 */}
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  {getStatusIcon(message.status as MessageStatus)}
                  <span
                    className={`px-2 py-0.5 rounded text-xs font-medium ${
                      MESSAGE_STATUS_COLORS[message.status as MessageStatus]
                    }`}
                  >
                    {MESSAGE_STATUS_LABELS[message.status as MessageStatus]}
                  </span>
                  <span
                    className={`px-2 py-0.5 rounded text-xs ${
                      message.message_type === "LMS"
                        ? "bg-orange-100 text-orange-700"
                        : "bg-blue-100 text-blue-700"
                    }`}
                  >
                    {message.message_type}
                  </span>
                </div>
                <span className="text-xs text-gray-500">
                  {formatDateTime(message.sent_at || message.created_at)}
                </span>
              </div>

              {/* 내용 */}
              <p className="text-gray-700 whitespace-pre-wrap break-words">
                {message.content}
              </p>

              {/* 에러 메시지 */}
              {message.status === "FAILED" && message.error_message && (
                <div className="mt-2 p-2 bg-red-50 rounded text-xs text-red-600">
                  {message.error_message}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
