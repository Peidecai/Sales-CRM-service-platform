/**
 * Data masking / desensitization utilities.
 * Pure functions — no side-effects.
 */

/**
 * Mask phone number: 138****1234
 */
export function maskPhone(phone: string): string {
  if (!phone || phone.length < 7) return phone;
  return phone.slice(0, 3) + "****" + phone.slice(-4);
}

/**
 * Mask ID card: 3301****1234
 */
export function maskIdCard(id: string): string {
  if (!id || id.length < 8) return id;
  return id.slice(0, 4) + "****" + id.slice(-4);
}

/**
 * Mask email: ab***@example.com
 */
export function maskEmail(email: string): string {
  if (!email) return email;
  const atIndex = email.indexOf("@");
  if (atIndex <= 0) return email;
  const local = email.slice(0, atIndex);
  const domain = email.slice(atIndex);
  const showLen = Math.min(2, local.length);
  return local.slice(0, showLen) + "***" + domain;
}

/**
 * Mask address: show first 6 chars + ****
 */
export function maskAddress(address: string): string {
  if (!address) return address;
  if (address.length <= 6) return address;
  return address.slice(0, 6) + "****";
}

/**
 * Mask by pattern.
 * Pattern format: "showFirst,hideMiddle,showLast"
 * - "3,4,4" → show first 3, hide 4, show last 4
 * - "2,*,0" → show first 2, hide rest (showLast=0, hideMiddle=remaining)
 */
export function maskByPattern(value: string, pattern: string): string {
  if (!value || !pattern) return value;

  const parts = pattern.split(",").map((p) => p.trim());
  if (parts.length !== 3) return value;

  const showFirst = parseInt(parts[0], 10);
  const showLast = parseInt(parts[2], 10);

  if (isNaN(showFirst) || isNaN(showLast)) return value;

  if (showFirst + showLast >= value.length) return value;

  const hideCount =
    parts[1] === "*"
      ? value.length - showFirst - showLast
      : parseInt(parts[1], 10);

  if (isNaN(hideCount) || hideCount <= 0) return value;

  const firstPart = value.slice(0, showFirst);
  const mask = "*".repeat(hideCount);
  const lastPart = showLast > 0 ? value.slice(-showLast) : "";

  return firstPart + mask + lastPart;
}
