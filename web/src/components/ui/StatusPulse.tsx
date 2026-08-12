// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type AgentStatus =
  | "idle"
  | "analyzing"
  | "committed"
  | "revealed"
  | "executed"
  | "error";

interface StatusPulseProps {
  status: AgentStatus;
  className?: string;
}

// ---------------------------------------------------------------------------
// Status config — label, color, animation
// ---------------------------------------------------------------------------

const statusConfig: Record<
  AgentStatus,
  { label: string; dotClass: string; ringClass: string }
> = {
  idle: {
    label: "Idle",
    dotClass: "bg-neutral-300",
    ringClass: "",
  },
  analyzing: {
    label: "Analyzing",
    dotClass: "bg-ember animate-pulse-soft",
    ringClass: "animate-ping absolute inset-0 rounded-full bg-ember/20",
  },
  committed: {
    label: "Decision Committed",
    dotClass: "bg-ember-400",
    ringClass: "",
  },
  revealed: {
    label: "Reasoning Revealed",
    dotClass: "bg-success-400",
    ringClass: "",
  },
  executed: {
    label: "Trade Executed",
    dotClass: "bg-success",
    ringClass: "",
  },
  error: {
    label: "Error",
    dotClass: "bg-danger",
    ringClass: "",
  },
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function StatusPulse({ status, className = "" }: StatusPulseProps) {
  const cfg = statusConfig[status];

  return (
    <div
      className={[
        "inline-flex items-center gap-2.5",
        "px-3 py-1.5 rounded-lg",
        "bg-cream-surface border border-border-light",
        "transition-colors duration-300",
        className,
      ].join(" ")}
      role="status"
      aria-label={cfg.label}
    >
      {/* Dot + optional ping ring */}
      <span className="relative flex h-2.5 w-2.5 shrink-0">
        {cfg.ringClass && <span className={cfg.ringClass} />}
        <span
          className={[
            "relative inline-flex h-2.5 w-2.5 rounded-full",
            cfg.dotClass,
            "transition-colors duration-300",
          ].join(" ")}
        />
      </span>

      {/* Label */}
      <span className="text-xs font-medium text-ink-600 tracking-tight">
        {cfg.label}
      </span>
    </div>
  );
}
