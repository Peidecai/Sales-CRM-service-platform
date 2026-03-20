import { IsIn, IsObject } from 'class-validator'

export class BatchActionDto {
  @IsIn(['transfer', 'tag', 'notify'])
  action!: 'transfer' | 'tag' | 'notify'

  @IsObject()
  params!: Record<string, unknown>
}
