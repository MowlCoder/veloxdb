import { memo, useMemo, useRef, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useVirtualizer } from '@tanstack/react-virtual'
import {
  CaretDownIcon,
  CaretRightIcon,
  DatabaseIcon,
  MagnifyingGlassIcon,
  PlusIcon,
  SidebarSimpleIcon,
  SpinnerGapIcon,
} from '@phosphor-icons/react'

import { getSchema, type ConnectionSummary, type TableInfo } from '@/lib/tauri'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

type ConnectionsSidebarTreeProps = {
  activeConnection: ConnectionSummary | null
  connections: ConnectionSummary[]
  tables: TableInfo[]
  selectedTable: TableInfo | null
  search: string
  isConnectionsLoading?: boolean
  isTablesLoading?: boolean
  isActivatingConnection?: boolean
  onSearchChange: (value: string) => void
  onOpenConnection: () => void
  onSelectConnection: (connection: ConnectionSummary) => void
  onSelectTable: (table: TableInfo) => void
  onToggleCollapsed: () => void
}

type TableTreeItemProps = {
  connectionId: string
  table: TableInfo
  isExpanded: boolean
  isSelected: boolean
  onSelectTable: (table: TableInfo) => void
  onToggleExpanded: () => void
}

const EMPTY_CONNECTIONS: ConnectionSummary[] = []
const EMPTY_TABLES: TableInfo[] = []

