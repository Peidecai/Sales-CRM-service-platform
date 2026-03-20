import { PartialType, OmitType } from '@nestjs/swagger'
import { CreateSpeechAnnotationDto } from './create-speech-annotation.dto'

export class UpdateSpeechAnnotationDto extends PartialType(
  OmitType(CreateSpeechAnnotationDto, ['callRecordId'] as const),
) {}
