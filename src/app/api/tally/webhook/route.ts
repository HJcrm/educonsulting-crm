import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createServiceClient } from "@/lib/supabase/server";
import type { LeadInsert } from "@/types/database";

/**
 * Tally Form Webhook Payload 스키마
 * Tally의 실제 payload 구조에 맞게 조정 필요
 */

const TallyOptionSchema = z.object({
  id: z.string(),
  text: z.string(),
});

const TallyFieldSchema = z.object({
  key: z.string(),
  label: z.string(),
  type: z.string(),
  value: z.union([z.string(), z.array(z.string()), z.null()]).optional(),
  options: z.array(TallyOptionSchema).optional(),
});

const TallyWebhookSchema = z.object({
  eventId: z.string(),
  eventType: z.string(),
  createdAt: z.string(),
  data: z.object({
    responseId: z.string(),
    submissionId: z.string(),
    respondentId: z.string().optional(),
    formId: z.string(),
    formName: z.string().optional(),
    createdAt: z.string(),
    fields: z.array(TallyFieldSchema),
  }),
});

type TallyWebhookPayload = z.infer<typeof TallyWebhookSchema>;
type TallyField = TallyWebhookPayload["data"]["fields"][0];

/**
 * Tally field.key → DB 컬럼 매핑 테이블
 * 폼이 변경되면 여기만 수정하면 됨
 */
const FIELD_KEY_MAPPING: Record<string, string> = {
  // 현재 Tally 폼의 field.key들
  "question_g01o6D": "parent_name",
  "question_y6Ra5X": "parent_phone",
  "question_XDkbPL": "student_grade",
  "question_8Kyl4z": "desired_track",
  "question_0xyWRB": "desired_timing",
  "question_zqo65M": "question_context",
};

/**
 * 라벨 키워드 → DB 컬럼 매핑 (fallback용)
 */
const LABEL_KEYWORD_MAPPING: Record<string, string[]> = {
  parent_name: ["성함", "이름", "학부모"],
  parent_phone: ["전화번호", "연락처", "phone"],
  student_grade: ["학년", "grade"],
  desired_track: ["희망계열", "계열", "track"],
  desired_timing: ["시간대", "상담 시기", "timing"],
  question_context: ["궁금", "문의", "question"],
  region: ["지역", "거주지", "region"],
};

/**
 * 선택형 필드(MULTIPLE_CHOICE, CHECKBOXES 등)의 옵션 ID를 실제 텍스트로 변환
 */
function resolveFieldValue(field: TallyField): string | null {
  if (!field.value) return null;

  const selectTypes = ["MULTIPLE_CHOICE", "CHECKBOXES", "DROPDOWN", "RANKING"];

  // 선택형 타입이고 options가 있는 경우: ID → text 변환
  if (selectTypes.includes(field.type) && field.options && Array.isArray(field.options)) {
    const values = Array.isArray(field.value) ? field.value : [field.value];
    const resolvedTexts = values
      .map((v) => {
        const option = field.options?.find((opt) => opt.id === v);
        return option?.text || v;
      })
      .filter(Boolean);
    return resolvedTexts.length > 0 ? resolvedTexts.join(", ") : null;
  }

  // 일반 텍스트 필드
  const val = Array.isArray(field.value) ? field.value.join(", ") : field.value;
  return val?.trim() || null;
}

/**
 * field.key 기반으로 필드 값 추출 (1순위: key 매핑, 2순위: 라벨 fallback)
 */
function getFieldByColumn(
  fields: TallyField[],
  columnName: string
): string | null {
  // 1순위: field.key 매핑으로 찾기
  for (const [fieldKey, dbColumn] of Object.entries(FIELD_KEY_MAPPING)) {
    if (dbColumn === columnName) {
      const field = fields.find((f) => f.key === fieldKey);
      if (field && field.value) {
        return resolveFieldValue(field);
      }
    }
  }

  // 2순위: 라벨 키워드 fallback
  const keywords = LABEL_KEYWORD_MAPPING[columnName];
  if (keywords) {
    for (const keyword of keywords) {
      const field = fields.find(
        (f) =>
          f.label.toLowerCase().includes(keyword.toLowerCase()) ||
          f.key.toLowerCase().includes(keyword.toLowerCase())
      );
      if (field && field.value) {
        return resolveFieldValue(field);
      }
    }
  }

  return null;
}

