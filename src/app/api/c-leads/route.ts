import { NextRequest, NextResponse } from "next/server";
import { getCLeads } from "@/lib/queries/c-leads";

/**
 * GET /api/c-leads
 * C레벨 리드 목록 조회
 */
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const search = searchParams.get("search") || undefined;
  const page = parseInt(searchParams.get("page") || "1", 10);
  const pageSize = parseInt(searchParams.get("pageSize") || "20", 10);
  const status = searchParams.get("status") || undefined;

  const result = await getCLeads({ search, page, pageSize, status });

  return NextResponse.json(result);
}
