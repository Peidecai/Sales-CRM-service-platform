import {
  IsInt,
  IsPositive,
  IsOptional,
  IsString,
  IsArray,
  MaxLength,
  Min,
  Max,
} from 'class-validator'
import { Type } from 'class-transformer'

export class ClaimDto {
  @IsInt()
  @IsPositive()
  customerId!: number
}

export class BatchClaimDto {
  @IsArray()
  @IsInt({ each: true })
  customerIds!: number[]
}

export class AssignDto {
  @IsInt()
  @IsPositive()
  customerId!: number

  @IsInt()
  @IsPositive()
  toUserId!: number
}

export class ReturnDto {
  @IsInt()
  @IsPositive()
  customerId!: number

  @IsOptional()
  @IsString()
  @MaxLength(500)
  reason?: string
}

export class BatchReturnDto {
  @IsArray()
  @IsInt({ each: true })
  customerIds!: number[]

  @IsOptional()
  @IsString()
  @MaxLength(500)
  reason?: string
}

export class QueryPoolDto {
  @IsOptional()
  @IsString()
  keyword?: string

  @IsOptional()
  @IsString()
  industry?: string

  @IsOptional()
  @IsString()
  region?: string

  @IsOptional()
  @IsInt()
  @Min(1)
  @Type(() => Number)
  page?: number = 1

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  @Type(() => Number)
  pageSize?: number = 20
}

export class QueryPoolLogDto {
  @IsOptional()
  @IsInt()
  @Type(() => Number)
  customerId?: number

  @IsOptional()
  @IsInt()
  @Min(1)
  @Type(() => Number)
  page?: number = 1

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  @Type(() => Number)
  pageSize?: number = 20
}

export class UpdatePoolConfigDto {
  @IsOptional() @IsInt() @Min(1) daily_claim_limit?: number
  @IsOptional() @IsInt() @Min(1) max_holding?: number
  @IsOptional() @IsInt() @Min(0) cooldown_days?: number
  @IsOptional() @IsInt() @Min(1) protect_days_new?: number
  @IsOptional() @IsInt() @Min(1) protect_days_following?: number
  @IsOptional() @IsInt() @Min(1) protect_days_intention?: number
  @IsOptional() @IsInt() @Min(1) protect_days_opportunity?: number
  @IsOptional() @IsInt() @Min(1) recycle_days_lead?: number
  @IsOptional() @IsInt() @Min(1) recycle_days_potential?: number
  @IsOptional() @IsInt() @Min(1) recycle_days_following?: number
  @IsOptional() @IsInt() @Min(1) recycle_days_intention?: number
}
