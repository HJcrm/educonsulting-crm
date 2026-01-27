import { Suspense } from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { LeadsPageContent } from "./components/LeadsPageContent";

export const dynamic = "force-dynamic";

export default function DBPage({
  searchParams,
}: {
  searchParams: {
    search?: string;
    page?: string;
    view?: "table" | "pipeline";
    assignee?: string;
    grade?: string;
    track?: string;
    dateRange?: string;
  };
}) {
  const search = searchParams.search || "";
  const page = parseInt(searchParams.page || "1", 10);
  const view = searchParams.view || "table";

  return (
    <main className="min-h-screen bg-gray-50 p-4 sm:p-6 lg:p-8">
      <div className={view === "pipeline" ? "max-w-full mx-auto" : "max-w-7xl mx-auto"}>
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <Link
              href="/"
              className="p-2 hover:bg-gray-200 rounded-lg transition-colors"
            >
              <ArrowLeft className="w-5 h-5 text-gray-600" />
            </Link>
            <h1 className="text-2xl font-bold text-gray-800">리드 DB</h1>
          </div>
        </div>

        {/* Content */}
        <Suspense fallback={<PageSkeleton />}>
          <LeadsPageContent
            initialSearch={search}
            initialPage={page}
            initialView={view as "table" | "pipeline"}
          />
        </Suspense>
      </div>
    </main>
  );
}

function PageSkeleton() {
  return (
    <div className="space-y-4">
      {/* View toggle skeleton */}
      <div className="flex justify-end">
        <div className="h-10 w-48 bg-gray-200 rounded-lg animate-pulse" />
      </div>

      {/* Content skeleton */}
      <div className="bg-white rounded-xl shadow">
        <div className="p-4 border-b">
          <div className="h-10 w-64 bg-gray-200 rounded-lg animate-pulse" />
        </div>
        <div className="p-4 space-y-3">
          {Array.from({ length: 10 }).map((_, i) => (
            <div
              key={i}
              className="h-12 bg-gray-100 rounded animate-pulse"
            />
          ))}
        </div>
      </div>
    </div>
  );
}
