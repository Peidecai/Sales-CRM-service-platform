import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { CallRecord } from '../call-record/call-record.entity'
import { Customer } from '../customer/customer.entity'
import { Contact } from '../contact/contact.entity'
import { FollowUp } from '../follow-up/follow-up.entity'
import { AliyunVoiceAdapter } from './adapters/aliyun-voice.adapter'
import { CallService } from './call.service'
import { CallController } from './call.controller'
import { CallCallbackController } from './call-callback.controller'
import { CallCallbackService } from './call-callback.service'
import { CallPopupController } from './call-popup.controller'
import { CustomerMatcherService } from './customer-matcher.service'
import { PopupAggregateService } from './popup-aggregate.service'
import { CallbackSignatureGuard } from '../../common/guards/callback-signature.guard'

@Module({
  imports: [TypeOrmModule.forFeature([CallRecord, Customer, Contact, FollowUp])],
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
