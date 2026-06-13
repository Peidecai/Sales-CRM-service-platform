/**
 * Shared formatting utility functions.
 */

/** Format ISO datetime string to "YYYY-MM-DD HH:mm" */
export function formatDate(dateStr: string): string {
  if (!dateStr) return ''
  const d = new Date(dateStr)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`
}

/** Format seconds into "X分Y秒" */
export function formatDuration(seconds: number): string {
  if (!seconds || seconds <= 0) return '0分0秒'
  const min = Math.floor(seconds / 60)
  const sec = seconds % 60
  return `${min}分${sec}秒`
}

/** Format number to localized currency string (no symbol) */
export function formatAmount(amount: number): string {
  if (amount == null) return '0'
  return Number(amount).toLocaleString('zh-CN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
}
