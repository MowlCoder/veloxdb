import { useMemo, useRef } from 'react'
import {
  flexRender,
  getCoreRowModel,
  useReactTable,
  type ColumnDef,
} from '@tanstack/react-table'
import { useVirtualizer } from '@tanstack/react-virtual'

import type { QueryResult } from '@/lib/tauri'

type ResultsGridProps = {
  result: QueryResult | null
  isPending?: boolean
}

function formatValue(value: string | null | undefined) {
  if (value === null) {
    return 'NULL'
  }

  if (value === undefined || value === '') {
    return ''
  }

  return value
}

export function ResultsGrid({ result, isPending = false }: ResultsGridProps) {
  const parentRef = useRef<HTMLDivElement | null>(null)

  const data = result?.rows ?? []
  const columns = useMemo<ColumnDef<Record<string, string | null>>[]>(
    () =>
      (result?.columns ?? []).map((columnName) => ({
        accessorKey: columnName,
        header: columnName,
        cell: ({ getValue }) => (
          <span className={getValue() === null ? 'text-muted-foreground' : ''}>
            {formatValue(getValue<string | null>())}
          </span>
        ),
      })),
    [result],
  )

  // eslint-disable-next-line react-hooks/incompatible-library
  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
  })

  const rows = table.getRowModel().rows
  const rowVirtualizer = useVirtualizer({
    count: rows.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 36,
    overscan: 10,
  })

  const templateColumns =
    result && result.columns.length > 0
      ? `repeat(${result.columns.length}, minmax(180px, 1fr))`
      : 'minmax(0, 1fr)'

  if (isPending) {
    return (
      <div className="flex h-full items-center justify-center text-xs text-muted-foreground">
        Running query...
      </div>
    )
  }

  if (!result) {
    return (
      <div className="flex h-full items-center justify-center text-xs text-muted-foreground">
        Run a query to inspect rows here.
      </div>
    )
  }

  if (result.columns.length === 0) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-2 text-xs text-muted-foreground">
        <span>Statement completed without a rowset.</span>
        <span>{result.commandTag ? `${result.commandTag} rows affected.` : 'No rows returned.'}</span>
      </div>
    )
  }

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <div className="grid border-b border-border bg-muted/30" style={{ gridTemplateColumns: templateColumns }}>
        {table.getFlatHeaders().map((header) => (
          <div
            key={header.id}
            className="truncate border-r border-border px-3 py-2 text-[11px] font-medium uppercase tracking-[0.18em] text-muted-foreground last:border-r-0"
          >
            {flexRender(header.column.columnDef.header, header.getContext())}
          </div>
        ))}
      </div>

      <div ref={parentRef} className="min-h-0 flex-1 overflow-auto">
        <div
          className="relative w-full"
          style={{ height: `${rowVirtualizer.getTotalSize()}px` }}
        >
          {rowVirtualizer.getVirtualItems().map((virtualRow) => {
            const row = rows[virtualRow.index]

            return (
              <div
                key={row.id}
                className="absolute left-0 top-0 grid w-full border-b border-border/60 bg-background text-xs"
                style={{
                  height: `${virtualRow.size}px`,
                  transform: `translateY(${virtualRow.start}px)`,
                  gridTemplateColumns: templateColumns,
                }}
              >
                {row.getVisibleCells().map((cell) => (
                  <div
                    key={cell.id}
                    className="truncate border-r border-border/60 px-3 py-2 last:border-r-0"
                    title={formatValue(cell.getValue<string | null>())}
                  >
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </div>
                ))}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
