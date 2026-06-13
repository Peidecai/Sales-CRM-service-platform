import { IsString, IsOptional, IsBoolean } from 'class-validator'

export class CreatePromptTemplateDto {
  @IsString()
  name!: string

  @IsString()
  module!: string

  @IsString()
  scene!: string

  @IsString()
  systemPrompt!: string

  @IsOptional()
  @IsString()
  userPromptTemplate?: string | null

  @IsOptional()
  @IsBoolean()
  isActive?: boolean

  @IsOptional()
  @IsString()
  description?: string | null
}

export class UpdatePromptTemplateDto {
  @IsOptional()
  @IsString()
  name?: string

  @IsOptional()
  @IsString()
  systemPrompt?: string

  @IsOptional()
  @IsString()
  userPromptTemplate?: string | null

  @IsOptional()
  @IsBoolean()
  isActive?: boolean

  @IsOptional()
  @IsString()
  description?: string | null

  @IsOptional()
  @IsString()
  changeNote?: string
}

export class RollbackPromptDto {
  @IsOptional()
  version?: number
}
