import type { SelectQueryBuilder } from 'typeorm'
import type { Customer } from '../customer/customer.entity'
import type { GroupRule } from '@crm/shared'

/**
 * Whitelist of allowed customer fields for rule engine queries.
 * Maps logical field names to actual DB column expressions.
 */
const FIELD_MAP: Record<string, string> = {
  industry: 'customer.industry',
  region: 'customer.region',
  status: 'customer.status',
  scale: 'customer.scale',
  level: 'customer.level',
  source: 'customer.source',
  customerType: 'customer.customer_type',
  intentionLevel: 'customer.intention_level',
  registeredCapital: 'customer.registered_capital',
  annualRevenue: 'customer.annual_revenue',
  employeeCount: 'customer.employee_count',
  lastContactAt: 'customer.updated_at',
  createdAt: 'customer.created_at',
  isInPool: 'customer.is_in_pool',
  tags: 'customer.tags',
}

export function buildGroupRuleQuery(
  qb: SelectQueryBuilder<Customer>,
  rules: GroupRule[],
): SelectQueryBuilder<Customer> {
  if (!rules || rules.length === 0) return qb

  for (let i = 0; i < rules.length; i++) {
    const rule = rules[i]
    const col = FIELD_MAP[rule.field]
    if (!col) continue // skip unknown fields — prevents SQL injection

    const paramName = `rule_${i}`
    const clause = buildClause(col, rule.operator, paramName, rule.value)
    if (!clause) continue

    // First rule or AND logic
    const useOr = i > 0 && rule.logic === 'OR'
    if (useOr) {
      qb.orWhere(clause.sql, clause.params)
    } else {
      qb.andWhere(clause.sql, clause.params)
    }
  }

  return qb
}

interface ClauseResult {
  sql: string
  params: Record<string, unknown>
}

function buildClause(
  col: string,
  operator: string,
  paramName: string,
  value: string | number | string[],
): ClauseResult | null {
  switch (operator) {
    case 'eq':
      return { sql: `${col} = :${paramName}`, params: { [paramName]: value } }
    case 'neq':
      return { sql: `${col} != :${paramName}`, params: { [paramName]: value } }
    case 'in':
      return {
        sql: `${col} IN (:...${paramName})`,
        params: { [paramName]: Array.isArray(value) ? value : [value] },
      }
    case 'not_in':
      return {
        sql: `${col} NOT IN (:...${paramName})`,
        params: { [paramName]: Array.isArray(value) ? value : [value] },
      }
    case 'gt':
      return { sql: `${col} > :${paramName}`, params: { [paramName]: value } }
    case 'lt':
      return { sql: `${col} < :${paramName}`, params: { [paramName]: value } }
    case 'gte':
      return { sql: `${col} >= :${paramName}`, params: { [paramName]: value } }
    case 'lte':
      return { sql: `${col} <= :${paramName}`, params: { [paramName]: value } }
    case 'contains':
      return { sql: `${col} LIKE :${paramName}`, params: { [paramName]: `%${value}%` } }
    case 'before':
      return { sql: `${col} < :${paramName}`, params: { [paramName]: value } }
    case 'after':
      return { sql: `${col} > :${paramName}`, params: { [paramName]: value } }
    case 'days_ago_gt':
      return { sql: `DATEDIFF(NOW(), ${col}) > :${paramName}`, params: { [paramName]: value } }
    case 'days_ago_lt':
      return { sql: `DATEDIFF(NOW(), ${col}) < :${paramName}`, params: { [paramName]: value } }
    default:
      return null
  }
}
