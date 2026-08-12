import { type ReactNode } from "react";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface TimelineStep {
  id: string;
  label: string;
  /** Rendered below the label as supporting detail. */
  detail?: ReactNode;
  status: "complete" | "current" | "pending" | "error";
}

interface TimelineProps {
  steps: TimelineStep[];
  className?: string;
}

// ---------------------------------------------------------------------------
// Status → styling
// ---------------------------------------------------------------------------

const statusStyles: Record<
  TimelineStep["status"],
  { dot: string; line: string; label: string }
> = {
  complete: {
    dot: "bg-success ring-success/20",
    line: "bg-success/30",
    label: "text-ink-700",
  },
  current: {
    dot: "bg-ember ring-ember/20",
    line: "bg-border-medium",
    label: "text-ink-800 font-semibold",
  },
  pending: {
    dot: "bg-neutral-300 ring-neutral-200/50",
    line: "bg-border-light",
    label: "text-neutral-400",
  },
  error: {
    dot: "bg-danger ring-danger/20",
    line: "bg-danger/20",
    label: "text-danger-600",
  },
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function Timeline({ steps, className = "" }: TimelineProps) {
  return (
    <div className={["relative", className].join(" ")} role="list">
      {steps.map((step, i) => {
        const isLast = i === steps.length - 1;
        const s = statusStyles[step.status];

        return (
          <div key={step.id} className="flex gap-4" role="listitem">
            {/* Left rail: dot + vertical line */}
            <div className="flex flex-col items-center shrink-0">
              {/* Dot */}
              <div
                className={[
                  "relative flex h-4 w-4 items-center justify-center rounded-full ring-2",
                  s.dot,
                ].join(" ")}
              >
                {step.status === "current" && (
                  <span className="absolute inset-0 rounded-full bg-ember/30 animate-pulse-soft" />
                )}
              </div>

              {/* Connecting line */}
              {!isLast && (
                <div
                  className={["w-px flex-1 min-h-[1.5rem]", s.line].join(" ")}
                />
              )}
            </div>

            {/* Right: content */}
            <div className={["pb-5", isLast && "pb-0"].join(" ")}>
              <p className={["text-sm leading-tight", s.label].join(" ")}>
                {step.label}
              </p>
              {step.detail && (
                <div className="mt-1 text-xs text-ink-400">{step.detail}</div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
