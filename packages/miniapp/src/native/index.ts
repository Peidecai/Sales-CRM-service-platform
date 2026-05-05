/**
 * Native capabilities — unified export
 *
 * All native modules use conditional compilation (#ifdef APP-PLUS)
 * and provide graceful fallbacks for non-APP platforms.
 */

export { registerPush, unregisterPush } from './push'
export type { PushRegistrationResult, PushMessage } from './push'

export { getHighAccuracyLocation, checkLocationPermission, requestLocationPermission } from './geo'
export type { LocationResult } from './geo'

export { getSimCards, getPreferredSimSlot, setPreferredSimSlot } from './sim-card'
export type { SimInfo, SimDetectionResult } from './sim-card'

export { scanPhoneNumber, scanBusinessCard } from './camera-ocr'
export type { PhoneScanResult, BusinessCardResult } from './camera-ocr'

export { checkBiometricAvailable, authenticate } from './biometric'
export type { BiometricStatus } from './biometric'

export { makeCall } from './phone-call'
export type { CallOptions, CallResult } from './phone-call'
