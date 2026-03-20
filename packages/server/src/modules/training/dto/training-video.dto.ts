import { IsString, IsOptional, IsInt, IsBoolean, MaxLength, Min } from 'class-validator'
import { Type } from 'class-transformer'

export class CreateTrainingVideoDto {
  @IsString()
  @MaxLength(200)
  title!: string

  @IsOptional()
  @IsString()
  description?: string

  @IsString()
  @MaxLength(500)
  fileUrl!: string

  @IsOptional()
  @IsString()
  @MaxLength(500)
  coverUrl?: string

  @IsInt()
  @Min(0)
  @Type(() => Number)
  duration!: number

  @IsInt()
  @Min(0)
  @Type(() => Number)
  fileSize!: number

  @IsString()
  @MaxLength(20)
  format!: string

  @IsInt()
  @Type(() => Number)
  categoryId!: number

  @IsOptional()
  @IsInt()
  @Min(0)
  @Type(() => Number)
  sortOrder?: number
}

export class UpdateTrainingVideoDto {
  @IsOptional()
  @IsString()
  @MaxLength(200)
  title?: string

  @IsOptional()
  @IsString()
  description?: string

  @IsOptional()
  @IsString()
  @MaxLength(500)
  fileUrl?: string

  @IsOptional()
  @IsString()
  @MaxLength(500)
  coverUrl?: string

  @IsOptional()
  @IsInt()
  @Min(0)
  @Type(() => Number)
  duration?: number

  @IsOptional()
  @IsInt()
  @Min(0)
  @Type(() => Number)
  fileSize?: number

  @IsOptional()
  @IsString()
  @MaxLength(20)
  format?: string

  @IsOptional()
  @IsInt()
  @Type(() => Number)
  categoryId?: number

  @IsOptional()
  @IsInt()
  @Min(0)
  @Type(() => Number)
  sortOrder?: number

  @IsOptional()
  @IsBoolean()
  isPublished?: boolean
}

export class QueryVideoDto {
  @IsOptional()
  @IsInt()
  @Type(() => Number)
  categoryId?: number

  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  isPublished?: boolean

  @IsOptional()
  @IsString()
  keyword?: string

  @IsOptional()
  @IsInt()
  @Min(1)
  @Type(() => Number)
  page?: number

  @IsOptional()
  @IsInt()
  @Min(1)
  @Type(() => Number)
  pageSize?: number
}
