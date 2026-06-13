import { Type } from 'class-transformer'
import {
  IsArray,
  IsBoolean,
  IsDefined,
  IsNotEmpty,
  IsNumber,
  IsString,
  ValidateNested,
} from 'class-validator'

export class CloudTranscriptionCallbackQueryDto {
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

export class CloudTranscriptionSegmentDto {
  @IsNumber()
  @Type(() => Number)
  beginTime!: number

  @IsNumber()
  @Type(() => Number)
  channelId!: number

  @IsNumber()
  @Type(() => Number)
  emotionValue!: number

  @IsNumber()
  @Type(() => Number)
  endTime!: number

  @IsNumber()
  @Type(() => Number)
  silenceDuration!: number

  @IsNumber()
  @Type(() => Number)
  speechRate!: number

  @IsString()
  text!: string
}

export class CloudTranscriptionCallbackBodyDto {
  @IsDefined()
  bizDuration!: string | number

  @IsBoolean()
  enableCallback!: boolean

  @IsDefined()
  requestTime!: string | number

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CloudTranscriptionSegmentDto)
  result!: CloudTranscriptionSegmentDto[]

  @IsDefined()
  solveTime!: string | number

  @IsNumber()
  @Type(() => Number)
  statusCode!: number

  @IsString()
  @IsNotEmpty()
  statusText!: string

  @IsString()
  @IsNotEmpty()
  taskId!: string

  @IsString()
  @IsNotEmpty()
  callSid!: string
}

export interface CloudTranscriptionCallbackResponse {
  message: string
  success: boolean
  code: 0 | 1
  data: boolean
}
