/**
 * OCR: phone number scanning and business card recognition
 *
 * APP-PLUS: uses camera capture + backend OCR API
 * Non-APP: returns empty results
 */

import { request, BASE_URL } from '@/api/request'

export interface PhoneScanResult {
  phoneNumbers: string[]
}

export interface BusinessCardResult {
  name?: string
  company?: string
  title?: string
  phone?: string
  email?: string
  address?: string
  raw?: string
}

/**
 * Take a photo and scan for phone numbers via OCR.
 * Uses camera → upload to backend OCR endpoint → extract phone patterns.
 */
export async function scanPhoneNumber(): Promise<PhoneScanResult> {
  // #ifdef APP-PLUS
  try {
    const imagePath = await takePhoto()
    if (!imagePath) {
      return { phoneNumbers: [] }
    }

    const ocrText = await uploadForOcr(imagePath)
    if (!ocrText) {
      return { phoneNumbers: [] }
    }

    // Extract phone numbers using regex patterns
    const phoneNumbers = extractPhoneNumbers(ocrText)
    return { phoneNumbers }
  } catch (e) {
    console.warn('[OCR] scanPhoneNumber failed:', e)
    uni.showToast({ title: 'OCR 识别失败', icon: 'none' })
    return { phoneNumbers: [] }
  }
  // #endif

  // #ifndef APP-PLUS
  console.warn('[OCR] scanPhoneNumber only available on APP-PLUS')
  return { phoneNumbers: [] }
  // #endif
}

/**
 * Scan a business card and extract structured contact information.
 * Uses camera → upload to backend OCR endpoint → parse fields.
 */
export async function scanBusinessCard(): Promise<BusinessCardResult> {
  // #ifdef APP-PLUS
  try {
    const imagePath = await takePhoto()
    if (!imagePath) {
      return {}
    }

    const ocrText = await uploadForOcr(imagePath)
    if (!ocrText) {
      return {}
    }

    return parseBusinessCard(ocrText)
  } catch (e) {
    console.warn('[OCR] scanBusinessCard failed:', e)
    uni.showToast({ title: '名片识别失败', icon: 'none' })
    return {}
  }
  // #endif

  // #ifndef APP-PLUS
  console.warn('[OCR] scanBusinessCard only available on APP-PLUS')
  return {}
  // #endif
}

/**
 * Take a photo using the device camera
 */
function takePhoto(): Promise<string | null> {
  return new Promise((resolve) => {
    uni.chooseImage({
      count: 1,
      sourceType: ['camera'],
      sizeType: ['compressed'],
      success: (res) => {
        if (res.tempFilePaths && res.tempFilePaths.length > 0) {
          resolve(res.tempFilePaths[0])
        } else {
          resolve(null)
        }
      },
      fail: () => {
        resolve(null)
      },
    })
  })
}

/**
 * Upload image to backend OCR endpoint and return recognized text
 */
function uploadForOcr(filePath: string): Promise<string | null> {
  return new Promise((resolve) => {
    const token = uni.getStorageSync('crm_token') as string

    uni.uploadFile({
      url: `${BASE_URL}/ocr/recognize`,
      filePath,
      name: 'file',
      header: {
        Authorization: token ? `Bearer ${token}` : '',
      },
      success: (res) => {
        try {
          if (res.statusCode === 200) {
            const body = JSON.parse(res.data) as { code: number; data?: { text: string } }
            if (body.code === 0 && body.data?.text) {
              resolve(body.data.text)
              return
            }
          }
          resolve(null)
        } catch {
          resolve(null)
        }
      },
      fail: () => {
        resolve(null)
      },
    })
  })
}

/**
 * Extract phone numbers from OCR text
 * Supports: 11-digit mobile, landline with area code, international format
 */
function extractPhoneNumbers(text: string): string[] {
  const patterns = [
    /(?:(?:\+|00)86[-\s]?)?1[3-9]\d{9}/g,           // China mobile
    /0\d{2,3}[-\s]?\d{7,8}/g,                         // China landline
    /(?:\+\d{1,3}[-\s]?)?\(?\d{2,4}\)?[-\s]?\d{3,4}[-\s]?\d{4}/g, // International
    /\d{3,4}[-\s]\d{7,8}/g,                            // Area code + number
  ]

  const found = new Set<string>()
  for (const pattern of patterns) {
    const matches = text.match(pattern)
    if (matches) {
      for (const match of matches) {
        // Normalize: remove spaces and dashes for dedup
        const normalized = match.replace(/[-\s()]/g, '')
        if (normalized.length >= 7 && normalized.length <= 15) {
          found.add(normalized)
        }
      }
    }
  }

  return [...found]
}

/**
 * Parse business card OCR text into structured fields
 */
function parseBusinessCard(text: string): BusinessCardResult {
  const result: BusinessCardResult = { raw: text }
  const lines = text.split(/\n/).map((l) => l.trim()).filter(Boolean)

  // Extract phone
  const phones = extractPhoneNumbers(text)
  if (phones.length > 0) {
    result.phone = phones[0]
  }

  // Extract email
  const emailMatch = text.match(/[\w.+-]+@[\w-]+\.[\w.]+/i)
  if (emailMatch) {
    result.email = emailMatch[0]
  }

  // Heuristic field extraction from lines
  for (const line of lines) {
    // Skip lines that are phone/email (already extracted)
    if (result.phone && line.includes(result.phone)) continue
    if (result.email && line.includes(result.email)) continue

    // Company: lines with common suffixes
    if (!result.company && /(?:公司|集团|有限|科技|企业|股份|Co\.|Ltd|Inc|Corp)/i.test(line)) {
      result.company = line
      continue
    }

    // Title/position keywords
    if (!result.title && /(?:经理|总监|主管|总裁|董事|CEO|CTO|CFO|VP|Director|Manager|销售|顾问|工程师|设计师)/i.test(line)) {
      result.title = line
      continue
    }

    // Address keywords
    if (!result.address && /(?:省|市|区|县|街|路|号|楼|室|大厦|广场|中心|Floor|Road|St\.|Ave)/i.test(line)) {
      result.address = line
      continue
    }

    // Name: first short line (2-4 chars) that isn't other fields — likely a Chinese name
    if (!result.name && line.length >= 2 && line.length <= 8 && /^[\u4e00-\u9fff\s·A-Za-z]+$/.test(line)) {
      result.name = line
    }
  }

  return result
}
