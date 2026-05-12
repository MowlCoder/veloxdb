import type { ColumnProperties, DatabaseEngine, TableInfo } from '@/data/types'
import { quoteIdent } from '@/lib/sql-ident'

export type ResultRow = Record<string, string | null>

export type ResultEditPatch = {
  rowId: string
  primaryKey: Record<string, string | null>
  changes: Record<string, string | null>
}

export type SaveResultEditsRequest = {
  connectionId?: string
  engine?: DatabaseEngine
  table: TableInfo
  patches: ResultEditPatch[]
}

function sqlLiteral(value: string | null) {
  if (value === null) {
    return 'NULL'
  }

  return `'${value.replaceAll("'", "''")}'`
}

function buildWhereClause(primaryKey: Record<string, string | null>, engine: DatabaseEngine) {
  const entries = Object.entries(primaryKey)
  if (entries.length === 0) {
    return ''
  }

  return entries
    .map(([columnName, columnValue]) => {
      if (columnValue === null) {
        return `${quoteIdent(columnName, engine)} IS NULL`
      }

      return `${quoteIdent(columnName, engine)} = ${sqlLiteral(columnValue)}`
    })
    .join(' AND ')
}

export function buildUpdateStatements(request: SaveResultEditsRequest) {
  const engine = request.engine ?? 'postgres'
  const tableName = `${quoteIdent(request.table.schema, engine)}.${quoteIdent(request.table.name, engine)}`

  return request.patches
    .map((patch) => {
      const assignments = Object.entries(patch.changes)
        .map(([columnName, value]) => `${quoteIdent(columnName, engine)} = ${sqlLiteral(value)}`)
        .join(', ')
      const whereClause = buildWhereClause(patch.primaryKey, engine)

      if (!assignments || !whereClause) {
        return ''
      }

      return `UPDATE ${tableName} SET ${assignments} WHERE ${whereClause};`
    })
    .filter(Boolean)
}

/** Columns that can appear in a simple INSERT form (skip identity ALWAYS / generated ALWAYS). */
export function isInsertFormColumn(column: ColumnProperties): boolean {
  if (column.isGenerated === 'ALWAYS') {
    return false
  }
  if (column.isIdentity && column.identityGeneration === 'ALWAYS') {
    return false
  }
  return true
}

export type InsertRowColumnValue = {
  columnName: string
  value: string | null
}

export type InsertRowRequest = {
  connectionId: string
  engine?: DatabaseEngine
  table: TableInfo
  columns: InsertRowColumnValue[]
}

export type DeleteRowsRequest = {
  connectionId?: string
  engine?: DatabaseEngine
  table: TableInfo
  primaryKeys: Record<string, string | null>[]
}

export function buildDeleteStatements(request: DeleteRowsRequest): string {
  const engine = request.engine ?? 'postgres'
  const tableName = `${quoteIdent(request.table.schema, engine)}.${quoteIdent(request.table.name, engine)}`
  return request.primaryKeys
    .map((pk) => {
      const whereClause = buildWhereClause(pk, engine)
      if (!whereClause) return ''
      return `DELETE FROM ${tableName} WHERE ${whereClause};`
    })
    .filter(Boolean)
    .join('\n')
}

export function buildInsertStatement(request: InsertRowRequest): string {
  const engine = request.engine ?? 'postgres'
  const tableName = `${quoteIdent(request.table.schema, engine)}.${quoteIdent(request.table.name, engine)}`
  if (request.columns.length === 0) {
    return `INSERT INTO ${tableName}\nDEFAULT VALUES;`
  }

  const columnList = request.columns.map((c) => quoteIdent(c.columnName, engine)).join(', ')
  const values = request.columns.map((c) => sqlLiteral(c.value)).join(', ')
  return `INSERT INTO ${tableName} (${columnList})\nVALUES (${values});`
}