/**
 * 하위 호환성을 위한 기존 getFieldValue 유지 (UTM 등에서 사용)
 */
function getFieldValue(
  fields: TallyField[],
  ...keys: string[]
): string | null {
  for (const key of keys) {
    const field = fields.find(
      (f) =>
        f.label.toLowerCase().includes(key.toLowerCase()) ||
        f.key.toLowerCase().includes(key.toLowerCase())
    );
    if (field && field.value) {
      return resolveFieldValue(field);
    }
  }
  return null;
}

/**
 * URL에서 UTM 파라미터 추출
 */
function extractUtmParams(fields: TallyWebhookPayload["data"]["fields"]): {
  utm_source: string | null;
  utm_medium: string | null;
  utm_campaign: string | null;
  utm_term: string | null;
  utm_content: string | null;
} {
  return {
    utm_source: getFieldValue(fields, "utm_source"),
    utm_medium: getFieldValue(fields, "utm_medium"),
    utm_campaign: getFieldValue(fields, "utm_campaign"),
    utm_term: getFieldValue(fields, "utm_term"),
    utm_content: getFieldValue(fields, "utm_content"),
  };
}

/**
 * 전화번호 정규화
 */
function normalizePhone(phone: string | null): string {
  if (!phone) return "";
  // 숫자만 추출
  const digits = phone.replace(/\D/g, "");
  // 한국 전화번호 포맷팅
  if (digits.length === 11) {
    return `${digits.slice(0, 3)}-${digits.slice(3, 7)}-${digits.slice(7)}`;
  }
  if (digits.length === 10) {
    return `${digits.slice(0, 3)}-${digits.slice(3, 6)}-${digits.slice(6)}`;
  }
  return phone;
}

/**
 * POST /api/tally/webhook
 * Tally Form 제출 시 호출되는 웹훅 엔드포인트
 */
