import { Injectable, NestMiddleware } from '@nestjs/common'
import { Request, Response, NextFunction } from 'express'
import { randomUUID } from 'crypto'
import { requestContext } from '../context/request-context'

@Injectable()
export class RequestContextMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction): void {
    const traceId = (req.headers['x-request-id'] as string) || randomUUID()

    // Echo traceId back in response header
    res.setHeader('X-Request-Id', traceId)

    // Extract userId from JWT payload if already decoded (set by passport later)
    // userId will be populated by the logging interceptor after auth guard runs
    requestContext.run({ traceId }, () => {
      next()
    })
  }
}
