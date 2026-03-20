/**
 * Error Reporter — captures and reports errors to backend
 *
 * - Development: console.error only
 * - Production: POST /api/v1/app/error-report
 */

const BASE_URL = import.meta.env.VITE_API_BASE_URL
const isDev = import.meta.env.DEV

interface ErrorReport {
  message: string
  stack?: string
  page?: string
  timestamp: number
  deviceInfo: Record<string, unknown>
  appVersion: string
  userId?: string
}

function getDeviceInfo(): Record<string, unknown> {
  try {
    const info = uni.getSystemInfoSync()
    return {
      brand: info.brand,
      model: info.model,
      system: info.system,
      platform: info.platform,
      version: info.version,
      SDKVersion: info.SDKVersion,
      screenWidth: info.screenWidth,
      screenHeight: info.screenHeight,
    }
  } catch {
    return {}
  }
}

function getCurrentPagePath(): string {
  try {
    const pages = getCurrentPages()
    if (pages.length > 0) {
      return pages[pages.length - 1].route || ''
    }
  } catch {
    // ignore
  }
  return ''
}

function getUserId(): string | undefined {
  try {
    const token = uni.getStorageSync('crm_token') as string
    if (!token) return undefined
    // Decode JWT payload to extract userId (base64url)
    const parts = token.split('.')
    if (parts.length < 2) return undefined
    const payload = JSON.parse(decodeURIComponent(escape(atob(parts[1])))) as { sub?: string }
    return payload.sub
  } catch {
    return undefined
  }
}

function getAppVersion(): string {
  try {
    const info = uni.getAccountInfoSync()
    return info.miniProgram?.version || info.miniProgram?.envVersion || 'unknown'
  } catch {
    return 'unknown'
  }
}

/**
 * Report an error. In dev mode, only logs to console.
 * In production, sends to backend error-report endpoint.
 */
export function reportError(error: string | Error): void {
  const message = typeof error === 'string' ? error : error.message
  const stack = typeof error === 'string' ? undefined : error.stack

  const report: ErrorReport = {
    message,
    stack,
    page: getCurrentPagePath(),
    timestamp: Date.now(),
    deviceInfo: getDeviceInfo(),
    appVersion: getAppVersion(),
    userId: getUserId(),
  }

  if (isDev) {
    console.error('[ErrorReporter]', report)
    return
  }

  // Production: send to backend, fire-and-forget
  try {
    uni.request({
      url: `${BASE_URL}/app/error-report`,
      method: 'POST',
      header: { 'Content-Type': 'application/json' },
      data: report as unknown as UniApp.RequestOptions['data'],
      fail: () => {
        // Silently ignore report failures
      },
    })
  } catch {
    // Silently ignore
  }
}

/**
 * Report an API error with additional context
 */
export function reportApiError(url: string, statusCode: number, message: string): void {
  reportError(new Error(`API Error [${statusCode}] ${url}: ${message}`))
}
