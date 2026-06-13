import { describe, it, expect } from 'vitest'
import { CustomerStatus } from '@/api/customer'
import { OpportunityStage } from '@/api/opportunity'
import { getStatusLabel, getStatusTagType, getStageLabel, getStageTagType } from './tag-helpers'

describe('getStatusLabel', () => {
  it('should return Chinese label for LEAD', () => {
    expect(getStatusLabel(CustomerStatus.LEAD)).toBe('线索')
  })

  it('should return Chinese label for POTENTIAL', () => {
    expect(getStatusLabel(CustomerStatus.POTENTIAL)).toBe('潜在客户')
  })

  it('should return Chinese label for INTENTION', () => {
    expect(getStatusLabel(CustomerStatus.INTENTION)).toBe('有意向')
  })

  it('should return Chinese label for OPPORTUNITY', () => {
    expect(getStatusLabel(CustomerStatus.OPPORTUNITY)).toBe('商机客户')
  })

  it('should return Chinese label for DEAL', () => {
    expect(getStatusLabel(CustomerStatus.DEAL)).toBe('成交客户')
  })

  it('should return Chinese label for MAINTAIN', () => {
    expect(getStatusLabel(CustomerStatus.MAINTAIN)).toBe('维护期')
  })

  it('should return Chinese label for INVALID', () => {
    expect(getStatusLabel(CustomerStatus.INVALID)).toBe('无效客户')
  })

  it('should return Chinese label for LOST', () => {
    expect(getStatusLabel(CustomerStatus.LOST)).toBe('已流失')
  })

  it('should return raw value for unknown status', () => {
    expect(getStatusLabel('unknown' as CustomerStatus)).toBe('unknown')
  })
})

describe('getStatusTagType', () => {
  it('should return "info" for LEAD', () => {
    expect(getStatusTagType(CustomerStatus.LEAD)).toBe('info')
  })

  it('should return "info" for POTENTIAL', () => {
    expect(getStatusTagType(CustomerStatus.POTENTIAL)).toBe('info')
  })

  it('should return "primary" for INTENTION', () => {
    expect(getStatusTagType(CustomerStatus.INTENTION)).toBe('primary')
  })

  it('should return "warning" for OPPORTUNITY', () => {
    expect(getStatusTagType(CustomerStatus.OPPORTUNITY)).toBe('warning')
  })

  it('should return "success" for DEAL', () => {
    expect(getStatusTagType(CustomerStatus.DEAL)).toBe('success')
  })

  it('should return "success" for MAINTAIN', () => {
    expect(getStatusTagType(CustomerStatus.MAINTAIN)).toBe('success')
  })

  it('should return "danger" for INVALID', () => {
    expect(getStatusTagType(CustomerStatus.INVALID)).toBe('danger')
  })

  it('should return "danger" for LOST', () => {
    expect(getStatusTagType(CustomerStatus.LOST)).toBe('danger')
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
