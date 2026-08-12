import { forwardRef, type ButtonHTMLAttributes } from "react";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";
type ButtonSize = "sm" | "md" | "lg";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
}

// ---------------------------------------------------------------------------
// Variant → className mapping
// ---------------------------------------------------------------------------

const variantClasses: Record<ButtonVariant, string> = {
  primary:
    "bg-ember text-white hover:bg-ember-600 active:bg-ember-700 " +
    "shadow-xs hover:shadow-sm " +
    "disabled:bg-ember-200 disabled:text-ember-400",
  secondary:
    "bg-cream-surface text-ink-700 border border-border " +
    "hover:bg-cream-100 hover:border-border-medium active:bg-cream-200 " +
    "disabled:text-neutral-300 disabled:border-border-light",
  ghost:
    "bg-transparent text-ink-600 " +
    "hover:bg-cream-100 hover:text-ink-800 active:bg-cream-200 " +
    "disabled:text-neutral-300",
  danger:
    "bg-danger text-white hover:bg-danger-600 active:bg-danger-700 " +
    "shadow-xs " +
    "disabled:bg-danger-200 disabled:text-danger-300",
};

const sizeClasses: Record<ButtonSize, string> = {
  sm: "px-3 py-1.5 text-sm rounded-md gap-1.5",
  md: "px-4 py-2.5 text-sm rounded-lg gap-2",
  lg: "px-6 py-3 text-base rounded-lg gap-2.5",
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      variant = "primary",
      size = "md",
      loading = false,
      disabled,
      className = "",
      children,
      ...rest
    },
    ref,
  ) => {
    return (
      <button
        ref={ref}
        disabled={disabled || loading}
        className={[
          "inline-flex items-center justify-center font-medium",
          "transition-all duration-150 ease-out",
          "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ember",
          "disabled:cursor-not-allowed",
          variantClasses[variant],
          sizeClasses[size],
          className,
        ].join(" ")}
        {...rest}
      >
        {loading && <Spinner />}
        {children}
      </button>
    );
  },
);

Button.displayName = "Button";

// ---------------------------------------------------------------------------
// Tiny inline spinner
// ---------------------------------------------------------------------------

function Spinner() {
  return (
    <svg
      className="h-4 w-4 animate-spin"
      viewBox="0 0 16 16"
      fill="none"
      aria-hidden="true"
    >
      <circle
        cx="8"
        cy="8"
        r="6"
        stroke="currentColor"
        strokeWidth="2"
        strokeDasharray="28"
        strokeDashoffset="8"
        strokeLinecap="round"
        opacity={0.3}
      />
      <circle
        cx="8"
        cy="8"
        r="6"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        className="text-current"
        strokeDasharray="28"
        strokeDashoffset="20"
      />
    </svg>
  );
}
