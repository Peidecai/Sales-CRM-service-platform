import { ref } from 'vue'

/**
 * Composable for throttling async function calls (button anti-duplicate-submit).
 * Returns { loading, run } where `run` wraps the original fn with loading state.
 */
export function useThrottle<T extends (...args: unknown[]) => Promise<unknown>>(
  fn: T,
  delay = 1000,
) {
  const loading = ref(false)
  let lastCallTime = 0

  const run = async (...args: Parameters<T>): Promise<ReturnType<T> | undefined> => {
    const now = Date.now()
    if (loading.value || now - lastCallTime < delay) {
      return undefined
    }
    loading.value = true
    lastCallTime = now
    try {
      const result = await fn(...args)
      return result as ReturnType<T>
    } finally {
      loading.value = false
    }
  }

  return { loading, run }
}
