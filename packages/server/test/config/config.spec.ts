import { ConfigService } from '@nestjs/config'
import { databaseConfig } from '../../src/config/database.config'
import { jwtConfig } from '../../src/config/jwt.config'

describe('Config factories', () => {
  it('databaseConfig should use defaults from ConfigService', () => {
    const mockConfig = {
      get: jest.fn((key: string, defaultVal: unknown) => defaultVal),
    } as unknown as ConfigService

    const config = databaseConfig(mockConfig) as Record<string, unknown>

    expect(config.host).toBe('localhost')
    expect(config.port).toBe(3306)
    expect(config.username).toBe('crm_user')
    expect(config.database).toBe('crm_sales')
  })

  it('databaseConfig should read values from ConfigService', () => {
    const values: Record<string, unknown> = {
      DB_HOST: 'db.internal',
      DB_PORT: 4406,
      DB_USERNAME: 'crm_user',
      DB_PASSWORD: 'secret',
      DB_DATABASE: 'crm_prod',
      NODE_ENV: 'development',
    }
    const mockConfig = {
      get: jest.fn((key: string, defaultVal: unknown) => values[key] ?? defaultVal),
    } as unknown as ConfigService

    const config = databaseConfig(mockConfig) as Record<string, unknown>

    expect(config.host).toBe('db.internal')
    expect(config.port).toBe(4406)
    expect(config.username).toBe('crm_user')
    expect(config.password).toBe('secret')
    expect(config.database).toBe('crm_prod')
  })

  it('jwtConfig should use defaults and overrides', () => {
    delete process.env.JWT_SECRET
    delete process.env.JWT_ACCESS_EXPIRES_IN
    delete process.env.JWT_REFRESH_SECRET
    delete process.env.JWT_REFRESH_EXPIRES_IN

    const defaults = jwtConfig()
    expect(defaults.secret).toBe('dev-secret-key')
    expect(defaults.accessExpiresIn).toBe('2h')
    expect(defaults.refreshSecret).toBe('dev-refresh-secret-key')
    expect(defaults.refreshExpiresIn).toBe('7d')

    process.env.JWT_SECRET = 'jwt-secret'
    process.env.JWT_ACCESS_EXPIRES_IN = '1h'
    process.env.JWT_REFRESH_SECRET = 'jwt-refresh'
    process.env.JWT_REFRESH_EXPIRES_IN = '14d'

    const overridden = jwtConfig()
    expect(overridden.secret).toBe('jwt-secret')
    expect(overridden.accessExpiresIn).toBe('1h')
    expect(overridden.refreshSecret).toBe('jwt-refresh')
    expect(overridden.refreshExpiresIn).toBe('14d')

    // Cleanup
    delete process.env.JWT_SECRET
    delete process.env.JWT_ACCESS_EXPIRES_IN
    delete process.env.JWT_REFRESH_SECRET
    delete process.env.JWT_REFRESH_EXPIRES_IN
  })
})
