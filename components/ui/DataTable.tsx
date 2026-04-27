"use client";

import {
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
  type ColumnDef,
  type ColumnFiltersState,
  type SortingState,
} from "@tanstack/react-table";
import { ChevronLeft, ChevronRight, Search } from "lucide-react";
import { useMemo, useState } from "react";

type Alignment = "left" | "center" | "right";

export type DataTableColumnMeta = {
  align?: Alignment;
  className?: string;
  headerClassName?: string;
};

declare module "@tanstack/react-table" {
   
   
  // eslint-disable-next-line
  interface ColumnMeta<TData, TValue> extends DataTableColumnMeta {}
}

type DataTableProps<TData> = {
  data: TData[];
  columns: ColumnDef<TData, unknown>[];
  minWidth?: number;
  searchPlaceholder?: string;
  emptyMessage?: string;
  initialPageSize?: number;
  pageSizeOptions?: number[];
  hideSearch?: boolean;
  hidePagination?: boolean;
  toolbarRight?: React.ReactNode;
  isLoading?: boolean;
};

const alignClassName = (align: Alignment) => {
  if (align === "center") return "text-center";
  if (align === "right") return "text-right";
  return "text-left";
};

function DataTable<TData>({
  data,
  columns,
  minWidth = 900,
  searchPlaceholder = "Search...",
  emptyMessage = "No records found.",
  initialPageSize = 10,
  pageSizeOptions = [10, 20, 50, 100],
  hideSearch = false,
  hidePagination = false,
  toolbarRight,
  isLoading = false,
}: DataTableProps<TData>) {
  const [sorting, setSorting] = useState<SortingState>([]);
  const [globalFilter, setGlobalFilter] = useState("");
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);

  const normalizedColumns = useMemo(
    () =>
      columns.map((column) => ({
        ...column,
        enableSorting:
          typeof column.enableSorting === "boolean"
            ? column.enableSorting
            : true,
      })),
   
    [columns],
  );

  // eslint-disable-next-line
  const table = useReactTable({
    data,
    columns: normalizedColumns,
    state: {
      sorting,
      globalFilter,
      columnFilters,
    },
    initialState: {
      pagination: {
        pageSize: initialPageSize,
      },
    },
    onSortingChange: setSorting,
    onGlobalFilterChange: setGlobalFilter,
    onColumnFiltersChange: setColumnFilters,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    globalFilterFn: "includesString",
  });

  return (
    <div className="rounded-2xl border border-stone-200 bg-white overflow-hidden">
      {(!hideSearch || toolbarRight) && (
        <div className="flex flex-col gap-3 border-b border-stone-100 p-4 md:flex-row md:items-center md:justify-between">
          {!hideSearch ? (
            <div className="relative w-full md:max-w-sm">
              <Search
                size={15}
                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-stone-400"
              />
              <input
                type="text"
                value={globalFilter}
                onChange={(event) => setGlobalFilter(event.target.value)}
                placeholder={searchPlaceholder}
                className="w-full rounded-xl border border-stone-200 bg-stone-50 py-2 pl-9 pr-3 text-[13px] outline-none transition-colors focus:border-[#1a5c2e]"
              />
            </div>
          ) : (
            <div />
          )}

          {toolbarRight ? <div className="flex items-center gap-2">{toolbarRight}</div> : null}
        </div>
      )}

      <div className="overflow-x-auto">
        <table
          className="w-full border-collapse text-left text-[14px]"
          style={{ minWidth: `${minWidth}px` }}
        >
          <thead className="bg-stone-50 text-[11px] uppercase tracking-[0.1em] text-stone-500">
            {table.getHeaderGroups().map((headerGroup) => (
              <tr key={headerGroup.id}>
                {headerGroup.headers.map((header) => {
                  const meta = header.column.columnDef.meta;
                  const align = meta?.align ?? "left";
                  const canSort = header.column.getCanSort();
                  const sortState = header.column.getIsSorted();

                  return (
                    <th
                      key={header.id}
                      className={`sticky top-0 border-b border-stone-200 px-4 py-3 font-medium ${alignClassName(align)} ${meta?.headerClassName ?? ""}`}
                    >
                      {header.isPlaceholder ? null : (
                        <button
                          type="button"
                          disabled={!canSort}
                          onClick={canSort ? header.column.getToggleSortingHandler() : undefined}
                          className={`inline-flex items-center gap-1 ${canSort ? "hover:text-stone-800" : "cursor-default"}`}
                        >
                          {flexRender(
                            header.column.columnDef.header,
                            header.getContext(),
                          )}
                          {sortState === "asc" && <span>▲</span>}
                          {sortState === "desc" && <span>▼</span>}
                        </button>
                      )}
                    </th>
                  );
                })}
              </tr>
            ))}
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td
                  colSpan={table.getAllColumns().length}
                  className="px-4 py-16 text-center text-[13px] text-stone-500"
                >
                  <div className="flex flex-col items-center justify-center gap-3">
                    <span className="h-5 w-5 animate-spin rounded-full border-2 border-[#1a5c2e] border-t-transparent"></span>
                    <span>Loading data...</span>
                  </div>
                </td>
              </tr>
            ) : table.getRowModel().rows.length === 0 ? (
              <tr>
                <td
                  colSpan={table.getAllColumns().length}
                  className="px-4 py-10 text-center text-[13px] text-stone-500"
                >
                  {emptyMessage}
                </td>
              </tr>
            ) : (
              table.getRowModel().rows.map((row) => (
                <tr key={row.id} className="border-b border-stone-100 hover:bg-stone-50">
                  {row.getVisibleCells().map((cell) => {
                    const meta = cell.column.columnDef.meta;
                    const align = meta?.align ?? "left";

                    return (
                      <td
                        key={cell.id}
                        className={`px-4 py-3 ${alignClassName(align)} ${meta?.className ?? ""}`}
                      >
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </td>
                    );
                  })}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {!hidePagination && (
        <div className="flex flex-col gap-3 border-t border-stone-100 p-4 md:flex-row md:items-center md:justify-between">
          <p className="text-[12px] text-stone-500">
            Showing {table.getRowModel().rows.length} of {table.getFilteredRowModel().rows.length} records
          </p>

          <div className="flex items-center gap-2">
            <select
              value={table.getState().pagination.pageSize}
              onChange={(event) => table.setPageSize(Number(event.target.value))}
              className="rounded-lg border border-stone-200 bg-white px-2 py-1 text-[12px] text-stone-700"
            >
              {pageSizeOptions.map((size) => (
                <option key={size} value={size}>
                  {size}/page
                </option>
              ))}
            </select>

            <button
              type="button"
              onClick={() => table.previousPage()}
              disabled={!table.getCanPreviousPage()}
              className="inline-flex items-center gap-1 rounded-lg border border-stone-200 bg-white px-2 py-1 text-[12px] text-stone-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <ChevronLeft size={14} /> Prev
            </button>

            <span className="text-[12px] text-stone-600">
              Page {table.getState().pagination.pageIndex + 1} of {table.getPageCount() || 1}
            </span>

            <button
              type="button"
              onClick={() => table.nextPage()}
              disabled={!table.getCanNextPage()}
              className="inline-flex items-center gap-1 rounded-lg border border-stone-200 bg-white px-2 py-1 text-[12px] text-stone-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Next <ChevronRight size={14} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default DataTable;
