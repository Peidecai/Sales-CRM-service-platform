/**
 * GPS high-accuracy location with conditional compilation
 *
 * APP-PLUS: uses uni.getLocation with isHighAccuracy + native permission requests
 * Non-APP: falls back to standard uni.getLocation (lower accuracy)
 */

export interface LocationResult {
  latitude: number
  longitude: number
  accuracy: number
  address?: string
}

export interface WatchPositionOptions {
  /** Interval in ms between location updates (default 5000) */
  interval?: number
  /** Use high accuracy mode (default true) */
  highAccuracy?: boolean
}

/**
 * Request native location permission on APP-PLUS.
 * On Android, requests ACCESS_FINE_LOCATION at runtime.
 * On iOS, permission is declared in manifest.json (no runtime request needed).
 * Returns true if permission granted or non-APP platform.
 */
export async function requestNativeLocationPermission(): Promise<boolean> {
  // #ifdef APP-PLUS
  try {
    const platform = uni.getSystemInfoSync().platform
    if (platform === 'android') {
      return await new Promise<boolean>((resolve) => {
        plus.android.requestPermissions(
          ['android.permission.ACCESS_FINE_LOCATION'],
          (result) => {
            // granted=0, deniedPresent=1, deniedAlways=2
            if (result.granted && result.granted.length > 0) {
              resolve(true)
            } else {
              console.warn('[Geo] Android fine location permission denied')
              resolve(false)
            }
          },
          (err) => {
            console.warn('[Geo] Android permission request error:', err)
            resolve(false)
          },
        )
      })
    }
    // iOS: permission managed via manifest.json plist
    return true
  } catch (e) {
    console.warn('[Geo] Native permission request failed:', e)
    return false
  }
  // #endif

  // #ifndef APP-PLUS
  // On mini-program platforms, use uni.authorize instead
  return requestLocationPermission()
  // #endif
}

/**
 * Get high-accuracy GPS location.
 * On APP-PLUS: requests native permission first, then uses high-accuracy mode with 5s timeout.
 * On other platforms: falls back to standard location API.
 * Returns null on failure.
 */
export async function getHighAccuracyLocation(): Promise<LocationResult | null> {
  // #ifdef APP-PLUS
  try {
    // Ensure native permission is granted
    const hasPermission = await requestNativeLocationPermission()
    if (!hasPermission) {
      console.warn('[Geo] Location permission not granted')
      return null
    }

    return await new Promise<LocationResult>((resolve, reject) => {
      uni.getLocation({
        type: 'gcj02',
        isHighAccuracy: true,
        highAccuracyExpireTime: 5000,
        geocode: true,
        success: (res) => {
          resolve({
            latitude: res.latitude,
            longitude: res.longitude,
            accuracy: res.accuracy ?? 0,
            address: (res as Record<string, unknown>).address as string | undefined,
          })
        },
        fail: (err) => reject(new Error(err.errMsg ?? 'Location failed')),
      })
    })
  } catch (e) {
    console.warn('[Geo] High-accuracy location failed:', e)
    return null
  }
  // #endif

  // #ifndef APP-PLUS
  try {
    return await new Promise<LocationResult>((resolve, reject) => {
      uni.getLocation({
        type: 'gcj02',
        success: (res) => {
          resolve({
            latitude: res.latitude,
            longitude: res.longitude,
            accuracy: res.accuracy ?? 0,
          })
        },
        fail: (err) => reject(new Error(err.errMsg ?? 'Location failed')),
      })
    })
  } catch (e) {
    console.warn('[Geo] Standard location failed:', e)
    return null
  }
  // #endif
}

/**
 * Check if location permission is authorized
 */
export async function checkLocationPermission(): Promise<boolean> {
  try {
    const res = await new Promise<UniApp.GetSettingRes>((resolve, reject) => {
      uni.getSetting({
        success: resolve,
        fail: reject,
      })
    })
    return !!res.authSetting?.['scope.userLocation']
  } catch {
    return false
  }
}

/**
 * Request location permission from the user (mini-program scope)
 */
export async function requestLocationPermission(): Promise<boolean> {
  try {
    await new Promise<void>((resolve, reject) => {
      uni.authorize({
        scope: 'scope.userLocation',
        success: () => resolve(),
        fail: () => reject(new Error('Permission denied')),
      })
    })
    return true
  } catch {
    return false
  }
}

/**
 * Reverse geocode coordinates to a human-readable address string.
 * APP-PLUS: uses plus.maps geocoding service.
 * Non-APP: returns formatted lat/lng string as fallback.
 */
export async function reverseGeocode(lat: number, lng: number): Promise<string> {
  // #ifdef APP-PLUS
  try {
    return await new Promise<string>((resolve) => {
      const geocoder = new plus.maps.Geocoder()
      const point = new plus.maps.Point(lng, lat)
      geocoder.reverseGeocode(point, {
        onSuccess: (event: { address?: string; result?: { address?: string } }) => {
          const addr = event.address || event.result?.address
          resolve(addr || `${lat.toFixed(6)}, ${lng.toFixed(6)}`)
        },
        onFail: () => {
          resolve(`${lat.toFixed(6)}, ${lng.toFixed(6)}`)
        },
      })
    })
  } catch {
    return `${lat.toFixed(6)}, ${lng.toFixed(6)}`
  }
  // #endif

  // #ifndef APP-PLUS
  return `${lat.toFixed(6)}, ${lng.toFixed(6)}`
  // #endif
}

/**
 * Watch position continuously for route tracking.
 * Returns a stop function to cancel watching.
 *
 * @param callback - Called on each position update
 * @param options - Watch configuration
 * @returns A function that stops the position watch when called
 */
export function watchPosition(
  callback: (location: LocationResult) => void,
  options?: WatchPositionOptions,
): () => void {
  const interval = options?.interval ?? 5000
  const highAccuracy = options?.highAccuracy ?? true
  let stopped = false
  let timer: ReturnType<typeof setTimeout> | null = null

  async function poll() {
    if (stopped) return
    try {
      const loc = await new Promise<LocationResult>((resolve, reject) => {
        uni.getLocation({
          type: 'gcj02',
          isHighAccuracy: highAccuracy,
          highAccuracyExpireTime: 5000,
          success: (res) => {
            resolve({
              latitude: res.latitude,
              longitude: res.longitude,
              accuracy: res.accuracy ?? 0,
            })
          },
          fail: (err) => reject(new Error(err.errMsg ?? 'Location failed')),
        })
      })
      if (!stopped) {
        callback(loc)
      }
    } catch (e) {
      console.warn('[Geo] Watch position poll failed:', e)
    }
    if (!stopped) {
      timer = setTimeout(poll, interval)
    }
  }

  // Start polling
  poll()

  // Return stop function
  return () => {
    stopped = true
    if (timer !== null) {
      clearTimeout(timer)
      timer = null
    }
  }
}
