import { Injectable, Logger } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { createCipheriv, createDecipheriv, randomBytes } from 'crypto'

/**
 * AES-256-GCM encryption for sensitive database fields (phone, idCard, email, bankCard).
 *
 * Format: hex(iv) + ':' + hex(authTag) + ':' + hex(ciphertext)
 * Key is read from ENCRYPTION_KEY env var (64-char hex = 32 bytes).
 */
@Injectable()
export class EncryptionService {
  private readonly logger = new Logger(EncryptionService.name)
  private readonly key: Buffer
  private readonly enabled: boolean

  constructor(private readonly configService: ConfigService) {
    const hexKey = this.configService.get<string>('ENCRYPTION_KEY', '')
    const nodeEnv = this.configService.get<string>('NODE_ENV', 'development')

    if (hexKey && hexKey.length === 64 && hexKey !== '0'.repeat(64)) {
      this.key = Buffer.from(hexKey, 'hex')
      this.enabled = true
    } else if (nodeEnv === 'production') {
      throw new Error(
        'Production 环境必须配置有效的 ENCRYPTION_KEY（64位 hex，不可为全零），禁止明文存储敏感字段',
      )
    } else {
      // Disabled in dev — passthrough
      this.key = Buffer.alloc(32)
      this.enabled = false
      this.logger.warn('ENCRYPTION_KEY not configured — sensitive field encryption disabled')
    }
  }

  encrypt(plaintext: string): string {
    if (!this.enabled || !plaintext) return plaintext

    const iv = randomBytes(12)
    const cipher = createCipheriv('aes-256-gcm', this.key, iv)
    const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()])
    const authTag = cipher.getAuthTag()

    return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted.toString('hex')}`
  }

  decrypt(ciphertext: string): string {
    if (!this.enabled || !ciphertext) return ciphertext

    // Not encrypted (legacy plaintext data)
    if (!ciphertext.includes(':')) return ciphertext

    try {
      const parts = ciphertext.split(':')
      if (parts.length !== 3) return ciphertext

      const iv = Buffer.from(parts[0], 'hex')
      const authTag = Buffer.from(parts[1], 'hex')
      const encrypted = Buffer.from(parts[2], 'hex')

      const decipher = createDecipheriv('aes-256-gcm', this.key, iv)
      decipher.setAuthTag(authTag)
      const decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()])

      return decrypted.toString('utf8')
    } catch {
      // If decryption fails, return as-is (likely plaintext)
      return ciphertext
    }
  }

  /**
   * Instance-level TypeORM column transformer (for use in service layer).
   */
  transformer() {
    return {
      from: (value: string | null) => (value ? this.decrypt(value) : value),
      to: (value: string | null) => (value ? this.encrypt(value) : value),
    }
  }

  // --- Static helpers for @Column() decorators (no DI needed) ---

  private static readKey(): { key: Buffer; enabled: boolean } {
    const hexKey = process.env.ENCRYPTION_KEY ?? ''
    if (hexKey && hexKey.length === 64 && hexKey !== '0'.repeat(64)) {
      return { key: Buffer.from(hexKey, 'hex'), enabled: true }
    }
    return { key: Buffer.alloc(32), enabled: false }
  }

  static encryptRaw(plaintext: string): string {
    const { key, enabled } = EncryptionService.readKey()
    if (!enabled || !plaintext) return plaintext

    const iv = randomBytes(12)
    const cipher = createCipheriv('aes-256-gcm', key, iv)
    const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()])
    const authTag = cipher.getAuthTag()

    return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted.toString('hex')}`
  }

  static decryptRaw(ciphertext: string): string {
    const { key, enabled } = EncryptionService.readKey()
    if (!enabled || !ciphertext) return ciphertext
    if (!ciphertext.includes(':')) return ciphertext

    try {
      const parts = ciphertext.split(':')
      if (parts.length !== 3) return ciphertext

      const iv = Buffer.from(parts[0], 'hex')
      const authTag = Buffer.from(parts[1], 'hex')
      const encrypted = Buffer.from(parts[2], 'hex')

      const decipher = createDecipheriv('aes-256-gcm', key, iv)
      decipher.setAuthTag(authTag)
      const decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()])
      return decrypted.toString('utf8')
    } catch {
      return ciphertext
    }
  }

  /**
   * Static TypeORM column transformer — reads ENCRYPTION_KEY from process.env.
   * Use in entity @Column() decorators where DI is unavailable.
   * Usage: @Column({ transformer: EncryptionService.columnTransformer() })
   */
  static columnTransformer() {
    return {
      from: (value: string | null) => (value ? EncryptionService.decryptRaw(value) : value),
      to: (value: string | null) => (value ? EncryptionService.encryptRaw(value) : value),
    }
  }
}
