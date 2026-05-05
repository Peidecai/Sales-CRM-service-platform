import { Controller, Post, Body, Res, UseGuards } from '@nestjs/common'
import type { Response } from 'express'
import { CallbackSignatureGuard } from '../../common/guards/callback-signature.guard'
import { ReplayAttackGuard } from '../../common/guards/replay-attack.guard'
import { CallCallbackService } from './call-callback.service'

/**
 * 厂商来电/状态回调接口，不做 JWT 校验，仅做签名校验。
 */
@Controller('call-callback')
export class CallCallbackController {
  constructor(private readonly callCallbackService: CallCallbackService) {}

  @Post()
  @UseGuards(CallbackSignatureGuard, ReplayAttackGuard)
  async handleProviderCallback(@Body() body: Record<string, unknown>, @Res() res: Response) {
    await this.callCallbackService.handleCallback(body)
    res.status(200).send('OK')
  }
}
