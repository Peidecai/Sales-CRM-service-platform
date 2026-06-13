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
import { CustomerExportService } from './services/customer-export.service'
import { CustomerImportService } from './services/customer-import.service'
import { CustomerNumberService } from './services/customer-number.service'
import { DuplicateCheckService } from './services/duplicate-check.service'
import { CustomerMergeService } from './services/customer-merge.service'
import { CustomerBloomService } from './services/customer-bloom.service'
import { CustomerImportProcessor } from './processors/customer-import.processor'
import { CustomFieldModule } from '../custom-field/custom-field.module'

@Module({
  imports: [
    TypeOrmModule.forFeature([Customer, User, Contact, FollowUp, Opportunity, CustomerImportLog]),
    BullModule.registerQueue({
      name: 'customer-import',
      defaultJobOptions: {
        attempts: 3,
        backoff: { type: 'exponential', delay: 5000 },
        removeOnComplete: 100,
        removeOnFail: 200,
      },
    }),
    CustomFieldModule,
  ],
  controllers: [CustomerController],
  providers: [
    CustomerService,
    CustomerExportService,
    CustomerImportService,
    CustomerNumberService,
    DuplicateCheckService,
    CustomerMergeService,
    CustomerBloomService,
    CustomerImportProcessor,
  ],
  exports: [
    CustomerService,
    CustomerExportService,
    CustomerImportService,
    DuplicateCheckService,
    TypeOrmModule,
  ],
})
export class CustomerModule {}
