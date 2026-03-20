import { IsOptional, IsEnum, IsInt, Min, IsBoolean } from 'class-validator'
import { Type, Transform } from 'class-transformer'
import { AnnotationTargetType } from '@crm/shared'

export class QueryAnnotationDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  pageSize?: number

  @IsOptional()
  @IsEnum(AnnotationTargetType)
  targetType?: AnnotationTargetType

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  targetId?: number

  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean()
  resolved?: boolean
}
