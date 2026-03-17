import {
  useEffect,
  useMemo,
  useState,
  type CSSProperties,
  type PointerEvent as ReactPointerEvent,
} from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  MoonIcon,
  PlayIcon,
  SidebarSimpleIcon,
  SunIcon,
} from '@phosphor-icons/react'

import { ConnectionDialog } from '@/components/app/connection-dialog'
import { CommandPalette } from '@/components/app/command-palette'
import { ResultsGrid } from '@/components/app/results-grid'
import { SqlEditor } from '@/components/app/sql-editor'
import { ConnectionsSidebarTree } from '@/components/app/tables-sidebar'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  connectDb,
  getSchema,
  getTables,
  listConnections,
  runQuery,
  setActiveConnection,
  type ConnectionSummary,
  type TableInfo,
} from '@/lib/tauri'

const DEFAULT_QUERY = `select table_schema, table_name
from information_schema.tables
where table_schema not in ('pg_catalog', 'information_schema')
order by table_schema, table_name
limit 100;`

const SIDEBAR_WIDTH_KEY = 'veloxdb.sidebarWidth'
const SIDEBAR_COLLAPSED_KEY = 'veloxdb.sidebarCollapsed'
const DEFAULT_SIDEBAR_WIDTH = 320
const MIN_SIDEBAR_WIDTH = 240
const MAX_SIDEBAR_WIDTH = 520

function clampSidebarWidth(value: number) {
  return Math.min(MAX_SIDEBAR_WIDTH, Math.max(MIN_SIDEBAR_WIDTH, value))
}

function readSidebarWidth() {
  const value = Number(window.localStorage.getItem(SIDEBAR_WIDTH_KEY))
  return Number.isFinite(value) ? clampSidebarWidth(value) : DEFAULT_SIDEBAR_WIDTH
}

function readSidebarCollapsed() {
  return window.localStorage.getItem(SIDEBAR_COLLAPSED_KEY) === 'true'
}

