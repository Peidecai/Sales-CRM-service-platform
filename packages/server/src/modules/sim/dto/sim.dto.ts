import { IsInt, IsOptional, IsString, MaxLength, Min, Max } from 'class-validator'
import { Type } from 'class-transformer'
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'

export class UpdateSimPreferenceDto {
  @ApiProperty({ description: '默认 SIM 卡槽位' })
  @IsInt()
  @Min(0)
  @Max(1)
  @Type(() => Number)
  defaultSlot!: number

  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(20) sim1Number?: string
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(20) sim1Carrier?: string
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(20) sim2Number?: string
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(20) sim2Carrier?: string
}

export class SetCustomerSimBindingDto {
  @ApiProperty() @IsInt() @Type(() => Number) customerId!: number
  @ApiProperty() @IsInt() @Min(0) @Max(1) @Type(() => Number) simSlot!: number
  @ApiPropertyOptional() @IsOptional() @IsString() reason?: string
}

export class SimUsageQueryDto {
  @ApiPropertyOptional() @IsOptional() @IsString() startDate?: string
  @ApiPropertyOptional() @IsOptional() @IsString() endDate?: string
}
