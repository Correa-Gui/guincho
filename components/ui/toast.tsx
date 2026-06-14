"use client";

import * as React from "react";
import { Toast } from "@base-ui/react/toast";
import { CheckCircle2, XCircle, Info, XIcon } from "lucide-react";

import { cn } from "@/lib/utils";
import { toastManager } from "@/lib/toast";

const TOAST_ICON: Record<string, React.ReactNode> = {
  success: <CheckCircle2 className="size-4 text-pos" />,
  error: <XCircle className="size-4 text-neg" />,
  info: <Info className="size-4 text-primary" />,
};

function ToastList() {
  const { toasts } = Toast.useToastManager();

  return toasts.map((toast) => (
    <Toast.Root
      key={toast.id}
      toast={toast}
      className={cn(
        "absolute right-0 bottom-0 left-0 z-[calc(100-var(--toast-index))] mx-auto flex w-full items-start gap-2 rounded-xl border border-border bg-popover p-4 text-sm text-popover-foreground shadow-lg ring-1 ring-foreground/10 transition-all select-none",
        "data-[ending-style]:opacity-0 data-[starting-style]:opacity-0 data-[starting-style]:translate-y-1/2 data-[ending-style]:translate-y-1/2",
        "[transform:translateY(calc(var(--toast-offset-y)*-1))_scale(calc(1-0.05*var(--toast-index)))]",
      )}
    >
      <span className="mt-0.5 shrink-0">{TOAST_ICON[toast.type ?? "info"]}</span>
      <div className="flex flex-1 flex-col gap-0.5">
        {toast.title ? <Toast.Title className="font-medium" /> : null}
        {toast.description ? (
          <Toast.Description className="text-muted-foreground" />
        ) : null}
      </div>
      <Toast.Close className="shrink-0 rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground">
        <XIcon className="size-3.5" />
      </Toast.Close>
    </Toast.Root>
  ));
}

export function Toaster() {
  return (
    <Toast.Provider toastManager={toastManager}>
      <Toast.Portal>
        <Toast.Viewport className="fixed top-auto right-4 bottom-4 z-[100] mx-auto flex w-[min(calc(100vw-2rem),24rem)] sm:right-4">
          <ToastList />
        </Toast.Viewport>
      </Toast.Portal>
    </Toast.Provider>
  );
}
