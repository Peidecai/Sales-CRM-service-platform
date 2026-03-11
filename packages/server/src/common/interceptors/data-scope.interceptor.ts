import { Injectable, NestInterceptor, ExecutionContext, CallHandler } from '@nestjs/common'
import { Observable } from 'rxjs'
import { Reflector } from '@nestjs/core'

/**
 * Data scope levels:
 * - 'all'        : can see all data (admin)
 * - 'department' : can see own department's data
 * - 'self'       : can only see own data
 */
export type DataScope = 'all' | 'department' | 'self'

export const DATA_SCOPE_KEY = 'data_scope'

/**
 * Decorator to mark a route with a default data scope override.
 * Usage: @SetMetadata(DATA_SCOPE_KEY, 'department')
 */

/**
 * DataScopeInterceptor — injects `dataScope` into request so Service
 * layer can apply WHERE conditions (userId / departmentId / none).
 */
@Injectable()
export class DataScopeInterceptor implements NestInterceptor {
  constructor(private reflector: Reflector) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context.switchToHttp().getRequest<{
      user: { id: number; role: string; departmentId?: number }
      dataScope?: { scope: DataScope; userId?: number; departmentId?: number }
    }>()

    const user = request.user
    if (!user) {
      return next.handle()
    }

    // Determine scope from user role
    let scope: DataScope = 'self'
    if (user.role === 'admin') {
      scope = 'all'
    } else if (user.role === 'manager') {
      scope = 'department'
    }

    // Allow explicit override via decorator
    const explicit = this.reflector.getAllAndOverride<DataScope>(DATA_SCOPE_KEY, [
      context.getHandler(),
      context.getClass(),
    ])
    if (explicit) {
      scope = explicit
    }

    // Inject scope info into request for service layer consumption
    request.dataScope = {
      scope,
      userId: scope === 'self' ? user.id : undefined,
      departmentId: scope === 'department' ? user.departmentId : undefined,
    }

    return next.handle()
  }
}
