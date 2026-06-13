import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { Annotation } from './entities/annotation.entity'
import { AnnotationService } from './annotation.service'
import { AnnotationController } from './annotation.controller'

@Module({
  imports: [TypeOrmModule.forFeature([Annotation])],
  controllers: [AnnotationController],
  providers: [AnnotationService],
  exports: [AnnotationService],
})
export class AnnotationModule {}
