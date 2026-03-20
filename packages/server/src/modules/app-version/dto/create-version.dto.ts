import {
  IsString,
  IsNotEmpty,
  IsNumber,
  IsEnum,
  IsBoolean,
  IsOptional,
  Matches,
} from 'class-validator'
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'
import { AppPlatform } from '../entities/app-version.entity'

export class CreateVersionDto {
  @ApiProperty({ example: '1.2.0', description: '版本号 (semver)' })
  @IsString()
  @IsNotEmpty()
  @Matches(/^\d+\.\d+\.\d+$/, { message: 'version must be semver format (e.g. 1.2.0)' })
  version!: string

  @ApiProperty({ example: 100, description: '构建号' })
  @IsNumber()
  buildNumber!: number

  @ApiProperty({ enum: AppPlatform, example: AppPlatform.ALL })
  @IsEnum(AppPlatform)
  platform!: AppPlatform

  @ApiProperty({ example: 'https://cdn.example.com/app-1.2.0.wgt' })
  @IsString()
  @IsNotEmpty()
  downloadUrl!: string

  @ApiProperty({ example: '修复了已知问题，优化了性能' })
  @IsString()
  @IsNotEmpty()
  description!: string

  @ApiPropertyOptional({ default: false })
  @IsBoolean()
  @IsOptional()
  forceUpdate?: boolean

  @ApiPropertyOptional({ default: true })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean

  @ApiPropertyOptional({ example: '1.0.0', description: '最低支持版本' })
  @IsString()
  @IsOptional()
  @Matches(/^\d+\.\d+\.\d+$/, { message: 'minVersion must be semver format' })
  minVersion?: string
}
