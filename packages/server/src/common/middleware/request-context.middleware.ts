import { Injectable, NestMiddleware } from '@nestjs/common'
import { Request, Response, NextFunction } from 'express'
import { randomUUID } from 'crypto'
import { requestContext } from '../context/request-context'

@Injectable()
export class RequestContextMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction): void {
    const traceId = (req.headers['x-request-id'] as string) || randomUUID()

    // 将 traceId 回传给客户端，便于前后端和日志系统串起同一次请求。
    res.setHeader('X-Request-Id', traceId)

    // 先创建 AsyncLocalStorage 上下文；认证完成后再由后续环节补充 userId 等信息。
    requestContext.run({ traceId }, () => {
      next()
    })
  }
}
