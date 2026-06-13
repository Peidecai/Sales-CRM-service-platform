import { IsOptional, IsString } from 'class-validator'

export class HangupCallDto {
  @IsOptional()
  @IsString()
  reason?: string
}

export class TransferCallDto {
  @IsString()
  targetNumber!: string
}
