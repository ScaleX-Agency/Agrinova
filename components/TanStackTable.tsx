"use client";

import {
  flexRender,
  getCoreRowModel,
  useReactTable,
  type Cell,
  type ColumnDef,
  type Header,
} from "@tanstack/react-table";

type TableAlignment = "left" | "center" | "right";

export type TableColumnMeta = {
  align?: TableAlignment;
  headerClassName?: string;
  cellClassName?: string;
  fixedWidth?: boolean;
};

declare module "@tanstack/react-table" {
  interface ColumnMeta<TData, TValue> extends TableColumnMeta {}
}

type TanStackTableProps<TData> = {
  data: TData[];
  columns: ColumnDef<TData, any>[];
  minWidthPx?: number;
  className?: string;
  align?: TableAlignment;
};

const getAlignClassName = (align: TableAlignment) => {
  if (align === "center") return "text-center";
  if (align === "right") return "text-right";
  return "text-left";
};

const TanStackTable = <TData,>({
  data,
  columns,
  minWidthPx,
  className = "",
  align = "left",
}: TanStackTableProps<TData>) => {
  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
  });

  return (
    <div className={`overflow-x-auto ${className}`.trim()}>
      <table
        className={`w-full table-auto border-collapse text-[13px] ${getAlignClassName(align)}`}
        style={minWidthPx ? { minWidth: `${minWidthPx}px` } : undefined}
      >
        <thead className="text-[11px] uppercase tracking-[0.1em] text-stone-500">
          {table.getHeaderGroups().map((headerGroup) => (
            <tr key={headerGroup.id}>
              {headerGroup.headers.map((header) => (
                <HeaderCell key={header.id} header={header} />
              ))}
            </tr>
          ))}
        </thead>
        <tbody>
          {table.getRowModel().rows.map((row) => (
            <tr key={row.id} className="border-b border-stone-100">
              {row.getVisibleCells().map((cell) => (
                <BodyCell key={cell.id} cell={cell} />
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

type HeaderCellProps<TData> = {
  header: Header<TData, unknown>;
};

const HeaderCell = <TData,>({ header }: HeaderCellProps<TData>) => {
  const meta = header.column.columnDef.meta;
  const cellAlign = meta?.align ?? "left";
  const widthStyle = meta?.fixedWidth ? { width: header.getSize() } : undefined;

  return (
    <th
      key={header.id}
      className={`border-b border-stone-200 border-r border-stone-200 px-2 py-2 font-medium last:border-r-0 ${getAlignClassName(cellAlign)} ${meta?.headerClassName ?? ""}`.trim()}
      style={widthStyle}
    >
      {header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}
    </th>
  );
};

type BodyCellProps<TData> = {
  cell: Cell<TData, unknown>;
};

const BodyCell = <TData,>({ cell }: BodyCellProps<TData>) => {
  const meta = cell.column.columnDef.meta;
  const cellAlign = meta?.align ?? "left";
  const widthStyle = meta?.fixedWidth ? { width: cell.column.getSize() } : undefined;

  return (
    <td
      key={cell.id}
      className={`border-r border-stone-200 px-2 py-2.5 align-top last:border-r-0 ${getAlignClassName(cellAlign)} ${meta?.cellClassName ?? ""}`.trim()}
      style={widthStyle}
    >
      {flexRender(cell.column.columnDef.cell, cell.getContext())}
    </td>
  );
};

export default TanStackTable;