import {
  IsString,
  IsEnum,
  IsDateString,
  IsOptional,
  IsArray,
  ValidateNested,
  ArrayMinSize,
  ArrayMaxSize,
  IsNumber,
  MaxLength,
} from 'class-validator'
import { Type } from 'class-transformer'
import { PkType, PkMetric } from '@crm/shared'

export class PkTeamDto {
  @IsString()
  @MaxLength(100)
  name!: string

  @IsString()
  side!: string

  @IsArray()
  @IsNumber({}, { each: true })
  @ArrayMinSize(1)
  memberIds!: number[]
}

export class CreatePkDto {
  @IsString()
  @MaxLength(200)
  title!: string

  @IsEnum(PkType)
  type!: PkType

  @IsEnum(PkMetric)
  metric!: PkMetric

  @IsDateString()
  startDate!: string

  @IsDateString()
  endDate!: string

  @IsOptional()
  @IsString()
  stake?: string

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PkTeamDto)
  @ArrayMinSize(2)
  @ArrayMaxSize(2)
  teams!: PkTeamDto[]
}
