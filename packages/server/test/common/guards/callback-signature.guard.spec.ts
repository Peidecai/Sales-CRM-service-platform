import { ExecutionContext, ForbiddenException } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { createHmac } from 'crypto'
import { CallbackSignatureGuard } from '../../../src/common/guards/callback-signature.guard'

function makeConfigService(secret = 'test-app-secret'): ConfigService {
  return {
    get: jest.fn((_key: string, defaultVal?: string) => secret || defaultVal),
  } as unknown as ConfigService
}

function makeExecutionContext(
  headers: Record<string, string> = {},
  body: Record<string, unknown> = {},
): ExecutionContext {
  return {
    switchToHttp: () => ({
      getRequest: () => ({ headers, body }),
    }),
  } as unknown as ExecutionContext
}

function computeSignature(
  secret: string,
  body: Record<string, unknown>,
): string {
  const keys = Object.keys(body)
    .filter((k) => k !== 'signature')
    .sort()
  const payload = keys.map((k) => `${k}=${body[k]}`).join('&')
  return createHmac('sha256', secret).update(payload).digest('hex')
}

describe('CallbackSignatureGuard', () => {
  const SECRET = 'test-app-secret'

  afterEach(() => jest.restoreAllMocks())

  /* ---------- Missing secret ---------- */

  it('should throw ForbiddenException when secret is not configured', () => {
    const guard = new CallbackSignatureGuard(makeConfigService(''))
    const ctx = makeExecutionContext(
      { 'x-signature': 'abc' },
      { data: 'hello' },
    )

    expect(() => guard.canActivate(ctx)).toThrow(ForbiddenException)
    expect(() => guard.canActivate(ctx)).toThrow(
      'Callback signature not configured',
    )
  })

  /* ---------- Missing signature ---------- */

  it('should throw ForbiddenException when signature is missing from request', () => {
    const guard = new CallbackSignatureGuard(makeConfigService())
    const ctx = makeExecutionContext({}, { data: 'hello' })

    expect(() => guard.canActivate(ctx)).toThrow(ForbiddenException)
    expect(() => guard.canActivate(ctx)).toThrow('Missing callback signature')
  })

  /* ---------- Signature from x-signature header ---------- */

  it('should accept valid signature from x-signature header', () => {
    const guard = new CallbackSignatureGuard(makeConfigService())
    const body = { action: 'complete', callId: '123' }
    const sig = computeSignature(SECRET, body)
    const ctx = makeExecutionContext({ 'x-signature': sig }, body)

    expect(guard.canActivate(ctx)).toBe(true)
  })

  /* ---------- Signature from x-callback-signature header ---------- */

  it('should accept valid signature from x-callback-signature header', () => {
    const guard = new CallbackSignatureGuard(makeConfigService())
    const body = { event: 'done', id: '456' }
    const sig = computeSignature(SECRET, body)
    const ctx = makeExecutionContext({ 'x-callback-signature': sig }, body)

    expect(guard.canActivate(ctx)).toBe(true)
  })

  /* ---------- Signature from body.signature ---------- */

  it('should accept valid signature from body.signature field', () => {
    const guard = new CallbackSignatureGuard(makeConfigService())
    const bodyData = { event: 'done', id: '789' }
    const sig = computeSignature(SECRET, bodyData)
    const fullBody = { ...bodyData, signature: sig }
    const ctx = makeExecutionContext({}, fullBody)

    expect(guard.canActivate(ctx)).toBe(true)
  })

  /* ---------- Invalid signature ---------- */

  it('should throw ForbiddenException for invalid signature', () => {
    const guard = new CallbackSignatureGuard(makeConfigService())
    const body = { action: 'callback', callId: '100' }
    const ctx = makeExecutionContext(
      { 'x-signature': 'deadbeef'.repeat(8) },
      body,
    )

    expect(() => guard.canActivate(ctx)).toThrow(ForbiddenException)
    expect(() => guard.canActivate(ctx)).toThrow('Invalid callback signature')
  })

  /* ---------- Case-insensitive comparison ---------- */

  it('should accept uppercase signature (case-insensitive)', () => {
    const guard = new CallbackSignatureGuard(makeConfigService())
    const body = { key: 'value' }
    const sig = computeSignature(SECRET, body).toUpperCase()
    const ctx = makeExecutionContext({ 'x-signature': sig }, body)

    expect(guard.canActivate(ctx)).toBe(true)
  })

  /* ---------- Empty body ---------- */

  it('should handle empty object body', () => {
    const guard = new CallbackSignatureGuard(makeConfigService())
    const body = {}
    const sig = computeSignature(SECRET, body) // HMAC of empty string
    const ctx = makeExecutionContext({ 'x-signature': sig }, body)

    expect(guard.canActivate(ctx)).toBe(true)
  })

  /* ---------- Sorted keys ---------- */

  it('should sort body keys for signature verification', () => {
    const guard = new CallbackSignatureGuard(makeConfigService())
    // Keys out of alphabetical order
    const body = { zebra: '1', alpha: '2', middle: '3' }
    const sig = computeSignature(SECRET, body)
    const ctx = makeExecutionContext({ 'x-signature': sig }, body)

    expect(guard.canActivate(ctx)).toBe(true)
  })

  /* ---------- null / non-object body ---------- */

  it('should handle null body gracefully', () => {
    const guard = new CallbackSignatureGuard(makeConfigService())
    const sig = createHmac('sha256', SECRET).update('').digest('hex')
    const ctx = {
      switchToHttp: () => ({
        getRequest: () => ({
          headers: { 'x-signature': sig },
          body: null,
        }),
      }),
    } as unknown as ExecutionContext

    expect(guard.canActivate(ctx)).toBe(true)
  })

  /* ---------- Signature excludes 'signature' key from body ---------- */

  it('should exclude signature key from body when computing HMAC', () => {
    const guard = new CallbackSignatureGuard(makeConfigService())
    const bodyWithoutSig = { action: 'test', id: '1' }
    const sig = computeSignature(SECRET, bodyWithoutSig)
    // Body includes signature field but it should be excluded from HMAC
    const fullBody = { ...bodyWithoutSig, signature: sig }
    const ctx = makeExecutionContext({}, fullBody)

    expect(guard.canActivate(ctx)).toBe(true)
  })
})
