import { IsNotEmpty, IsString } from 'class-validator'

export class UnicomCallbackQueryDto {
  @IsString()
  @IsNotEmpty()
  token!: string

  @IsString()
  @IsNotEmpty()
  timestamp!: string

  @IsString()
  @IsNotEmpty()
  sign!: string
}

export interface UnicomCallbackResponse {
  message: string
  success: boolean
  code: 0 | 1
  data: boolean
}
