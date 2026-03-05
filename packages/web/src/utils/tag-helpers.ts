/**
 * Tag type helpers for customer status and opportunity stage.
 */
import { CustomerStatus } from '@/api/customer'
import { OpportunityStage } from '@/api/opportunity'

export type TagType = 'info' | 'primary' | 'warning' | 'success' | 'danger'

// ---- Customer Status ----

const customerStatusLabelMap: Record<CustomerStatus, string> = {
  [CustomerStatus.POTENTIAL]: '潜在客户',
  [CustomerStatus.FOLLOWING]: '跟进中',
  [CustomerStatus.NEGOTIATING]: '谈判中',
  [CustomerStatus.SIGNED]: '已签约',
  [CustomerStatus.LOST]: '已流失',
  [CustomerStatus.INACTIVE]: '暂不合作',
}

const customerStatusTagMap: Record<CustomerStatus, TagType> = {
  [CustomerStatus.POTENTIAL]: 'info',
  [CustomerStatus.FOLLOWING]: 'primary',
  [CustomerStatus.NEGOTIATING]: 'warning',
  [CustomerStatus.SIGNED]: 'success',
  [CustomerStatus.LOST]: 'danger',
  [CustomerStatus.INACTIVE]: 'info',
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
