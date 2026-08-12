import { type ReactNode } from "react";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface Column<T> {
  key: string;
  header: string;
  /** Accessor: keyof T or a render function. */
  render: (row: T, index: number) => ReactNode;
  /** Right-align numeric columns. */
  align?: "left" | "right";
  className?: string;
}

interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  /** Unique key extractor. */
  keyExtractor: (row: T, index: number) => string;
  /** Shown when data is empty. */
  emptyText?: string;
  className?: string;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function DataTable<T>({
  columns,
  data,
  keyExtractor,
  emptyText = "No data",
  className = "",
}: DataTableProps<T>) {
  if (data.length === 0) {
    return (
      <div className="py-12 text-center text-sm text-neutral-400">
        {emptyText}
      </div>
    );
  }

  return (
    <div className={["overflow-x-auto scrollbar-thin", className].join(" ")}>
      <table className="w-full">
        {/* Head */}
        <thead>
          <tr className="border-b border-border-light">
            {columns.map((col) => (
              <th
                key={col.key}
                className={[
                  "px-4 py-3 text-left",
                  "text-2xs font-semibold uppercase tracking-wider text-neutral-400",
                  col.align === "right" && "text-right",
                  col.className,
                ].join(" ")}
              >
                {col.header}
              </th>
            ))}
          </tr>
        </thead>

        {/* Body */}
        <tbody>
          {data.map((row, i) => (
            <tr
              key={keyExtractor(row, i)}
              className={[
                "border-b border-border-light/60",
                "transition-colors duration-100",
                "hover:bg-cream-50",
              ].join(" ")}
            >
              {columns.map((col) => {
                const cell = col.render(row, i);
                return (
                  <td
                    key={col.key}
                    className={[
                      "px-4 py-3.5",
                      "text-sm text-ink-700",
                      col.align === "right" && "text-right tabular-nums",
                      col.className,
                    ].join(" ")}
                  >
                    {cell}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
