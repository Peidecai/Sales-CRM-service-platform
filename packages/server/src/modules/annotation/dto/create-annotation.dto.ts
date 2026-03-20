import { IsString, IsEnum, IsInt, IsOptional, IsNumber } from 'class-validator'
import { AnnotationTargetType } from '@crm/shared'

export class CreateAnnotationDto {
  @IsEnum(AnnotationTargetType)
  targetType!: AnnotationTargetType

  @IsInt()
  targetId!: number

  @IsString()
  content!: string

  @IsOptional()
  @IsNumber()
  pageX?: number

  @IsOptional()
  @IsNumber()
  pageY?: number
}
