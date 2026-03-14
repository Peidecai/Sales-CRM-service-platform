import { Module } from '@nestjs/common'
import { AliyunVoiceAdapter } from './adapters/aliyun-voice.adapter'
import { CallService } from './call.service'
import { CallController } from './call.controller'
import { CallCallbackController } from './call-callback.controller'
import { CallCallbackService } from './call-callback.service'
import { CallPopupController } from './call-popup.controller'
import { CustomerMatcherService } from './customer-matcher.service'
import { PopupAggregateService } from './popup-aggregate.service'
import { AgentModule } from '../agent/agent.module'
import { CallRecordModule } from '../call-record/call-record.module'
import { CustomerModule } from '../customer/customer.module'
import { ContactModule } from '../contact/contact.module'
import { FollowUpModule } from '../follow-up/follow-up.module'
import { CallbackSignatureGuard } from '../../common/guards/callback-signature.guard'

@Module({
  imports: [AgentModule, CallRecordModule, CustomerModule, ContactModule, FollowUpModule],
  controllers: [CallController, CallCallbackController, CallPopupController],
  providers: [
    CallService,
    CallCallbackService,
    CustomerMatcherService,
    PopupAggregateService,
    CallbackSignatureGuard,
    {
      provide: 'VOICE_PROVIDER',
      useClass: AliyunVoiceAdapter,
    },
  ],
  exports: [CallService, CustomerMatcherService, PopupAggregateService],
})
export class CallModule {}
