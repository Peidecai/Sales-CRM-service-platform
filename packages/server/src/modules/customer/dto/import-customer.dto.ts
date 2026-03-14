import { IsArray, IsObject, IsOptional, IsString, ArrayMaxSize } from 'class-validator'

export class ImportCustomerDto {
  @IsArray()
  @ArrayMaxSize(5000)
  rows!: Array<Record<string, string>>

  @IsObject()
  mapping!: Record<string, string>

  @IsOptional()
  @IsString()
  fileName?: string
}
