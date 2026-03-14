import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsInt,
  MaxLength,
  Matches,
  IsArray,
  Min,
} from 'class-validator'

export class CreateTagDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  name!: string

  @IsOptional()
  @IsString()
  @Matches(/^#[0-9A-Fa-f]{6}$/, { message: '颜色格式不正确，请使用HEX格式(如#409EFF)' })
  color?: string

  @IsOptional()
  @IsString()
  @MaxLength(50)
  group?: string

  @IsOptional()
  @IsInt()
  @Min(0)
  sort?: number
}

export class BatchTagDto {
  @IsArray()
  @IsInt({ each: true })
  customerIds!: number[]

  @IsArray()
  @IsInt({ each: true })
  tagIds!: number[]
}

export class AddTagsDto {
  @IsArray()
  @IsInt({ each: true })
  tagIds!: number[]
}
