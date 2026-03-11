import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { CustomerTag } from './entities/customer-tag.entity'
import { CustomerTagRelation } from './entities/customer-tag-relation.entity'
import { Customer } from '../customer/customer.entity'
import { CustomerTagController } from './customer-tag.controller'
import { CustomerTagService } from './customer-tag.service'
import { AutoTagService } from './auto-tag.service'

@Module({
  imports: [TypeOrmModule.forFeature([CustomerTag, CustomerTagRelation, Customer])],
  controllers: [CustomerTagController],
  providers: [CustomerTagService, AutoTagService],
  exports: [CustomerTagService, AutoTagService],
})
export class CustomerTagModule {}
