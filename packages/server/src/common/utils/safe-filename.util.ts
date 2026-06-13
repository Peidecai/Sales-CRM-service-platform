import * as path from 'path'

/**
 * Denied filename patterns for OSS / local storage.
 *
 * Matches are case-insensitive against the final resolved basename.
 */
const DENIED_EXTENSIONS = new Set([
  '.exe',
  '.bat',
  '.cmd',
  '.com',
  '.msi',
  '.scr',
  '.pif',
  '.vbs',
  '.vbe',
  '.js',
  '.jse',
  '.wsf',
  '.wsh',
  '.ws',
  '.ps1',
  '.psm1',
  '.psd1',
  '.sh',
  '.bash',
  '.csh',
  '.ksh',
  '.dll',
  '.sys',
  '.drv',
  '.inf',
  '.reg',
  '.hta',
  '.cpl',
  '.jar',
  '.class',
  '.php',
  '.phtml',
  '.php3',
  '.php4',
  '.php5',
  '.phps',
  '.asp',
  '.aspx',
  '.cer',
  '.jsp',
  '.jspx',
  '.py',
  '.pyc',
  '.pyo',
  '.rb',
  '.pl',
  '.cgi',
  '.swf',
])

/**
 * Denied basenames (case-insensitive, without extension).
 */
const DENIED_BASENAMES = new Set([
  'con',
  'prn',
  'aux',
  'nul',
  'com1',
  'com2',
  'com3',
  'com4',
  'com5',
  'com6',
  'com7',
  'com8',
  'com9',
  'lpt1',
  'lpt2',
  'lpt3',
  'lpt4',
  'lpt5',
  'lpt6',
  'lpt7',
  'lpt8',
  'lpt9',
  '.htaccess',
  '.htpasswd',
  '.env',
  '.git',
  '.gitignore',
  'web.config',
  'thumbs.db',
  'desktop.ini',
])

/**
 * Characters not allowed in the filename component.
 */
// eslint-disable-next-line no-control-regex
const INVALID_CHARS_RE = /[\x00-\x1f<>:"|?*\\]/g

export class UnsafeFilenameError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'UnsafeFilenameError'
  }
}

/**
 * Safely join a base directory with a user-supplied filename / relative path,
 * preventing path traversal, denied extensions, and reserved names.
 *
 * @param baseDir  The trusted root directory (e.g. `uploads/`, `recordings/`)
 * @param userPath The untrusted user-supplied path segment
 * @returns        The safe, normalised key (forward-slash separated, no leading slash)
 * @throws {UnsafeFilenameError} if the path is unsafe
 */
export function safeFilenameJoin(baseDir: string, userPath: string): string {
  if (!userPath || !userPath.trim()) {
    throw new UnsafeFilenameError('Filename must not be empty')
  }

  // Normalise separators to forward slash
  const normalised = userPath.replace(/\\/g, '/')

  // Reject null bytes
  if (normalised.includes('\0')) {
    throw new UnsafeFilenameError('Filename contains null bytes')
  }

  // Resolve to detect traversal
  const base = path.resolve(baseDir)
  const resolved = path.resolve(base, normalised)

  if (!resolved.startsWith(base + path.sep) && resolved !== base) {
    throw new UnsafeFilenameError(`Path traversal detected: "${userPath}" escapes base directory`)
  }

  // Extract the final filename for deny-list checks
  const basename = path.basename(resolved)

  if (!basename || basename === '.' || basename === '..') {
    throw new UnsafeFilenameError('Filename resolves to empty or dot segment')
  }

  // Check invalid characters
  if (INVALID_CHARS_RE.test(basename)) {
    throw new UnsafeFilenameError(`Filename contains invalid characters: "${basename}"`)
  }

  // Check denied extensions
  const ext = path.extname(basename).toLowerCase()
  if (ext && DENIED_EXTENSIONS.has(ext)) {
    throw new UnsafeFilenameError(`File extension "${ext}" is not allowed`)
  }

  // Check double extensions (e.g. file.php.jpg → still catch .php)
  const parts = basename.toLowerCase().split('.')
  for (let i = 1; i < parts.length - 1; i++) {
    const hiddenExt = '.' + parts[i]
    if (DENIED_EXTENSIONS.has(hiddenExt)) {
      throw new UnsafeFilenameError(`Hidden file extension "${hiddenExt}" is not allowed`)
    }
  }

  // Check denied basenames
  const rawExt = path.extname(basename)
  const nameWithoutExt = path.basename(basename, rawExt).toLowerCase()
  if (DENIED_BASENAMES.has(nameWithoutExt) || DENIED_BASENAMES.has(basename.toLowerCase())) {
    throw new UnsafeFilenameError(`Filename "${basename}" is reserved`)
  }

  // Build the safe key with forward slashes (for OSS)
  const relative = path.relative(base, resolved)
  const safeKey = relative.split(path.sep).join('/')

  // Final guard: no leading slash, no double dots remain
  if (safeKey.startsWith('/') || safeKey.includes('..')) {
    throw new UnsafeFilenameError('Resulting path is unsafe')
  }

  return baseDir.replace(/\\/g, '/').replace(/\/$/, '') + '/' + safeKey
}

/**
 * Sanitise a filename by removing unsafe characters, without throwing.
 * Useful when you want a best-effort clean name rather than rejection.
 */
export function sanitizeFilename(filename: string): string {
  return (
    filename
      .replace(/\\/g, '/')
      .split('/')
      .pop()!
      .replace(INVALID_CHARS_RE, '_')
      .replace(/\.{2,}/g, '.')
      .replace(/^\.+/, '')
      .replace(/\s+/g, '_')
      .slice(0, 255) || 'unnamed'
  )
}
