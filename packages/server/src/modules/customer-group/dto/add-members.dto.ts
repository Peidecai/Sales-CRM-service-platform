import { IsArray, IsInt } from 'class-validator'

export class AddMembersDto {
  @IsArray()
  @IsInt({ each: true })
  customerIds!: number[]
}
