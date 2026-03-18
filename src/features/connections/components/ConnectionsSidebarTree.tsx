import { memo, useCallback, useEffect, useMemo, useRef, useState, type MouseEvent as ReactMouseEvent } from 'react'
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

import type { ConnectionSummary, TableInfo } from '@/data/types'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useTableSchemaQuery } from '@/features/schema/queries'

type ConnectionContextMenuTarget = {
  kind: 'connection'
  connection: ConnectionSummary
}

type TableContextMenuTarget = {
  kind: 'table'
  connectionId: string
  table: TableInfo
  tableKey: string
  isExpanded: boolean
}

type SidebarContextMenuTarget = ConnectionContextMenuTarget | TableContextMenuTarget

type ConnectionsSidebarTreeProps = {
  activeConnection: ConnectionSummary | null
  connections: ConnectionSummary[]
  tables: TableInfo[]
  selectedTable: TableInfo | null
  search: string
  tablesErrorMessage?: string
  isConnectionsLoading?: boolean
  isTablesLoading?: boolean
  isActivatingConnection?: boolean
  onSearchChange: (value: string) => void
  onOpenConnection: () => void
  onSelectConnection: (connection: ConnectionSummary) => void
  onSelectTable: (table: TableInfo) => void
  onOpenTableProperties: (connectionId: string, table: TableInfo) => void
  onToggleCollapsed: () => void
}

