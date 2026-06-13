/**
 * Data masking utilities for sensitive information display.
 */

/** maskPhone('13812345678') → '138****5678' */
export function maskPhone(phone: string): string {
  if (!phone || phone.length < 7) return phone
  return phone.slice(0, 3) + '****' + phone.slice(-4)
}

/** maskEmail('test@example.com') → 't***@example.com' */
export function maskEmail(email: string): string {
  if (!email) return email
  const atIndex = email.indexOf('@')
  if (atIndex <= 0) return email
  const local = email.slice(0, atIndex)
  const domain = email.slice(atIndex)
  if (local.length <= 1) return local + '***' + domain
  return local[0] + '***' + domain
}

/** maskIdCard('110101199901011234') → '1101****1234' */
export function maskIdCard(idCard: string): string {
  if (!idCard || idCard.length < 8) return idCard
  return idCard.slice(0, 4) + '****' + idCard.slice(-4)
}

/** maskName('张三') → '张*', maskName('张三丰') → '张**' */
export function maskName(name: string): string {
  if (!name) return name
  if (name.length <= 1) return name
  return name[0] + '*'.repeat(name.length - 1)
}
