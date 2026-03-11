import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { Contact } from './contact.entity'
import { Customer } from '../customer/customer.entity'
import { ContactController } from './contact.controller'
import { ContactService } from './contact.service'

@Module({
  imports: [TypeOrmModule.forFeature([Contact, Customer])],
  controllers: [ContactController],
  providers: [ContactService],
  exports: [ContactService],
})
export class ContactModule {}
