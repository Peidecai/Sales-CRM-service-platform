import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { CheckIn } from './entities/check-in.entity'
import { CheckInController } from './check-in.controller'
import { CheckInService } from './check-in.service'
import { CustomerModule } from '../customer/customer.module'

@Module({
  imports: [TypeOrmModule.forFeature([CheckIn]), CustomerModule],
  controllers: [CheckInController],
  providers: [CheckInService],
  exports: [CheckInService, TypeOrmModule],
})
export class CheckInModule {}
