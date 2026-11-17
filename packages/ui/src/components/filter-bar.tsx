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
        "flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-end",
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
        className="text-muted-foreground text-xs font-medium"
      >
        {label}
      </label>
      {children}
    </div>
  );
}

export { FilterBar, FilterField };
