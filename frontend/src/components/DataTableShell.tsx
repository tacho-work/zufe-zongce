import './DataTableShell.css';

interface Column {
  key: string;
  label: string;
  width?: string;
}

interface DataTableShellProps {
  columns: Column[];
  rowCount?: number;
}

export function DataTableShell({ columns, rowCount = 5 }: DataTableShellProps) {
  return (
    <table className="data-table-shell">
      <thead>
        <tr>
          {columns.map((col) => (
            <th key={col.key} style={col.width ? { width: col.width } : undefined}>
              {col.label}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {Array.from({ length: rowCount }).map((_, i) => (
          <tr key={i}>
            {columns.map((col) => (
              <td key={col.key}>
                <span className="data-table-shell-placeholder" />
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}
