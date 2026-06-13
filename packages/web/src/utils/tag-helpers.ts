/**
 * Tag type helpers for customer status and opportunity stage.
 */
import { CustomerStatus } from '@/api/customer'
import { OpportunityStage } from '@/api/opportunity'

export type TagType = 'info' | 'primary' | 'warning' | 'success' | 'danger'

// ---- Customer Status ----

const customerStatusLabelMap: Record<CustomerStatus, string> = {
  [CustomerStatus.LEAD]: '线索',
  [CustomerStatus.POTENTIAL]: '潜在客户',
  [CustomerStatus.INTENTION]: '有意向',
  [CustomerStatus.OPPORTUNITY]: '商机客户',
  [CustomerStatus.DEAL]: '成交客户',
  [CustomerStatus.MAINTAIN]: '维护期',
  [CustomerStatus.INVALID]: '无效客户',
  [CustomerStatus.LOST]: '已流失',
}

const customerStatusTagMap: Record<CustomerStatus, TagType> = {
  [CustomerStatus.LEAD]: 'info',
  [CustomerStatus.POTENTIAL]: 'info',
  [CustomerStatus.INTENTION]: 'primary',
  [CustomerStatus.OPPORTUNITY]: 'warning',
  [CustomerStatus.DEAL]: 'success',
  [CustomerStatus.MAINTAIN]: 'success',
  [CustomerStatus.INVALID]: 'danger',
  [CustomerStatus.LOST]: 'danger',
}

export function getStatusLabel(status: CustomerStatus): string {
  return customerStatusLabelMap[status] ?? status
}

export function getStatusTagType(status: CustomerStatus): TagType {
  return customerStatusTagMap[status] ?? 'info'
}

// ---- Opportunity Stage ----

const opportunityStageLabelMap: Record<OpportunityStage, string> = {
  [OpportunityStage.LEAD]: '线索',
  [OpportunityStage.QUALIFIED]: '意向客户',
  [OpportunityStage.PROPOSAL]: '方案报价',
  [OpportunityStage.NEGOTIATION]: '商务谈判',
  [OpportunityStage.CLOSED_WON]: '成交',
  [OpportunityStage.CLOSED_LOST]: '丢单',
}

const opportunityStageTagMap: Record<OpportunityStage, TagType> = {
  [OpportunityStage.LEAD]: 'info',
  [OpportunityStage.QUALIFIED]: 'primary',
  [OpportunityStage.PROPOSAL]: 'warning',
  [OpportunityStage.NEGOTIATION]: 'warning',
  [OpportunityStage.CLOSED_WON]: 'success',
  [OpportunityStage.CLOSED_LOST]: 'danger',
}

export function getStageLabel(stage: OpportunityStage): string {
  return opportunityStageLabelMap[stage] ?? stage
}

export function getStageTagType(stage: OpportunityStage): TagType {
  return opportunityStageTagMap[stage] ?? 'info'
}
