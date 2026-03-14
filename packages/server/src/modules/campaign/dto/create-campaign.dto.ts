import { IsString, IsNotEmpty, IsOptional, IsArray, IsInt } from 'class-validator'

export class CreateCampaignDto {
  @IsString()
  @IsNotEmpty()
  name!: string

  @IsOptional()
  @IsArray()
  @IsInt({ each: true })
  customerIds?: number[]
}