export async function POST(request: NextRequest) {
  try {
    // 1. Body를 단 한 번만 읽음 (재사용)
    const rawPayload = await request.json();
    console.log("[Tally Webhook] Received payload:", JSON.stringify(rawPayload, null, 2));

    // 2. 웹훅 시크릿 검증
    const webhookSecret = process.env.TALLY_WEBHOOK_SECRET;
    if (webhookSecret) {
      const authHeader = request.headers.get("authorization");
      const providedSecret =
        authHeader?.replace("Bearer ", "") ||
        request.headers.get("x-tally-signature");

      if (providedSecret !== webhookSecret) {
        console.error("[Tally Webhook] Invalid webhook secret");
        return NextResponse.json(
          { error: "Unauthorized" },
          { status: 401 }
        );
      }
    }

    // 3. Payload 스키마 검증
    const parseResult = TallyWebhookSchema.safeParse(rawPayload);
    if (!parseResult.success) {
      console.error("[Tally Webhook] Validation error:", parseResult.error);
      return NextResponse.json(
        { error: "Invalid payload", details: parseResult.error.flatten() },
        { status: 400 }
      );
    }

    const payload = parseResult.data;
    const { fields } = payload.data;

    // 4. 필드 값 추출 (field.key 기반 매핑 + 라벨 fallback)
    const parentName = getFieldByColumn(fields, "parent_name");
    const parentPhone = getFieldByColumn(fields, "parent_phone");
    const studentGrade = getFieldByColumn(fields, "student_grade");
    const desiredTrack = getFieldByColumn(fields, "desired_track");
    const desiredTiming = getFieldByColumn(fields, "desired_timing");
    const questionContext = getFieldByColumn(fields, "question_context");
    const region = getFieldByColumn(fields, "region");

    // 디버깅: 추출된 값 로깅 (선택형은 text로 변환됨)
    console.log("[Tally Webhook] Extracted values:", {
      parentName,
      parentPhone,
      studentGrade,      // "고3" (UUID가 아닌 텍스트)
      desiredTrack,      // "이과계열"
      desiredTiming,     // "오후 3시~6시"
      questionContext,
      region,
    });

    // 필수 필드 검증
    if (!parentName || !parentPhone) {
      console.error("[Tally Webhook] Missing required fields");
      return NextResponse.json(
        { error: "Missing required fields: parent_name, parent_phone" },
        { status: 400 }
      );
    }

    // 5. UTM 파라미터 추출
    const utmParams = extractUtmParams(fields);

    // 6. Supabase에 저장
    const supabase = createServiceClient();
    const normalizedPhone = normalizePhone(parentPhone);

    // 6-1. 기존 리드 검색 (전화번호 기준)
    const { data: existingLead } = await (supabase as any)
      .from("leads")
      .select("id, parent_name")
      .eq("parent_phone", normalizedPhone)
      .order("created_at", { ascending: false })
      .limit(1)
      .single();

    if (existingLead) {
      // 재문의: 기존 리드 업데이트 + interaction 추가
      console.log("[Tally Webhook] Returning customer found:", existingLead.id);

      // 기존 리드 업데이트 (stage를 NEW로 리셋, updated_at 갱신)
      const { error: updateError } = await (supabase as any)
        .from("leads")
        .update({
          stage: "NEW",
          updated_at: new Date().toISOString(),
          // 새 문의 정보로 업데이트
          student_grade: studentGrade || undefined,
          desired_track: desiredTrack || undefined,
          desired_timing: desiredTiming || undefined,
          question_context: questionContext || undefined,
        })
        .eq("id", existingLead.id);

      if (updateError) {
        console.error("[Tally Webhook] Update error:", updateError);
      }

      // 새 문의 내용을 interaction으로 저장
      const interactionContent = `[재문의]\n` +
        `문의 내용: ${questionContext || "(없음)"}\n` +
        `학년: ${studentGrade || "(없음)"}\n` +
        `희망계열: ${desiredTrack || "(없음)"}\n` +
        `상담희망시간: ${desiredTiming || "(없음)"}`;

      await (supabase as any)
        .from("interactions")
        .insert({
          lead_id: existingLead.id,
          type: "MEMO",
          content: interactionContent,
        });

      return NextResponse.json({
        success: true,
        leadId: existingLead.id,
        isReturning: true,
        message: "Returning customer updated",
      });
    }

    // 6-2. 신규 리드 생성
    const leadData: LeadInsert = {
      source: "tally",
      form_submission_id: payload.data.submissionId,
      parent_name: parentName,
      parent_phone: normalizedPhone,
      student_grade: studentGrade,
      desired_track: desiredTrack,
      region: region,
      desired_timing: desiredTiming,
      question_context: questionContext,
      stage: "NEW",
      ...utmParams,
      raw_payload: rawPayload as Record<string, unknown>,
    };

    const { data, error } = await (supabase as any)
      .from("leads")
      .upsert(leadData, {
        onConflict: "form_submission_id",
        ignoreDuplicates: true,
      })
      .select()
      .single();

    if (error) {
      // 중복 에러는 성공으로 처리 (이미 존재하는 리드)
      if (error.code === "23505") {
        console.log("[Tally Webhook] Duplicate submission ignored:", payload.data.submissionId);
        return NextResponse.json({
          success: true,
          message: "Duplicate submission ignored",
        });
      }
      console.error("[Tally Webhook] Database error:", error);
      return NextResponse.json(
        { error: "Database error", details: error.message },
        { status: 500 }
      );
    }

    console.log("[Tally Webhook] New lead created:", data?.id);
    return NextResponse.json({
      success: true,
      leadId: data?.id,
      isReturning: false,
    });
  } catch (error) {
    console.error("[Tally Webhook] Unexpected error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * GET /api/tally/webhook
 * 웹훅 상태 확인용
 */
export async function GET() {
  return NextResponse.json({
    status: "ok",
    endpoint: "/api/tally/webhook",
    method: "POST",
  });
}
