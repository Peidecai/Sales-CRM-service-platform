import { IsNotEmpty, IsString, IsOptional, IsInt, IsEnum } from 'class-validator'
import { CloudCallStatus } from '../interfaces/cloud-call-provider.interface'

export class CloudCallCallbackDto {
  @IsString()
  @IsNotEmpty()
  callId!: string

  @IsEnum(CloudCallStatus)
  @IsNotEmpty()
  status!: CloudCallStatus

  @IsInt()
  @IsOptional()
  duration?: number

  @IsString()
  @IsOptional()
  recordingUrl?: string
}
