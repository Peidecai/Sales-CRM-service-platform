import type {
  CustomerStatus,
  OpportunityStage,
  NotificationType,
  TargetScope,
  TargetPeriod,
  TargetMetricType,
  ProspectChannel,
} from "../enums/index";

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

/**
 * 销售目标基本信息
 */
export interface SalesTargetBasicInfo {
  id: number;
  name: string;
  scope: TargetScope;
  period: TargetPeriod;
  metricType: TargetMetricType;
  targetValue: number;
  achievedValue: number;
  year: number;
  quarter: number | null;
  month: number | null;
  startDate: string;
  endDate: string;
  assignedUserId: number | null;
  assignedUserName?: string;
  parentTargetId: number | null;
  achievementRate: number;
  createdAt: string;
  updatedAt: string;
}

/**
 * 业绩排行信息
 */
export interface PerformanceRankingInfo {
  id: number;
  userId: number;
  userName: string;
  period: TargetPeriod;
  metricType: TargetMetricType;
  metricValue: number;
  rank: number;
  snapshotDate: string;
  scope: TargetScope;
}

/**
 * 互联网获客搜索条件
 */
export interface ProspectSearchQuery {
  keyword?: string;
  industry?: string;
  province?: string;
  city?: string;
  minRegisteredCapital?: number;
  maxRegisteredCapital?: number;
  minEmployeeCount?: number;
  maxEmployeeCount?: number;
  page?: number;
  pageSize?: number;
}

/**
 * 互联网获客搜索结果
 */
export interface ProspectSearchResult {
  companyName: string;
  legalPerson?: string;
  registeredCapital?: string;
  establishDate?: string;
  industry?: string;
  province?: string;
  city?: string;
  address?: string;
  unifiedCreditCode?: string;
  phone?: string;
  email?: string;
  website?: string;
  employeeCount?: number;
  businessScope?: string;
  channel: ProspectChannel;
}
