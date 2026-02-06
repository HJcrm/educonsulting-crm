/**
 * Solapi SMS/LMS 발송 클라이언트
 * https://docs.solapi.com/
 */

import crypto from "crypto";

const SOLAPI_API_KEY = process.env.SOLAPI_API_KEY || "";
const SOLAPI_API_SECRET = process.env.SOLAPI_API_SECRET || "";
const SOLAPI_SENDER_PHONE = process.env.SOLAPI_SENDER_PHONE || "";

const SOLAPI_API_URL = "https://api.solapi.com";

interface SolapiMessageRequest {
  to: string;
  from: string;
  text: string;
  type?: "SMS" | "LMS";
}

interface SolapiSendResponse {
  groupId: string;
  messageId: string;
  statusCode: string;
  statusMessage: string;
  to: string;
  type: string;
  from: string;
}

interface SolapiError {
  errorCode: string;
  errorMessage: string;
}

export interface SendMessageResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

/**
 * 전화번호 정규화 (숫자만 추출)
 */
export function normalizePhone(phone: string): string {
  return phone.replace(/\D/g, "");
}

/**
 * Solapi API 서명 생성
 */
function generateSignature(): { signature: string; date: string; salt: string } {
  const date = new Date().toISOString();
  const salt = crypto.randomBytes(32).toString("hex");
  const signature = crypto
    .createHmac("sha256", SOLAPI_API_SECRET)
    .update(date + salt)
    .digest("hex");

  return { signature, date, salt };
}

/**
 * 메시지 타입 결정 (90자 기준)
 */
export function getMessageType(text: string): "SMS" | "LMS" {
  // 한글은 1자, 영문/숫자는 0.5자로 계산 (대략적인 기준)
  // Solapi는 byte 기준으로 SMS 90byte 제한
  const byteLength = Buffer.byteLength(text, "utf8");
  return byteLength > 90 ? "LMS" : "SMS";
}

/**
 * SMS/LMS 발송
 */
export async function sendMessage(
  to: string,
  text: string
): Promise<SendMessageResult> {
  // 환경변수 검증
  if (!SOLAPI_API_KEY || !SOLAPI_API_SECRET || !SOLAPI_SENDER_PHONE) {
    console.error("[Solapi] Missing environment variables");
    return {
      success: false,
      error: "Solapi 환경변수가 설정되지 않았습니다.",
    };
  }

  const normalizedTo = normalizePhone(to);
  const normalizedFrom = normalizePhone(SOLAPI_SENDER_PHONE);
  const messageType = getMessageType(text);

  const { signature, date, salt } = generateSignature();

  const messageRequest: SolapiMessageRequest = {
    to: normalizedTo,
    from: normalizedFrom,
    text,
    type: messageType,
  };

  try {
    console.log(`[Solapi] Sending ${messageType} to ${normalizedTo}`);

    const response = await fetch(`${SOLAPI_API_URL}/messages/v4/send`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `HMAC-SHA256 apiKey=${SOLAPI_API_KEY}, date=${date}, salt=${salt}, signature=${signature}`,
      },
      body: JSON.stringify({
        message: messageRequest,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      const errorData = data as SolapiError;
      console.error("[Solapi] API Error:", errorData);
      return {
        success: false,
        error: errorData.errorMessage || "메시지 발송에 실패했습니다.",
      };
    }

    const result = data as SolapiSendResponse;
    console.log(`[Solapi] Message sent: ${result.messageId}`);

    return {
      success: true,
      messageId: result.messageId,
    };
  } catch (error) {
    console.error("[Solapi] Network Error:", error);
    return {
      success: false,
      error: "네트워크 오류가 발생했습니다.",
    };
  }
}

/**
 * 문자 수 계산 (byte 기준, UI 표시용)
 */
export function getByteLength(text: string): number {
  return Buffer.byteLength(text, "utf8");
}
