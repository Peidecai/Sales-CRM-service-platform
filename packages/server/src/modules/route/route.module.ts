import { Module } from '@nestjs/common'
import { RouteController } from './route.controller'
import { RouteService } from './route.service'
import { CustomerModule } from '../customer/customer.module'

@Module({
  imports: [CustomerModule],
  controllers: [RouteController],
  providers: [RouteService],
})
export class RouteModule {}
