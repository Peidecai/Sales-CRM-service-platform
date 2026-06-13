import { describe, expect, it } from 'vitest'
import {
  buildCallRecordIdentityItems,
  buildTranscriptDisplaySegments,
  formatTranscriptTimestamp,
  toLinkedEntityId,
} from './detail-helpers'

describe('call record detail helpers', () => {
  it('returns null for missing linked customer ids from Unicom call records', () => {
    expect(toLinkedEntityId(null)).toBeNull()
    expect(toLinkedEntityId(undefined)).toBeNull()
    expect(toLinkedEntityId(0)).toBeNull()
    expect(toLinkedEntityId(-1)).toBeNull()
    expect(toLinkedEntityId(Number.NaN)).toBeNull()
    expect(toLinkedEntityId(Number.POSITIVE_INFINITY)).toBeNull()
  })

  it('keeps positive numeric linked entity ids', () => {
    expect(toLinkedEntityId(2)).toBe(2)
  })

  it('builds stable phone and salesperson identity items for call records', () => {
    const items = buildCallRecordIdentityItems({
      counterpartPhone: '13700137000',
      simNumber: '15688519282',
      customer: { phone: '13800138001' },
      salesUserName: '王销售',
      salesUserPhone: '13900139000',
      userId: 7,
    })

    expect(items).toEqual([
      { label: '对方号码', value: '13700137000' },
      { label: '线路号码', value: '15688519282' },
      { label: '客户电话', value: '13800138001' },
      { label: '销售员', value: '王销售' },
      { label: '销售员电话', value: '13900139000' },
    ])
  })

  it('falls back to user id when salesperson name is missing', () => {
    const items = buildCallRecordIdentityItems({
      userId: 7,
      salesUserName: null,
      salesUserPhone: null,
      simNumber: null,
      customer: null,
    })

    expect(items).toEqual([{ label: '销售员', value: 'ID: 7' }])
  })

  it('uses normalized transcript segments before plain transcript text', () => {
    const segments = buildTranscriptDisplaySegments({
      transcriptText: 'plain fallback',
      transcriptSegments: [
        {
          id: 1,
          segmentIndex: 0,
          speaker: 'agent',
          startTimeMs: 1000,
          endTimeMs: 2500,
          text: '您好',
        },
        {
          id: 2,
          segmentIndex: 1,
          speaker: 'customer',
          startTimeMs: 3000,
          endTimeMs: 4500,
          text: '我想咨询',
        },
      ],
    })

    expect(segments).toEqual([
      { key: '1', speaker: '销售', time: '00:01', text: '您好' },
      { key: '2', speaker: '客户', time: '00:03', text: '我想咨询' },
    ])
  })

  it('falls back to plain cloud callback transcript text when segments are absent', () => {
    const segments = buildTranscriptDisplaySegments({
      transcriptText: '第一句\n\n第二句',
      transcriptSegments: [],
    })

    expect(segments).toEqual([
      { key: 'fallback-0', speaker: '转写', time: '', text: '第一句' },
      { key: 'fallback-1', speaker: '转写', time: '', text: '第二句' },
    ])
  })

  it('formats millisecond offsets as mm:ss', () => {
    expect(formatTranscriptTimestamp(null)).toBe('')
    expect(formatTranscriptTimestamp(0)).toBe('00:00')
    expect(formatTranscriptTimestamp(65000)).toBe('01:05')
    expect(formatTranscriptTimestamp(3601000)).toBe('60:01')
  })
})
