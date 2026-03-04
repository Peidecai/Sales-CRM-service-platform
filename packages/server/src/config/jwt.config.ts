export const jwtConfig = () => ({
  secret: process.env.JWT_SECRET || 'dev-secret-key',
  accessExpiresIn: process.env.JWT_ACCESS_EXPIRES_IN || '2h',
  refreshSecret: process.env.JWT_REFRESH_SECRET || 'dev-refresh-secret-key',
  refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
});
