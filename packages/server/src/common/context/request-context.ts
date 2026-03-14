import { AsyncLocalStorage } from 'async_hooks'

export interface RequestContextStore {
  traceId: string
  userId?: number
}

export const requestContext = new AsyncLocalStorage<RequestContextStore>()

/** Get the current trace ID, or 'unknown' if outside request scope */
export function getTraceId(): string {
  return requestContext.getStore()?.traceId ?? 'unknown'
}

/** Get the current user ID, or undefined if not authenticated */
export function getUserId(): number | undefined {
  return requestContext.getStore()?.userId
}
