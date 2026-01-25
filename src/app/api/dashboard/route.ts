import { NextRequest, NextResponse } from "next/server";
import { getDashboardData, type DateFilter } from "@/lib/queries/dashboard";

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const filter = (searchParams.get("filter") as DateFilter) || "7d";

  // 유효한 필터인지 확인
  if (!["7d", "30d", "all"].includes(filter)) {
    return NextResponse.json({ error: "Invalid filter" }, { status: 400 });
  }

  try {
    const data = await getDashboardData(filter);
    return NextResponse.json(data);
  } catch (error) {
    console.error("Dashboard API error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
