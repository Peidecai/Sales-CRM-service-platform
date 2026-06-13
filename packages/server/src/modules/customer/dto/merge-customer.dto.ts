import { IsInt } from 'class-validator'

export class MergeCustomerDto {
  @IsInt()
  primaryId!: number

  @IsInt()
  secondaryId!: number
}
