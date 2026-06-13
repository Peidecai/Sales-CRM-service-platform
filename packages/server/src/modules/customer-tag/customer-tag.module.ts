import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { CustomerTag } from './entities/customer-tag.entity'
import { CustomerTagRelation } from './entities/customer-tag-relation.entity'
import { CustomerTagController } from './customer-tag.controller'
import { CustomerTagService } from './customer-tag.service'
import { AutoTagService } from './auto-tag.service'
import { CustomerModule } from '../customer/customer.module'

@Module({
  imports: [TypeOrmModule.forFeature([CustomerTag, CustomerTagRelation]), CustomerModule],
  controllers: [CustomerTagController],
  providers: [CustomerTagService, AutoTagService],
  exports: [CustomerTagService, AutoTagService],
})
export class CustomerTagModule {}
