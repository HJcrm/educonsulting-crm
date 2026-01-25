import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { addInteraction } from "@/lib/queries/leads";

const AddInteractionSchema = z.object({
  content: z.string().min(1, "내용을 입력해주세요"),
  type: z.enum(["CALL", "KAKAO", "SMS", "MEETING", "MEMO"]).default("MEMO"),
});

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json();
    const parseResult = AddInteractionSchema.safeParse(body);

    if (!parseResult.success) {
      return NextResponse.json(
        { error: "Invalid request body", details: parseResult.error.flatten() },
        { status: 400 }
      );
    }

    const { content, type } = parseResult.data;
    const interaction = await addInteraction(params.id, content, type);

    if (!interaction) {
      return NextResponse.json(
        { error: "Failed to add interaction" },
        { status: 500 }
      );
    }

    return NextResponse.json(interaction, { status: 201 });
  } catch (error) {
    console.error("Add interaction error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
