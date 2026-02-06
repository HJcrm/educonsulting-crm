import { NextRequest, NextResponse } from "next/server";
import { getCLeadById, updateCLead } from "@/lib/queries/c-leads";

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/c-leads/[id]
 * 단일 C레벨 리드 조회 (메시지 이력 포함)
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  const { id } = await params;

  const lead = await getCLeadById(id);

  if (!lead) {
    return NextResponse.json(
      { error: "Lead not found" },
      { status: 404 }
    );
  }

  return NextResponse.json(lead);
}

/**
 * PATCH /api/c-leads/[id]
 * C레벨 리드 수정 (상태, 메모 등)
 */
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  const { id } = await params;

  try {
    const body = await request.json();
    const { status, notes, parent_name, parent_phone, student_grade, region, question_context } = body;

    const updates: Record<string, unknown> = {};
    if (status !== undefined) updates.status = status;
    if (notes !== undefined) updates.notes = notes;
    if (parent_name !== undefined) updates.parent_name = parent_name;
    if (parent_phone !== undefined) updates.parent_phone = parent_phone;
    if (student_grade !== undefined) updates.student_grade = student_grade;
    if (region !== undefined) updates.region = region;
    if (question_context !== undefined) updates.question_context = question_context;

    if (Object.keys(updates).length === 0) {
      return NextResponse.json(
        { error: "No updates provided" },
        { status: 400 }
      );
    }

    const lead = await updateCLead(id, updates);

    if (!lead) {
      return NextResponse.json(
        { error: "Failed to update lead" },
        { status: 500 }
      );
    }

    return NextResponse.json(lead);
  } catch (error) {
    console.error("Error updating c_lead:", error);
    return NextResponse.json(
      { error: "Invalid request body" },
      { status: 400 }
    );
  }
}
