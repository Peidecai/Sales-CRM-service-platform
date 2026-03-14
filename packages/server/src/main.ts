import { NestFactory } from '@nestjs/core'
import { ValidationPipe } from '@nestjs/common'
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger'
import { ConfigService } from '@nestjs/config'
import * as cookieParser from 'cookie-parser'
import { AppModule } from './app.module'
import { HttpExceptionFilter } from './common/filters/http-exception.filter'
import { ResponseInterceptor } from './common/interceptors/response.interceptor'
import { LoggingInterceptor } from './common/interceptors/logging.interceptor'
import { TimeoutInterceptor } from './common/interceptors/timeout.interceptor'
import { DataMaskInterceptor } from './common/interceptors/data-mask.interceptor'
import { SanitizeHtmlPipe } from './common/pipes/sanitize-html.pipe'
import { SqlInjectionMiddleware } from './common/middleware/sql-injection.middleware'
import { RequestContextMiddleware } from './common/middleware/request-context.middleware'
import { CsrfMiddleware } from './common/middleware/csrf.middleware'
import { WinstonLoggerService } from './common/logger/winston-logger.service'

async function bootstrap() {
  // Use Winston logger for structured, rotated logging
  const logger = new WinstonLoggerService()

  const app = await NestFactory.create(AppModule, {
    logger,
  })

  const configService = app.get(ConfigService)
  const port = configService.get<number>('PORT', 3000)
  const apiPrefix = configService.get<string>('API_PREFIX', '/api/v1')

  // Global prefix
  app.setGlobalPrefix(apiPrefix.replace(/^\//, ''))

  // CORS — also allow security-related headers
  const corsOrigins = configService.get<string>(
    'CORS_ORIGINS',
    'http://localhost:5173,http://localhost:3001',
  )
  app.enableCors({
    origin: corsOrigins.split(',').map((o) => o.trim()),
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: [
      'Content-Type',
      'Authorization',
      'X-Signature',
      'X-Timestamp',
      'X-Nonce',
      'X-Request-Id',
      'X-XSRF-TOKEN',
    ],
    exposedHeaders: ['X-Request-Id'],
    credentials: true,
  })

  // Cookie parser — required for CSRF double-submit cookie pattern
  app.use(cookieParser())

  // Request context middleware — traceId via AsyncLocalStorage (must be first)
  const requestContextMiddleware = new RequestContextMiddleware()
  app.use((req: unknown, res: unknown, next: unknown) =>
    requestContextMiddleware.use(
      req as Parameters<RequestContextMiddleware['use']>[0],
      res as Parameters<RequestContextMiddleware['use']>[1],
      next as Parameters<RequestContextMiddleware['use']>[2],
    ),
  )

  // SQL injection detection middleware (#164)
  const sqlInjectionMiddleware = new SqlInjectionMiddleware()
  app.use((req: unknown, res: unknown, next: unknown) =>
    sqlInjectionMiddleware.use(
      req as Parameters<SqlInjectionMiddleware['use']>[0],
      res as Parameters<SqlInjectionMiddleware['use']>[1],
      next as Parameters<SqlInjectionMiddleware['use']>[2],
    ),
  )

  // CSRF double-submit cookie validation
  const csrfMiddleware = new CsrfMiddleware()
  app.use((req: unknown, res: unknown, next: unknown) =>
    csrfMiddleware.use(
      req as Parameters<CsrfMiddleware['use']>[0],
      res as Parameters<CsrfMiddleware['use']>[1],
      next as Parameters<CsrfMiddleware['use']>[2],
    ),
  )

  // Global pipes — validation + XSS sanitization (#165)
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
    new SanitizeHtmlPipe(),
  )

  // Global filters
  app.useGlobalFilters(new HttpExceptionFilter())

  // Global interceptors — includes data masking (#163)
  app.useGlobalInterceptors(
    new TimeoutInterceptor(30000),
    new LoggingInterceptor(),
    new DataMaskInterceptor(),
    new ResponseInterceptor(),
  )

  // Swagger
  const swaggerEnabled = configService.get<string>('SWAGGER_ENABLED', 'false') === 'true'
  if (swaggerEnabled) {
    const swaggerPath = configService.get<string>('SWAGGER_PATH', 'api/docs')
    const config = new DocumentBuilder()
      .setTitle(configService.get<string>('SWAGGER_TITLE', 'CRM API'))
      .setDescription(configService.get<string>('SWAGGER_DESCRIPTION', 'CRM Sales Platform API'))
      .setVersion(configService.get<string>('SWAGGER_VERSION', '1.0'))
      .addBearerAuth()
      .build()
    const document = SwaggerModule.createDocument(app, config)
    SwaggerModule.setup(swaggerPath, app, document)
    console.log(`Swagger docs available at: http://localhost:${port}/${swaggerPath}`)
  }

  await app.listen(port)
  console.log(`NestJS server running on: http://localhost:${port}`)
  console.log(`API prefix: ${apiPrefix}`)
}

bootstrap()
