import { invoke } from '@tauri-apps/api/core'

export type ConnectionInput = {
  id?: string
  name: string
  host: string
  port: number
  database: string
  user: string
  password: string
}

export type ConnectionSummary = {
  id: string
  name: string
  host: string
  port: number
  database: string
  user: string
  connectedAt: string
}

export type QueryRequest = {
  connectionId?: string
  sql: string
}

export type TableInfo = {
  schema: string
  name: string
  previewQuery: string
}

export type ColumnInfo = {
  tableSchema: string
  tableName: string
  columnName: string
  dataType: string
  isNullable: boolean
}

export type QueryResult = {
  columns: string[]
  rows: Array<Record<string, string | null>>
  rowCount: number
  executionMs: number
  truncated: boolean
  commandTag: number | null
}

export async function connectDb(input: ConnectionInput) {
  return invoke<ConnectionSummary>('connect_db', { input })
}

export async function listConnections() {
  return invoke<ConnectionSummary[]>('list_connections_command')
}

export async function setActiveConnection(connectionId: string) {
  return invoke<ConnectionSummary>('set_active_connection', { connectionId })
}

export async function runQuery(request: QueryRequest) {
  return invoke<QueryResult>('run_query', { input: request })
}

export async function getTables(connectionId?: string) {
  return invoke<TableInfo[]>('get_tables', { connectionId })
}

export async function getSchema(connectionId: string | undefined, table: TableInfo) {
  return invoke<ColumnInfo[]>('get_schema', {
    input: {
      connectionId,
      tableSchema: table.schema,
      tableName: table.name,
    },
  })
}
