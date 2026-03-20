import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { SimPreference } from './entities/sim-preference.entity'
import { CustomerSimBinding } from './entities/customer-sim-binding.entity'
import { CallRecordModule } from '../call-record/call-record.module'
import { SimService } from './sim.service'
import { SimController } from './sim.controller'

@Module({
  imports: [TypeOrmModule.forFeature([SimPreference, CustomerSimBinding]), CallRecordModule],
  controllers: [SimController],
  providers: [SimService],
  exports: [SimService],
})
export class SimModule {}
