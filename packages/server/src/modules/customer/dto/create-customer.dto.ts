import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsEmail,
  IsEnum,
  IsInt,
  IsPositive,
  IsArray,
  MaxLength,
} from 'class-validator'
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'
import { CustomerStatus } from '@crm/shared'

export class CreateCustomerDto {
  @ApiProperty({ description: 'Customer name', maxLength: 100 })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  name!: string

  @ApiPropertyOptional({ description: 'Company name', maxLength: 200 })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  company?: string

  @ApiPropertyOptional({ description: 'Phone number', maxLength: 20 })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  phone?: string

  @ApiPropertyOptional({ description: 'Email address' })
  @IsOptional()
  @IsEmail()
  email?: string

  @ApiPropertyOptional({ description: 'Customer status', enum: CustomerStatus })
  @IsOptional()
  @IsEnum(CustomerStatus)
  status?: CustomerStatus

  @ApiProperty({ description: 'Assigned user ID' })
  @IsInt()
  @IsPositive()
  assignedUserId!: number

  @ApiPropertyOptional({ description: 'Notes' })
  @IsOptional()
  @IsString()
  notes?: string

  @ApiPropertyOptional({ description: 'Tags', type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[]

  @ApiPropertyOptional({ description: 'Industry', maxLength: 50 })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  industry?: string

  @ApiPropertyOptional({ description: 'Source', maxLength: 20 })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  source?: string
}