const TableTreeItem = memo(function TableTreeItem({
  connectionId,
  table,
  isExpanded,
  isSelected,
  onSelectTable,
  onToggleExpanded,
}: TableTreeItemProps) {
  const schemaQuery = useQuery({
    queryKey: ['schema', connectionId, table.schema, table.name],
    queryFn: () => getSchema(connectionId, table),
    enabled: isExpanded,
    staleTime: 5 * 60 * 1000,
  })

  return (
    <div className="border-b border-sidebar-border/60">
      <div className="flex min-w-0 items-center">
        <button
          type="button"
          className="flex h-9 w-8 shrink-0 items-center justify-center text-sidebar-foreground/70 transition hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
          onClick={onToggleExpanded}
          aria-label={isExpanded ? 'Collapse table fields' : 'Expand table fields'}
        >
          {isExpanded ? <CaretDownIcon /> : <CaretRightIcon />}
        </button>

        <button
          type="button"
          className={cn(
            'flex min-w-0 flex-1 items-center gap-2 px-2 py-2 text-left text-xs transition hover:bg-sidebar-accent hover:text-sidebar-accent-foreground',
            isSelected && 'bg-sidebar-accent text-sidebar-accent-foreground',
          )}
          onClick={() => onSelectTable(table)}
        >
          <DatabaseIcon className="size-3.5 shrink-0 text-sidebar-foreground/60" />
          <div className="min-w-0">
            <p className="truncate font-medium">{table.name}</p>
            <p className="truncate text-[11px] text-sidebar-foreground/60">{table.schema}</p>
          </div>
        </button>
      </div>

      {isExpanded ? (
        <div className="border-t border-sidebar-border/60 bg-sidebar/60 px-3 py-2">
          {schemaQuery.isLoading ? (
            <div className="flex items-center gap-2 text-[11px] text-sidebar-foreground/60">
              <SpinnerGapIcon className="size-3 animate-spin" />
              Loading fields...
            </div>
          ) : null}

          {schemaQuery.isError ? (
            <div className="text-[11px] text-destructive">
              {schemaQuery.error.message}
            </div>
          ) : null}

          {schemaQuery.data?.length ? (
            <div className="space-y-1">
              {schemaQuery.data.map((column) => (
                <div
                  key={`${column.tableSchema}.${column.tableName}.${column.columnName}`}
                  className="rounded-none border border-sidebar-border/60 bg-background/70 px-2 py-1.5 text-[11px]"
                >
                  <div className="truncate text-sidebar-foreground">{column.columnName}</div>
                  <div className="truncate text-sidebar-foreground/60">
                    {column.dataType}
                    {column.isNullable ? ' nullable' : ' not null'}
                  </div>
                </div>
              ))}
            </div>
          ) : null}

          {schemaQuery.data && schemaQuery.data.length === 0 ? (
            <div className="text-[11px] text-sidebar-foreground/60">
              No fields were returned for this table.
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  )
})

export function ConnectionsSidebarTree({
  activeConnection,
  connections = EMPTY_CONNECTIONS,
  tables = EMPTY_TABLES,
  selectedTable,
  search,
  isConnectionsLoading = false,
  isTablesLoading = false,
  isActivatingConnection = false,
  onSearchChange,
  onOpenConnection,
  onSelectConnection,
  onSelectTable,
  onToggleCollapsed,
}: ConnectionsSidebarTreeProps) {
  const [expandedTables, setExpandedTables] = useState<Record<string, boolean>>({})
  const tableParentRef = useRef<HTMLDivElement | null>(null)
  const activeConnectionId = activeConnection?.id ?? null
  const activeTableKey =
    activeConnectionId && selectedTable
      ? `${activeConnectionId}:${selectedTable.schema}.${selectedTable.name}`
      : null

  const visibleConnections = useMemo(() => {
    if (!activeConnection) {
      return connections
    }

    return connections.some((connection) => connection.id === activeConnection.id)
      ? connections
      : [activeConnection, ...connections]
  }, [activeConnection, connections])

  const rowVirtualizer = useVirtualizer({
    count: tables.length,
    getScrollElement: () => tableParentRef.current,
    estimateSize: () => 40,
    overscan: 8,
  })

  return (
    <aside className="flex h-full flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground">
      <div className="flex items-center justify-between gap-2 border-b border-sidebar-border px-3 py-2.5">
        <div className="min-w-0">
          <p className="text-[11px] uppercase tracking-[0.24em] text-sidebar-foreground/60">
            Connections
          </p>
          <p className="truncate pt-1 text-xs text-sidebar-foreground/80">
            Browse databases, tables, and fields.
          </p>
        </div>

        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={onOpenConnection}
            aria-label="Create connection"
          >
            <PlusIcon />
          </Button>
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={onToggleCollapsed}
            aria-label="Collapse sidebar"
          >
            <SidebarSimpleIcon />
          </Button>
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-auto">
        {isConnectionsLoading ? (
          <div className="flex items-center gap-2 px-3 py-4 text-xs text-sidebar-foreground/60">
            <SpinnerGapIcon className="size-4 animate-spin" />
            Loading saved connections...
          </div>
        ) : null}

        {!isConnectionsLoading && visibleConnections.length === 0 ? (
          <div className="space-y-2 px-3 py-4 text-xs text-sidebar-foreground/60">
            <p>No saved connections yet.</p>
            <p>Add a connection to start browsing tables and fields.</p>
          </div>
        ) : null}

        {!isConnectionsLoading && visibleConnections.length > 0 ? (
          <div className="divide-y divide-sidebar-border/60">
            {visibleConnections.map((connection) => {
              const isActive = activeConnectionId === connection.id

              return (
                <div key={connection.id}>
                  <button
                    type="button"
                    className={cn(
                      'flex w-full items-start gap-2 px-3 py-3 text-left text-xs transition hover:bg-sidebar-accent hover:text-sidebar-accent-foreground',
                      isActive && 'bg-sidebar-accent text-sidebar-accent-foreground',
                    )}
                    onClick={() => onSelectConnection(connection)}
                    disabled={isActivatingConnection}
                  >
                    <span className="pt-0.5 text-sidebar-foreground/70">
                      {isActive ? <CaretDownIcon /> : <CaretRightIcon />}
                    </span>
                    <DatabaseIcon className="mt-0.5 size-3.5 shrink-0 text-sidebar-foreground/70" />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <p className="truncate font-medium">{connection.name}</p>
                        {isActive ? (
                          <span className="shrink-0 border border-sidebar-border/80 px-1 py-0.5 text-[10px] uppercase tracking-[0.18em] text-sidebar-foreground/60">
                            Active
                          </span>
                        ) : null}
                      </div>
                      <p className="truncate pt-1 text-[11px] text-sidebar-foreground/60">
                        {connection.database} on {connection.host}:{connection.port}
                      </p>
                    </div>
                  </button>

                  {isActive ? (
                    <div className="border-t border-sidebar-border/60 bg-sidebar/70">
                      <div className="border-b border-sidebar-border/60 p-3">
                        <div className="relative">
                          <MagnifyingGlassIcon className="pointer-events-none absolute left-2 top-1/2 size-4 -translate-y-1/2 text-sidebar-foreground/50" />
                          <Input
                            value={search}
                            onChange={(event) => onSearchChange(event.target.value)}
                            placeholder="Search tables"
                            className="border-sidebar-border bg-background/70 pl-8"
                          />
                        </div>
                      </div>

                      {!isTablesLoading && tables.length === 0 ? (
                        <div className="px-3 py-4 text-xs text-sidebar-foreground/60">
                          {search
                            ? 'No tables match the current filter.'
                            : 'No tables were found for this connection.'}
                        </div>
                      ) : null}

                      {isTablesLoading ? (
                        <div className="flex items-center gap-2 px-3 py-4 text-xs text-sidebar-foreground/60">
                          <SpinnerGapIcon className="size-4 animate-spin" />
                          Loading tables...
                        </div>
                      ) : null}

                      {!isTablesLoading && tables.length > 0 ? (
                        <div ref={tableParentRef} className="max-h-[55vh] overflow-auto">
                          <div
                            className="relative w-full"
                            style={{ height: `${rowVirtualizer.getTotalSize()}px` }}
                          >
                            {rowVirtualizer.getVirtualItems().map((virtualRow) => {
                              const table = tables[virtualRow.index]
                              if (!table) {
                                return null
                              }
                              const tableKey = `${connection.id}:${table.schema}.${table.name}`
                              const isExpanded = Boolean(expandedTables[tableKey])

                              return (
                                <div
                                  key={tableKey}
                                  ref={rowVirtualizer.measureElement}
                                  data-index={virtualRow.index}
                                  className="absolute left-0 top-0 w-full"
                                  style={{
                                    transform: `translateY(${virtualRow.start}px)`,
                                  }}
                                >
                                  <TableTreeItem
                                    connectionId={connection.id}
                                    table={table}
                                    isExpanded={isExpanded}
                                    isSelected={activeTableKey === tableKey}
                                    onSelectTable={onSelectTable}
                                    onToggleExpanded={() =>
                                      setExpandedTables((current) => ({
                                        ...current,
                                        [tableKey]: !current[tableKey],
                                      }))
                                    }
                                  />
                                </div>
                              )
                            })}
                          </div>
                        </div>
                      ) : null}
                    </div>
                  ) : null}
                </div>
              )
            })}
          </div>
        ) : null}
      </div>
    </aside>
  )
}
