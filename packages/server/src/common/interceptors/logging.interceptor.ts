import { Injectable, NestInterceptor, ExecutionContext, CallHandler, Logger } from '@nestjs/common'
import { Observable } from 'rxjs'
import { tap } from 'rxjs/operators'
import { Request } from 'express'
import { getTraceId, requestContext } from '../context/request-context'

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger('HTTP')

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context.switchToHttp().getRequest<Request>()
    const { method, url } = request
    const now = Date.now()

    // Populate userId in the context store after auth guard has run
    const store = requestContext.getStore()
    const user = request.user as { id?: number } | undefined
    if (store && user?.id) {
      store.userId = user.id
    }

    const traceId = getTraceId()

    return next.handle().pipe(
      tap(() => {
        const elapsed = Date.now() - now
        const userId = store?.userId ?? '-'
        this.logger.log(`[${traceId}] user=${userId} ${method} ${url} — ${elapsed}ms`)
      }),
    )
  }
}
