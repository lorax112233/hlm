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
    <div className="overflow-hidden rounded-2xl border border-black/5 bg-white shadow-sm">
      <table className="w-full text-left text-sm">
        <thead className="bg-black/5 text-xs uppercase tracking-[0.25em] text-black/50">
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
              className="border-t border-black/5 transition hover:bg-black/5 even:bg-black/[0.02]"
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
