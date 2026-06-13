/**
 * RSA-OAEP password encryption using Web Crypto API.
 *
 * Flow:
 *   1. Frontend fetches RSA public key PEM from GET /auth/public-key
 *   2. Imports as CryptoKey via crypto.subtle.importKey
 *   3. Encrypts plaintext password → base64 ciphertext
 *   4. Sends ciphertext to POST /auth/login
 *   5. Backend decrypts with private key before bcrypt.compare
 */

/** Strip PEM headers/footers and decode base64 → ArrayBuffer */
function pemToArrayBuffer(pem: string): ArrayBuffer {
  const b64 = pem
    .replace(/-----BEGIN PUBLIC KEY-----/g, '')
    .replace(/-----END PUBLIC KEY-----/g, '')
    .replace(/\s/g, '')
  const binary = atob(b64)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i)
  }
  return bytes.buffer
}

/** Import a PEM-encoded RSA public key as a CryptoKey */
async function importPublicKey(pem: string): Promise<CryptoKey> {
  const keyData = pemToArrayBuffer(pem)
  return crypto.subtle.importKey(
    'spki',
    keyData,
    { name: 'RSA-OAEP', hash: 'SHA-256' },
    false,
    ['encrypt'],
  )
}

/**
 * Encrypt a plaintext string with an RSA public key (PEM format).
 * Returns a base64-encoded ciphertext string.
 */
export async function rsaEncrypt(plaintext: string, publicKeyPem: string): Promise<string> {
  const publicKey = await importPublicKey(publicKeyPem)
  const encoded = new TextEncoder().encode(plaintext)
  const encrypted = await crypto.subtle.encrypt(
    { name: 'RSA-OAEP' },
    publicKey,
    encoded,
  )
  // Convert ArrayBuffer to base64
  const bytes = new Uint8Array(encrypted)
  let binary = ''
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i])
  }
  return btoa(binary)
}
