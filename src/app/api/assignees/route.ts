import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createServiceClient } from "@/lib/supabase/server";

const AddAssigneeSchema = z.object({
  name: z.string().min(1, "담당자 이름을 입력해주세요"),
});

/**
 * GET /api/assignees
 * 담당자 목록 조회
 */
export async function GET() {
  try {
    const supabase = createServiceClient();

    const { data, error } = await supabase
      .from("assignees")
      .select("*")
      .order("created_at", { ascending: true });

    if (error) {
      console.error("Error fetching assignees:", error);
      return NextResponse.json(
        { error: "Failed to fetch assignees" },
        { status: 500 }
      );
    }

    return NextResponse.json(data || []);
  } catch (error) {
    console.error("Get assignees error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/assignees
 * 담당자 추가
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parseResult = AddAssigneeSchema.safeParse(body);

    if (!parseResult.success) {
      return NextResponse.json(
        { error: "Invalid request body", details: parseResult.error.flatten() },
        { status: 400 }
      );
    }

    const { name } = parseResult.data;
    const supabase = createServiceClient();

    const { data, error } = await supabase
      .from("assignees")
      .insert({ name: name.trim() })
      .select()
      .single();

    if (error) {
      if (error.code === "23505") {
        return NextResponse.json(
          { error: "이미 존재하는 담당자입니다" },
          { status: 400 }
        );
      }
      console.error("Error adding assignee:", error);
      return NextResponse.json(
        { error: "Failed to add assignee" },
        { status: 500 }
      );
    }

    return NextResponse.json(data, { status: 201 });
  } catch (error) {
    console.error("Add assignee error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
