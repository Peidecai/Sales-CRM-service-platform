import { Injectable, NestInterceptor, ExecutionContext, CallHandler } from '@nestjs/common'
import { Observable } from 'rxjs'
import { map } from 'rxjs/operators'

export interface ResponseData<T> {
  code: number
  message: string
  data: T
  timestamp: string
}

/**
 * Recursively convert Date instances to ISO strings so JSON.stringify
 * does not produce empty objects `{}`.
 */
function serializeDates(value: unknown): unknown {
  if (value instanceof Date) {
    return value.toISOString()
  }
  if (Array.isArray(value)) {
    return value.map(serializeDates)
  }
  if (value !== null && typeof value === 'object') {
    const result: Record<string, unknown> = {}
    for (const [k, v] of Object.entries(value)) {
      result[k] = serializeDates(v)
    }
    return result
  }
  return value
}

@Injectable()
export class ResponseInterceptor<T> implements NestInterceptor<T, ResponseData<T>> {
  intercept(context: ExecutionContext, next: CallHandler): Observable<ResponseData<T>> {
    return next.handle().pipe(
      map((data) => {
        // If already wrapped in our format, don't wrap again
        if (
          data !== null &&
          typeof data === 'object' &&
          'code' in data &&
          'message' in data &&
          'data' in data &&
          typeof (data as Record<string, unknown>).code === 'number'
        ) {
          return serializeDates(data) as ResponseData<T>
        }

        return {
          code: 0,
          message: 'success',
          data: serializeDates(data),
          timestamp: new Date().toISOString(),
        } as ResponseData<T>
      }),
    )
  }
}
