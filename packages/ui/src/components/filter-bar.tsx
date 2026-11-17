import { cn } from "@doctor-tracker-app/ui/lib/utils";
import * as React from "react";

function FilterBar({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="filter-bar"
      role="search"
      className={cn(
        "grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-[1.35fr_1fr_1fr_0.85fr_0.85fr_auto] xl:items-end",
        className,
      )}
      {...props}
    />
  );
}

/**
 * A labeled slot inside a FilterBar. Owns the label→control association
 * (htmlFor/id) so list pages can't forget it.
 */
function FilterField({
  label,
  htmlFor,
  className,
  children,
  ...props
}: React.ComponentProps<"div"> & {
  label: string;
  htmlFor: string;
  children: React.ReactNode;
}) {
  return (
    <div
      data-slot="filter-field"
      className={cn("flex min-w-0 flex-col gap-1", className)}
      {...props}
    >
      <label
        htmlFor={htmlFor}
        className="text-muted-foreground text-[11px] font-semibold tracking-[0.08em] uppercase"
      >
        {label}
      </label>
      {children}
    </div>
  );
}

export { FilterBar, FilterField };
