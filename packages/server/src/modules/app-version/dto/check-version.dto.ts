import { IsString, IsNotEmpty, Matches } from 'class-validator'
import { ApiProperty } from '@nestjs/swagger'

export class CheckVersionDto {
  @ApiProperty({ enum: ['android', 'ios'], example: 'android' })
  @IsString()
  @IsNotEmpty()
  platform!: string

  @ApiProperty({ example: '1.0.0' })
  @IsString()
  @IsNotEmpty()
  @Matches(/^\d+\.\d+\.\d+$/, { message: 'currentVersion must be semver format' })
  currentVersion!: string
}
