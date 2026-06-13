import type { CallRecordVO } from '@/api/call-record'

export function toLinkedEntityId(value: number | null | undefined): number | null {
  return typeof value === 'number' && Number.isFinite(value) && value > 0 ? value : null
}

export interface CallRecordIdentityItem {
  label: string
  value: string
}

export interface TranscriptDisplaySegment {
  key: string
  speaker: string
  time: string
  text: string
}

type CallRecordIdentitySource = Pick<
  CallRecordVO,
  | 'callPhoneNumber'
  | 'counterpartPhone'
  | 'simNumber'
  | 'customerPhone'
  | 'salesUserName'
  | 'salesUserPhone'
  | 'userId'
> & {
  customer?: { phone?: string | null } | null
  user?: { name?: string | null; username?: string | null; phone?: string | null } | null
}

type CallRecordTranscriptSource = Pick<CallRecordVO, 'transcriptSegments' | 'transcriptText'>

export function buildCallRecordIdentityItems(
  record: CallRecordIdentitySource,
): CallRecordIdentityItem[] {
  const items: CallRecordIdentityItem[] = []
  const counterpartPhone = firstNonBlank(record.counterpartPhone, record.callPhoneNumber)
  const linePhone = firstNonBlank(record.simNumber)
  const customerPhone = firstNonBlank(record.customerPhone, record.customer?.phone)
  const salesUserName = firstNonBlank(
    record.salesUserName,
    record.user?.name,
    record.user?.username,
  )
  const salesUserPhone = firstNonBlank(record.salesUserPhone, record.user?.phone)

  if (counterpartPhone) {
    items.push({ label: '对方号码', value: counterpartPhone })
  }
  if (linePhone && linePhone !== counterpartPhone) {
    items.push({ label: '线路号码', value: linePhone })
  }
  if (customerPhone && customerPhone !== counterpartPhone) {
    items.push({ label: '客户电话', value: customerPhone })
  }
  items.push({ label: '销售员', value: salesUserName || `ID: ${record.userId}` })
  if (salesUserPhone) {
    items.push({ label: '销售员电话', value: salesUserPhone })
  }

  return items
}

export function buildTranscriptDisplaySegments(
  record: CallRecordTranscriptSource,
): TranscriptDisplaySegment[] {
  const normalizedSegments = (record.transcriptSegments ?? [])
    .filter((segment) => segment.text?.trim())
    .map((segment, index) => ({
      key: String(segment.id ?? `segment-${index}`),
      speaker: formatTranscriptSpeaker(segment.speaker),
      time: formatTranscriptTimestamp(segment.startTimeMs),
      text: segment.text.trim(),
    }))

  if (normalizedSegments.length > 0) {
    return normalizedSegments
  }

  return (record.transcriptText ?? '')
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((text, index) => ({
      key: `fallback-${index}`,
      speaker: '转写',
      time: '',
      text,
    }))
}

export function formatTranscriptTimestamp(value: number | null | undefined): string {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < 0) return ''
  const totalSeconds = Math.floor(value / 1000)
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
}

function formatTranscriptSpeaker(value: string | null | undefined): string {
  if (value === 'agent') return '销售'
  if (value === 'customer') return '客户'
  return '转写'
}

function firstNonBlank(...values: Array<string | null | undefined>): string {
  return values.map((value) => value?.trim()).find((value): value is string => Boolean(value)) ?? ''
}
