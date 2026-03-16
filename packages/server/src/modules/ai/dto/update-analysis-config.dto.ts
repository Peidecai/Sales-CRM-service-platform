import {
  IsBoolean,
  IsOptional,
  IsString,
  IsArray,
  IsObject,
  ArrayNotEmpty,
  MaxLength,
} from 'class-validator'
import { ApiPropertyOptional } from '@nestjs/swagger'

export class UpdateAnalysisConfigDto {
  // ---- 功能开关 ----

  @ApiPropertyOptional({ description: '通话 AI 分析总开关', example: true })
  @IsOptional()
  @IsBoolean()
  callAnalysisEnabled?: boolean

  @ApiPropertyOptional({ description: '客户分类开关', example: true })
  @IsOptional()
  @IsBoolean()
  customerClassifyEnabled?: boolean

  @ApiPropertyOptional({ description: '话术评分开关', example: true })
  @IsOptional()
  @IsBoolean()
  speechScoringEnabled?: boolean

  @ApiPropertyOptional({ description: '知识库匹配对比开关', example: true })
  @IsOptional()
  @IsBoolean()
  knowledgeCompareEnabled?: boolean

  @ApiPropertyOptional({ description: '分析后自动创建商机开关', example: true })
  @IsOptional()
  @IsBoolean()
  autoCreateOpportunity?: boolean

  // ---- 模型配置 ----

  @ApiPropertyOptional({ description: '对话模型名称', example: 'qwen-plus' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  chatModel?: string

  @ApiPropertyOptional({ description: '向量嵌入模型名称', example: 'text-embedding-v3' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  embeddingModel?: string

  // ---- 自定义提示词 ----

  @ApiPropertyOptional({ description: '通话分析自定义提示词（为空时使用默认）' })
  @IsOptional()
  @IsString()
  @MaxLength(10000)
  callAnalysisPrompt?: string

  @ApiPropertyOptional({ description: '客户分类自定义提示词（为空时使用默认）' })
  @IsOptional()
  @IsString()
  @MaxLength(10000)
  customerClassifyPrompt?: string

  @ApiPropertyOptional({ description: '话术评分自定义提示词（为空时使用默认）' })
  @IsOptional()
  @IsString()
  @MaxLength(10000)
  speechScoringPrompt?: string

  // ---- 分类规则 ----

  @ApiPropertyOptional({
    description: '客户分类规则列表，每项描述一个分类及其判定条件',
    type: 'array',
    items: { type: 'object' },
    example: [{ label: '高意向', keywords: ['购买', '下单'] }],
  })
  @IsOptional()
  @IsArray()
  @ArrayNotEmpty()
  @IsObject({ each: true })
  classifyRules?: Record<string, unknown>[]
}
