import { IsOptional, IsBoolean } from 'class-validator'

export class UpdatePopupConfigDto {
  @IsOptional()
  @IsBoolean()
  autoPop?: boolean

  @IsOptional()
  @IsBoolean()
  showRecentFollowUps?: boolean

  @IsOptional()
  @IsBoolean()
  showLastSummary?: boolean
}
