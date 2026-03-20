import { PartialType } from '@nestjs/swagger'
import { CreateSpeechTemplateDto } from './create-speech-template.dto'

export class UpdateSpeechTemplateDto extends PartialType(CreateSpeechTemplateDto) {}
