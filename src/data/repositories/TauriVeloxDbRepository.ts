import { invoke } from '@tauri-apps/api/core'

import type {
  ConnectionInput,
  ConnectionSummary,
  ColumnInfo,
  ColumnProperties,
  QueryRequest,
  QueryResult,
  TableInfo,
  TablePropertiesApplyRequest,
} from '@/data/types'
import type { VeloxDbRepository } from '@/data/repositories/VeloxDbRepository'

/**
 * Tauri implementation of the VeloxDbRepository interface.
 */
export class TauriVeloxDbRepository implements VeloxDbRepository {
  async connectDb(input: ConnectionInput): Promise<ConnectionSummary> {
    return invoke<ConnectionSummary>('connect_db', { input })
  }

  async listConnections(): Promise<ConnectionSummary[]> {
    return invoke<ConnectionSummary[]>('list_connections_command')
  }

  async setActiveConnection(connectionId: string): Promise<ConnectionSummary> {
    return invoke<ConnectionSummary>('set_active_connection', { connectionId })
  }

  async runQuery(request: QueryRequest): Promise<QueryResult> {
    return invoke<QueryResult>('run_query', { input: request })
  }

  async getTables(connectionId?: string): Promise<TableInfo[]> {
    return invoke<TableInfo[]>('get_tables', { connectionId })
  }

  async getSchema(connectionId: string | undefined, table: TableInfo): Promise<ColumnInfo[]> {
    return invoke<ColumnInfo[]>('get_schema', {
      input: {
        connectionId,
        tableSchema: table.schema,
        tableName: table.name,
      },
    })
  }

  async getTableProperties(
    connectionId: string | undefined,
    table: TableInfo,
  ): Promise<ColumnProperties[]> {
    return invoke<ColumnProperties[]>('get_table_properties', {
      input: {
        connectionId,
        tableSchema: table.schema,
        tableName: table.name,
      },
    })
  }

  async applyTableProperties(request: TablePropertiesApplyRequest): Promise<void> {
    await invoke('apply_table_properties', { input: request })
  }
}

