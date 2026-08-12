import { type HTMLAttributes } from "react";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface MonoTextProps extends HTMLAttributes<HTMLSpanElement> {
  /** Truncate the middle of the string (e.g. 0x1234...abcd). */
  truncate?: "middle" | "end";
  /** Number of chars to keep on each side when truncating middle. */
  keep?: number;
  /** Show a copy-to-clipboard button on hover. */
  copyable?: boolean;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function MonoText({
  truncate,
  keep = 6,
  copyable = false,
  className = "",
  children,
  ...rest
}: MonoTextProps) {
  const text = String(children ?? "");

  const display =
    truncate === "middle" && text.length > keep * 2 + 3
      ? `${text.slice(0, keep)}…${text.slice(-keep)}`
      : truncate === "end" && text.length > keep + 3
        ? `${text.slice(0, keep)}…`
        : text;

  const handleCopy = () => {
    if (copyable && text) {
      navigator.clipboard.writeText(text).catch(() => {});
    }
  };

  return (
    <span
      className={[
        "mono-data inline-flex items-center gap-1",
        copyable && "cursor-pointer hover:text-ember transition-colors duration-150",
        copyable && "group",
        className,
      ].join(" ")}
      title={truncate ? text : undefined}
      onClick={copyable ? handleCopy : undefined}
      {...rest}
    >
      {display}
      {copyable && (
        <CopyIcon className="h-3.5 w-3.5 opacity-0 group-hover:opacity-60 transition-opacity shrink-0" />
      )}
    </span>
  );
}

// ---------------------------------------------------------------------------
// Tiny copy icon
// ---------------------------------------------------------------------------

function CopyIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 14 14"
      fill="none"
      aria-hidden="true"
    >
      <rect
        x="4"
        y="4"
        width="8"
        height="8"
        rx="1.5"
        stroke="currentColor"
        strokeWidth="1.25"
      />
      <path
        d="M3 10V3.5C3 2.67157 3.67157 2 4.5 2H10"
        stroke="currentColor"
        strokeWidth="1.25"
        strokeLinecap="round"
      />
    </svg>
  );
}
