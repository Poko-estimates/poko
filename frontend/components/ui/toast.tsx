"use client"

import { Toast } from "@base-ui/react/toast"
import { CheckCircle2, Info, TriangleAlert, X } from "lucide-react"

import { cn } from "@/lib/utils"

/**
 * Top-centre toasts that dismiss themselves.
 *
 * Deliberately laid out as a plain flex column rather than the absolutely
 * positioned stack in Base UI's demo. That demo's markup exists to produce a
 * bottom-anchored "peek" effect where toasts slide under one another; we just
 * want two or three notices in a row, and normal flow gives that for a
 * fraction of the CSS.
 */

const toastIcons = {
  success: CheckCircle2,
  error: TriangleAlert,
  info: Info,
} as const

type ToastKind = keyof typeof toastIcons

function toastKindOf(type: string | undefined): ToastKind {
  return type && type in toastIcons ? (type as ToastKind) : "info"
}

/** Wraps the app so anything inside it can raise a toast. */
function ToastProvider({ children }: { children: React.ReactNode }) {
  return (
    // Five seconds, stated rather than inherited. Hovering or focusing the
    // viewport pauses the countdown, so a toast can't vanish mid-read.
    <Toast.Provider timeout={5000}>
      {children}
      <Toast.Portal>
        <Toast.Viewport className="fixed top-4 left-1/2 z-60 flex w-[min(26rem,calc(100vw-2rem))] -translate-x-1/2 flex-col gap-2">
          <ToastList />
        </Toast.Viewport>
      </Toast.Portal>
    </Toast.Provider>
  )
}

function ToastList() {
  const { toasts } = Toast.useToastManager()

  return toasts.map((toast) => {
    const kind = toastKindOf(toast.type)
    const Icon = toastIcons[kind]

    return (
      <Toast.Root
        key={toast.id}
        toast={toast}
        className={cn(
          "flex items-start gap-3 rounded-2xl border bg-card px-4 py-3 shadow-[0_25px_50px_-20px_rgba(20,33,61,0.45)]",
          "transition-[opacity,transform] duration-200 ease-out",
          // Enters and leaves upwards, the direction it came from.
          "data-ending-style:-translate-y-2 data-ending-style:opacity-0",
          "data-starting-style:-translate-y-2 data-starting-style:opacity-0",
          kind === "error" ? "border-destructive/40" : "border-border"
        )}
      >
        <Toast.Content className="flex min-w-0 flex-1 items-start gap-3">
          <Icon
            className={cn(
              "mt-0.5 size-4.5 shrink-0",
              kind === "success" && "text-success",
              kind === "error" && "text-destructive",
              kind === "info" && "text-secondary"
            )}
            aria-hidden="true"
          />
          <div className="flex min-w-0 flex-1 flex-col gap-0.5">
            <Toast.Title className="text-sm leading-snug font-semibold text-primary" />
            <Toast.Description className="text-xs leading-relaxed text-muted-foreground" />
          </div>
        </Toast.Content>

        <Toast.Close
          aria-label="Dismiss"
          className="-my-1 -mr-1.5 inline-flex size-8 shrink-0 cursor-pointer items-center justify-center rounded-lg text-muted-foreground transition-colors outline-none hover:bg-primary/5 hover:text-primary focus-visible:ring-3 focus-visible:ring-ring/50"
        >
          <X className="size-4" aria-hidden="true" />
        </Toast.Close>
      </Toast.Root>
    )
  })
}

/** Raise a toast from any client component below the provider. */
const useToast = Toast.useToastManager

export { ToastProvider, useToast }
export type { ToastKind }
