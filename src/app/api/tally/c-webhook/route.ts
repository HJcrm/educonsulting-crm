import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createServiceClient } from "@/lib/supabase/server";
import type { CLeadInsert } from "@/types/c-leads";

/**
 * Tally Form Webhook Payload 스키마
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
 * C레벨 Tally field.key → DB 컬럼 매핑 테이블
 * 폼이 변경되면 여기만 수정하면 됨
 */
const FIELD_KEY_MAPPING: Record<string, string> = {
  // C레벨 Tally 폼의 field.key들 (실제 폼에 맞게 수정 필요)
  // 예시:
  // "question_abc123": "parent_name",
  // "question_def456": "parent_phone",
};

/**
 * 라벨 키워드 → DB 컬럼 매핑 (fallback용)
 */
const LABEL_KEYWORD_MAPPING: Record<string, string[]> = {
  parent_name: ["성함", "이름", "학부모"],
  parent_phone: ["전화번호", "연락처", "phone"],
  student_grade: ["학년", "grade"],
  desired_track: ["희망계열", "계열", "track"],
  region: ["지역", "거주지", "region"],
  question_context: ["궁금", "문의", "question", "내용"],
};

/**
 * 선택형 필드(MULTIPLE_CHOICE, CHECKBOXES 등)의 옵션 ID를 실제 텍스트로 변환
 */
function resolveFieldValue(field: TallyField): string | null {
  if (!field.value) return null;

  const selectTypes = ["MULTIPLE_CHOICE", "CHECKBOXES", "DROPDOWN", "RANKING"];

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

  const val = Array.isArray(field.value) ? field.value.join(", ") : field.value;
  return val?.trim() || null;
}

/**
 * field.key 기반으로 필드 값 추출
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
 * UTM 파라미터 추출
 */
function extractUtmParams(fields: TallyField[]): {
  utm_source: string | null;
  utm_medium: string | null;
  utm_campaign: string | null;
} {
  const getFieldValue = (keys: string[]): string | null => {
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
  };

  return {
    utm_source: getFieldValue(["utm_source"]),
    utm_medium: getFieldValue(["utm_medium"]),
    utm_campaign: getFieldValue(["utm_campaign"]),
  };
}

/**
 * 전화번호 정규화
 */
function normalizePhone(phone: string | null): string {
  if (!phone) return "";
  const digits = phone.replace(/\D/g, "");
  if (digits.length === 11) {
    return `${digits.slice(0, 3)}-${digits.slice(3, 7)}-${digits.slice(7)}`;
  }
  if (digits.length === 10) {
    return `${digits.slice(0, 3)}-${digits.slice(3, 6)}-${digits.slice(6)}`;
  }
  return phone;
}

/**
 * POST /api/tally/c-webhook
 * C레벨 Tally Form 제출 시 호출되는 웹훅 엔드포인트
 */
export async function POST(request: NextRequest) {
  try {
    const rawPayload = await request.json();
    console.log("[C-Tally Webhook] Received payload:", JSON.stringify(rawPayload, null, 2));

    // 웹훅 시크릿 검증
    const webhookSecret = process.env.TALLY_C_WEBHOOK_SECRET;
    if (webhookSecret) {
      const authHeader = request.headers.get("authorization");
      const providedSecret =
        authHeader?.replace("Bearer ", "") ||
        request.headers.get("x-tally-signature");

      if (providedSecret !== webhookSecret) {
        console.error("[C-Tally Webhook] Invalid webhook secret");
        return NextResponse.json(
          { error: "Unauthorized" },
          { status: 401 }
        );
      }
    }

    // Payload 스키마 검증
    const parseResult = TallyWebhookSchema.safeParse(rawPayload);
    if (!parseResult.success) {
      console.error("[C-Tally Webhook] Validation error:", parseResult.error);
      return NextResponse.json(
        { error: "Invalid payload", details: parseResult.error.flatten() },
        { status: 400 }
      );
    }

    const payload = parseResult.data;
    const { fields } = payload.data;

    // 필드 값 추출
    const parentName = getFieldByColumn(fields, "parent_name");
    const parentPhone = getFieldByColumn(fields, "parent_phone");
    const studentGrade = getFieldByColumn(fields, "student_grade");
    const desiredTrack = getFieldByColumn(fields, "desired_track");
    const region = getFieldByColumn(fields, "region");
    const questionContext = getFieldByColumn(fields, "question_context");

    console.log("[C-Tally Webhook] Extracted values:", {
      parentName,
      parentPhone,
      studentGrade,
      desiredTrack,
      region,
      questionContext,
    });

    // 필수 필드 검증
    if (!parentName || !parentPhone) {
      console.error("[C-Tally Webhook] Missing required fields");
      return NextResponse.json(
        { error: "Missing required fields: parent_name, parent_phone" },
        { status: 400 }
      );
    }

    // UTM 파라미터 추출
    const utmParams = extractUtmParams(fields);

    // Supabase에 저장
    const supabase = createServiceClient();
    const normalizedPhone = normalizePhone(parentPhone);

    const leadData: CLeadInsert = {
      source: "tally",
      form_submission_id: payload.data.submissionId,
      parent_name: parentName,
      parent_phone: normalizedPhone,
      student_grade: studentGrade,
      desired_track: desiredTrack,
      region: region,
      question_context: questionContext,
      status: "ACTIVE",
      ...utmParams,
      raw_payload: rawPayload as Record<string, unknown>,
    };

    const { data, error } = await supabase
      .from("c_leads")
      .upsert(leadData, {
        onConflict: "form_submission_id",
        ignoreDuplicates: true,
      })
      .select()
      .single();

    if (error) {
      // 중복 에러는 성공으로 처리
      if (error.code === "23505") {
        console.log("[C-Tally Webhook] Duplicate submission ignored:", payload.data.submissionId);
        return NextResponse.json({
          success: true,
          message: "Duplicate submission ignored",
        });
      }
      console.error("[C-Tally Webhook] Database error:", error);
      return NextResponse.json(
        { error: "Database error", details: error.message },
        { status: 500 }
      );
    }

    console.log("[C-Tally Webhook] C-Lead created:", data?.id);
    return NextResponse.json({
      success: true,
      leadId: data?.id,
    });
  } catch (error) {
    console.error("[C-Tally Webhook] Unexpected error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * GET /api/tally/c-webhook
 * 웹훅 상태 확인용
 */
export async function GET() {
  return NextResponse.json({
    status: "ok",
    endpoint: "/api/tally/c-webhook",
    method: "POST",
  });
}
