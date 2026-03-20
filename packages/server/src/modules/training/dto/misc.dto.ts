import { IsString, IsOptional, IsInt, MaxLength, Min, IsArray } from 'class-validator'
import { Type } from 'class-transformer'

export class CreateChapterDto {
  @IsString()
  @MaxLength(200)
  title!: string

  @IsInt()
  @Min(0)
  @Type(() => Number)
  startTime!: number

  @IsOptional()
  @IsInt()
  @Min(0)
  @Type(() => Number)
  sortOrder?: number
}

export class UpdateChapterDto {
  @IsOptional()
  @IsString()
  @MaxLength(200)
  title?: string

  @IsOptional()
  @IsInt()
  @Min(0)
  @Type(() => Number)
  startTime?: number

  @IsOptional()
  @IsInt()
  @Min(0)
  @Type(() => Number)
  sortOrder?: number
}

export class UpdateProgressDto {
  @IsInt()
  @Min(0)
  @Type(() => Number)
  watchedSeconds!: number

  @IsInt()
  @Min(0)
  @Type(() => Number)
  lastPosition!: number
}

export class CreateBookmarkDto {
  @IsInt()
  @Min(0)
  @Type(() => Number)
  timestamp!: number

  @IsOptional()
  @IsString()
  note?: string
}

export class CreateTrainingTaskDto {
  @IsString()
  @MaxLength(200)
  title!: string

  @IsOptional()
  @IsString()
  description?: string

  @IsInt()
  @Type(() => Number)
  videoId!: number

  @IsArray()
  @IsInt({ each: true })
  assigneeIds!: number[]

  @Type(() => Date)
  deadline!: Date
}
