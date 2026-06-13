import { IsString, IsOptional, IsIn } from 'class-validator'

export class PlaygroundDto {
  @IsString()
  prompt!: string

  @IsOptional()
  @IsString()
  module?: string

  @IsOptional()
  @IsString()
  systemPrompt?: string
}

export class UsageQueryDto {
  @IsOptional()
  @IsString()
  module?: string

  @IsOptional()
  @IsString()
  startDate?: string

  @IsOptional()
  @IsString()
  endDate?: string

  @IsOptional()
  @IsIn(['day', 'week', 'month'])
  groupBy?: 'day' | 'week' | 'month'
}
