import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { SpeechCategory } from './entities/speech-category.entity'
import { SpeechTemplate } from './entities/speech-template.entity'
import { SpeechAnnotation } from './entities/speech-annotation.entity'
import {
  SpeechTemplateController,
  SpeechCategoryController,
  SpeechAnnotationController,
} from './speech.controller'
import { SpeechTemplateService } from './speech-template.service'
import { SpeechAnnotationService } from './speech-annotation.service'
import { CallRecordModule } from '../call-record/call-record.module'

@Module({
  imports: [
    TypeOrmModule.forFeature([SpeechCategory, SpeechTemplate, SpeechAnnotation]),
    CallRecordModule,
  ],
  controllers: [SpeechTemplateController, SpeechCategoryController, SpeechAnnotationController],
  providers: [SpeechTemplateService, SpeechAnnotationService],
  exports: [SpeechTemplateService, TypeOrmModule],
})
export class SpeechModule {}
