import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { Contract } from './entities/contract.entity'
import { ContractTemplate } from './entities/contract-template.entity'
import { ContractService } from './contract.service'
import { ContractTemplateService } from './contract-template.service'
import { ContractController } from './contract.controller'

@Module({
  imports: [TypeOrmModule.forFeature([Contract, ContractTemplate])],
  controllers: [ContractController],
  providers: [ContractService, ContractTemplateService],
  exports: [ContractService, ContractTemplateService, TypeOrmModule],
})
export class ContractModule {}
