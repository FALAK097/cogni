"use client";

import * as React from "react";

import { cn } from "@/lib/utils";

/* oxlint-disable jsx-a11y/label-has-associated-control -- Callers provide htmlFor or wrap controls. */
function Label({ className, ...props }: React.ComponentProps<"label">) {
  return (
    // Association is supplied by each caller through htmlFor or by wrapping the control.
    // react-doctor-disable-next-line react-doctor/label-has-associated-control
    <label
      data-slot="label"
      className={cn(
        "flex items-center gap-2 text-sm leading-none font-medium select-none group-data-[disabled=true]:pointer-events-none group-data-[disabled=true]:opacity-50 peer-disabled:cursor-not-allowed peer-disabled:opacity-50",
        className,
      )}
      {...props}
    />
  );
}
/* oxlint-enable jsx-a11y/label-has-associated-control */

export { Label };
