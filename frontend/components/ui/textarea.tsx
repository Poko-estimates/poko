import { Field as FieldPrimitive } from "@base-ui/react/field"

import { cn } from "@/lib/utils"

/**
 * Multi-line input. Rendered through `Field.Control` rather than as a bare
 * `<textarea>` so it picks up the label association and validation state from
 * the surrounding `Field`, exactly as `Input` does.
 */
function Textarea({
  className,
  rows = 3,
  ...props
}: FieldPrimitive.Control.Props & { rows?: number }) {
  return (
    <FieldPrimitive.Control
      data-slot="textarea"
      render={<textarea rows={rows} />}
      className={cn(
        // resize-none: the drag handle lets a textarea be pulled outside its
        // container, and inside a dialog that breaks the layout. Content longer
        // than the visible rows scrolls instead, and maxLength caps it anyway.
        "w-full min-w-0 resize-none rounded-xl border border-input bg-muted/50 px-3.5 py-2.5 text-sm leading-relaxed text-foreground transition-[color,background-color,border-color,box-shadow] outline-none",
        "placeholder:text-muted-foreground/70 selection:bg-primary selection:text-primary-foreground",
        "hover:bg-muted focus-visible:border-ring focus-visible:bg-background focus-visible:ring-3 focus-visible:ring-ring/40",
        "disabled:pointer-events-none disabled:opacity-50",
        "data-[invalid]:border-destructive data-[invalid]:ring-3 data-[invalid]:ring-destructive/20",
        className
      )}
      {...props}
    />
  )
}

export { Textarea }
