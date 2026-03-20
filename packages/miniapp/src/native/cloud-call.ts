/**
 * Native phone call wrapper
 *
 * Wraps uni.makePhoneCall with SIM card selection support on Android.
 * Falls back to standard dialer on iOS and non-APP platforms.
 */

import { getPreferredSimSlot } from './sim-card'

export interface CallOptions {
  phoneNumber: string
  simSlot?: number  // Override preferred SIM slot
}

export interface CallResult {
  success: boolean
  method: 'native' | 'sim-select' | 'standard'
}

/**
 * Make a phone call, optionally selecting a specific SIM card.
 * Uses preferred SIM slot from settings if simSlot is not specified.
 */
export async function makeCall(options: CallOptions): Promise<CallResult> {
  const { phoneNumber } = options
  const simSlot = options.simSlot ?? getPreferredSimSlot()

  // #ifdef APP-PLUS
  try {
    const platform = uni.getSystemInfoSync().platform

    // Android with SIM slot selection
    if (simSlot !== null && platform === 'android') {
      return makeCallWithSim(phoneNumber, simSlot)
    }

    // Standard native call
    return await makeStandardCall(phoneNumber, 'native')
  } catch (e) {
    console.warn('[CloudCall] Native call failed, falling back:', e)
    return makeStandardCall(phoneNumber, 'standard')
  }
  // #endif

  // #ifndef APP-PLUS
  return makeStandardCall(phoneNumber, 'standard')
  // #endif
}

/**
 * Android: make a call using a specific SIM slot via Intent
 */
function makeCallWithSim(phoneNumber: string, simSlot: number): CallResult {
  // #ifdef APP-PLUS
  try {
    const Intent = plus.android.importClass('android.content.Intent')
    const Uri = plus.android.importClass('android.net.Uri')
    const intent = new Intent(Intent.ACTION_CALL, Uri.parse(`tel:${phoneNumber}`))
    intent.putExtra('com.android.phone.extra.slot', simSlot)
    const activity = plus.android.runtimeMainActivity()
    activity.startActivity(intent)
    return { success: true, method: 'sim-select' }
  } catch (e) {
    console.warn('[CloudCall] SIM select call failed:', e)
    return { success: false, method: 'sim-select' }
  }
  // #endif

  // #ifndef APP-PLUS
  return { success: false, method: 'sim-select' }
  // #endif
}

/**
 * Standard uni.makePhoneCall wrapper
 */
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
