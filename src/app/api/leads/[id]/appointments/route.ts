import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { addAppointment } from "@/lib/queries/leads";

const AddAppointmentSchema = z.object({
  scheduledAt: z.string().refine((val) => !isNaN(Date.parse(val)), {
    message: "유효한 날짜를 입력해주세요",
  }),
  notes: z.string().optional(),
});

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json();
    const parseResult = AddAppointmentSchema.safeParse(body);

    if (!parseResult.success) {
      return NextResponse.json(
        { error: "Invalid request body", details: parseResult.error.flatten() },
        { status: 400 }
      );
    }

    const { scheduledAt, notes } = parseResult.data;
    const appointment = await addAppointment(params.id, scheduledAt, notes);

    if (!appointment) {
      return NextResponse.json(
        { error: "Failed to add appointment" },
        { status: 500 }
      );
    }

    return NextResponse.json(appointment, { status: 201 });
  } catch (error) {
    console.error("Add appointment error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
