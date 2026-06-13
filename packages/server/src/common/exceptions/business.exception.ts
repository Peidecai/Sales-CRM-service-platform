import { HttpException, HttpStatus } from '@nestjs/common'

/**
 * Business error codes by module.
 *
 * Ranges:
 * - 20000–29999: Customer module
 * - 30000–39999: Opportunity module
 * - 40000–49999: Order / Contract module
 * - 50000–59999: AI module
 * - 90000–99999: General / cross-cutting
 */
export const BizErrorCodes = {
  // ── Customer 20000–29999 ──
  CUSTOMER_DUPLICATE: 20001,
  CUSTOMER_NOT_FOUND: 20002,
  CUSTOMER_IMPORT_FAILED: 20003,
  CUSTOMER_POOL_COOLDOWN: 20004,
  CUSTOMER_POOL_LIMIT: 20005,
  CUSTOMER_HOLDING_LIMIT: 20006,
  CUSTOMER_MERGE_CONFLICT: 20007,

  // ── Opportunity 30000–39999 ──
  OPPORTUNITY_NOT_FOUND: 30001,
  OPPORTUNITY_STAGE_INVALID: 30002,
  OPPORTUNITY_CLOSE_REASON_REQUIRED: 30003,
  OPPORTUNITY_AMOUNT_INVALID: 30004,

  // ── Order / Contract 40000–49999 ──
  CONTRACT_NOT_FOUND: 40001,
  CONTRACT_EXPIRED: 40002,
  QUOTATION_NOT_FOUND: 40003,

  // ── AI 50000–59999 ──
  AI_SERVICE_UNAVAILABLE: 50001,
  AI_QUOTA_EXCEEDED: 50002,
  AI_RESPONSE_PARSE_ERROR: 50003,
  AI_TIMEOUT: 50004,

  // ── General 90000–99999 ──
  RATE_LIMIT_EXCEEDED: 90001,
  PERMISSION_DENIED: 90002,
  RESOURCE_NOT_FOUND: 90003,
  VALIDATION_FAILED: 90004,
  ENCRYPTION_ERROR: 90005,
  EXTERNAL_SERVICE_ERROR: 90006,
} as const

export type BizErrorCode = (typeof BizErrorCodes)[keyof typeof BizErrorCodes]

/**
 * Business exception with a numeric business error code (bizCode).
 *
 * Unlike generic HttpException, BusinessException carries a domain-specific
 * code that the frontend can switch on for precise error handling.
 *
 * Usage:
 *   throw new BusinessException(BizErrorCodes.CUSTOMER_DUPLICATE, '发现重复客户')
 *   throw new BusinessException(BizErrorCodes.AI_QUOTA_EXCEEDED, 'AI 调用配额已用尽', HttpStatus.TOO_MANY_REQUESTS)
 */
export class BusinessException extends HttpException {
  public readonly bizCode: number

  constructor(
    bizCode: BizErrorCode,
    message: string,
    httpStatus: HttpStatus = HttpStatus.BAD_REQUEST,
  ) {
    super({ bizCode, message }, httpStatus)
    this.bizCode = bizCode
  }
}
