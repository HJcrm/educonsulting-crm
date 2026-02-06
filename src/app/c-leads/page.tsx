import { Suspense } from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { CLeadsPageContent } from "./components/CLeadsPageContent";

export const dynamic = "force-dynamic";

export default async function CLeadsPage({
  searchParams,
}: {
  searchParams: Promise<{
    search?: string;
    page?: string;
  }>;
}) {
  const params = await searchParams;
  const search = params.search || "";
  const page = parseInt(params.page || "1", 10);

  return (
    <main className="min-h-screen bg-gray-50 p-4 sm:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <Link
              href="/"
              className="p-2 hover:bg-gray-200 rounded-lg transition-colors"
            >
              <ArrowLeft className="w-5 h-5 text-gray-600" />
            </Link>
            <h1 className="text-2xl font-bold text-gray-800">C레벨 DB</h1>
          </div>
        </div>

        {/* Content */}
        <Suspense fallback={<PageSkeleton />}>
          <CLeadsPageContent initialSearch={search} initialPage={page} />
        </Suspense>
      </div>
    </main>
  );
}

function PageSkeleton() {
  return (
    <div className="bg-white rounded-xl shadow">
      <div className="p-4 border-b">
        <div className="h-10 w-64 bg-gray-200 rounded-lg animate-pulse" />
      </div>
      <div className="p-4 space-y-3">
        {Array.from({ length: 10 }).map((_, i) => (
          <div key={i} className="h-12 bg-gray-100 rounded animate-pulse" />
        ))}
      </div>
    </div>
  );
}
