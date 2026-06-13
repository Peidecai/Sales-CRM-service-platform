import request from './request'

// ─── Types ───────────────────────────────────────────────────────────────

export interface PkTeamMember {
  id: number
  userId: number
  contribution: number
  user?: { id: number; name: string; username: string }
  team?: PkTeamInfo
}

export interface PkTeamInfo {
  id: number
  name: string
  side: string
  score: number
  isWinner: boolean
  members: PkTeamMember[]
}

export interface PkItem {
  id: number
  title: string
  type: string
  status: string
  metric: string
  startDate: string
  endDate: string
  stake: string | null
  result: string | null
  createdById: number
  createdBy?: { id: number; name: string }
  teams: PkTeamInfo[]
  createdAt: string
  updatedAt: string
}

export interface PkListResult {
  list: PkItem[]
  total: number
  page: number
  pageSize: number
}

export interface PkMyStats {
  wins: number
  losses: number
  draws: number
  total: number
}

export interface PkBadgeItem {
  id: number
  userId: number
  type: string
  pkId: number | null
  createdAt: string
}

export interface CreatePkTeamDto {
  name: string
  side: string
  memberIds: number[]
}

export interface CreatePkPayload {
  title: string
  type: string
  metric: string
  startDate: string
  endDate: string
  stake?: string
  teams: CreatePkTeamDto[]
}

// ─── API Functions ───────────────────────────────────────────────────────

export function getPkList(params: { status?: string; page?: number; pageSize?: number }) {
  return request.get<PkListResult>('/pk', { params })
}

export function createPk(data: CreatePkPayload) {
  return request.post<PkItem>('/pk', data)
}

export function getPkDetail(id: number) {
  return request.get<PkItem>(`/pk/${id}`)
}

export function deletePk(id: number) {
  return request.delete(`/pk/${id}`)
}

export function startPk(id: number) {
  return request.post<PkItem>(`/pk/${id}/start`)
}

export function settlePk(id: number) {
  return request.post<PkItem>(`/pk/${id}/settle`)
}

export function getPkRanking(id: number) {
  return request.get<PkTeamMember[]>(`/pk/${id}/ranking`)
}

export function getPkScore(id: number) {
  return request.get<PkItem>(`/pk/${id}/score`)
}

export function getPkHistory(params: { page?: number; pageSize?: number }) {
  return request.get<PkListResult>('/pk/history', { params })
}

export function getMyPkStats() {
  return request.get<PkMyStats>('/pk/my-stats')
}

export function getMyBadges() {
  return request.get<PkBadgeItem[]>('/pk/badges')
}
