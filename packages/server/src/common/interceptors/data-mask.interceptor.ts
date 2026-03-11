import { Injectable, NestInterceptor, ExecutionContext, CallHandler } from '@nestjs/common'
import { Observable, map } from 'rxjs'

/**
 * Masking rules for sensitive fields in API responses.
 * Maintains a single source of truth for all masking patterns.
 */
const MASK_RULES: Record<string, (value: string) => string> = {
  // 手机号: 138****5678
  phone: (v) => (v.length >= 7 ? v.slice(0, 3) + '****' + v.slice(-4) : v),
  mobile: (v) => (v.length >= 7 ? v.slice(0, 3) + '****' + v.slice(-4) : v),
  // 身份证: 110***********1234
  idCard: (v) => (v.length >= 8 ? v.slice(0, 3) + '*'.repeat(v.length - 7) + v.slice(-4) : v),
  idNumber: (v) => (v.length >= 8 ? v.slice(0, 3) + '*'.repeat(v.length - 7) + v.slice(-4) : v),
  // 邮箱: ab***@domain.com
  email: (v) => {
    const idx = v.indexOf('@')
    if (idx <= 0) return v
    const prefix = v.slice(0, Math.min(2, idx))
    return prefix + '***' + v.slice(idx)
  },
  // 银行卡: ****1234
  bankCard: (v) => (v.length >= 4 ? '****' + v.slice(-4) : v),
  bankAccount: (v) => (v.length >= 4 ? '****' + v.slice(-4) : v),
}

const MASK_KEYS = new Set(Object.keys(MASK_RULES))

@Injectable()
export class DataMaskInterceptor implements NestInterceptor {
  intercept(_context: ExecutionContext, next: CallHandler): Observable<unknown> {
    return next.handle().pipe(map((data) => this.maskDeep(data)))
  }

  private maskDeep(obj: unknown): unknown {
    if (obj === null || obj === undefined) return obj
    if (typeof obj !== 'object') return obj

    if (Array.isArray(obj)) {
      return obj.map((item) => this.maskDeep(item))
    }

    const result: Record<string, unknown> = {}
    for (const [key, value] of Object.entries(obj as Record<string, unknown>)) {
      if (MASK_KEYS.has(key) && typeof value === 'string' && value.length > 0) {
        result[key] = MASK_RULES[key](value)
      } else if (typeof value === 'object' && value !== null) {
        result[key] = this.maskDeep(value)
      } else {
        result[key] = value
      }
    }
    return result
  }
}
