import { IsString, IsOptional, IsEnum, IsDateString, IsInt, MaxLength } from 'class-validator'
import { TodoCategory, TodoPriority } from '@crm/shared'

export class CreateTodoDto {
  @IsString()
  @MaxLength(200)
  title!: string

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

  @IsOptional()
  @IsString()
  @MaxLength(50)
  relatedType?: string

  @IsOptional()
  @IsInt()
  relatedId?: number
}
