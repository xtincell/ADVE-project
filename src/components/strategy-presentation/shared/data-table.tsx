"use client";

interface DataTableProps {
  headers: string[];
  rows: (string | number | null)[][];
  compact?: boolean;
}

export function DataTable({ headers, rows, compact }: DataTableProps) {
  if (rows.length === 0) {
    return <p className="text-sm text-foreground-muted italic">Aucune donnee disponible</p>;
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-border">
      <table className="w-full text-left">
        <thead>
          <tr className="border-b border-border bg-background/80">
            {headers.map((h, i) => (
              <th
                key={i}
                className={`px-4 text-xs font-semibold uppercase tracking-wider text-foreground-muted ${
                  compact ? "py-2" : "py-3"
                }`}
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, ri) => (
            <tr key={ri} className="border-b border-border/50 last:border-0">
              {row.map((cell, ci) => (
                <td
                  key={ci}
                  className={`px-4 text-sm text-foreground-secondary ${compact ? "py-2" : "py-3"}`}
                >
                  {cell ?? <span className="text-foreground-muted">—</span>}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
