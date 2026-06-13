import request from './request'

export const getSigningList = (params: Record<string, unknown>) =>
  request.get('/signing', { params })
export const createSigning = (data: Record<string, unknown>) => request.post('/signing', data)
export const getSigningDetail = (id: number) => request.get(`/signing/${id}`)
export const updateSigningStatus = (id: number, data: Record<string, unknown>) =>
  request.put(`/signing/${id}/status`, data)
export const getSigningStatistics = (params?: Record<string, unknown>) =>
  request.get('/signing/statistics', { params })
export const getSigningRanking = (params?: Record<string, unknown>) =>
  request.get('/signing/ranking', { params })
