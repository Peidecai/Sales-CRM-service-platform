import { describe, it, expect } from 'vitest'
import { maskPhone, maskEmail, maskIdCard, maskName } from './mask'

describe('maskPhone', () => {
  it('masks standard 11-digit phone number', () => {
    expect(maskPhone('13812345678')).toBe('138****5678')
  })

  it('returns short input unchanged', () => {
    expect(maskPhone('123456')).toBe('123456')
  })

  it('returns empty string as-is', () => {
    expect(maskPhone('')).toBe('')
  })

  it('handles null/undefined safely', () => {
    expect(maskPhone(null as unknown as string)).toBeFalsy()
    expect(maskPhone(undefined as unknown as string)).toBeFalsy()
  })
})

describe('maskEmail', () => {
  it('masks standard email address', () => {
    expect(maskEmail('test@example.com')).toBe('t***@example.com')
  })

  it('handles single-char local part', () => {
    expect(maskEmail('a@example.com')).toBe('a***@example.com')
  })

  it('returns email without @ sign as-is', () => {
    expect(maskEmail('noemail')).toBe('noemail')
  })

  it('returns empty string as-is', () => {
    expect(maskEmail('')).toBe('')
  })
})

describe('maskIdCard', () => {
  it('masks standard 18-digit ID card', () => {
    expect(maskIdCard('110101199901011234')).toBe('1101****1234')
  })

  it('returns short input unchanged', () => {
    expect(maskIdCard('1234567')).toBe('1234567')
  })

  it('returns empty string as-is', () => {
    expect(maskIdCard('')).toBe('')
  })
})

describe('maskName', () => {
  it('masks 2-char name', () => {
    expect(maskName('AB')).toBe('A*')
  })

  it('masks 3-char name', () => {
    expect(maskName('ABC')).toBe('A**')
  })

  it('returns single char unchanged', () => {
    expect(maskName('A')).toBe('A')
  })

  it('returns empty string as-is', () => {
    expect(maskName('')).toBe('')
  })
})
