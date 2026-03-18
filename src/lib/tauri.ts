import type {
  ColumnInfo,
  ConnectionInput,
  ConnectionSummary,
  QueryRequest,
  QueryResult,
  TableInfo,
} from '@/data/types'

import { TauriVeloxDbRepository } from '@/data/repositories/TauriVeloxDbRepository'

export type {
  ColumnInfo,
  ConnectionInput,
  ConnectionSummary,
  QueryRequest,
  QueryResult,
  TableInfo,
}

const repository = new TauriVeloxDbRepository()

export async function connectDb(input: ConnectionInput) {
  return repository.connectDb(input)
}

export async function listConnections() {
  return repository.listConnections()
}

export async function setActiveConnection(connectionId: string) {
  return repository.setActiveConnection(connectionId)
}

export async function runQuery(request: QueryRequest) {
  return repository.runQuery(request)
}

export async function getTables(connectionId?: string) {
  return repository.getTables(connectionId)
}

export async function getSchema(connectionId: string | undefined, table: TableInfo) {
  return repository.getSchema(connectionId, table)
}
