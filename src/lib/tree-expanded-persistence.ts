const PREFIX = 'veloxdb.tree-expanded'

export function readExpandedIds(scope: string): string[] {
  try {
    const raw = window.localStorage.getItem(`${PREFIX}.${scope}`)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    return parsed.filter((v): v is string => typeof v === 'string')
  } catch {
    return []
  }
}

export function writeExpandedIds(scope: string, ids: string[]): void {
  try {
    window.localStorage.setItem(`${PREFIX}.${scope}`, JSON.stringify(ids))
  } catch {
    // localStorage full or unavailable — silently ignore
  }
}
