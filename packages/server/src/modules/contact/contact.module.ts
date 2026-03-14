import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { Contact } from './contact.entity'
import { ContactController } from './contact.controller'
import { ContactService } from './contact.service'
import { CustomerModule } from '../customer/customer.module'

@Module({
  imports: [TypeOrmModule.forFeature([Contact]), CustomerModule],
  controllers: [ContactController],
  providers: [ContactService],
  exports: [ContactService, TypeOrmModule],
})
export class ContactModule {}
