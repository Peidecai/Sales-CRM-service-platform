import { describe, it, expect } from 'vitest'
import { CustomerStatus } from '@/api/customer'
import { OpportunityStage } from '@/api/opportunity'
import { getStatusLabel, getStatusTagType, getStageLabel, getStageTagType } from './tag-helpers'

describe('getStatusLabel', () => {
  it('should return Chinese label for POTENTIAL', () => {
    expect(getStatusLabel(CustomerStatus.POTENTIAL)).toBe('潜在客户')
  })

  it('should return Chinese label for FOLLOWING', () => {
    expect(getStatusLabel(CustomerStatus.FOLLOWING)).toBe('跟进中')
  })

  it('should return Chinese label for NEGOTIATING', () => {
    expect(getStatusLabel(CustomerStatus.NEGOTIATING)).toBe('谈判中')
  })

  it('should return Chinese label for SIGNED', () => {
    expect(getStatusLabel(CustomerStatus.SIGNED)).toBe('已签约')
  })

  it('should return Chinese label for LOST', () => {
    expect(getStatusLabel(CustomerStatus.LOST)).toBe('已流失')
  })

  it('should return Chinese label for INACTIVE', () => {
    expect(getStatusLabel(CustomerStatus.INACTIVE)).toBe('暂不合作')
  })

  it('should return raw value for unknown status', () => {
    expect(getStatusLabel('unknown' as CustomerStatus)).toBe('unknown')
  })
})

describe('getStatusTagType', () => {
  it('should return "info" for POTENTIAL', () => {
    expect(getStatusTagType(CustomerStatus.POTENTIAL)).toBe('info')
  })

  it('should return "primary" for FOLLOWING', () => {
    expect(getStatusTagType(CustomerStatus.FOLLOWING)).toBe('primary')
  })

  it('should return "warning" for NEGOTIATING', () => {
    expect(getStatusTagType(CustomerStatus.NEGOTIATING)).toBe('warning')
  })

  it('should return "success" for SIGNED', () => {
    expect(getStatusTagType(CustomerStatus.SIGNED)).toBe('success')
  })

  it('should return "danger" for LOST', () => {
    expect(getStatusTagType(CustomerStatus.LOST)).toBe('danger')
  })

  it('should return "info" for INACTIVE', () => {
    expect(getStatusTagType(CustomerStatus.INACTIVE)).toBe('info')
  })

  it('should return "info" for unknown status', () => {
    expect(getStatusTagType('unknown' as CustomerStatus)).toBe('info')
  })
})

describe('getStageLabel', () => {
  it('should return Chinese label for LEAD', () => {
    expect(getStageLabel(OpportunityStage.LEAD)).toBe('线索')
  })

  it('should return Chinese label for QUALIFIED', () => {
    expect(getStageLabel(OpportunityStage.QUALIFIED)).toBe('意向客户')
  })

  it('should return Chinese label for PROPOSAL', () => {
    expect(getStageLabel(OpportunityStage.PROPOSAL)).toBe('方案报价')
  })

  it('should return Chinese label for NEGOTIATION', () => {
    expect(getStageLabel(OpportunityStage.NEGOTIATION)).toBe('商务谈判')
  })

  it('should return Chinese label for CLOSED_WON', () => {
    expect(getStageLabel(OpportunityStage.CLOSED_WON)).toBe('成交')
  })

  it('should return Chinese label for CLOSED_LOST', () => {
    expect(getStageLabel(OpportunityStage.CLOSED_LOST)).toBe('丢单')
  })

  it('should return raw value for unknown stage', () => {
    expect(getStageLabel('unknown' as OpportunityStage)).toBe('unknown')
  })
})

describe('getStageTagType', () => {
  it('should return "info" for LEAD', () => {
    expect(getStageTagType(OpportunityStage.LEAD)).toBe('info')
  })

  it('should return "primary" for QUALIFIED', () => {
    expect(getStageTagType(OpportunityStage.QUALIFIED)).toBe('primary')
  })

  it('should return "warning" for PROPOSAL', () => {
    expect(getStageTagType(OpportunityStage.PROPOSAL)).toBe('warning')
  })

  it('should return "warning" for NEGOTIATION', () => {
    expect(getStageTagType(OpportunityStage.NEGOTIATION)).toBe('warning')
  })

  it('should return "success" for CLOSED_WON', () => {
    expect(getStageTagType(OpportunityStage.CLOSED_WON)).toBe('success')
  })

  it('should return "danger" for CLOSED_LOST', () => {
    expect(getStageTagType(OpportunityStage.CLOSED_LOST)).toBe('danger')
  })

  it('should return "info" for unknown stage', () => {
    expect(getStageTagType('unknown' as OpportunityStage)).toBe('info')
  })
})
