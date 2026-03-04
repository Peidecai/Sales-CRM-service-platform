import type { CustomerStatus, OpportunityStage, NotificationType } from '../enums/index';

/**
 * 客户基本信息
 */
export interface CustomerBasicInfo {
  id: number;
  name: string;
  company: string;
  phone: string;
  email: string;
  status: CustomerStatus;
  assignedUserId: number;
  assignedUserName?: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * 商机基本信息
 */
export interface OpportunityBasicInfo {
  id: number;
  title: string;
  customerId: number;
  customerName?: string;
  stage: OpportunityStage;
  amount: number;
  expectedCloseDate: string;
  assignedUserId: number;
  assignedUserName?: string;
  probability: number;
  createdAt: string;
  updatedAt: string;
}

/**
 * 发送通知载荷
 */
export interface SendNotificationPayload {
  type: NotificationType;
  recipientId: number;
  title: string;
  content: string;
  relatedId?: number;
  relatedType?: string;
  metadata?: Record<string, unknown>;
}
