import { Module, Global } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { DataMaskingRule } from './entities/data-masking-rule.entity'
import { DataMaskingService } from './data-masking.service'
import { DataMaskingInterceptor } from './data-masking.interceptor'
import { DataMaskingController } from './data-masking.controller'

@Global()
@Module({
  imports: [TypeOrmModule.forFeature([DataMaskingRule])],
  controllers: [DataMaskingController],
  providers: [DataMaskingService, DataMaskingInterceptor],
  exports: [DataMaskingService, DataMaskingInterceptor],
})
export class DataMaskingModule {}
