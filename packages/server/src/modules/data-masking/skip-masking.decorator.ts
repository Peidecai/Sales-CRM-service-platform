import { SetMetadata } from '@nestjs/common'

export const SKIP_MASKING_KEY = 'skipMasking'
export const SkipMasking = () => SetMetadata(SKIP_MASKING_KEY, true)
