import request from './request'

export const getPoolList = (params: Record<string, unknown>) =>
  request.get('/customer-pool', { params })

export const claimCustomer = (customerId: number) =>
  request.post('/customer-pool/claim', { customerId })

export const batchClaimCustomers = (customerIds: number[]) =>
  request.post('/customer-pool/batch-claim', { customerIds })

export const assignCustomer = (customerId: number, toUserId: number) =>
  request.post('/customer-pool/assign', { customerId, toUserId })

export const returnCustomer = (customerId: number, reason?: string) =>
  request.post('/customer-pool/return', { customerId, reason })

export const batchReturnCustomers = (customerIds: number[], reason?: string) =>
  request.post('/customer-pool/batch-return', { customerIds, reason })

export const getPoolLogs = (params: Record<string, unknown>) =>
  request.get('/customer-pool/logs', { params })

export const getPoolConfig = () => request.get('/customer-pool/config')

export const updatePoolConfig = (data: Record<string, unknown>) =>
  request.put('/customer-pool/config', data)
