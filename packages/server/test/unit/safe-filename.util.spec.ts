import {
  safeFilenameJoin,
  sanitizeFilename,
  UnsafeFilenameError,
} from '../../src/common/utils/safe-filename.util'

describe('safeFilenameJoin', () => {
  const base = 'uploads'

  // ─── Valid paths ───────────────────────────────────────────
  describe('valid paths', () => {
    it('should join a simple filename', () => {
      expect(safeFilenameJoin(base, 'photo.jpg')).toBe('uploads/photo.jpg')
    })

    it('should join a nested path', () => {
      expect(safeFilenameJoin(base, 'user/avatar.png')).toBe('uploads/user/avatar.png')
    })

    it('should handle base with trailing slash', () => {
      expect(safeFilenameJoin('uploads/', 'file.pdf')).toBe('uploads/file.pdf')
    })

    it('should allow safe extensions', () => {
      const safe = ['photo.jpg', 'doc.pdf', 'data.csv', 'sheet.xlsx', 'clip.mp4', 'song.wav']
      for (const f of safe) {
        expect(() => safeFilenameJoin(base, f)).not.toThrow()
      }
    })
  })

  // ─── Path traversal ────────────────────────────────────────
  describe('path traversal prevention', () => {
    it('should reject ../', () => {
      expect(() => safeFilenameJoin(base, '../etc/passwd')).toThrow(UnsafeFilenameError)
    })

    it('should reject ../../', () => {
      expect(() => safeFilenameJoin(base, '../../etc/shadow')).toThrow(UnsafeFilenameError)
    })

    it('should reject encoded traversal with backslash', () => {
      expect(() => safeFilenameJoin(base, '..\\..\\windows\\system32')).toThrow(UnsafeFilenameError)
    })

    it('should reject traversal disguised with nested dirs', () => {
      expect(() => safeFilenameJoin(base, 'a/b/../../../../etc/passwd')).toThrow(UnsafeFilenameError)
    })

    it('should reject bare ..', () => {
      expect(() => safeFilenameJoin(base, '..')).toThrow(UnsafeFilenameError)
    })
  })

  // ─── Null bytes ────────────────────────────────────────────
  describe('null byte injection', () => {
    it('should reject filenames with null bytes', () => {
      expect(() => safeFilenameJoin(base, 'file.jpg\0.exe')).toThrow(UnsafeFilenameError)
    })
  })

  // ─── Denied extensions ────────────────────────────────────
  describe('denied extensions', () => {
    const deniedExts = [
      'script.exe', 'run.bat', 'cmd.cmd', 'payload.ps1',
      'hack.sh', 'shell.php', 'back.jsp', 'lib.dll',
      'app.jar', 'code.py', 'script.rb', 'cgi.pl',
      'page.asp', 'page.aspx', 'run.vbs', 'flash.swf',
    ]

    it.each(deniedExts)('should reject %s', (filename) => {
      expect(() => safeFilenameJoin(base, filename)).toThrow(UnsafeFilenameError)
      expect(() => safeFilenameJoin(base, filename)).toThrow(/extension/)
    })
  })

  // ─── Double/hidden extensions ──────────────────────────────
  describe('double extension attacks', () => {
    it('should reject file.php.jpg', () => {
      expect(() => safeFilenameJoin(base, 'file.php.jpg')).toThrow(UnsafeFilenameError)
      expect(() => safeFilenameJoin(base, 'file.php.jpg')).toThrow(/hidden/i)
    })

    it('should reject file.exe.pdf', () => {
      expect(() => safeFilenameJoin(base, 'file.exe.pdf')).toThrow(UnsafeFilenameError)
    })

    it('should reject file.sh.txt', () => {
      expect(() => safeFilenameJoin(base, 'file.sh.txt')).toThrow(UnsafeFilenameError)
    })

    it('should allow legitimate multi-dot names like archive.2024.01.tar.gz', () => {
      expect(() => safeFilenameJoin(base, 'archive.2024.01.tar.gz')).not.toThrow()
    })
  })

  // ─── Reserved/denied basenames ─────────────────────────────
  describe('denied basenames', () => {
    it('should reject Windows reserved names', () => {
      const reserved = ['CON.txt', 'PRN.pdf', 'AUX.doc', 'NUL.csv', 'COM1.dat', 'LPT3.log']
      for (const f of reserved) {
        expect(() => safeFilenameJoin(base, f)).toThrow(UnsafeFilenameError)
        expect(() => safeFilenameJoin(base, f)).toThrow(/reserved/)
      }
    })

    it('should reject .htaccess', () => {
      expect(() => safeFilenameJoin(base, '.htaccess')).toThrow(UnsafeFilenameError)
    })

    it('should reject .env', () => {
      expect(() => safeFilenameJoin(base, '.env')).toThrow(UnsafeFilenameError)
    })

    it('should reject web.config', () => {
      expect(() => safeFilenameJoin(base, 'web.config')).toThrow(UnsafeFilenameError)
    })
  })

  // ─── Empty / whitespace ────────────────────────────────────
  describe('empty or invalid input', () => {
    it('should reject empty string', () => {
      expect(() => safeFilenameJoin(base, '')).toThrow(UnsafeFilenameError)
    })

    it('should reject whitespace-only string', () => {
      expect(() => safeFilenameJoin(base, '   ')).toThrow(UnsafeFilenameError)
    })
  })

  // ─── Case insensitivity ────────────────────────────────────
  describe('case insensitivity', () => {
    it('should reject uppercase denied extensions', () => {
      expect(() => safeFilenameJoin(base, 'SCRIPT.EXE')).toThrow(UnsafeFilenameError)
    })

    it('should reject mixed-case reserved names', () => {
      expect(() => safeFilenameJoin(base, 'Con.TXT')).toThrow(UnsafeFilenameError)
    })
  })
})

describe('sanitizeFilename', () => {
  it('should remove path separators and return only basename', () => {
    expect(sanitizeFilename('../../etc/passwd')).toBe('passwd')
  })

  it('should replace invalid characters with underscore', () => {
    expect(sanitizeFilename('file<name>.txt')).toBe('file_name_.txt')
  })

  it('should strip leading dots', () => {
    expect(sanitizeFilename('.hidden')).toBe('hidden')
  })

  it('should collapse multiple dots', () => {
    expect(sanitizeFilename('file...name.txt')).toBe('file.name.txt')
  })

  it('should replace whitespace with underscore', () => {
    expect(sanitizeFilename('my file name.pdf')).toBe('my_file_name.pdf')
  })

  it('should truncate to 255 characters', () => {
    const long = 'a'.repeat(300) + '.txt'
    expect(sanitizeFilename(long).length).toBeLessThanOrEqual(255)
  })

  it('should return "unnamed" for empty input', () => {
    expect(sanitizeFilename('')).toBe('unnamed')
  })

  it('should handle backslash paths', () => {
    expect(sanitizeFilename('C:\\Users\\admin\\file.txt')).toBe('file.txt')
  })
})
