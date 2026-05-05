/**
 * Native phone call wrapper.
 *
 * Wraps uni.makePhoneCall with SIM card selection support on Android.
 * Falls back to the standard dialer on iOS and non-APP platforms.
 */

import { getPreferredSimSlot } from './sim-card'

export interface CallOptions {
  phoneNumber: string
  simSlot?: number
}

export interface CallResult {
  success: boolean
  method: 'native' | 'sim-select' | 'standard'
}

export async function makeCall(options: CallOptions): Promise<CallResult> {
  const phoneNumber = normalizeDialablePhone(options.phoneNumber)
  if (!phoneNumber) return { success: false, method: 'standard' }

  const simSlot = options.simSlot ?? getPreferredSimSlot()

  // #ifdef APP-PLUS
  try {
    const platform = uni.getSystemInfoSync().platform

    if (simSlot !== null && platform === 'android') {
      const result = makeCallWithSim(phoneNumber, simSlot)
      if (result.success) return result
      return await makeStandardCall(phoneNumber, 'standard')
    }

    return await makeStandardCall(phoneNumber, 'native')
  } catch (e) {
    console.warn('[PhoneCall] Native call failed, falling back:', e)
    return makeStandardCall(phoneNumber, 'standard')
  }
  // #endif

  // #ifndef APP-PLUS
  return makeStandardCall(phoneNumber, 'standard')
  // #endif
}

function normalizeDialablePhone(value: string): string {
  return value.trim().replace(/[^\d+]/g, '')
}

function makeCallWithSim(phoneNumber: string, simSlot: number): CallResult {
  // #ifdef APP-PLUS
  try {
    // Android 没有统一的双卡拨号 API，这些 extra 是厂商 ROM 常见兼容字段。
    const Intent = plus.android.importClass('android.content.Intent') as unknown as AndroidIntentClass
    const Uri = plus.android.importClass('android.net.Uri') as unknown as AndroidUriClass
    const intent = new Intent(Intent.ACTION_CALL, Uri.parse(`tel:${phoneNumber}`))
    intent.putExtra('com.android.phone.extra.slot', simSlot)
    const activity = plus.android.runtimeMainActivity() as unknown as AndroidActivityInstance
    activity.startActivity(intent)
    return { success: true, method: 'sim-select' }
  } catch (e) {
    console.warn('[PhoneCall] SIM select call failed:', e)
    return { success: false, method: 'sim-select' }
  }
  // #endif

  // #ifndef APP-PLUS
  return { success: false, method: 'sim-select' }
  // #endif
}

function makeStandardCall(
  phoneNumber: string,
  method: 'native' | 'standard',
): Promise<CallResult> {
  return new Promise((resolve) => {
    uni.makePhoneCall({
      phoneNumber,
      success: () => resolve({ success: true, method }),
      fail: () => resolve({ success: false, method }),
    })
  })
}