function App() {
  const queryClient = useQueryClient()
  const [connection, setConnection] = useState<ConnectionSummary | null>(null)
  const [query, setQuery] = useState(DEFAULT_QUERY)
  const [lastQuery, setLastQuery] = useState('')
  const [tableSearch, setTableSearch] = useState('')
  const [selectedTable, setSelectedTable] = useState<TableInfo | null>(null)
  const [isDark, setIsDark] = useState(() =>
    window.matchMedia('(prefers-color-scheme: dark)').matches,
  )
  const [connectionDialogOpen, setConnectionDialogOpen] = useState(false)
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false)
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(readSidebarCollapsed)
  const [sidebarWidth, setSidebarWidth] = useState(readSidebarWidth)

  useEffect(() => {
    document.documentElement.classList.toggle('dark', isDark)
  }, [isDark])

  useEffect(() => {
    window.localStorage.setItem(SIDEBAR_COLLAPSED_KEY, String(isSidebarCollapsed))
  }, [isSidebarCollapsed])

  useEffect(() => {
    window.localStorage.setItem(SIDEBAR_WIDTH_KEY, String(sidebarWidth))
  }, [sidebarWidth])

  const connectionsQuery = useQuery({
    queryKey: ['connections'],
    queryFn: listConnections,
    staleTime: 30 * 1000,
  })

  const connectMutation = useMutation({
    mutationFn: connectDb,
    onSuccess: (nextConnection) => {
      setConnection(nextConnection)
      setSelectedTable(null)
      setTableSearch('')
      setIsSidebarCollapsed(false)
      setConnectionDialogOpen(false)
      runQueryMutation.reset()
      queryClient.setQueryData<ConnectionSummary[]>(['connections'], (current) => {
        const existing = current ?? []
        const filtered = existing.filter((item) => item.id !== nextConnection.id)
        return [nextConnection, ...filtered]
      })
    },
  })

  const runQueryMutation = useMutation({
    mutationFn: runQuery,
    onSuccess: (_result, variables) => {
      setLastQuery(variables.sql)
    },
  })

  const activateConnectionMutation = useMutation({
    mutationFn: setActiveConnection,
    onSuccess: (nextConnection) => {
      setConnection(nextConnection)
      setSelectedTable(null)
      setTableSearch('')
      runQueryMutation.reset()
    },
  })

  const tablesQuery = useQuery({
    queryKey: ['tables', connection?.id],
    queryFn: () => getTables(connection?.id),
    enabled: Boolean(connection?.id),
    staleTime: 30 * 1000,
  })

  const schemaQuery = useQuery({
    queryKey: ['schema', connection?.id, selectedTable?.schema, selectedTable?.name],
    queryFn: () => getSchema(connection?.id, selectedTable as TableInfo),
    enabled: Boolean(connection?.id && selectedTable),
    staleTime: 5 * 60 * 1000,
  })

  const filteredTables = useMemo(() => {
    const source = tablesQuery.data ?? []
    const needle = tableSearch.trim().toLowerCase()

    if (!needle) {
      return source
    }

    return source.filter((table) =>
      `${table.schema}.${table.name}`.toLowerCase().includes(needle),
    )
  }, [tableSearch, tablesQuery.data])

  const handleRunQuery = (nextQuery?: string) => {
    if (!connection?.id) {
      setConnectionDialogOpen(true)
      return
    }

    const sql = (nextQuery ?? query).trim()
    if (!sql) {
      return
    }

    runQueryMutation.mutate({
      connectionId: connection.id,
      sql,
    })
  }

  const handleSelectTable = (table: TableInfo) => {
    setSelectedTable(table)
    setQuery(table.previewQuery)
    handleRunQuery(table.previewQuery)
  }

  const handleSelectConnection = (nextConnection: ConnectionSummary) => {
    if (connection?.id === nextConnection.id) {
      return
    }

    activateConnectionMutation.mutate(nextConnection.id)
  }

  const handleSidebarResizeStart = (event: ReactPointerEvent<HTMLDivElement>) => {
    const startX = event.clientX
    const startWidth = sidebarWidth

    const handlePointerMove = (moveEvent: PointerEvent) => {
      setSidebarWidth(clampSidebarWidth(startWidth + moveEvent.clientX - startX))
    }

    const handlePointerUp = () => {
      window.removeEventListener('pointermove', handlePointerMove)
      window.removeEventListener('pointerup', handlePointerUp)
    }

    window.addEventListener('pointermove', handlePointerMove)
    window.addEventListener('pointerup', handlePointerUp)
  }

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const commandKey = event.metaKey || event.ctrlKey

      if (commandKey && event.key.toLowerCase() === 'p') {
        event.preventDefault()
        setCommandPaletteOpen(true)
      }

      if (commandKey && event.shiftKey && event.key.toLowerCase() === 'c') {
        event.preventDefault()
        setConnectionDialogOpen(true)
      }
    }

    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [])

  const layoutStyle = {
    '--sidebar-width': `${isSidebarCollapsed ? 0 : sidebarWidth}px`,
  } as CSSProperties

  const connectionError = connectMutation.error ?? activateConnectionMutation.error

  return (
    <div className="flex h-screen overflow-hidden bg-background text-foreground" style={layoutStyle}>
      {!isSidebarCollapsed ? (
        <>
          <div className="min-w-0 shrink-0" style={{ width: 'var(--sidebar-width)' }}>
            <ConnectionsSidebarTree
              activeConnection={connection}
              connections={connectionsQuery.data ?? []}
              tables={filteredTables}
              selectedTable={selectedTable}
              search={tableSearch}
              isConnectionsLoading={connectionsQuery.isLoading}
              isTablesLoading={tablesQuery.isLoading}
              isActivatingConnection={activateConnectionMutation.isPending}
              onSearchChange={setTableSearch}
              onOpenConnection={() => setConnectionDialogOpen(true)}
              onSelectConnection={handleSelectConnection}
              onSelectTable={handleSelectTable}
              onToggleCollapsed={() => setIsSidebarCollapsed(true)}
            />
          </div>
          <div
            className="w-1 shrink-0 cursor-col-resize border-r border-border bg-muted/20 transition hover:bg-muted/60"
            onPointerDown={handleSidebarResizeStart}
            title="Resize sidebar"
          />
        </>
      ) : null}

      <main className="grid min-w-0 flex-1 grid-rows-[auto_minmax(0,1fr)]">
        <header className="flex items-center justify-between gap-4 border-b border-border px-5 py-3">
          <div className="flex min-w-0 items-center gap-3">
            {isSidebarCollapsed ? (
              <Button
                variant="outline"
                size="icon-sm"
                onClick={() => setIsSidebarCollapsed(false)}
                aria-label="Open sidebar"
              >
                <SidebarSimpleIcon />
              </Button>
            ) : null}

            <div className="min-w-0">
              <p className="text-[11px] uppercase tracking-[0.24em] text-muted-foreground">
                VeloxDB.dev
              </p>
              <p className="truncate text-sm text-foreground">
                {connection
                  ? `Connected to ${connection.database} on ${connection.host}:${connection.port}`
                  : 'Choose a saved connection or create a new one to start querying'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCommandPaletteOpen(true)}
            >
              <SidebarSimpleIcon />
              Palette
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsDark((current) => !current)}
            >
              {isDark ? <SunIcon /> : <MoonIcon />}
              {isDark ? 'Light' : 'Dark'}
            </Button>
            <Button
              size="sm"
              onClick={() => handleRunQuery()}
              disabled={runQueryMutation.isPending}
            >
              <PlayIcon />
              Run query
            </Button>
          </div>
        </header>

        <div className="grid min-h-0 grid-rows-[minmax(0,1fr)_260px]">
          <section className="min-h-0 border-b border-border">
            <Tabs value="query-1" className="flex h-full flex-col gap-0">
              <div className="flex items-center justify-between border-b border-border px-3 py-2">
                <TabsList variant="line">
                  <TabsTrigger value="query-1">Query 1</TabsTrigger>
                </TabsList>
                <div className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
                  Cmd/Ctrl + Enter
                </div>
              </div>

              <TabsContent value="query-1" className="min-h-0 flex-1">
                <SqlEditor
                  value={query}
                  isDark={isDark}
                  onChange={setQuery}
                  onRun={() => handleRunQuery()}
                />
              </TabsContent>
            </Tabs>
          </section>

          <section className="min-h-0">
            <div className="flex items-center justify-between border-b border-border px-5 py-3">
              <div className="min-w-0">
                <p className="text-[11px] uppercase tracking-[0.24em] text-muted-foreground">
                  Results
                </p>
                <p className="truncate text-sm text-foreground">
                  {selectedTable
                    ? `${selectedTable.schema}.${selectedTable.name}`
                    : 'Current query output'}
                </p>
              </div>

              <div className="text-right text-xs text-muted-foreground">
                {schemaQuery.data?.length ? (
                  <span>{schemaQuery.data.length} columns in selected table</span>
                ) : (
                  <span>
                    {runQueryMutation.data
                      ? `${runQueryMutation.data.rowCount} rows in ${runQueryMutation.data.executionMs} ms`
                      : 'No query executed yet'}
                  </span>
                )}
              </div>
            </div>

            <ResultsGrid
              result={runQueryMutation.data ?? null}
              isPending={runQueryMutation.isPending}
            />

            {runQueryMutation.data?.truncated ? (
              <div className="border-t border-border bg-muted/20 px-5 py-2 text-xs text-muted-foreground">
                Result output was truncated to keep the UI responsive.
              </div>
            ) : null}

            {connectionError ? (
              <div className="border-t border-border bg-destructive/10 px-5 py-2 text-xs text-destructive">
                {connectionError.message}
              </div>
            ) : null}

            {runQueryMutation.error ? (
              <div className="border-t border-border bg-destructive/10 px-5 py-2 text-xs text-destructive">
                {runQueryMutation.error.message}
              </div>
            ) : null}
          </section>
        </div>
      </main>

      <ConnectionDialog
        open={connectionDialogOpen}
        onOpenChange={setConnectionDialogOpen}
        onSubmit={async (values) => {
          await connectMutation.mutateAsync(values)
        }}
        isPending={connectMutation.isPending}
      />

      <CommandPalette
        open={commandPaletteOpen}
        onOpenChange={setCommandPaletteOpen}
        tables={filteredTables}
        hasLastQuery={Boolean(lastQuery)}
        onOpenConnection={() => setConnectionDialogOpen(true)}
        onRunLastQuery={() => {
          if (lastQuery) {
            setQuery(lastQuery)
            handleRunQuery(lastQuery)
          }
        }}
        onSelectTable={handleSelectTable}
      />
    </div>
  )
}

export default App
