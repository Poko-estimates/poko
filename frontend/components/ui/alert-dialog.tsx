import { AlertDialog as AlertDialogPrimitive } from "@base-ui/react/alert-dialog"

import { cn } from "@/lib/utils"

/**
 * For choices that need an answer — the kind you shouldn't be able to dismiss
 * by clicking away. That is the difference from `Dialog`: an alert dialog has
 * no close affordance of its own, so every path out is a deliberate button.
 */
const AlertDialog = AlertDialogPrimitive.Root
const AlertDialogTrigger = AlertDialogPrimitive.Trigger
const AlertDialogClose = AlertDialogPrimitive.Close

function AlertDialogContent({
  className,
  ...props
}: AlertDialogPrimitive.Popup.Props) {
  return (
    <AlertDialogPrimitive.Portal>
      <AlertDialogPrimitive.Backdrop className="fixed inset-0 z-50 bg-primary/40 backdrop-blur-[3px] transition-opacity duration-200 data-ending-style:opacity-0 data-starting-style:opacity-0 supports-[-webkit-touch-callout:none]:absolute" />
      <AlertDialogPrimitive.Viewport className="fixed inset-0 z-50 flex items-center justify-center overflow-hidden p-4 sm:p-6">
        <AlertDialogPrimitive.Popup
          data-slot="alert-dialog-content"
          className={cn(
            "flex w-[min(26rem,100%)] max-h-full min-h-0 flex-col gap-4 overflow-hidden rounded-3xl border border-border bg-card p-6 text-card-foreground shadow-[0_45px_90px_-40px_rgba(20,33,61,0.55)] transition-[scale,opacity] duration-200 ease-out outline-none data-ending-style:scale-[0.98] data-ending-style:opacity-0 data-starting-style:scale-[0.98] data-starting-style:opacity-0",
            className
          )}
          {...props}
        />
      </AlertDialogPrimitive.Viewport>
    </AlertDialogPrimitive.Portal>
  )
}

function AlertDialogTitle({
  className,
  ...props
}: AlertDialogPrimitive.Title.Props) {
  return (
    <AlertDialogPrimitive.Title
      data-slot="alert-dialog-title"
      className={cn(
        "text-lg leading-tight font-semibold tracking-tight text-primary",
        className
      )}
      {...props}
    />
  )
}

function AlertDialogDescription({
  className,
  ...props
}: AlertDialogPrimitive.Description.Props) {
  return (
    <AlertDialogPrimitive.Description
      data-slot="alert-dialog-description"
      className={cn("text-sm leading-relaxed text-muted-foreground", className)}
      {...props}
    />
  )
}

function AlertDialogFooter({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="alert-dialog-footer"
      className={cn(
        "mt-1 flex flex-col-reverse gap-2 sm:flex-row sm:items-center sm:justify-end sm:gap-3",
        className
      )}
      {...props}
    />
  )
}

export {
  AlertDialog,
  AlertDialogClose,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogTitle,
  AlertDialogTrigger,
}
