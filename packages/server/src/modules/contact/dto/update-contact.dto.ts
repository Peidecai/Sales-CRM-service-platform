import { PartialType, OmitType } from '@nestjs/swagger'
import { CreateContactDto } from './create-contact.dto'

export class UpdateContactDto extends PartialType(
  OmitType(CreateContactDto, ['customerId'] as const),
) {}
