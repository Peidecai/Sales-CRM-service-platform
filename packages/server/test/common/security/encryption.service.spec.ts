import { ConfigService } from '@nestjs/config'
import { EncryptionService } from '../../../src/common/security/encryption.service'

const VALID_HEX_KEY = 'a'.repeat(64)
const ALL_ZERO_KEY = '0'.repeat(64)

function makeConfigService(
  overrides: Record<string, string> = {},
): ConfigService {
  const defaults: Record<string, string> = {
    ENCRYPTION_KEY: VALID_HEX_KEY,
    NODE_ENV: 'development',
  }
  const values = { ...defaults, ...overrides }
  return {
    get: jest.fn(
      (key: string, defaultVal?: string) => values[key] ?? defaultVal,
    ),
  } as unknown as ConfigService
}

describe('EncryptionService', () => {
  afterEach(() => {
    delete process.env.ENCRYPTION_KEY
    jest.restoreAllMocks()
  })

  /* ---------- constructor ---------- */

  describe('constructor', () => {
    it('should enable encryption when a valid 64-char hex key is provided', () => {
      const svc = new EncryptionService(makeConfigService())
      // Encryption enabled → encrypt actually transforms
      const cipher = svc.encrypt('hello')
      expect(cipher).not.toBe('hello')
      expect(cipher).toContain(':')
    })

    it('should disable encryption when ENCRYPTION_KEY is empty (non-production)', () => {
      const svc = new EncryptionService(
        makeConfigService({ ENCRYPTION_KEY: '' }),
      )
      expect(svc.encrypt('plain')).toBe('plain')
      expect(svc.decrypt('plain')).toBe('plain')
    })

    it('should disable encryption when ENCRYPTION_KEY is all zeros', () => {
      const svc = new EncryptionService(
        makeConfigService({ ENCRYPTION_KEY: ALL_ZERO_KEY }),
      )
      expect(svc.encrypt('plain')).toBe('plain')
    })

    it('should disable encryption when ENCRYPTION_KEY has wrong length', () => {
      const svc = new EncryptionService(
        makeConfigService({ ENCRYPTION_KEY: 'abc123' }),
      )
      expect(svc.encrypt('data')).toBe('data')
    })

    it('should throw in production without a valid key', () => {
      expect(() => {
        new EncryptionService(
          makeConfigService({ ENCRYPTION_KEY: '', NODE_ENV: 'production' }),
        )
      }).toThrow('Production 环境必须配置有效的 ENCRYPTION_KEY')
    })

    it('should throw in production with all-zero key', () => {
      expect(() => {
        new EncryptionService(
          makeConfigService({
            ENCRYPTION_KEY: ALL_ZERO_KEY,
            NODE_ENV: 'production',
          }),
        )
      }).toThrow('Production 环境必须配置有效的 ENCRYPTION_KEY')
    })
  })

  /* ---------- encrypt / decrypt ---------- */

  describe('encrypt & decrypt', () => {
    let svc: EncryptionService

    beforeEach(() => {
      svc = new EncryptionService(makeConfigService())
    })

    it('should round-trip encrypt then decrypt', () => {
      const plaintext = '13800138000'
      const ciphertext = svc.encrypt(plaintext)
      expect(ciphertext).not.toBe(plaintext)
      expect(svc.decrypt(ciphertext)).toBe(plaintext)
    })

    it('should produce different ciphertexts for the same input (random IV)', () => {
      const a = svc.encrypt('hello')
      const b = svc.encrypt('hello')
      expect(a).not.toBe(b)
    })

    it('should handle Unicode / CJK characters', () => {
      const text = '你好世界 🎉'
      const cipher = svc.encrypt(text)
      expect(svc.decrypt(cipher)).toBe(text)
    })

    it('should handle empty string as passthrough', () => {
      expect(svc.encrypt('')).toBe('')
      expect(svc.decrypt('')).toBe('')
    })

    it('should return legacy plaintext when no colon present', () => {
      expect(svc.decrypt('plaintext-no-colon')).toBe('plaintext-no-colon')
    })

    it('should return ciphertext as-is if parts count is not 3', () => {
      expect(svc.decrypt('a:b')).toBe('a:b')
      expect(svc.decrypt('a:b:c:d')).toBe('a:b:c:d')
    })

    it('should return ciphertext as-is on decryption failure (tampered data)', () => {
      const cipher = svc.encrypt('secret')
      // Tamper with the auth tag portion
      const parts = cipher.split(':')
      parts[1] = 'ff'.repeat(16) // invalid auth tag
      const tampered = parts.join(':')
      expect(svc.decrypt(tampered)).toBe(tampered)
    })

    it('ciphertext format should be iv:authTag:encrypted (hex)', () => {
      const cipher = svc.encrypt('test')
      const parts = cipher.split(':')
      expect(parts).toHaveLength(3)
      // IV is 12 bytes = 24 hex chars
      expect(parts[0]).toHaveLength(24)
      // AuthTag is 16 bytes = 32 hex chars
      expect(parts[1]).toHaveLength(32)
      // Encrypted data is non-empty
      expect(parts[2].length).toBeGreaterThan(0)
    })
  })

  /* ---------- transformer (instance) ---------- */

  describe('transformer()', () => {
    let svc: EncryptionService

    beforeEach(() => {
      svc = new EncryptionService(makeConfigService())
    })

    it('should return a TypeORM column transformer with from/to', () => {
      const t = svc.transformer()
      expect(typeof t.from).toBe('function')
      expect(typeof t.to).toBe('function')
    })

    it('to should encrypt and from should decrypt', () => {
      const t = svc.transformer()
      const encrypted = t.to('sensitive')
      expect(encrypted).not.toBe('sensitive')
      expect(t.from(encrypted as string)).toBe('sensitive')
    })

    it('should pass null through', () => {
      const t = svc.transformer()
      expect(t.to(null)).toBeNull()
      expect(t.from(null)).toBeNull()
    })
  })

  /* ---------- static methods ---------- */

  describe('static encryptRaw / decryptRaw', () => {
    it('should passthrough when env key is not set', () => {
      delete process.env.ENCRYPTION_KEY
      expect(EncryptionService.encryptRaw('hello')).toBe('hello')
      expect(EncryptionService.decryptRaw('hello')).toBe('hello')
    })

    it('should encrypt and decrypt when env key is valid', () => {
      process.env.ENCRYPTION_KEY = VALID_HEX_KEY
      const cipher = EncryptionService.encryptRaw('phone123')
      expect(cipher).toContain(':')
      expect(EncryptionService.decryptRaw(cipher)).toBe('phone123')
    })

    it('should passthrough empty string', () => {
      process.env.ENCRYPTION_KEY = VALID_HEX_KEY
      expect(EncryptionService.encryptRaw('')).toBe('')
      expect(EncryptionService.decryptRaw('')).toBe('')
    })

    it('should return as-is on decryption failure', () => {
      process.env.ENCRYPTION_KEY = VALID_HEX_KEY
      expect(EncryptionService.decryptRaw('bad:data:here')).toBe(
        'bad:data:here',
      )
    })

    it('should return plaintext when no colon present', () => {
      process.env.ENCRYPTION_KEY = VALID_HEX_KEY
      expect(EncryptionService.decryptRaw('legacy-plain')).toBe('legacy-plain')
    })

    it('should return as-is when parts count not 3', () => {
      process.env.ENCRYPTION_KEY = VALID_HEX_KEY
      expect(EncryptionService.decryptRaw('a:b')).toBe('a:b')
    })
  })

  describe('static columnTransformer()', () => {
    it('should return from/to functions', () => {
      const t = EncryptionService.columnTransformer()
      expect(typeof t.from).toBe('function')
      expect(typeof t.to).toBe('function')
    })

    it('should passthrough null values', () => {
      const t = EncryptionService.columnTransformer()
      expect(t.to(null)).toBeNull()
      expect(t.from(null)).toBeNull()
    })

    it('should round-trip with valid env key', () => {
      process.env.ENCRYPTION_KEY = VALID_HEX_KEY
      const t = EncryptionService.columnTransformer()
      const encrypted = t.to('id-card-123')
      expect(encrypted).not.toBe('id-card-123')
      expect(t.from(encrypted as string)).toBe('id-card-123')
    })
  })
})
