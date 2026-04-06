"use client";

interface DataTableProps {
  headers: string[];
  rows: (string | number | null)[][];
  compact?: boolean;
}

export function DataTable({ headers, rows, compact }: DataTableProps) {
  if (rows.length === 0) {
    return <p className="text-sm text-zinc-600 italic">Aucune donnee disponible</p>;
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-zinc-800">
      <table className="w-full text-left">
        <thead>
          <tr className="border-b border-zinc-800 bg-zinc-900/80">
            {headers.map((h, i) => (
              <th
                key={i}
                className={`px-4 text-xs font-semibold uppercase tracking-wider text-zinc-500 ${
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
            <tr key={ri} className="border-b border-zinc-800/50 last:border-0">
              {row.map((cell, ci) => (
                <td
                  key={ci}
                  className={`px-4 text-sm text-zinc-300 ${compact ? "py-2" : "py-3"}`}
                >
                  {cell ?? <span className="text-zinc-700">—</span>}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
