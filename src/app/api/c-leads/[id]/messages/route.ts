import { NextRequest, NextResponse } from "next/server";
import { getCLeadMessages, createCLeadMessage, updateCLeadMessage, getCLeadById } from "@/lib/queries/c-leads";
import { sendMessage, getMessageType, normalizePhone } from "@/lib/solapi/client";
import type { MessageType } from "@/types/c-leads";

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/c-leads/[id]/messages
 * 메시지 이력 조회
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  const { id } = await params;

  const messages = await getCLeadMessages(id);

  return NextResponse.json(messages);
}

/**
 * POST /api/c-leads/[id]/messages
 * 메시지 발송 (Solapi API 연동)
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  const { id } = await params;

  try {
    const body = await request.json();
    const { content } = body;

    if (!content || typeof content !== "string" || !content.trim()) {
      return NextResponse.json(
        { error: "Message content is required" },
        { status: 400 }
      );
    }

    // 리드 정보 조회
    const lead = await getCLeadById(id);
    if (!lead) {
      return NextResponse.json(
        { error: "Lead not found" },
        { status: 404 }
      );
    }

    const recipientPhone = normalizePhone(lead.parent_phone);
    const messageType: MessageType = getMessageType(content.trim());

    // 1. 메시지 이력 생성 (PENDING 상태)
    const messageRecord = await createCLeadMessage({
      c_lead_id: id,
      message_type: messageType,
      recipient_phone: recipientPhone,
      content: content.trim(),
      status: "PENDING",
    });

    if (!messageRecord) {
      return NextResponse.json(
        { error: "Failed to create message record" },
        { status: 500 }
      );
    }

    // 2. Solapi API로 실제 발송
    const sendResult = await sendMessage(recipientPhone, content.trim());

    // 3. 발송 결과에 따라 상태 업데이트
    if (sendResult.success) {
      await updateCLeadMessage(messageRecord.id, {
        status: "SENT",
        external_message_id: sendResult.messageId,
        sent_at: new Date().toISOString(),
      });

      return NextResponse.json({
        success: true,
        messageId: messageRecord.id,
        externalMessageId: sendResult.messageId,
        messageType,
      });
    } else {
      await updateCLeadMessage(messageRecord.id, {
        status: "FAILED",
        error_message: sendResult.error,
      });

      return NextResponse.json(
        {
          success: false,
          messageId: messageRecord.id,
          error: sendResult.error,
        },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error("Error sending message:", error);
    return NextResponse.json(
      { error: "Failed to send message" },
      { status: 500 }
    );
  }
}
