import { Injectable, NestMiddleware, ForbiddenException } from '@nestjs/common'
import { Request, Response, NextFunction } from 'express'
import { randomBytes } from 'crypto'

/**
 * CSRF Double-Submit Cookie pattern.
 *
 * - Every response sets an `XSRF-TOKEN` cookie (httpOnly: false so JS can read it).
 * - Mutating requests (POST/PUT/PATCH/DELETE) must include an `X-XSRF-TOKEN` header
 *   whose value matches the cookie. Since a cross-origin attacker cannot read cookies
 *   from this domain (SameSite=Strict), they cannot forge the header.
 *
 * Safe methods (GET/HEAD/OPTIONS) are exempt.
 * Auth endpoints (login, refresh, captcha, wx-login) are also exempt because they
 * are called before the client has a CSRF token.
 */

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS'])

/** Paths relative to the API prefix that are exempt from CSRF validation */
const EXEMPT_PATHS = new Set([
  '/auth/login',
  '/auth/refresh',
  '/auth/captcha',
  '/auth/wx-login',
  '/auth/public-key',
])

@Injectable()
export class CsrfMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction): void {
    // Always set / refresh the CSRF cookie so the client has a token to submit
    let csrfToken = req.cookies?.['XSRF-TOKEN'] as string | undefined
    if (!csrfToken) {
      csrfToken = randomBytes(32).toString('hex')
    }
    res.cookie('XSRF-TOKEN', csrfToken, {
      httpOnly: false, // must be readable by JavaScript
      sameSite: 'strict',
      secure: process.env.NODE_ENV === 'production',
      path: '/',
    })

    // Safe methods — skip validation
    if (SAFE_METHODS.has(req.method)) {
      return next()
    }

    // Check exempt paths (strip the global API prefix to get the relative path)
    const apiPrefix = process.env.API_PREFIX || '/api/v1'
    const relativePath = req.path.startsWith(apiPrefix)
      ? req.path.slice(apiPrefix.length)
      : req.path

    if (EXEMPT_PATHS.has(relativePath)) {
      return next()
    }

    // Validate: X-XSRF-TOKEN header must match the cookie value
    const headerToken = req.headers['x-xsrf-token'] as string | undefined
    if (!headerToken || headerToken !== csrfToken) {
      throw new ForbiddenException('CSRF token mismatch')
    }

    next()
  }
}
