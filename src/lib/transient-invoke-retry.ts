function messageOf(error: unknown): string {
  if (error instanceof Error) {
    return error.message
  }
  return String(error)
}

/**
 * Single extra attempt for invoke failures that look like transport or pool
 * timeouts (aligned with backend `is_retryable_connection_error`).
 */
export function shouldRetryTransientDbInvoke(failureCount: number, error: unknown): boolean {
  if (failureCount !== 0) {
    return false
  }
  const m = messageOf(error).toLowerCase()
  return (
    m.includes('broken pipe') ||
    m.includes('connection reset') ||
    m.includes('connection refused') ||
    m.includes('unexpected eof') ||
    m.includes('unexpected end of file') ||
    m.includes('error communicating with the server') ||
    m.includes('connection closed') ||
    m.includes('closed the connection') ||
    m.includes('server closed the connection') ||
    m.includes('eof has been reached') ||
    m.includes('could not receive data from server') ||
    m.includes('could not send data to server') ||
    m.includes('timeout occurred while waiting') ||
    m.includes('timeout occurred while creating') ||
    m.includes('timeout occurred while recycling')
  )
}
