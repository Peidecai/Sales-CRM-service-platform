/**
 * Dual SIM card detection
 *
 * APP-PLUS (Android): reads SIM info via TelephonyManager + SubscriptionManager
 * APP-PLUS (iOS): returns { supported: false } — iOS does not expose SIM APIs
 * Non-APP: returns { supported: false }
 */

export interface SimInfo {
  slot: number       // 0 | 1
  carrier: string    // carrier name
  phoneNumber?: string
  iccId?: string     // SIM serial (partial, for identification)
}

export interface SimDetectionResult {
  supported: boolean
  cards: SimInfo[]
}

const SIM_PREFERENCE_KEY = 'crm_sim_preference'

/**
 * Detect available SIM cards.
 * Only functional on Android APP-PLUS builds.
 */
export function getSimCards(): SimDetectionResult {
  // #ifdef APP-PLUS
  try {
    const platform = uni.getSystemInfoSync().platform
    if (platform === 'android') {
      return detectAndroidSim()
    }
    // iOS does not support SIM card reading
    return { supported: false, cards: [] }
  } catch (e) {
    console.warn('[SimCard] Detection failed:', e)
    return { supported: false, cards: [] }
  }
  // #endif

  // #ifndef APP-PLUS
  return { supported: false, cards: [] }
  // #endif
}

/**
 * Android SIM card detection via SubscriptionManager (API 22+) with TelephonyManager fallback
 */
function detectAndroidSim(): SimDetectionResult {
  // #ifdef APP-PLUS
  try {
    const cards: SimInfo[] = []
    const Context = plus.android.importClass('android.content.Context')
    const activity = plus.android.runtimeMainActivity()

    // Try SubscriptionManager first (Android 5.1+, API 22)
    try {
      const SubscriptionManager = plus.android.importClass(
        'android.telephony.SubscriptionManager',
      )
      const subManager = SubscriptionManager.from(activity)
      if (subManager) {
        const subList = subManager.getActiveSubscriptionInfoList()
        if (subList) {
          const count = subList.size() as number
          for (let i = 0; i < count; i++) {
            const subInfo = subList.get(i) as Record<string, unknown>
            const slot = (subInfo.getSimSlotIndex?.() as number) ?? i
            const carrier = (subInfo.getCarrierName?.() as string) ?? '未知运营商'
            const number = (subInfo.getNumber?.() as string) ?? undefined
            const iccId = (subInfo.getIccId?.() as string) ?? undefined

            cards.push({
              slot,
              carrier: String(carrier),
              phoneNumber: number ? String(number) : undefined,
              iccId: iccId ? String(iccId).slice(-4) : undefined,
            })
          }
        }
      }
    } catch {
      // SubscriptionManager not available, fall through to TelephonyManager
    }

    // Fallback: TelephonyManager for primary SIM
    if (cards.length === 0) {
      try {
        const tm = activity.getSystemService(Context.TELEPHONY_SERVICE)
        if (tm) {
          const carrier = (tm as Record<string, unknown>).getSimOperatorName?.() as string | undefined
          const number = (tm as Record<string, unknown>).getLine1Number?.() as string | undefined
          if (carrier) {
            cards.push({
              slot: 0,
              carrier: String(carrier),
              phoneNumber: number ? String(number) : undefined,
            })
          }
        }
      } catch {
        // Permission denied or unavailable
      }
    }

    return { supported: cards.length > 0, cards }
  } catch (e) {
    console.warn('[SimCard] Android detection error:', e)
    return { supported: false, cards: [] }
  }
  // #endif

  // #ifndef APP-PLUS
  return { supported: false, cards: [] }
  // #endif
}

/**
 * Get the user's preferred SIM slot for outbound calls
 */
export function getPreferredSimSlot(): number | null {
  try {
    const val = uni.getStorageSync(SIM_PREFERENCE_KEY) as string
    if (val === '0' || val === '1') {
      return Number(val)
    }
    return null
  } catch {
    return null
  }
}

/**
 * Set the user's preferred SIM slot
 */
export function setPreferredSimSlot(slot: number | null): void {
  try {
    if (slot === null) {
      uni.removeStorageSync(SIM_PREFERENCE_KEY)
    } else {
      uni.setStorageSync(SIM_PREFERENCE_KEY, String(slot))
    }
  } catch (e) {
    console.warn('[SimCard] Failed to save preference:', e)
  }
}

/**
 * Make a phone call with a specific SIM slot (Android only).
 * Falls back to default uni.makePhoneCall if slot selection is not possible.
 */
export function makeCallWithSim(phoneNumber: string, simSlot?: number): void {
  // #ifdef APP-PLUS
  try {
    const platform = uni.getSystemInfoSync().platform
    if (platform === 'android' && simSlot !== undefined) {
      const Intent = plus.android.importClass('android.content.Intent')
      const Uri = plus.android.importClass('android.net.Uri')
      const activity = plus.android.runtimeMainActivity()

      const uri = Uri.parse(`tel:${phoneNumber}`)
      const intent = new Intent(Intent.ACTION_CALL, uri)

      // Set SIM slot via subscription ID
      try {
        const SubscriptionManager = plus.android.importClass(
          'android.telephony.SubscriptionManager',
        )
        const subManager = SubscriptionManager.from(activity)
        if (subManager) {
          const subList = subManager.getActiveSubscriptionInfoList()
          if (subList && subList.size() > simSlot) {
            const subInfo = subList.get(simSlot) as Record<string, unknown>
            const subId = subInfo.getSubscriptionId?.() as number
            if (subId !== undefined) {
              intent.putExtra('android.telecom.extra.PHONE_ACCOUNT_HANDLE', subId)
            }
          }
        }
      } catch {
        // Slot selection failed, proceed with default
      }

      activity.startActivity(intent)
      return
    }
  } catch (e) {
    console.warn('[SimCard] makeCallWithSim failed, using default:', e)
  }
  // #endif

  uni.makePhoneCall({ phoneNumber })
}
