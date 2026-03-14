import { IsString, IsIn } from 'class-validator'

export class SetStatusDto {
  @IsString()
  @IsIn(['IDLE', 'BUSY', 'ON_CALL', 'WRAP_UP', 'OFFLINE'])
  status!: string
}
