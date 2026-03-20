import { IsString, IsNumber, IsBoolean, IsOptional, Min, Max } from 'class-validator'

export class UpdateAiConfigDto {
  @IsOptional()
  @IsString()
  provider?: string

  @IsOptional()
  @IsString()
  model?: string

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(2)
  temperature?: number

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(128000)
  maxTokens?: number

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(1)
  topP?: number

  @IsOptional()
  @IsNumber()
  @Min(-2)
  @Max(2)
  frequencyPenalty?: number

  @IsOptional()
  @IsNumber()
  @Min(-2)
  @Max(2)
  presencePenalty?: number

  @IsOptional()
  @IsBoolean()
  isActive?: boolean

  @IsOptional()
  @IsString()
  fallbackModel?: string | null

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(100)
  fallbackThreshold?: number
}
