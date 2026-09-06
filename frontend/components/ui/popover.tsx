import { Popover as PopoverPrimitive } from "@base-ui/react/popover"

import { cn } from "@/lib/utils"

const Popover = PopoverPrimitive.Root
const PopoverTrigger = PopoverPrimitive.Trigger
const PopoverClose = PopoverPrimitive.Close

/**
 * Portal, positioner and popup in one. Sits above dialogs so a popover opened
 * from inside one isn't clipped by its backdrop.
 */
function PopoverContent({
  align = "center",
  className,
  side = "bottom",
  sideOffset = 8,
  ...props
}: PopoverPrimitive.Popup.Props &
  Pick<PopoverPrimitive.Positioner.Props, "align" | "side" | "sideOffset">) {
  return (
    <PopoverPrimitive.Portal>
      <PopoverPrimitive.Positioner
        align={align}
        side={side}
        sideOffset={sideOffset}
        className="z-[60]"
      >
        <PopoverPrimitive.Popup
          data-slot="popover-content"
          className={cn(
            "origin-[var(--transform-origin)] rounded-2xl border border-border bg-popover p-3 text-popover-foreground shadow-[0_30px_60px_-30px_rgba(20,33,61,0.55)] transition-[scale,opacity] duration-150 ease-out outline-none data-ending-style:scale-[0.98] data-ending-style:opacity-0 data-starting-style:scale-[0.98] data-starting-style:opacity-0",
            className
          )}
          {...props}
        />
      </PopoverPrimitive.Positioner>
    </PopoverPrimitive.Portal>
  )
}

export { Popover, PopoverClose, PopoverContent, PopoverTrigger }
