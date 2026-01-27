"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { LayoutList, LayoutGrid } from "lucide-react";
import { LeadsTable } from "./LeadsTable";
import { PipelineBoard } from "./PipelineBoard";
import { ToastProvider } from "./Toast";

interface Props {
  initialSearch: string;
  initialPage: number;
  initialView: "table" | "pipeline";
}

export function LeadsPageContent({ initialSearch, initialPage, initialView }: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [view, setView] = useState<"table" | "pipeline">(initialView);

  // URL에서 view 파라미터 동기화
  useEffect(() => {
    const urlView = searchParams.get("view");
    if (urlView === "table" || urlView === "pipeline") {
      setView(urlView);
    }
  }, [searchParams]);

  // view 변경 시 URL 업데이트
  const handleViewChange = (newView: "table" | "pipeline") => {
    setView(newView);
    const params = new URLSearchParams(searchParams.toString());
    params.set("view", newView);
    // 파이프라인에서는 페이지네이션 불필요
    if (newView === "pipeline") {
      params.delete("page");
    }
    router.replace(`/db?${params.toString()}`, { scroll: false });
  };

  return (
    <ToastProvider>
      <div className="space-y-4">
        {/* View Toggle */}
        <div className="flex justify-end">
          <div className="inline-flex rounded-lg border border-gray-300 bg-white p-1">
            <button
              onClick={() => handleViewChange("table")}
              className={`
                flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors
                ${
                  view === "table"
                    ? "bg-primary-600 text-white"
                    : "text-gray-600 hover:bg-gray-100"
                }
              `}
              aria-pressed={view === "table"}
            >
              <LayoutList className="w-4 h-4" />
              리스트
            </button>
            <button
              onClick={() => handleViewChange("pipeline")}
              className={`
                flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors
                ${
                  view === "pipeline"
                    ? "bg-primary-600 text-white"
                    : "text-gray-600 hover:bg-gray-100"
                }
              `}
              aria-pressed={view === "pipeline"}
            >
              <LayoutGrid className="w-4 h-4" />
              파이프라인
            </button>
          </div>
        </div>

        {/* Content */}
        {view === "table" ? (
          <LeadsTable initialSearch={initialSearch} initialPage={initialPage} />
        ) : (
          <PipelineBoard />
        )}
      </div>
    </ToastProvider>
  );
}
