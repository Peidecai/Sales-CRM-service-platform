import { databaseConfig } from '../../src/config/database.config'
import { jwtConfig } from '../../src/config/jwt.config'
import { redisConfig } from '../../src/config/redis.config'

describe('Config factories', () => {
  const originalEnv = process.env

  beforeEach(() => {
    process.env = { ...originalEnv }
  })

  afterAll(() => {
    process.env = originalEnv
  })

  it('databaseConfig should use defaults', () => {
    delete process.env.DB_HOST
    delete process.env.DB_PORT
    delete process.env.DB_USERNAME
    delete process.env.DB_PASSWORD
    delete process.env.DB_DATABASE
    delete process.env.NODE_ENV

    const config = databaseConfig() as Record<string, unknown>

    expect(config.host).toBe('localhost')
    expect(config.port).toBe(3306)
    expect(config.username).toBe('root')
    expect(config.password).toBe('crm_password_123')
    expect(config.database).toBe('crm_sales')
    expect(config.logging).toBe(false)
  })

  it('databaseConfig should read values from env', () => {
    process.env.DB_HOST = 'db.internal'
    process.env.DB_PORT = '4406'
    process.env.DB_USERNAME = 'crm_user'
    process.env.DB_PASSWORD = 'secret'
    process.env.DB_DATABASE = 'crm_prod'
    process.env.NODE_ENV = 'development'

    const config = databaseConfig() as Record<string, unknown>

    expect(config.host).toBe('db.internal')
    expect(config.port).toBe(4406)
    expect(config.username).toBe('crm_user')
    expect(config.password).toBe('secret')
    expect(config.database).toBe('crm_prod')
    expect(config.logging).toBe(true)
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
  })

  it('redisConfig should use defaults and parse env values', () => {
    delete process.env.REDIS_HOST
    delete process.env.REDIS_PORT
    delete process.env.REDIS_PASSWORD
    delete process.env.REDIS_DB

    const defaults = redisConfig()
    expect(defaults.host).toBe('localhost')
    expect(defaults.port).toBe(6379)
    expect(defaults.password).toBeUndefined()
    expect(defaults.db).toBe(0)

    process.env.REDIS_HOST = 'redis.internal'
    process.env.REDIS_PORT = '6380'
    process.env.REDIS_PASSWORD = 'pwd'
    process.env.REDIS_DB = '2'

    const overridden = redisConfig()
    expect(overridden.host).toBe('redis.internal')
    expect(overridden.port).toBe(6380)
    expect(overridden.password).toBe('pwd')
    expect(overridden.db).toBe(2)
  })
})
