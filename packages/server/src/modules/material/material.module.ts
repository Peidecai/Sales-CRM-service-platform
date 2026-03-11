import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { MaterialFile } from './entities/material-file.entity'
import { MaterialService } from './material.service'
import { OssUploadService } from './oss-upload.service'
import { PreviewService } from './preview.service'
import { MaterialController } from './material.controller'

@Module({
  imports: [TypeOrmModule.forFeature([MaterialFile])],
  controllers: [MaterialController],
  providers: [MaterialService, OssUploadService, PreviewService],
  exports: [MaterialService],
})
export class MaterialModule {}
