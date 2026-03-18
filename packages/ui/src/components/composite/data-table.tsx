import {
  flexRender,
  getCoreRowModel,
  useReactTable,
} from '@tanstack/react-table';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@workspace/ui/components/table';
import { SectionCard, SectionCardFooter, SectionCardHeader } from '@workspace/ui/components/composite/section-card';
import type { ColumnDef } from '@tanstack/react-table';

interface DataTableProps<TData, TValue> {
  columns: Array<ColumnDef<TData, TValue>>;
  data: Array<TData>;
  isLoading?: boolean;
  toolbar?: React.ReactNode;
  footer?: React.ReactNode;
  variant?: 'default' | 'card';
  getRowClassName?: (row: TData) => string | undefined;
}

export function DataTable<TData, TValue>({
  columns,
  data,
  isLoading = false,
  toolbar,
  footer,
  variant = 'default',
  getRowClassName,
}: DataTableProps<TData, TValue>) {
  // TanStack Table exposes non-memoizable functions; this local table instance is intentional.
  // eslint-disable-next-line react-hooks/incompatible-library
  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    manualPagination: true,
  });

  const tableBody = (
    <TableBody>
      {isLoading ? (
        Array.from({ length: 5 }).map((_, rowIndex) => (
          <TableRow key={rowIndex}>
            {columns.map((_col, colIndex) => (
              <TableCell key={colIndex}>
                <div className="h-4 bg-muted animate-pulse rounded-sm" />
              </TableCell>
            ))}
          </TableRow>
        ))
      ) : table.getRowModel().rows.length > 0 ? (
        table.getRowModel().rows.map((row) => (
          <TableRow key={row.id} data-state={row.getIsSelected() && 'selected'} className={getRowClassName?.(row.original)}>
            {row.getVisibleCells().map((cell) => (
              <TableCell key={cell.id}>
                {flexRender(cell.column.columnDef.cell, cell.getContext())}
              </TableCell>
            ))}
          </TableRow>
        ))
      ) : (
        <TableRow>
          <TableCell colSpan={columns.length} className="h-24 text-center text-muted-foreground">
            No results.
          </TableCell>
        </TableRow>
      )}
    </TableBody>
  );

  const tableHead = (
    <TableHeader>
      {table.getHeaderGroups().map((headerGroup) => (
        <TableRow key={headerGroup.id}>
          {headerGroup.headers.map((header) => (
            <TableHead key={header.id}>
              {header.isPlaceholder
                ? null
                : flexRender(header.column.columnDef.header, header.getContext())}
            </TableHead>
          ))}
        </TableRow>
      ))}
    </TableHeader>
  );

  if (variant === 'card') {
    return (
      <SectionCard>
        {toolbar && <SectionCardHeader>{toolbar}</SectionCardHeader>}
        <div className="overflow-x-auto">
          <Table>
            {tableHead}
            {tableBody}
          </Table>
        </div>
        {footer && <SectionCardFooter>{footer}</SectionCardFooter>}
      </SectionCard>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {toolbar && <div>{toolbar}</div>}
      <div className="rounded-md border border-border overflow-hidden">
        <Table>
          {tableHead}
          {tableBody}
        </Table>
      </div>
      {footer && <div className="pt-2">{footer}</div>}
    </div>
  );
}
