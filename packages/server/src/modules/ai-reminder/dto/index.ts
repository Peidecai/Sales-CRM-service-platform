import { IsOptional, IsInt, Min, Max, IsEnum, IsString } from 'class-validator'
import { Type } from 'class-transformer'
import { AiReminderType, AiReminderFeedback } from '@crm/shared'

export class OpportunityScoreQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  opportunityId?: number

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  userId?: number

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  pageSize?: number = 20
}

export class AiReminderQueryDto {
  @IsOptional()
  @IsEnum(AiReminderType)
  type?: AiReminderType

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  opportunityId?: number

  @IsOptional()
  @IsString()
  priority?: string

  @IsOptional()
  @Type(() => Boolean)
  isRead?: boolean

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  pageSize?: number = 20
}

export class AiReminderFeedbackDto {
  @IsEnum(AiReminderFeedback)
  feedback!: AiReminderFeedback
}

export class CompetitorMentionQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  callRecordId?: number

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  opportunityId?: number

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  pageSize?: number = 20
}
