import { Suspense } from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { DashboardContent } from "./components/DashboardContent";

export const dynamic = "force-dynamic";

export default function DashboardPage({
  searchParams,
}: {
  searchParams: { filter?: string };
}) {
  const filter = (searchParams.filter as "7d" | "30d" | "all") || "7d";

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
            <h1 className="text-2xl font-bold text-gray-800">대시보드</h1>
          </div>
        </div>

        {/* Dashboard Content */}
        <Suspense fallback={<DashboardSkeleton />}>
          <DashboardContent initialFilter={filter} />
        </Suspense>
      </div>
    </main>
  );
}

function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      {/* Filter skeleton */}
      <div className="flex gap-2">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="h-10 w-20 bg-gray-200 rounded-lg animate-pulse"
          />
        ))}
      </div>

      {/* Cards skeleton */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className="bg-white rounded-xl shadow p-6 h-40 animate-pulse"
          >
            <div className="h-4 bg-gray-200 rounded w-1/2 mb-4" />
            <div className="h-8 bg-gray-200 rounded w-3/4" />
          </div>
        ))}
      </div>
    </div>
  );
}
