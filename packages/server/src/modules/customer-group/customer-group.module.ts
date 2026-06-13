import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { CustomerGroup } from './entities/customer-group.entity'
import { CustomerGroupMember } from './entities/customer-group-member.entity'
import { CustomerGroupController } from './customer-group.controller'
import { CustomerGroupService } from './customer-group.service'
import { CustomerModule } from '../customer/customer.module'

@Module({
  imports: [TypeOrmModule.forFeature([CustomerGroup, CustomerGroupMember]), CustomerModule],
  controllers: [CustomerGroupController],
  providers: [CustomerGroupService],
  exports: [CustomerGroupService, TypeOrmModule],
})
export class CustomerGroupModule {}
