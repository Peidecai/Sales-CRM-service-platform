import { LoggerService } from '@nestjs/common'
import { winstonLogger } from './winston.config'

/**
 * NestJS-compatible logger service backed by Winston.
 *
 * Drop-in replacement for the default NestJS logger.
 * Usage in main.ts:
 *   app.useLogger(new WinstonLoggerService())
 */
export class WinstonLoggerService implements LoggerService {
  log(message: string, context?: string): void {
    winstonLogger.info(message, { context })
  }

  error(message: string, trace?: string, context?: string): void {
    winstonLogger.error(message, { trace, context })
  }

  warn(message: string, context?: string): void {
    winstonLogger.warn(message, { context })
  }

  debug(message: string, context?: string): void {
    winstonLogger.debug(message, { context })
  }

  verbose(message: string, context?: string): void {
    winstonLogger.verbose(message, { context })
  }
}
