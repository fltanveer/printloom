'use client';
import * as React from 'react';
import {
  flexRender,
  getCoreRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
  type ColumnDef,
  type RowSelectionState,
  type SortingState,
} from '@tanstack/react-table';
import { ArrowUpDown, ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/components/ui/cn';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/switch';

/**
 * Table on desktop, cards below 768px. Paginates at 25 rows (so 100+ rows stay usable).
 * `renderCard` controls the mobile card; defaults to label/value pairs from the columns.
 */
export function DataTable<T>({
  data,
  columns,
  getRowId,
  onRowClick,
  renderCard,
  selectable,
  selection,
  onSelectionChange,
  pageSize = 25,
  empty,
  className,
  rowClassName,
}: {
  data: T[];
  columns: ColumnDef<T, unknown>[];
  getRowId: (row: T) => string;
  onRowClick?: (row: T) => void;
  renderCard?: (row: T) => React.ReactNode;
  selectable?: boolean;
  selection?: RowSelectionState;
  onSelectionChange?: (s: RowSelectionState) => void;
  pageSize?: number;
  empty?: React.ReactNode;
  className?: string;
  rowClassName?: (row: T) => string | undefined;
}) {
  const [sorting, setSorting] = React.useState<SortingState>([]);
  const [internalSel, setInternalSel] = React.useState<RowSelectionState>({});
  const rowSelection = selection ?? internalSel;

  const allColumns = React.useMemo<ColumnDef<T, unknown>[]>(() => {
    if (!selectable) return columns;
    return [
      {
        id: '__select',
        header: ({ table }) => (
          <Checkbox
            aria-label="Select all"
            checked={table.getIsAllPageRowsSelected() ? true : table.getIsSomePageRowsSelected() ? 'indeterminate' : false}
            onCheckedChange={(v) => table.toggleAllPageRowsSelected(!!v)}
          />
        ),
        cell: ({ row }) => (
          <span onClick={(e) => e.stopPropagation()}>
            <Checkbox aria-label="Select row" checked={row.getIsSelected()} onCheckedChange={(v) => row.toggleSelected(!!v)} />
          </span>
        ),
        enableSorting: false,
        size: 40,
      },
      ...columns,
    ];
  }, [columns, selectable]);

  const table = useReactTable({
    data,
    columns: allColumns,
    getRowId: (r) => getRowId(r),
    state: { sorting, rowSelection },
    onSortingChange: setSorting,
    onRowSelectionChange: (u) => {
      const next = typeof u === 'function' ? u(rowSelection) : u;
      if (onSelectionChange) onSelectionChange(next);
      else setInternalSel(next);
    },
    enableRowSelection: !!selectable,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: { pagination: { pageSize } },
  });

  if (!data.length && empty) return <>{empty}</>;

  const rows = table.getRowModel().rows;
  return (
    <div className={className}>
      {/* desktop table */}
      <div className="hidden overflow-x-auto rounded-card border border-border bg-surface md:block">
        <table className="w-full text-sm">
          <thead>
            {table.getHeaderGroups().map((hg) => (
              <tr key={hg.id} className="border-b border-border bg-surface-2/50">
                {hg.headers.map((h) => (
                  <th key={h.id} className="whitespace-nowrap px-3 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-muted">
                    {h.isPlaceholder ? null : h.column.getCanSort() ? (
                      <button type="button" className="inline-flex items-center gap-1 hover:text-text" onClick={h.column.getToggleSortingHandler()}>
                        {flexRender(h.column.columnDef.header, h.getContext())}
                        <ArrowUpDown className="h-3 w-3" />
                      </button>
                    ) : (
                      flexRender(h.column.columnDef.header, h.getContext())
                    )}
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr
                key={r.id}
                onClick={onRowClick ? () => onRowClick(r.original) : undefined}
                className={cn('border-b border-border last:border-0', onRowClick && 'cursor-pointer hover:bg-surface-2/60', r.getIsSelected() && 'bg-accent-soft', rowClassName?.(r.original))}
              >
                {r.getVisibleCells().map((c) => (
                  <td key={c.id} className="px-3 py-3 align-middle">
                    {flexRender(c.column.columnDef.cell, c.getContext())}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {/* mobile cards */}
      <div className="space-y-2.5 md:hidden">
        {rows.map((r) => (
          <div
            key={r.id}
            onClick={onRowClick ? () => onRowClick(r.original) : undefined}
            className={cn('rounded-card border border-border bg-surface p-3.5 shadow-s1', onRowClick && 'cursor-pointer active:bg-surface-2', r.getIsSelected() && 'border-accent bg-accent-soft')}
          >
            {selectable ? (
              <div className="mb-2 flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                <Checkbox aria-label="Select row" checked={r.getIsSelected()} onCheckedChange={(v) => r.toggleSelected(!!v)} />
                <span className="text-xs text-muted">Select</span>
              </div>
            ) : null}
            {renderCard ? (
              renderCard(r.original)
            ) : (
              <dl className="grid grid-cols-2 gap-x-3 gap-y-2 text-sm">
                {r
                  .getVisibleCells()
                  .filter((c) => c.column.id !== '__select')
                  .map((c) => (
                    <div key={c.id} className="min-w-0">
                      <dt className="text-xs text-muted">{typeof c.column.columnDef.header === 'string' ? c.column.columnDef.header : c.column.id}</dt>
                      <dd className="min-w-0">{flexRender(c.column.columnDef.cell, c.getContext())}</dd>
                    </div>
                  ))}
              </dl>
            )}
          </div>
        ))}
      </div>
      {table.getPageCount() > 1 ? (
        <div className="mt-3 flex items-center justify-between text-sm text-muted">
          <span>
            Page {table.getState().pagination.pageIndex + 1} of {table.getPageCount()} · {data.length} rows
          </span>
          <div className="flex gap-2">
            <Button variant="secondary" size="icon-sm" onClick={() => table.previousPage()} disabled={!table.getCanPreviousPage()} aria-label="Previous page">
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button variant="secondary" size="icon-sm" onClick={() => table.nextPage()} disabled={!table.getCanNextPage()} aria-label="Next page">
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  );
}

export type { ColumnDef, RowSelectionState };
