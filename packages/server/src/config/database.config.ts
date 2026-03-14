import { TypeOrmModuleOptions } from '@nestjs/typeorm'
import { ConfigService } from '@nestjs/config'

export const databaseConfig = (config: ConfigService): TypeOrmModuleOptions => {
  const nodeEnv = config.get<string>('NODE_ENV', 'development')
  const dbPassword = config.get<string>('DB_PASSWORD', '')

  if (nodeEnv === 'production' && !dbPassword) {
    throw new Error('DB_PASSWORD is required in production')
  }

  return {
    type: 'mysql',
    host: config.get<string>('DB_HOST', 'localhost'),
    port: config.get<number>('DB_PORT', 3306),
    username: config.get<string>('DB_USERNAME', 'crm_user'),
    password: dbPassword,
    database: config.get<string>('DB_DATABASE', 'crm_sales'),
    entities: [__dirname + '/../**/*.entity{.ts,.js}'],
    migrations: [__dirname + '/../../database/migrations/*{.ts,.js}'],
    synchronize: false,
    logging: nodeEnv === 'development',
    timezone: '+08:00',
    charset: 'utf8mb4',
    extra: {
      connectionLimit: config.get<number>('DB_CONNECTION_LIMIT', 20),
      acquireTimeout: 10000,
      connectTimeout: 10000,
      waitForConnections: true,
      queueLimit: 0,
      collation: 'utf8mb4_unicode_ci',
      ...(nodeEnv === 'production' &&
        config.get<string>('DB_SSL', 'false') !== 'false' && {
          ssl: {
            rejectUnauthorized:
              config.get<string>('DB_SSL_REJECT_UNAUTHORIZED', 'true') !== 'false',
          },
        }),
    },
  }
}
