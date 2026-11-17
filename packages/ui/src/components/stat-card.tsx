import { Card } from "@doctor-tracker-app/ui/components/card";
import { cn } from "@doctor-tracker-app/ui/lib/utils";
import type * as React from "react";

export type StatCardProps = {
  /** What the number counts (e.g. "Total doctors"). */
  label: string;
  /** The headline number, pre-formatted. */
  value: React.ReactNode;
  /** Optional context line under the value (e.g. "+12 this month"). */
  hint?: React.ReactNode;
  icon?: React.ComponentType;
  className?: string;
};

/** KPI tile for the dashboard: label, display-scale value, optional context. */
function StatCard({ label, value, hint, icon: Icon, className }: StatCardProps) {
  return (
    <Card data-slot="stat-card" className={cn("gap-1 py-4", className)}>
      <div
        data-slot="stat-card-header"
        className="flex items-center justify-between gap-2 px-4"
      >
        <p className="text-muted-foreground text-xs font-medium">{label}</p>
        {Icon ? (
          <span className="bg-secondary text-secondary-foreground flex size-8 items-center justify-center rounded-lg [&_svg:not([class*='size-'])]:size-4">
            <Icon aria-hidden />
          </span>
        ) : null}
      </div>
      <div data-slot="stat-card-body" className="px-4">
        <p className="font-display text-3xl leading-none font-semibold tabular-nums">
          {value}
        </p>
        {hint ? <p className="text-muted-foreground mt-1.5 text-xs">{hint}</p> : null}
      </div>
    </Card>
  );
}

export { StatCard };
