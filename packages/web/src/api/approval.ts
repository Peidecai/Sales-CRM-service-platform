import request from './request'
import type { ApiResponse, PageResult } from './types'

// ─── Enums (mirror @crm/shared) ───────────────────────────────────────────────

export enum ApprovalStatus {
  PENDING = 'pending',
  APPROVED = 'approved',
  REJECTED = 'rejected',
  CANCELLED = 'cancelled',
  WITHDRAWN = 'withdrawn',
}

export enum ApprovalAction {
  APPROVE = 'approve',
  REJECT = 'reject',
  DELEGATE = 'delegate',
}

export enum ApprovalBizType {
  QUOTATION = 'quotation',
  CONTRACT = 'contract',
  DISCOUNT = 'discount',
  PAYMENT = 'payment',
  REFUND = 'refund',
}

// ─── VO / Payload types ────────────────────────────────────────────────────────

export interface ApprovalFlowVO {
  id: number
  flowCode: string
  flowName: string
  bizType: ApprovalBizType
  description: string | null
  conditionRules: Record<string, unknown> | null
  nodes: Array<{
    id: string
    name: string
    approverType: 'user' | 'role' | 'department_head'
    approverValue: string
    order: number
  }>
  isEnabled: boolean
  version: number
  createdBy: number | null
  createdAt: string
  updatedAt: string
}

export interface ApprovalInstanceVO {
  id: number
  flowDefinitionId: number
  bizType: ApprovalBizType
  bizId: number
  bizNo: string | null
  title: string
  applicantId: number
  currentNodeId: string | null
  status: ApprovalStatus
  resultRemark: string | null
  completedAt: string | null
  createdAt: string
  updatedAt: string
}

export interface ApprovalRecordVO {
  id: number
  instanceId: number
  nodeId: string
  nodeName: string
  approverId: number
  action: ApprovalAction
  opinion: string | null
  attachments: Array<{ name: string; url: string }> | null
  durationMinutes: number | null
  createdAt: string
}

export interface ApprovalDetailVO {
  instance: ApprovalInstanceVO
  records: ApprovalRecordVO[]
  flow: ApprovalFlowVO | null
}

// ─── Request payloads ──────────────────────────────────────────────────────────

export interface SubmitApprovalPayload {
  bizType: ApprovalBizType
  bizId: number
  bizNo?: string
  title: string
}

export interface ProcessApprovalPayload {
  action: ApprovalAction
  opinion?: string
  attachments?: Array<{ name: string; url: string }>
}

export interface ApprovalQueryParams {
  page?: number
  pageSize?: number
  status?: ApprovalStatus
  bizType?: ApprovalBizType
  applicantId?: number
}

// ─── API ───────────────────────────────────────────────────────────────────────

export const approvalApi = {
  /**
   * 获取审批列表（分页）
   */
  getList(params?: ApprovalQueryParams): Promise<ApiResponse<PageResult<ApprovalInstanceVO>>> {
    return request.get('/approvals', { params: params ?? {} })
  },

  /**
   * 获取审批详情（含操作记录和流程定义）
   */
  getDetail(id: number): Promise<ApiResponse<ApprovalDetailVO>> {
    return request.get(`/approvals/${id}`)
  },

  /**
   * 发起审批申请
   */
  submit(payload: SubmitApprovalPayload): Promise<ApiResponse<ApprovalInstanceVO>> {
    return request.post('/approvals', payload)
  },

  /**
   * 处理审批（通过 / 驳回 / 转交）
   */
  process(id: number, payload: ProcessApprovalPayload): Promise<ApiResponse<ApprovalInstanceVO>> {
    return request.put(`/approvals/${id}/process`, payload)
  },

  /**
   * 撤回审批申请
   */
  withdraw(id: number): Promise<ApiResponse<ApprovalInstanceVO>> {
    return request.put(`/approvals/${id}/withdraw`)
  },

  /**
   * 获取我的待审批列表
   */
  getMyPending(): Promise<ApiResponse<ApprovalInstanceVO[]>> {
    return request.get('/approvals/pending')
  },
}
