import { AlertCircle } from "lucide-react"

/** Form-level failure, shown above the fields rather than against one input. */
function FormAlert({ children }: { children: React.ReactNode }) {
  return (
    <p
      role="alert"
      className="flex items-start gap-2 rounded-xl border border-destructive/25 bg-destructive/8 px-3 py-2.5 text-sm leading-relaxed text-destructive"
    >
      <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
      {children}
    </p>
  )
}

export { FormAlert }
