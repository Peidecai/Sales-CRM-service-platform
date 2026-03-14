import { IsString, IsNumber, IsOptional } from 'class-validator'

export class OssCallbackDto {
  @IsString()
  filename!: string

  @IsString()
  oss_key!: string

  @IsNumber()
  file_size!: number

  @IsString()
  mime_type!: string

  @IsString()
  signature!: string

  @IsString()
  timestamp!: string

  @IsOptional() @IsString() oss_bucket?: string
  @IsOptional() @IsString() md5?: string
  @IsOptional() @IsString() thumbnail_key?: string
  @IsOptional() @IsNumber() width?: number
  @IsOptional() @IsNumber() height?: number
  @IsOptional() @IsNumber() duration_seconds?: number
  @IsOptional() @IsNumber() created_by?: number
}
