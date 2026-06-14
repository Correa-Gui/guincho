"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { toastManager } from "@/lib/toast";
import { useModalClose } from "@/lib/modal-context";

export type FormFeedbackState = { error?: string; success?: boolean };

/**
 * Shows a success/error toast after a server action runs. On success, closes
 * the surrounding modal (if any) or falls back to `redirectTo` for direct
 * (non-modal) page access, then refreshes the route to pick up new data.
 */
export function useFormFeedback<State extends FormFeedbackState>(
  state: State,
  { successMessage, redirectTo }: { successMessage: string; redirectTo?: string },
) {
  const router = useRouter();
  const closeModal = useModalClose();

  useEffect(() => {
    if (state.success) {
      toastManager.add({ title: successMessage, type: "success" });
      if (closeModal) {
        closeModal();
      } else if (redirectTo) {
        router.push(redirectTo);
      }
      router.refresh();
    } else if (state.error) {
      toastManager.add({ title: state.error, type: "error" });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);
}
