import request from './request'

export const getPaymentPlans = (params: Record<string, unknown>) =>
  request.get('/payment-plans', { params })
export const createPaymentPlan = (data: Record<string, unknown>) =>
  request.post('/payment-plans', data)
export const getPaymentPlanDetail = (id: number) => request.get(`/payment-plans/${id}`)
export const getOverdueItems = (params: Record<string, unknown>) =>
  request.get('/payment-plans/overdue', { params })
export const confirmPayment = (itemId: number, data: Record<string, unknown>) =>
  request.post(`/payment-plans/items/${itemId}/confirm`, data)
export const markBadDebt = (itemId: number) =>
  request.post(`/payment-plans/items/${itemId}/bad-debt`)

export const importBankStatements = (data: { csvContent: string }) =>
  request.post('/bank-statements/import', data)
export const getBankStatements = (params: Record<string, unknown>) =>
  request.get('/bank-statements', { params })
export const autoMatchStatements = () => request.post('/bank-statements/auto-match')
export const manualMatchStatement = (id: number, data: { planItemId: number }) =>
  request.post(`/bank-statements/${id}/match`, data)

export const getPaymentDashboard = (params?: Record<string, unknown>) =>
  request.get('/payment-analytics/dashboard', { params })
export const getAgingAnalysis = (params?: Record<string, unknown>) =>
  request.get('/payment-analytics/aging', { params })
