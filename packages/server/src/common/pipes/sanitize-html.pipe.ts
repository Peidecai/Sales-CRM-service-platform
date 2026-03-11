import { Injectable, PipeTransform, ArgumentMetadata } from '@nestjs/common'
import * as sanitizeHtml from 'sanitize-html'

/**
 * Whitelist configuration for sanitize-html.
 * Allows common formatting tags, strips script/iframe/on* handlers.
 */
const SANITIZE_OPTIONS: sanitizeHtml.IOptions = {
  allowedTags: [
    'p',
    'br',
    'b',
    'i',
    'em',
    'strong',
    'u',
    's',
    'strike',
    'a',
    'ul',
    'ol',
    'li',
    'blockquote',
    'pre',
    'code',
    'h1',
    'h2',
    'h3',
    'h4',
    'h5',
    'h6',
    'img',
    'table',
    'thead',
    'tbody',
    'tr',
    'th',
    'td',
    'span',
    'div',
    'hr',
    'sub',
    'sup',
  ],
  allowedAttributes: {
    a: ['href', 'title', 'target', 'rel'],
    img: ['src', 'alt', 'width', 'height'],
    span: ['style'],
    td: ['colspan', 'rowspan'],
    th: ['colspan', 'rowspan'],
  },
  allowedSchemes: ['http', 'https', 'mailto'],
  disallowedTagsMode: 'discard',
}

/** Fields to sanitize — known rich text fields */
const SANITIZE_FIELDS = new Set([
  'content',
  'remark',
  'description',
  'body',
  'summary',
  'note',
  'notes',
  'htmlContent',
])

@Injectable()
export class SanitizeHtmlPipe implements PipeTransform {
  transform(value: unknown, metadata: ArgumentMetadata): unknown {
    if (metadata.type !== 'body') return value
    if (typeof value !== 'object' || value === null) return value

    return this.sanitizeDeep(value as Record<string, unknown>)
  }

  private sanitizeDeep(obj: Record<string, unknown>): Record<string, unknown> {
    const result: Record<string, unknown> = {}

    for (const [key, val] of Object.entries(obj)) {
      if (typeof val === 'string' && SANITIZE_FIELDS.has(key)) {
        result[key] = sanitizeHtml(val, SANITIZE_OPTIONS)
      } else if (typeof val === 'object' && val !== null && !Array.isArray(val)) {
        result[key] = this.sanitizeDeep(val as Record<string, unknown>)
      } else {
        result[key] = val
      }
    }

    return result
  }
}
