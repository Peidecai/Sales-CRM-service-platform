import { Injectable } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { InjectQueue } from '@nestjs/bull'
import { Repository } from 'typeorm'
import { Queue } from 'bull'
import { CustomerProfile } from './entities/customer-profile.entity'

@Injectable()
export class AiProfileService {
  constructor(
    @InjectRepository(CustomerProfile)
    private readonly profileRepo: Repository<CustomerProfile>,
    @InjectQueue('customer-profile')
    private readonly profileQueue: Queue,
  ) {}

  async getCustomerProfile(customerId: number) {
    return this.profileRepo.findOne({ where: { customerId } })
  }

  async generateCustomerProfile(customerId: number) {
    await this.profileQueue.add({ customerId })
    return { status: 'queued' }
  }
}
