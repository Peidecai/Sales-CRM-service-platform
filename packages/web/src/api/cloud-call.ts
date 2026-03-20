import request from './request'

export interface CloudCallProvider {
  id: string
  name: string
  label: string
}

export interface CloudCallSettings {
  provider: string
  appKey: string
  appSecret: string
  webhookUrl: string
}

export interface LineStatus {
  balance: number
  currency: string
  phoneNumbers: string[]
  concurrentLines: number
}

export interface CallStats {
  today: number
  week: number
  month: number
  todayDuration: number
  weekDuration: number
  monthDuration: number
  dailyCosts: Array<{ date: string; cost: number }>
}

export interface TestConnectionResult {
  success: boolean
  message: string
}

export function getCloudCallSettings() {
  return request.get<CloudCallSettings>('/cloud-call/settings')
}

export function updateCloudCallSettings(data: Partial<CloudCallSettings>) {
  return request.put<CloudCallSettings>('/cloud-call/settings', data)
}

export function testCloudCallConnection() {
  return request.post<TestConnectionResult>('/cloud-call/settings/test')
}

export function getLineStatus() {
  return request.get<LineStatus>('/cloud-call/line-status')
}

export function getCallStats() {
  return request.get<CallStats>('/cloud-call/stats')
}
