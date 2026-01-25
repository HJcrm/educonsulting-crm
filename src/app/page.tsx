import Link from "next/link";
import { LayoutDashboard, Database } from "lucide-react";

export default function HomePage() {
  return (
    <main className="min-h-screen flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-lg p-8 sm:p-12 max-w-lg w-full">
        <h1 className="text-2xl sm:text-3xl font-bold text-center text-gray-800 mb-2">
          입시컨설팅 CRM
        </h1>
        <p className="text-gray-500 text-center mb-8">
          상담 리드 관리 시스템
        </p>

        <div className="flex flex-col sm:flex-row gap-4">
          <Link
            href="/dashboard"
            className="flex-1 flex items-center justify-center gap-3 bg-primary-600 hover:bg-primary-700 text-white font-semibold py-4 px-6 rounded-xl transition-colors"
          >
            <LayoutDashboard className="w-5 h-5" />
            대시보드
          </Link>

          <Link
            href="/db"
            className="flex-1 flex items-center justify-center gap-3 bg-gray-800 hover:bg-gray-900 text-white font-semibold py-4 px-6 rounded-xl transition-colors"
          >
            <Database className="w-5 h-5" />
            DB
          </Link>
        </div>
      </div>
    </main>
  );
}
