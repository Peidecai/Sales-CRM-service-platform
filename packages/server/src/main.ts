import { NestFactory } from '@nestjs/core'
import { ValidationPipe } from '@nestjs/common'
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger'
import { ConfigService } from '@nestjs/config'
import { AppModule } from './app.module'
import { HttpExceptionFilter } from './common/filters/http-exception.filter'
import { ResponseInterceptor } from './common/interceptors/response.interceptor'
import { LoggingInterceptor } from './common/interceptors/logging.interceptor'
import { TimeoutInterceptor } from './common/interceptors/timeout.interceptor'

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    logger: ['error', 'warn', 'log', 'debug'],
  })

  const configService = app.get(ConfigService)
  const port = configService.get<number>('PORT', 3000)
  const apiPrefix = configService.get<string>('API_PREFIX', '/api/v1')

  // Global prefix
  app.setGlobalPrefix(apiPrefix.replace(/^\//, ''))

  // CORS
  const corsOrigins = configService.get<string>(
    'CORS_ORIGINS',
    'http://localhost:5173,http://localhost:3001',
  )
  app.enableCors({
    origin: corsOrigins.split(',').map((o) => o.trim()),
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true,
  })

  // Global pipes
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  )

  // Global filters
  app.useGlobalFilters(new HttpExceptionFilter())

  // Global interceptors
  app.useGlobalInterceptors(
    new TimeoutInterceptor(30000),
    new LoggingInterceptor(),
    new ResponseInterceptor(),
  )

  // Swagger
  const swaggerEnabled = configService.get<string>('SWAGGER_ENABLED', 'true') === 'true'
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
  console.log(`🚀 NestJS server running on: http://localhost:${port}`)
  console.log(`📋 API prefix: ${apiPrefix}`)
}

bootstrap()
