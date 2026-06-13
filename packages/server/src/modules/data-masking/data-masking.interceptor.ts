import { Injectable, NestInterceptor, ExecutionContext, CallHandler } from '@nestjs/common'
import { Reflector } from '@nestjs/core'
import { Observable } from 'rxjs'
import { map } from 'rxjs/operators'
import type { AuthUser } from '../../common/decorators/current-user.decorator'
import { PermissionCacheService } from '../rbac/permission-cache.service'
import { DataMaskingService } from './data-masking.service'
import { SKIP_MASKING_KEY } from './skip-masking.decorator'

@Injectable()
export class DataMaskingInterceptor implements NestInterceptor {
  constructor(
    private readonly dataMaskingService: DataMaskingService,
    private readonly permissionCacheService: PermissionCacheService,
    private readonly reflector: Reflector,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const skip = this.reflector.getAllAndOverride<boolean>(SKIP_MASKING_KEY, [
      context.getHandler(),
      context.getClass(),
    ])
    if (skip) return next.handle()

    const request = context.switchToHttp().getRequest<{ user?: AuthUser }>()
    const user = request.user

    return next.handle().pipe(
      map(async (responseData) => {
        if (!user || !responseData) return responseData

        const rules = await this.dataMaskingService.getActiveRules()
        if (rules.length === 0) return responseData

        const userPermissions = await this.permissionCacheService.getPermissionCodes(user.id)
        const userRole = user.role

        // Handle standard API response format { code, message, data }
        const data = responseData as Record<string, unknown>
        if (data.code !== undefined && data.data !== undefined) {
          const innerData = data.data
          data.data = this.applyToData(innerData, rules, userRole, userPermissions)
          return data
        }

        // Direct response
        return this.applyToData(responseData, rules, userRole, userPermissions)
      }),
    )
  }

  private applyToData(
    data: unknown,
    rules: import('./entities/data-masking-rule.entity').DataMaskingRule[],
    userRole: string,
    userPermissions: string[],
  ): unknown {
    if (!data || typeof data !== 'object') return data

    const obj = data as Record<string, unknown>

    // Paginated response: { list: [...], total, page, pageSize }
    if (Array.isArray(obj.list)) {
      obj.list = obj.list.map((item: unknown) => {
        if (item && typeof item === 'object') {
          return this.maskRecord(item as Record<string, unknown>, rules, userRole, userPermissions)
        }
        return item
      })
      return obj
    }

    // Array response
    if (Array.isArray(data)) {
      return (data as unknown[]).map((item) => {
        if (item && typeof item === 'object') {
          return this.maskRecord(item as Record<string, unknown>, rules, userRole, userPermissions)
        }
        return item
      })
    }

    // Single object
    return this.maskRecord(obj, rules, userRole, userPermissions)
  }

  private maskRecord(
    record: Record<string, unknown>,
    rules: import('./entities/data-masking-rule.entity').DataMaskingRule[],
    userRole: string,
    userPermissions: string[],
  ): Record<string, unknown> {
    // Detect entity name from known fields or constructor name
    const entityNames = [...new Set(rules.map((r) => r.entityName))]
    for (const entityName of entityNames) {
      record = this.dataMaskingService.applyMasking(
        record,
        entityName,
        rules,
        userRole,
        userPermissions,
      )
    }
    return record
  }
}
