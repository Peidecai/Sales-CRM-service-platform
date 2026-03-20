import { IsString, IsOptional, IsIn } from 'class-validator'

export class GroupRuleDto {
  @IsOptional()
  @IsIn(['AND', 'OR'])
  logic?: 'AND' | 'OR'

  @IsString()
  field!: string

  @IsIn([
    'eq',
    'neq',
    'in',
    'not_in',
    'gt',
    'lt',
    'gte',
    'lte',
    'contains',
    'before',
    'after',
    'days_ago_gt',
    'days_ago_lt',
  ])
  operator!: string

  // value can be string | number | string[] — validated in service
  value!: string | number | string[]
}
