import { NextRequest, NextResponse } from "next/server";
import { getLeads } from "@/lib/queries/leads";

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;

  const search = searchParams.get("search") || undefined;
  const page = parseInt(searchParams.get("page") || "1", 10);
  const pageSize = parseInt(searchParams.get("pageSize") || "20", 10);

  // 유효성 검사
  if (page < 1 || pageSize < 1 || pageSize > 100) {
    return NextResponse.json(
      { error: "Invalid pagination parameters" },
      { status: 400 }
    );
  }

  try {
    const result = await getLeads({ search, page, pageSize });
    return NextResponse.json(result);
  } catch (error) {
    console.error("Leads API error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