type TableTreeItemProps = {
  connectionId: string
  table: TableInfo
  isExpanded: boolean
  isSelected: boolean
  onSelectTable: (table: TableInfo) => void
  onToggleExpanded: () => void
  onOpenContextMenu: (
    event: ReactMouseEvent<HTMLButtonElement>,
    target: TableContextMenuTarget,
  ) => void
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
  onOpenContextMenu,
}: TableTreeItemProps) {
  const pendingSelectTimeoutRef = useRef<number | null>(null)

  const cancelPendingSelect = useCallback(() => {
    if (pendingSelectTimeoutRef.current != null) {
      window.clearTimeout(pendingSelectTimeoutRef.current)
      pendingSelectTimeoutRef.current = null
    }
  }, [])

  useEffect(() => {
    return () => cancelPendingSelect()
  }, [cancelPendingSelect])

  const schemaQuery = useTableSchemaQuery({
    connectionId,
    table,
    enabled: isExpanded,
  })

  const errorMessage =
    schemaQuery.error instanceof Error ? schemaQuery.error.message : 'Failed to load fields'

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
          onClick={(event) => {
            // Delay selection slightly to avoid running previews on double-click.
            if (event.detail > 1) {
              cancelPendingSelect()
              return
            }

            cancelPendingSelect()
            pendingSelectTimeoutRef.current = window.setTimeout(() => {
              onSelectTable(table)
              pendingSelectTimeoutRef.current = null
            }, 250)
          }}
          onContextMenu={(event) => {
            cancelPendingSelect()
            const tableKey = `${connectionId}:${table.schema}.${table.name}`
            onOpenContextMenu(event, {
              kind: 'table',
              connectionId,
              table,
              tableKey,
              isExpanded,
            })
          }}
          onDoubleClick={(event) => {
            cancelPendingSelect()
            const tableKey = `${connectionId}:${table.schema}.${table.name}`
            onOpenContextMenu(event, {
              kind: 'table',
              connectionId,
              table,
              tableKey,
              isExpanded,
            })
          }}
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
            <div className="text-[11px] text-destructive">{errorMessage}</div>
          ) : null}

          {schemaQuery.data?.length ? (
            <div className="max-h-[150px] overflow-auto pr-1 space-y-1">
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
  tablesErrorMessage,
  isConnectionsLoading = false,
  isTablesLoading = false,
  isActivatingConnection = false,
  onSearchChange,
  onOpenConnection,
  onSelectConnection,
  onSelectTable,
  onOpenTableProperties,
  onToggleCollapsed,
}: ConnectionsSidebarTreeProps) {
  const [expandedTables, setExpandedTables] = useState<Record<string, boolean>>({})
  const [isTablesPanelExpanded, setIsTablesPanelExpanded] = useState(true)
  const [contextMenu, setContextMenu] = useState<{
    x: number
    y: number
    target: SidebarContextMenuTarget
  } | null>(null)
  const contextMenuRef = useRef<HTMLDivElement | null>(null)
  const pendingSelectTimeoutRef = useRef<number | null>(null)
  const tableParentRef = useRef<HTMLDivElement | null>(null)
  const activeConnectionId = activeConnection?.id ?? null
  const activeTableKey =
    activeConnectionId && selectedTable
      ? `${activeConnectionId}:${selectedTable.schema}.${selectedTable.name}`
      : null

  useEffect(() => {
    // When switching connections, open the tables panel by default.
    if (activeConnectionId == null) return
    setIsTablesPanelExpanded(true)
  }, [activeConnectionId])

  const openSidebarContextMenu = useCallback(
    (event: ReactMouseEvent<HTMLElement>, target: SidebarContextMenuTarget) => {
      event.preventDefault()
      event.stopPropagation()

      const padding = 8
      const assumedMenuWidth = 220
      const assumedMenuHeight = 160
      const maxX = Math.max(padding, window.innerWidth - assumedMenuWidth - padding)
      const maxY = Math.max(padding, window.innerHeight - assumedMenuHeight - padding)

      setContextMenu({
        x: Math.min(Math.max(padding, event.clientX), maxX),
        y: Math.min(Math.max(padding, event.clientY), maxY),
        target,
      })
    },
    [],
  )

  useEffect(() => {
    if (!contextMenu) return

    const onPointerDown = (event: PointerEvent) => {
      const menuEl = contextMenuRef.current
      if (!menuEl) return
      const node = event.target
      if (node instanceof Node && menuEl.contains(node)) return
      setContextMenu(null)
    }

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setContextMenu(null)
      }
    }

    window.addEventListener('pointerdown', onPointerDown)
    window.addEventListener('keydown', onKeyDown)
    return () => {
      window.removeEventListener('pointerdown', onPointerDown)
      window.removeEventListener('keydown', onKeyDown)
    }
  }, [contextMenu])

  const visibleConnections = useMemo(() => {
    if (!activeConnection) {
      return connections
    }

    return connections.some((connection) => connection.id === activeConnection.id)
      ? connections
      : [activeConnection, ...connections]
  }, [activeConnection, connections])

  const cancelPendingSelect = useCallback(() => {
    if (pendingSelectTimeoutRef.current != null) {
      window.clearTimeout(pendingSelectTimeoutRef.current)
      pendingSelectTimeoutRef.current = null
    }
  }, [])

  useEffect(() => {
    return () => cancelPendingSelect()
  }, [cancelPendingSelect])

  const scheduleSelectConnection = useCallback(
    (connection: ConnectionSummary) => {
      cancelPendingSelect()
      pendingSelectTimeoutRef.current = window.setTimeout(() => {
        onSelectConnection(connection)
        pendingSelectTimeoutRef.current = null
      }, 250)
    },
    [cancelPendingSelect, onSelectConnection],
  )

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
        {contextMenu ? (
          <div
            ref={contextMenuRef}
            className="fixed z-50 w-[220px] rounded-md border border-sidebar-border bg-popover p-1 text-xs shadow-lg"
            style={{ left: contextMenu.x, top: contextMenu.y }}
            role="menu"
            aria-label="Sidebar context menu"
          >
            {contextMenu.target.kind === 'connection' ? (
              <button
                type="button"
                className="flex w-full items-center justify-between gap-2 rounded-sm px-2 py-1.5 text-left text-sidebar-foreground/90 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground disabled:opacity-60"
                onClick={() => {
                  const isActive = activeConnectionId === contextMenu.target.connection.id
                  if (isActive) {
                    setIsTablesPanelExpanded((prev) => !prev)
                  } else {
                    onSelectConnection(contextMenu.target.connection)
                  }
                  setContextMenu(null)
                }}
                disabled={isActivatingConnection}
              >
                <span>
                  {activeConnectionId === contextMenu.target.connection.id
                    ? isTablesPanelExpanded
                      ? 'Collapse tables'
                      : 'Expand tables'
                    : 'Activate connection'}
                </span>
              </button>
            ) : null}

            {contextMenu.target.kind === 'table' ? (
              <>
                <button
                  type="button"
                  className="flex w-full items-center justify-between gap-2 rounded-sm px-2 py-1.5 text-left text-sidebar-foreground/90 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                  onClick={() => {
                    onSelectTable(contextMenu.target.table)
                    setContextMenu(null)
                  }}
                >
                  <span>Select table (run preview)</span>
                </button>

                <button
                  type="button"
                  className="flex w-full items-center justify-between gap-2 rounded-sm px-2 py-1.5 text-left text-sidebar-foreground/90 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                  onClick={() => {
                    setExpandedTables((current) => ({
                      ...current,
                      [contextMenu.target.tableKey]: !current[contextMenu.target.tableKey],
                    }))
                    setContextMenu(null)
                  }}
                >
                  <span>{contextMenu.target.isExpanded ? 'Hide fields' : 'Show fields'}</span>
                </button>

                <button
                  type="button"
                  className="flex w-full items-center justify-between gap-2 rounded-sm px-2 py-1.5 text-left text-sidebar-foreground/90 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                  onClick={() => {
                    onOpenTableProperties(contextMenu.target.connectionId, contextMenu.target.table)
                    setContextMenu(null)
                  }}
                >
                  <span>View table properties</span>
                </button>
              </>
            ) : null}
          </div>
        ) : null}

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
                    onClick={(event) => {
                      // Delay activation slightly to avoid reacting to double-click.
                      if (event.detail > 1) {
                        cancelPendingSelect()
                        return
                      }

                      if (isActivatingConnection) return

                      if (isActive) {
                        cancelPendingSelect()
                        setIsTablesPanelExpanded((prev) => !prev)
                      } else {
                        scheduleSelectConnection(connection)
                      }
                    }}
                    disabled={isActivatingConnection}
                    onContextMenu={(event) => {
                      cancelPendingSelect()
                      openSidebarContextMenu(event, {
                        kind: 'connection',
                        connection,
                      })
                    }}
                    onDoubleClick={(event) => {
                      cancelPendingSelect()
                      openSidebarContextMenu(event, {
                        kind: 'connection',
                        connection,
                      })
                    }}
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

                  {isActive && isTablesPanelExpanded ? (
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

                      {tablesErrorMessage ? (
                        <div className="px-3 py-4 text-xs text-destructive">{tablesErrorMessage}</div>
                      ) : (
                        <>
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
                                        onOpenContextMenu={(event, target) =>
                                          openSidebarContextMenu(event, target)
                                        }
                                      />
                                    </div>
                                  )
                                })}
                              </div>
                            </div>
                          ) : null}
                        </>
                      )}
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

