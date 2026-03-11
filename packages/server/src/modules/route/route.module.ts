import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { RouteController } from './route.controller'
import { RouteService } from './route.service'
import { Customer } from '../customer/customer.entity'

@Module({
  imports: [TypeOrmModule.forFeature([Customer])],
  controllers: [RouteController],
  providers: [RouteService],
})
export class RouteModule {}
