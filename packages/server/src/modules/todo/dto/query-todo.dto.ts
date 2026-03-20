import { IsOptional, IsEnum, IsInt, Min } from 'class-validator'
import { Type } from 'class-transformer'
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
  @IsEnum(TodoStatus)
  status?: TodoStatus

  @IsOptional()
  @IsEnum(TodoPriority)
  priority?: TodoPriority

  @IsOptional()
  @IsEnum(TodoCategory)
  category?: TodoCategory
}
