import type { ConnectionSslMode, DatabaseEngine } from '@/data/types'

export type ParsedConnectionString = {
  engine: DatabaseEngine
  host: string
  port: number
  database: string
  filePath?: string
  user: string
  password: string
  sslMode: ConnectionSslMode
  extraParams: Record<string, string>
}

const DEFAULT_PG_PORT = 5432
const SSL_MODE_KEY = 'sslmode'

const VALID_SSL_MODES: Set<string> = new Set(['disable', 'prefer', 'require'])

function normalizeUrl(raw: string): string {
  return raw.trim()
}

/**
 * Parses supported connection URIs like:
 *   postgresql://user:password@host:5432/dbname?sslmode=require
 *   mysql://user:password@host:3306/dbname
 *   sqlite:///absolute/path/to/file.db
 *
 * Falls back gracefully — unknown/unsupported params go into extraParams.
 */
export function parseConnectionString(raw: string): ParsedConnectionString | null {
  const trimmed = raw.trim()
  if (trimmed.startsWith('sqlite://')) {
    const path = trimmed.replace(/^sqlite:\/\//, '')
    return {
      engine: 'sqlite',
      host: '',
      port: 0,
      database: path || ':memory:',
      filePath: path || ':memory:',
      user: '',
      password: '',
      sslMode: 'disable',
      extraParams: {},
    }
  }

  const normalized = normalizeUrl(raw)
  if (!normalized.includes('://')) {
    // Require explicit scheme to avoid silently coercing non-Postgres input.
    return null
  }

  let url: URL
  try {
    url = new URL(normalized)
  } catch {
    return null
  }

  const protocol = url.protocol.replace(':', '')
  const engine: DatabaseEngine = protocol.startsWith('mysql') ? 'mysql' : 'postgres'

  const host = decodeURIComponent(url.hostname || '127.0.0.1')
  const defaultPort = engine === 'mysql' ? 3306 : DEFAULT_PG_PORT
  const port = url.port ? Number(url.port) : defaultPort
  const database = decodeURIComponent(url.pathname.replace(/^\//, '') || (engine === 'mysql' ? '' : 'postgres'))
  const user = decodeURIComponent(url.username || (engine === 'mysql' ? '' : 'postgres'))
  const password = decodeURIComponent(url.password || '')

  const params = new URLSearchParams(url.search)
  let sslMode: ConnectionSslMode = engine === 'postgres' ? 'prefer' : 'disable'

  if (params.has(SSL_MODE_KEY)) {
    const rawMode = (params.get(SSL_MODE_KEY) ?? '').toLowerCase()
    if (VALID_SSL_MODES.has(rawMode)) {
      sslMode = rawMode as ConnectionSslMode
    }
    params.delete(SSL_MODE_KEY)
  }

  const extraParams: Record<string, string> = {}
  params.forEach((value, key) => {
    extraParams[key] = value
  })

  return { engine, host, port, database, user, password, sslMode, extraParams }
}

/** Builds a connection URI from individual fields. */
export function buildConnectionString(fields: {
  engine: DatabaseEngine
  user: string
  password: string
  host: string
  port: number
  database: string
  filePath?: string
  sslMode: ConnectionSslMode
  extraParams?: Record<string, string>
}): string {
  if (fields.engine === 'sqlite') {
    const path = fields.filePath || fields.database || ':memory:'
    return `sqlite://${path}`
  }

  const encodedUser = encodeURIComponent(fields.user)
  const encodedPassword = fields.password ? `:${encodeURIComponent(fields.password)}` : ''
  const encodedHost = fields.host.includes(':') ? `[${fields.host}]` : fields.host

  const scheme = fields.engine === 'mysql' ? 'mysql' : 'postgresql'
  let uri = `${scheme}://${encodedUser}${encodedPassword}@${encodedHost}:${fields.port}/${encodeURIComponent(fields.database)}`

  const params = new URLSearchParams()
  if (fields.engine === 'postgres' && fields.sslMode !== 'prefer') {
    params.set('sslmode', fields.sslMode)
  }
  if (fields.extraParams) {
    for (const [key, value] of Object.entries(fields.extraParams)) {
      params.set(key, value)
    }
  }

  const qs = params.toString()
  if (qs) uri += `?${qs}`

  return uri
}
