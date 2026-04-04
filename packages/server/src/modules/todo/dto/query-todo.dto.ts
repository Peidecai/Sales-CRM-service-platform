import { IsOptional, IsEnum, IsInt, Min } from 'class-validator'
import { Type, Transform } from 'class-transformer'
import { TodoCategory, TodoPriority, TodoStatus } from '@crm/shared'

export class QueryTodoDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  pageSize?: number

  @IsOptional()
  @Transform(({ value }) => (value === '' ? undefined : value))
  @IsEnum(TodoStatus)
  status?: TodoStatus

  @IsOptional()
  @Transform(({ value }) => (value === '' ? undefined : value))
  @IsEnum(TodoPriority)
  priority?: TodoPriority

  @IsOptional()
  @Transform(({ value }) => (value === '' ? undefined : value))
  @IsEnum(TodoCategory)
  category?: TodoCategory
}
