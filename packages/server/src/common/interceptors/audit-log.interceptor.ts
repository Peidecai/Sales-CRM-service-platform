import { Injectable, NestInterceptor, ExecutionContext, CallHandler } from '@nestjs/common'
import { Observable, tap } from 'rxjs'
import { AuditLogService } from '../../modules/audit-log/audit-log.service'
import { AuditAction } from '../../modules/audit-log/audit-log.entity'

const METHOD_ACTION_MAP: Record<string, AuditAction> = {
  POST: AuditAction.CREATE,
  PUT: AuditAction.UPDATE,
  PATCH: AuditAction.UPDATE,
  DELETE: AuditAction.DELETE,
}

@Injectable()
export class AuditLogInterceptor implements NestInterceptor {
  constructor(private readonly auditLogService: AuditLogService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context.switchToHttp().getRequest()
    const method: string = request.method
    const action = METHOD_ACTION_MAP[method]

    // Only audit write operations
    if (!action) {
      return next.handle()
    }

    const user = request.user as { id: number; username: string } | undefined
    if (!user) {
      return next.handle()
    }

    // Extract resource name from controller class name (e.g. CustomerController → customer)
    const controllerName = context.getClass().name
    const resource = controllerName.replace('Controller', '').toLowerCase()

    // Extract resource ID from route params
    const params = request.params as Record<string, string>
    const resourceId = params?.id ? parseInt(params.id, 10) : undefined

    // Get client IP
    const ip = (request.ip as string) || (request.headers['x-forwarded-for'] as string) || ''

    return next.handle().pipe(
      tap((responseData) => {
        // Fire-and-forget: don't block the response
        this.auditLogService
          .log({
            userId: user.id,
            username: user.username,
            action,
            resource,
            resourceId: resourceId || ((responseData as Record<string, unknown>)?.id as number),
            after:
              action === AuditAction.DELETE
                ? null
                : ((responseData as Record<string, unknown>) ?? null),
            responseData: (responseData as Record<string, unknown>) ?? null,
            ip,
          })
          .catch(() => {
            // Silently fail — audit should not break business logic
          })
      }),
    )
  }
}
