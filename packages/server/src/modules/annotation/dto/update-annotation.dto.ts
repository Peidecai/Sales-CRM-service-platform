import { IsString, IsOptional } from 'class-validator'

export class UpdateAnnotationDto {
  @IsOptional()
  @IsString()
  content?: string
}
