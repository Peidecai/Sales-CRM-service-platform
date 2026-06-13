import {
  IsInt,
  IsPositive,
  IsOptional,
  IsNumber,
  Min,
  IsArray,
  ValidateNested,
} from 'class-validator'
import { Type } from 'class-transformer'
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'

class DecomposeItemDto {
  @ApiPropertyOptional({ description: '分配用户 ID (个人目标)' })
  @IsOptional()
  @IsInt()
  @IsPositive()
  assignedUserId?: number

  @ApiPropertyOptional({ description: '团队标识 (团队目标)' })
  @IsOptional()
  teamId?: string

  @ApiProperty({ description: '分配的目标值' })
  @IsNumber()
  @Min(0)
  targetValue!: number
}

export class DecomposeTargetDto {
  @ApiProperty({ description: '分解项列表', type: [DecomposeItemDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => DecomposeItemDto)
  items!: DecomposeItemDto[]
}
