type Column = {
  key: string;
  label: string;
};

type DataTableProps = {
  columns: Column[];
  rows: Record<string, React.ReactNode>[];
};

export default function DataTable({ columns, rows }: DataTableProps) {
  return (
    <div className="overflow-x-auto rounded-2xl border border-black/8 bg-white/92 shadow-sm shadow-black/8">
      <table className="w-full text-left text-sm">
        <thead className="sticky top-0 bg-gradient-to-r from-black/[0.03] via-black/[0.04] to-black/[0.03] text-xs uppercase tracking-[0.18em] text-black/55">
          <tr>
            {columns.map((column) => (
              <th key={column.key} className="px-4 py-3 font-medium">
                {column.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, index) => (
            <tr
              key={index}
              className="border-t border-black/6 transition hover:bg-app-primary/[0.045] even:bg-black/[0.015]"
            >
              {columns.map((column) => (
                <td key={column.key} className="px-4 py-3 text-app-text">
                  {row[column.key]}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
