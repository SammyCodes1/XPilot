import { type HTMLAttributes, type ReactNode } from "react";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  /** Optional header content rendered above the body with standard padding. */
  header?: ReactNode;
  /** Optional footer content rendered below the body with a top border. */
  footer?: ReactNode;
  /** Remove internal padding (for full-bleed content like tables). */
  noPadding?: boolean;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function Card({
  header,
  footer,
  noPadding = false,
  className = "",
  children,
  ...rest
}: CardProps) {
  return (
    <div
      className={[
        "surface-card flex flex-col overflow-hidden",
        className,
      ].join(" ")}
      {...rest}
    >
      {header && (
        <div
          className={[
            "px-6 pt-5 pb-3",
            "border-b border-border-light",
            "text-ink-800 font-semibold text-lg tracking-tight",
          ].join(" ")}
        >
          {header}
        </div>
      )}

      <div className={noPadding ? "" : "px-6 py-5"}>{children}</div>

      {footer && (
        <div
          className={[
            "px-6 py-3 mt-auto",
            "border-t border-border-light",
            "text-sm text-ink-400",
          ].join(" ")}
        >
          {footer}
        </div>
      )}
    </div>
  );
}
