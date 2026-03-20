import { IsString, IsOptional, IsEnum, IsDateString, MaxLength } from 'class-validator'
import { TodoCategory, TodoPriority } from '@crm/shared'

export class UpdateTodoDto {
  @IsOptional()
  @IsString()
  @MaxLength(200)
  title?: string

  @IsOptional()
  @IsString()
  description?: string

  @IsOptional()
  @IsEnum(TodoCategory)
  category?: TodoCategory

  @IsOptional()
  @IsEnum(TodoPriority)
  priority?: TodoPriority

  @IsOptional()
  @IsDateString()
  dueDate?: string
}
