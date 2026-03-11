import request from './request'

export const getPoolList = (params: Record<string, unknown>) =>
  request.get('/api/v1/customer-pool', { params })

export const claimCustomer = (customerId: number) =>
  request.post('/api/v1/customer-pool/claim', { customerId })

export const batchClaimCustomers = (customerIds: number[]) =>
  request.post('/api/v1/customer-pool/batch-claim', { customerIds })

export const assignCustomer = (customerId: number, toUserId: number) =>
  request.post('/api/v1/customer-pool/assign', { customerId, toUserId })

export const returnCustomer = (customerId: number, reason?: string) =>
  request.post('/api/v1/customer-pool/return', { customerId, reason })

export const batchReturnCustomers = (customerIds: number[], reason?: string) =>
  request.post('/api/v1/customer-pool/batch-return', { customerIds, reason })

export const getPoolLogs = (params: Record<string, unknown>) =>
  request.get('/api/v1/customer-pool/logs', { params })

export const getPoolConfig = () => request.get('/api/v1/customer-pool/config')

export const updatePoolConfig = (data: Record<string, unknown>) =>
  request.put('/api/v1/customer-pool/config', data)
