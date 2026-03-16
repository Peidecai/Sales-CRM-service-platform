import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { Prospect } from './prospect.entity'
import { ProspectSearchLog } from './entities/prospect-search-log.entity'
import { ProspectDataSource } from './entities/prospect-data-source.entity'
import { ProspectSearchTemplate } from './entities/prospect-search-template.entity'
import { ProspectFilterConfig } from './entities/prospect-filter-config.entity'
import { CustomerModule } from '../customer/customer.module'
import { ProspectController } from './prospect.controller'
import { ProspectService } from './prospect.service'
import { ProspectConfigService } from './prospect-config.service'
import { MockProspectAdapter } from './adapters/mock.adapter'
import { TianyanchaAdapter } from './adapters/tianyancha.adapter'
import { QichachaAdapter } from './adapters/qichacha.adapter'

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Prospect,
      ProspectSearchLog,
      ProspectDataSource,
      ProspectSearchTemplate,
      ProspectFilterConfig,
    ]),
    CustomerModule,
  ],
  controllers: [ProspectController],
  providers: [
    ProspectService,
    ProspectConfigService,
    MockProspectAdapter,
    TianyanchaAdapter,
    QichachaAdapter,
  ],
  exports: [ProspectService, ProspectConfigService, TypeOrmModule],
})
export class ProspectModule {}
