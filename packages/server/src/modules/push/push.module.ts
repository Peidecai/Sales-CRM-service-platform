import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { DeviceToken } from './entities/device-token.entity'
import { PushController } from './push.controller'
import { PushService } from './push.service'
import { PUSH_PROVIDER } from './interfaces/push-provider.interface'
import { MockPushProvider } from './mock-push.provider'

@Module({
  imports: [TypeOrmModule.forFeature([DeviceToken])],
  controllers: [PushController],
  providers: [
    PushService,
    {
      provide: PUSH_PROVIDER,
      useClass: MockPushProvider,
    },
  ],
  exports: [PushService, TypeOrmModule],
})
export class PushModule {}
