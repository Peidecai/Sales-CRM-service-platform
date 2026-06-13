import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { SigningProcess } from './entities/signing-process.entity'
import { OpportunityModule } from '../opportunity/opportunity.module'
import { ContractModule } from '../contract/contract.module'
import { SigningService } from './signing.service'
import { SigningController } from './signing.controller'

@Module({
  imports: [TypeOrmModule.forFeature([SigningProcess]), OpportunityModule, ContractModule],
  controllers: [SigningController],
  providers: [SigningService],
  exports: [SigningService],
})
export class SigningModule {}
