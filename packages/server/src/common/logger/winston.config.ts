import * as winston from 'winston'
import 'winston-daily-rotate-file'
import { getTraceId, getUserId } from '../context/request-context'

/**
 * Winston logger configuration.
 *
 * - JSON format for structured logging (ELK / Filebeat compatible)
 * - Daily file rotation with 30-day retention
 * - Separate error log file
 * - Console transport for development
 * - traceId injected from AsyncLocalStorage for full request tracing
 */

const LOG_DIR = process.env.LOG_DIR || 'logs'
const NODE_ENV = process.env.NODE_ENV || 'development'

// ── Inject traceId + userId from AsyncLocalStorage ───────────
const injectTraceId = winston.format((info) => {
  info.traceId = getTraceId()
  info.userId = getUserId() ?? null
  return info
})

// ── Custom format: JSON with timestamp + traceId ─────────────
const jsonFormat = winston.format.combine(
  injectTraceId(),
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss.SSS' }),
  winston.format.errors({ stack: true }),
  winston.format.json(),
)

// ── Console format: colorized for dev readability ────────────
const consoleFormat = winston.format.combine(
  injectTraceId(),
  winston.format.timestamp({ format: 'HH:mm:ss.SSS' }),
  winston.format.colorize({ all: true }),
  winston.format.printf(
    ({ timestamp, level, message, context, traceId, userId, trace, ...meta }) => {
      const ctx = context ? `[${context}]` : ''
      const tid = traceId && traceId !== 'unknown' ? `[${traceId}]` : ''
      const uid = userId ? ` user=${userId}` : ''
      const metaStr = Object.keys(meta).length ? ` ${JSON.stringify(meta)}` : ''
      const traceStr = trace ? `\n${trace}` : ''
      return `${timestamp} ${level} ${tid}${ctx}${uid} ${message}${metaStr}${traceStr}`
    },
  ),
)

// ── Transports ──────────────────────────────────────────────
const transports: winston.transport[] = []

// Console transport — always active in dev, minimal in prod
if (NODE_ENV !== 'production') {
  transports.push(
    new winston.transports.Console({
      format: consoleFormat,
      level: 'debug',
    }),
  )
} else {
  transports.push(
    new winston.transports.Console({
      format: jsonFormat,
      level: 'info',
    }),
  )
}

// File transports — only in production
if (NODE_ENV === 'production') {
  // All logs (info and above) — daily rotation
  transports.push(
    new winston.transports.DailyRotateFile({
      dirname: LOG_DIR,
      filename: 'app-%DATE%.log',
      datePattern: 'YYYY-MM-DD',
      zippedArchive: true,
      maxSize: '50m',
      maxFiles: '30d',
      level: 'info',
      format: jsonFormat,
    }),
  )

  // Error-only log — daily rotation
  transports.push(
    new winston.transports.DailyRotateFile({
      dirname: LOG_DIR,
      filename: 'error-%DATE%.log',
      datePattern: 'YYYY-MM-DD',
      zippedArchive: true,
      maxSize: '50m',
      maxFiles: '30d',
      level: 'error',
      format: jsonFormat,
    }),
  )
}

// ── Create logger instance ──────────────────────────────────
export const winstonConfig: winston.LoggerOptions = {
  level: NODE_ENV === 'production' ? 'info' : 'debug',
  defaultMeta: {
    service: 'crm-server',
    env: NODE_ENV,
  },
  transports,
  // Do not exit on uncaughtException — let NestJS handle it
  exitOnError: false,
}

export const winstonLogger = winston.createLogger(winstonConfig)
