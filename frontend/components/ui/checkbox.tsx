import { Checkbox as CheckboxPrimitive } from "@base-ui/react/checkbox"
import { Check } from "lucide-react"

import { cn } from "@/lib/utils"

/**
 * A square checkbox, styled to match `Input` and the radio in the issue
 * dialog. Base UI renders a button plus a hidden input, so it takes part in a
 * form the way a native checkbox does.
 */
function Checkbox({ className, ...props }: CheckboxPrimitive.Root.Props) {
  return (
    <CheckboxPrimitive.Root
      data-slot="checkbox"
      className={cn(
        "flex size-5 shrink-0 cursor-pointer items-center justify-center rounded-md border border-input bg-card transition-colors outline-none",
        "hover:border-secondary/60 focus-visible:ring-3 focus-visible:ring-ring/50",
        "data-checked:border-secondary data-checked:bg-secondary",
        "data-disabled:pointer-events-none data-disabled:opacity-50",
        className
      )}
      {...props}
    >
      <CheckboxPrimitive.Indicator className="flex data-unchecked:hidden">
        <Check className="size-3.5 text-primary" aria-hidden="true" />
      </CheckboxPrimitive.Indicator>
    </CheckboxPrimitive.Root>
  )
}

export { Checkbox }
