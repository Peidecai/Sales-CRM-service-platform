import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { BullModule } from '@nestjs/bull'
import { Customer } from './customer.entity'
import { User } from '../user/user.entity'
import { Contact } from '../contact/contact.entity'
import { FollowUp } from '../follow-up/follow-up.entity'
import { Opportunity } from '../opportunity/opportunity.entity'
import { CustomerImportLog } from './entities/customer-import-log.entity'
import { CustomerController } from './customer.controller'
import { CustomerService } from './customer.service'
import { DuplicateCheckService } from './services/duplicate-check.service'
import { CustomerMergeService } from './services/customer-merge.service'
import { CustomerImportProcessor } from './processors/customer-import.processor'
import { CustomFieldModule } from '../custom-field/custom-field.module'

@Module({
  imports: [
    TypeOrmModule.forFeature([Customer, User, Contact, FollowUp, Opportunity, CustomerImportLog]),
    BullModule.registerQueue({ name: 'customer-import' }),
    CustomFieldModule,
  ],
  controllers: [CustomerController],
  providers: [
    CustomerService,
    DuplicateCheckService,
    CustomerMergeService,
    CustomerImportProcessor,
  ],
  exports: [CustomerService, DuplicateCheckService],
})
export class CustomerModule {}
