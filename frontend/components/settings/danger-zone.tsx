"use client"

import { useState, useTransition } from "react"
import { Trash2, UserX } from "lucide-react"

import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useToast } from "@/components/ui/toast"
import { deactivateAccount, deleteAccount } from "@/lib/account/actions"

/**
 * The two irreversible ones.
 *
 * Deactivating and deleting are deliberately different: the first closes the
 * door and keeps the data, the second removes it. Both succeed by redirecting,
 * so control only returns here on failure.
 */
function DangerZone({ email }: { email: string | null }) {
  return (
    <div className="flex flex-col divide-y divide-border">
      <DangerAction
        title="Deactivate account"
        body="You'll be signed out and won't be able to sign back in. Your issues and estimates are kept, and an administrator can restore access."
        confirmTitle="Deactivate your account?"
        confirmBody="You will be signed out immediately and locked out of signing in. Restoring access needs an administrator — you can't undo this yourself."
        confirmLabel="Deactivate"
        icon={<UserX className="size-4" aria-hidden="true" />}
        run={deactivateAccount}
      />

      <DangerAction
        title="Delete account"
        body="Removes your account, the issues you created, and every card played in them. This affects everyone who was at those tables."
        confirmTitle="Delete your account?"
        confirmBody="Your account, the issues you created and every card played in them will be removed for everyone at those tables. This cannot be undone."
        confirmLabel="Delete everything"
        icon={<Trash2 className="size-4" aria-hidden="true" />}
        // Typing the address is friction on purpose: it's the difference
        // between meaning to do this and having clicked one button too many.
        confirmPhrase={email}
        run={deleteAccount}
      />
    </div>
  )
}

function DangerAction({
  body,
  confirmBody,
  confirmLabel,
  confirmPhrase,
  confirmTitle,
  icon,
  run,
  title,
}: {
  body: string
  confirmBody: string
  confirmLabel: string
  /** When set, the action stays disabled until this is typed back exactly. */
  confirmPhrase?: string | null
  confirmTitle: string
  icon: React.ReactNode
  run: () => Promise<{ formError?: string }>
  title: string
}) {
  const toast = useToast()
  const [open, setOpen] = useState(false)
  const [pending, startTransition] = useTransition()
  const [typed, setTyped] = useState("")

  const ready = !confirmPhrase || typed.trim() === confirmPhrase

  function handleConfirm() {
    startTransition(async () => {
      // Success redirects, so anything returned here is a failure.
      const result = await run()

      setOpen(false)
      toast.add({
        type: "error",
        title: result?.formError ?? "That didn't work. Try again.",
      })
    })
  }

  return (
    <div className="flex flex-wrap items-start justify-between gap-4 py-4 first:pt-0 last:pb-0">
      <div className="min-w-0 flex-1">
        <h3 className="text-sm font-semibold text-primary">{title}</h3>
        <p className="mt-1 max-w-prose text-sm leading-relaxed text-muted-foreground">
          {body}
        </p>
      </div>

      <AlertDialog
        open={open}
        onOpenChange={(next) => {
          setOpen(next)
          if (!next) setTyped("")
        }}
      >
        <AlertDialogTrigger
          render={<Button type="button" variant="destructive" size="lg" />}
        >
          {icon}
          {title}
        </AlertDialogTrigger>

        <AlertDialogContent>
          <div className="flex flex-col gap-1.5">
            <AlertDialogTitle>{confirmTitle}</AlertDialogTitle>
            <AlertDialogDescription>{confirmBody}</AlertDialogDescription>
          </div>

          {confirmPhrase && (
            <label className="flex flex-col gap-2 text-sm font-medium text-primary">
              Type <span className="font-mono">{confirmPhrase}</span> to confirm
              <Input
                value={typed}
                onValueChange={setTyped}
                autoComplete="off"
                placeholder={confirmPhrase}
              />
            </label>
          )}

          <AlertDialogFooter>
            <Button
              type="button"
              variant="outline"
              size="lg"
              disabled={pending}
              onClick={() => setOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              size="lg"
              disabled={pending || !ready}
              onClick={handleConfirm}
            >
              {pending ? "Working…" : confirmLabel}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

export { DangerZone }
