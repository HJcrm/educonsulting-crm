"use client";

import { CLeadsTable } from "./CLeadsTable";
import { ToastProvider } from "@/app/db/components/Toast";

interface Props {
  initialSearch: string;
  initialPage: number;
}

export function CLeadsPageContent({ initialSearch, initialPage }: Props) {
  return (
    <ToastProvider>
      <CLeadsTable initialSearch={initialSearch} initialPage={initialPage} />
    </ToastProvider>
  );
}
