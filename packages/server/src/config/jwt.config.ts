export const jwtConfig = () => ({
  // RS256 key pair — read from env, falling back to HS256 dev secret for local dev
  privateKey: (process.env.JWT_PRIVATE_KEY || '').replace(/\\n/g, '\n') || undefined,
  publicKey: (process.env.JWT_PUBLIC_KEY || '').replace(/\\n/g, '\n') || undefined,
  algorithm: process.env.JWT_PRIVATE_KEY ? ('RS256' as const) : ('HS256' as const),
  // Fallback HS256 secret for local development without RSA keys
  secret: process.env.JWT_SECRET || 'dev-secret-key',
  accessExpiresIn: process.env.JWT_ACCESS_EXPIRES_IN || '2h',
  refreshSecret: process.env.JWT_REFRESH_SECRET || 'dev-refresh-secret-key',
  refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
})
