import { IsOptional, IsString, IsInt, IsBoolean, IsIn, Min, Max } from 'class-validator'
import { Type } from 'class-transformer'

export class ForumPostQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  categoryId?: number

  @IsOptional()
  @IsString()
  keyword?: string

  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  isPinned?: boolean

  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  isFeatured?: boolean

  @IsOptional()
  @IsIn(['latest', 'popular', 'commented'])
  sortBy?: 'latest' | 'popular' | 'commented'

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  pageSize?: number
}
