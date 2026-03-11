import { IsBoolean } from 'class-validator'
import { ApiProperty } from '@nestjs/swagger'

export class SetTopRecommendDto {
  @ApiProperty({ description: 'Whether to set top/recommend' })
  @IsBoolean()
  value!: boolean
}
