import { IsString, IsInt, IsOptional } from 'class-validator'

export class CreateForumCommentDto {
  @IsString()
  content!: string

  @IsOptional()
  @IsInt()
  parentId?: number

  @IsOptional()
  @IsInt()
  replyToUserId?: number
}
