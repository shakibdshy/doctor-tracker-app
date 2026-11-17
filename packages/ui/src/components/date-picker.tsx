"use client";

import { Popover as PopoverPrimitive } from "@base-ui/react/popover";
import { cn } from "@doctor-tracker-app/ui/lib/utils";
import { CalendarIcon } from "lucide-react";
import * as React from "react";
import { DayPicker } from "react-day-picker";

const pad = (n: number) => String(n).padStart(2, "0");

/** Local-date ISO key — the wire format used by filters and dateOfBirth. */
const isoOf = (date: Date) =>
  `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;

const parseISO = (value: string) => {
  const [y, m, d] = value.split("-").map(Number);
  return new Date(y!, (m! - 1), d!, 12);
};

const displayFormatter = new Intl.DateTimeFormat("en-CA", {
  year: "numeric",
  month: "short",
  day: "2-digit",
  timeZone: "UTC",
});

export type DatePickerProps = {
  id?: string;
  /** YYYY-MM-DD, or empty/null for no selection. */
  value?: string | null;
  onChange: (value: string | null) => void;
  placeholder?: string;
  disabled?: boolean;
  "aria-invalid"?: boolean;
  /** Earliest selectable month (bounds the year dropdown). */
  startMonth?: Date;
  /** Latest selectable month (bounds the year dropdown). */
  endMonth?: Date;
  className?: string;
};

/**
 * Design-system date picker: an input-styled trigger opening a token-styled
 * calendar popover. Replaces native `type="date"` so the calendar matches the
 * theme instead of the browser chrome.
 */
function DatePicker({
  id,
  value,
  onChange,
  placeholder = "Pick a date",
  disabled,
  startMonth,
  endMonth,
  className,
  ...props
}: DatePickerProps) {
  const [open, setOpen] = React.useState(false);
  const selected = value ? parseISO(value) : undefined;
  const today = new Date();

  const commit = (next: string | null) => {
    onChange(next);
    setOpen(false);
  };

  return (
    <PopoverPrimitive.Root open={open} onOpenChange={setOpen}>
      <PopoverPrimitive.Trigger
        id={id}
        disabled={disabled}
        aria-invalid={props["aria-invalid"]}
        data-slot="date-picker-trigger"
        className={cn(
          "flex h-9 w-full min-w-0 items-center justify-between gap-2 rounded-lg border border-input bg-card px-3 py-1 text-sm shadow-xs transition-colors outline-none hover:bg-muted/40 focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/30 disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-60 aria-invalid:border-destructive aria-invalid:ring-2 aria-invalid:ring-destructive/20 dark:bg-input/20 dark:hover:bg-input/40 dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40",
          className,
        )}
      >
        {value ? (
          <span className="truncate font-mono text-[13px] tabular-nums">
            {displayFormatter.format(new Date(`${value}T00:00:00Z`))}
          </span>
        ) : (
          <span className="text-muted-foreground truncate">{placeholder}</span>
        )}
        <CalendarIcon aria-hidden className="text-muted-foreground size-4 shrink-0" />
      </PopoverPrimitive.Trigger>
      <PopoverPrimitive.Portal>
        <PopoverPrimitive.Positioner className="isolate z-50 outline-none" sideOffset={4} align="start">
          <PopoverPrimitive.Popup
            data-slot="date-picker-popup"
            className="bg-popover text-popover-foreground shadow-pop ring-foreground/8 w-68 rounded-lg p-3 ring-1 outline-none"
          >
            <DayPicker
              mode="single"
              selected={selected}
              onSelect={(date) => commit(date ? isoOf(date) : null)}
              captionLayout="dropdown"
              startMonth={startMonth}
              endMonth={endMonth}
              defaultMonth={selected ?? today}
              labels={{
                labelMonthDropdown: () => "Month",
                labelYearDropdown: () => "Year",
              }}
              components={{
                DayButton: ({ day, modifiers, style, ...dayProps }) => (
                  <button
                    {...dayProps}
                    style={style as React.CSSProperties}
                    aria-label={isoOf(day.date)}
                  />
                ),
              }}
              classNames={{
                root: "flex flex-col",
                months: "relative flex flex-col",
                month: "flex flex-col gap-2",
                month_caption: "flex h-7 items-center px-0.5",
                caption_label: "flex items-center gap-1 text-[13px] font-medium",
                dropdowns: "flex items-center gap-1",
                dropdown_root:
                  "relative flex h-7 items-center rounded-md px-2 hover:bg-muted/60 has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-ring/40",
                dropdown:
                  "absolute inset-0 size-full cursor-pointer appearance-none opacity-0 outline-none",
                chevron: "size-3.5 fill-current text-muted-foreground",
                nav: "absolute top-0 right-0.5 flex items-center gap-0.5",
                button_previous:
                  "flex size-7 items-center justify-center rounded-md text-muted-foreground hover:bg-muted/60 hover:text-foreground disabled:pointer-events-none disabled:opacity-40",
                button_next:
                  "flex size-7 items-center justify-center rounded-md text-muted-foreground hover:bg-muted/60 hover:text-foreground disabled:pointer-events-none disabled:opacity-40",
                month_grid: "w-full border-collapse",
                weekdays: "flex",
                weekday:
                  "text-muted-foreground flex h-8 flex-1 items-center justify-center text-[11px] font-semibold tracking-[0.08em] uppercase",
                weeks: "flex flex-col gap-0.5",
                week: "flex",
                day: "flex flex-1 items-center justify-center p-0",
                day_button:
                  "flex size-8 items-center justify-center rounded-md text-[13px] tabular-nums outline-none hover:bg-muted/60 focus-visible:ring-2 focus-visible:ring-ring/40",
                selected:
                  "rounded-md bg-primary text-primary-foreground [&:is(td)]:bg-transparent [&_button]:bg-primary [&_button]:text-primary-foreground",
                today:
                  "rounded-md ring-1 ring-ring/50 [&:is(td)]:ring-0 [&_button]:ring-1 [&_button]:ring-ring/50",
                outside: "text-muted-foreground/50 [&_button]:text-muted-foreground/50",
                disabled: "pointer-events-none opacity-40 [&_button]:opacity-40",
                hidden: "invisible",
              }}
            />
            <div className="border-border/70 mt-2 flex items-center justify-between border-t pt-2">
              <button
                type="button"
                disabled={!value}
                onClick={() => commit(null)}
                className="text-muted-foreground hover:text-foreground rounded-md px-2 py-1 text-[13px] font-medium transition-colors disabled:pointer-events-none disabled:opacity-40"
              >
                Clear
              </button>
              <button
                type="button"
                onClick={() => commit(isoOf(today))}
                className="text-primary rounded-md px-2 py-1 text-[13px] font-medium hover:underline"
              >
                Today
              </button>
            </div>
          </PopoverPrimitive.Popup>
        </PopoverPrimitive.Positioner>
      </PopoverPrimitive.Portal>
    </PopoverPrimitive.Root>
  );
}

export { DatePicker, isoOf };