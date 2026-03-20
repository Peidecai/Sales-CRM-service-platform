import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { Pk } from './pk.entity'
import { PkTeam } from './pk-team.entity'
import { PkMember } from './pk-member.entity'
import { PkBadge } from './pk-badge.entity'
import { PkController } from './pk.controller'
import { PkService } from './pk.service'
import { PkBadgeService } from './pk-badge.service'
import { PkCronService } from './pk-cron.service'
import { OpportunityModule } from '../opportunity/opportunity.module'
import { CustomerModule } from '../customer/customer.module'
import { CallRecordModule } from '../call-record/call-record.module'
import { PaymentModule } from '../payment/payment.module'
import { UserModule } from '../user/user.module'

@Module({
  imports: [
    TypeOrmModule.forFeature([Pk, PkTeam, PkMember, PkBadge]),
    OpportunityModule,
    CustomerModule,
    CallRecordModule,
    PaymentModule,
    UserModule,
  ],
  controllers: [PkController],
  providers: [PkService, PkBadgeService, PkCronService],
  exports: [PkService],
})
export class PkModule {}
