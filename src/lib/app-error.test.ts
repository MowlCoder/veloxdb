import { classifyMessage, normalizeError } from '@/lib/app-error'
import { describe, expect, it } from 'vitest'

describe('adapter decode error normalization', () => {
  it('classifies MySQL decode mismatch as query error', () => {
    const message =
      "MySQL decode error in get_tables at column 'table_schema' (index 0): mismatched types"
    expect(classifyMessage(message)).toBe('query')
    expect(normalizeError(message).category).toBe('query')
  })

  it('classifies SQLite decode mismatch as query error', () => {
    const message =
      "SQLite decode error in get_schema at column 'name' (index 0): unsupported value type"
    expect(classifyMessage(message)).toBe('query')
    expect(normalizeError(message).category).toBe('query')
  })

  it('classifies MySQL unknown column as query error', () => {
    const message = "Unknown column 'full_name' in 'field list'"
    expect(classifyMessage(message)).toBe('query')
    expect(normalizeError(message).category).toBe('query')
  })

  it('classifies SQLite no such table as query error', () => {
    const message = 'no such table: users'
    expect(classifyMessage(message)).toBe('query')
    expect(normalizeError(message).category).toBe('query')
  })
})
