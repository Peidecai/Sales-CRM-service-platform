/**
 * 客户状态枚举
 */
export enum CustomerStatus {
  POTENTIAL = 'potential',       // 潜在客户
  FOLLOWING = 'following',       // 跟进中
  NEGOTIATING = 'negotiating',   // 谈判中
  SIGNED = 'signed',             // 已签约
  LOST = 'lost',                 // 已流失
  INACTIVE = 'inactive',         // 暂不合作
}

/**
 * 商机阶段枚举
 */
export enum OpportunityStage {
  LEAD = 'lead',                   // 线索
  QUALIFIED = 'qualified',         // 已确认
  PROPOSAL = 'proposal',           // 方案阶段
  NEGOTIATION = 'negotiation',     // 谈判阶段
  CLOSED_WON = 'closed_won',       // 成交
  CLOSED_LOST = 'closed_lost',     // 丢单
}

/**
 * 通知类型枚举
 */
export enum NotificationType {
  SYSTEM = 'system',               // 系统通知
  TASK = 'task',                   // 任务提醒
  FOLLOW_UP = 'follow_up',         // 跟进提醒
  OPPORTUNITY = 'opportunity',     // 商机更新
  MENTION = 'mention',             // @提及
}

/**
 * 用户角色枚举
 */
export enum UserRole {
  ADMIN = 'admin',
  MANAGER = 'manager',
  SALES = 'sales',
}
