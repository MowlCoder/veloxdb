import type { DatabaseEngine } from '@/data/types'

/** Escape an identifier based on SQL engine conventions. */
export function quoteIdent(ident: string, engine: DatabaseEngine = 'postgres'): string {
  if (engine === 'mysql') {
    return `\`${ident.replace(/`/g, '``')}\``
  }
  return `"${ident.replace(/"/g, '""')}"`
}
