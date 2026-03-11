import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsEmail,
  IsEnum,
  IsInt,
  IsPositive,
  IsArray,
  IsNumber,
  IsObject,
  MaxLength,
  Min,
  Max,
  Matches,
} from 'class-validator'
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'
import {
  CustomerStatus,
  CustomerSource,
  CustomerType,
  CustomerScale,
  CustomerLevel,
  CreditRating,
} from '@crm/shared'

export class CreateCustomerDto {
  @ApiProperty({ description: '客户名称', maxLength: 100 })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  name!: string

  @ApiPropertyOptional({ description: '公司名称', maxLength: 200 })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  company?: string

  @ApiPropertyOptional({ description: '手机号', maxLength: 20 })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  @Matches(/^1[3-9]\d{9}$/, { message: '手机号格式不正确，应为11位中国大陆手机号' })
  phone?: string

  @ApiPropertyOptional({ description: '邮箱' })
  @IsOptional()
  @IsEmail({}, { message: '邮箱格式不正确' })
  email?: string

  @ApiPropertyOptional({ description: '客户状态', enum: CustomerStatus })
  @IsOptional()
  @IsEnum(CustomerStatus)
  status?: CustomerStatus

  @ApiProperty({ description: '负责人ID' })
  @IsInt()
  @IsPositive()
  assignedUserId!: number

  @ApiPropertyOptional({ description: '备注' })
  @IsOptional()
  @IsString()
  notes?: string

  @ApiPropertyOptional({ description: '标签', type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[]

  @ApiPropertyOptional({ description: '行业', maxLength: 50 })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  industry?: string

  @ApiPropertyOptional({ description: '客户来源', enum: CustomerSource })
  @IsOptional()
  @IsEnum(CustomerSource)
  source?: CustomerSource

  // ---- Expanded Fields ----

  @ApiPropertyOptional({ description: '客户类型', enum: CustomerType })
  @IsOptional()
  @IsEnum(CustomerType)
  customerType?: CustomerType

  @ApiPropertyOptional({ description: '企业规模', enum: CustomerScale })
  @IsOptional()
  @IsEnum(CustomerScale)
  scale?: CustomerScale

  @ApiPropertyOptional({ description: '所在区域', maxLength: 100 })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  region?: string

  @ApiPropertyOptional({ description: '客户等级', enum: CustomerLevel })
  @IsOptional()
  @IsEnum(CustomerLevel)
  level?: CustomerLevel

  @ApiPropertyOptional({ description: '意向等级(1-5)' })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(5)
  intentionLevel?: number

  @ApiPropertyOptional({ description: '信用评级', enum: CreditRating })
  @IsOptional()
  @IsEnum(CreditRating)
  creditRating?: CreditRating

  @ApiPropertyOptional({ description: '统一社会信用代码', maxLength: 18 })
  @IsOptional()
  @IsString()
  @MaxLength(18)
  unifiedCreditCode?: string

  @ApiPropertyOptional({ description: '法人代表', maxLength: 50 })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  legalPerson?: string

  @ApiPropertyOptional({ description: '注册资本(万元)' })
  @IsOptional()
  @IsNumber()
  registeredCapital?: number

  @ApiPropertyOptional({ description: '年营收(万元)' })
  @IsOptional()
  @IsNumber()
  annualRevenue?: number

  @ApiPropertyOptional({ description: '员工人数' })
  @IsOptional()
  @IsInt()
  @Min(0)
  employeeCount?: number

  @ApiPropertyOptional({ description: '自定义字段' })
  @IsOptional()
  @IsObject()
  customFields?: Record<string, unknown>

  @ApiPropertyOptional({ description: '详细地址', maxLength: 500 })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  address?: string

  @ApiPropertyOptional({ description: '公司网站', maxLength: 200 })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  website?: string

  @ApiPropertyOptional({ description: '客户描述' })
  @IsOptional()
  @IsString()
  description?: string
}
