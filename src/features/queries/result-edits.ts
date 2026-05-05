import type { ColumnProperties, TableInfo } from '@/data/types'

export type ResultRow = Record<string, string | null>

export type ResultEditPatch = {
  rowId: string
  primaryKey: Record<string, string | null>
  changes: Record<string, string | null>
}

export type SaveResultEditsRequest = {
  connectionId?: string
  table: TableInfo
  patches: ResultEditPatch[]
}

function quoteIdentifier(identifier: string) {
  return `"${identifier.replaceAll('"', '""')}"`
}

function sqlLiteral(value: string | null) {
  if (value === null) {
    return 'NULL'
  }

  return `'${value.replaceAll("'", "''")}'`
}

function buildWhereClause(primaryKey: Record<string, string | null>) {
  const entries = Object.entries(primaryKey)
  if (entries.length === 0) {
    return ''
  }

  return entries
    .map(([columnName, columnValue]) => {
      if (columnValue === null) {
        return `${quoteIdentifier(columnName)} IS NULL`
      }

      return `${quoteIdentifier(columnName)} = ${sqlLiteral(columnValue)}`
    })
    .join(' AND ')
}

export function buildUpdateStatements(request: SaveResultEditsRequest) {
  const tableName = `${quoteIdentifier(request.table.schema)}.${quoteIdentifier(request.table.name)}`

  return request.patches
    .map((patch) => {
      const assignments = Object.entries(patch.changes)
        .map(([columnName, value]) => `${quoteIdentifier(columnName)} = ${sqlLiteral(value)}`)
        .join(', ')
      const whereClause = buildWhereClause(patch.primaryKey)

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
  table: TableInfo
  columns: InsertRowColumnValue[]
}

export type DeleteRowsRequest = {
  connectionId?: string
  table: TableInfo
  primaryKeys: Record<string, string | null>[]
}

export function buildDeleteStatements(request: DeleteRowsRequest): string {
  const tableName = `${quoteIdentifier(request.table.schema)}.${quoteIdentifier(request.table.name)}`
  return request.primaryKeys
    .map((pk) => {
      const whereClause = buildWhereClause(pk)
      if (!whereClause) return ''
      return `DELETE FROM ${tableName} WHERE ${whereClause};`
    })
    .filter(Boolean)
    .join('\n')
}

export function buildInsertStatement(request: InsertRowRequest): string {
  const tableName = `${quoteIdentifier(request.table.schema)}.${quoteIdentifier(request.table.name)}`
  if (request.columns.length === 0) {
    return `INSERT INTO ${tableName}\nDEFAULT VALUES;`
  }

  const columnList = request.columns.map((c) => quoteIdentifier(c.columnName)).join(', ')
  const values = request.columns.map((c) => sqlLiteral(c.value)).join(', ')
  return `INSERT INTO ${tableName} (${columnList})\nVALUES (${values});`
}
