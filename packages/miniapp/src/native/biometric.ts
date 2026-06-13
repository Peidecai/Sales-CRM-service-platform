/**
 * Biometric authentication (fingerprint / Face ID)
 *
 * APP-PLUS: uses plus.fingerprint API (covers both fingerprint and Face ID on iOS)
 * Non-APP: returns unsupported
 *
 * SECURITY NOTE: JWT token is currently stored in uni.storage (plaintext).
 * For production, migrate to platform keychain/keystore (plus.storage encrypted
 * or native keychain plugin) to protect tokens on rooted/jailbroken devices.
 */

export interface BiometricStatus {
  supported: boolean
  type?: 'fingerprint' | 'face' | 'unknown'
}

export interface BiometricAuthResult {
  success: boolean
  error?: string
}

const BIOMETRIC_ENABLED_KEY = 'crm_biometric_enabled'

/**
 * Check if biometric authentication is available on this device.
 */
export function checkBiometricAvailable(): BiometricStatus {
  // #ifdef APP-PLUS
  try {
    const supported = plus.fingerprint.isSupport()
    if (!supported) {
      return { supported: false }
    }

    // Detect biometric type
    const platform = uni.getSystemInfoSync().platform
    let type: BiometricStatus['type'] = 'unknown'

    if (platform === 'ios') {
      // iOS: check if enrolled — Face ID or Touch ID via same API
      // plus.fingerprint.isKeyguardSecure() can help but type detection
      // is best done by checking device model
      try {
        const model = uni.getSystemInfoSync().model || ''
        // iPhone X and later (no home button) use Face ID
        const faceIdModels = /iPhone1[0-9]|iPhone[2-9]\d/
        type = faceIdModels.test(model) ? 'face' : 'fingerprint'
      } catch {
        type = 'unknown'
      }
    } else if (platform === 'android') {
      type = 'fingerprint'
    }

    return { supported: true, type }
  } catch (e) {
    console.warn('[Biometric] Check failed:', e)
    return { supported: false }
  }
  // #endif

  // #ifndef APP-PLUS
  return { supported: false }
  // #endif
}

/**
 * Perform biometric authentication with a reason message.
 * Returns { success: true } on success, { success: false, error } on failure/cancel.
 */
export function authenticate(reason?: string): Promise<BiometricAuthResult> {
  // #ifdef APP-PLUS
  try {
    return new Promise<BiometricAuthResult>((resolve) => {
      plus.fingerprint.authenticate(
        () => {
          resolve({ success: true })
        },
        (err: { code?: number; message?: string }) => {
          let error: string
          switch (err.code ?? -1) {
            case 1:
              error = '验证失败，请重试'
              break
            case 2:
              error = '验证失败次数过多，请稍后再试'
              break
            case 3:
              error = '已取消验证'
              break
            case 4:
              error = '未录入生物识别信息'
              break
            case 5:
              error = '设备不支持生物识别'
              break
            default:
              error = err.message || `验证失败 (${err.code})`
          }
          resolve({ success: false, error })
        },
        {
          message: reason || 'CRM 身份验证',
        },
      )
    })
  } catch (e) {
    console.warn('[Biometric] Authentication error:', e)
    return Promise.resolve({ success: false, error: '生物识别不可用' })
  }
  // #endif

  // #ifndef APP-PLUS
  return Promise.resolve({ success: false, error: '当前平台不支持生物识别' })
  // #endif
}

/**
 * Check if the user has enabled biometric login
 */
export function isBiometricEnabled(): boolean {
  try {
    return uni.getStorageSync(BIOMETRIC_ENABLED_KEY) === 'true'
  } catch {
    return false
  }
}

/**
 * Enable or disable biometric login
 */
export function setBiometricEnabled(enabled: boolean): void {
  try {
    if (enabled) {
      uni.setStorageSync(BIOMETRIC_ENABLED_KEY, 'true')
    } else {
      uni.removeStorageSync(BIOMETRIC_ENABLED_KEY)
    }
  } catch (e) {
    console.warn('[Biometric] Failed to save preference:', e)
  }
}
