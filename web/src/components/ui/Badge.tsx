import { type HTMLAttributes } from "react";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type BadgeVariant = "buy" | "sell" | "hold" | "verified" | "unverified" | "neutral";

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
  size?: "sm" | "md";
}

// ---------------------------------------------------------------------------
// Mapping
// ---------------------------------------------------------------------------

const variantClasses: Record<BadgeVariant, string> = {
  buy: "bg-success-50 text-success-700 border-success-200",
  sell: "bg-danger-50 text-danger-600 border-danger-200",
  hold: "bg-neutral-50 text-neutral-500 border-neutral-200",
  verified: "bg-success-50 text-success-600 border-success-200",
  unverified: "bg-neutral-50 text-neutral-400 border-neutral-200",
  neutral: "bg-cream-100 text-ink-500 border-border",
};

const sizeClasses: Record<"sm" | "md", string> = {
  sm: "px-2 py-0.5 text-2xs",
  md: "px-2.5 py-1 text-xs",
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function Badge({
  variant = "neutral",
  size = "md",
  className = "",
  children,
  ...rest
}: BadgeProps) {
  return (
    <span
      className={[
        "inline-flex items-center gap-1",
        "rounded-md border",
        "font-semibold uppercase tracking-wider",
        variantClasses[variant],
        sizeClasses[size],
        className,
      ].join(" ")}
      {...rest}
    >
      {variant === "verified" && <CheckIcon className="h-3 w-3" />}
      {children}
    </span>
  );
}

// ---------------------------------------------------------------------------
// Tiny check icon
// ---------------------------------------------------------------------------

function CheckIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 12 12" fill="none" aria-hidden="true">
      <path
        d="M2.5 6L5 8.5L9.5 3.5"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
