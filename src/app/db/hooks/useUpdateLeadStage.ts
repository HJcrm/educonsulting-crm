"use client";

import { useState, useCallback } from "react";
import { Lead, LeadStage } from "@/types/database";

interface UseUpdateLeadStageOptions {
  onSuccess?: (lead: Lead) => void;
  onError?: (error: Error) => void;
}

interface UpdateLeadStageResult {
  updateStage: (leadId: string, newStage: LeadStage) => Promise<boolean>;
  isUpdating: boolean;
  error: string | null;
}

export function useUpdateLeadStage(
  options: UseUpdateLeadStageOptions = {}
): UpdateLeadStageResult {
  const [isUpdating, setIsUpdating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const updateStage = useCallback(
    async (leadId: string, newStage: LeadStage): Promise<boolean> => {
      setIsUpdating(true);
      setError(null);

      try {
        const res = await fetch(`/api/leads/${leadId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ stage: newStage }),
        });

        if (!res.ok) {
          throw new Error("단계 변경에 실패했습니다.");
        }

        const updatedLead = await res.json();
        options.onSuccess?.(updatedLead);
        return true;
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : "단계 변경에 실패했습니다.";
        setError(errorMessage);
        options.onError?.(err instanceof Error ? err : new Error(errorMessage));
        return false;
      } finally {
        setIsUpdating(false);
      }
    },
    [options]
  );

  return { updateStage, isUpdating, error };
}

// Toast 컨텍스트 (간단 구현)
export interface Toast {
  id: string;
  message: string;
  type: "success" | "error" | "info";
}

export function createToast(
  message: string,
  type: Toast["type"] = "info"
): Toast {
  return {
    id: Math.random().toString(36).substring(7),
    message,
    type,
  };
}
