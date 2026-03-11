/**
 * 客户状态枚举（8态）
 */
export enum CustomerStatus {
  LEAD = "lead", // 线索
  POTENTIAL = "potential", // 潜在客户
  INTENTION = "intention", // 有意向
  OPPORTUNITY = "opportunity", // 商机客户
  DEAL = "deal", // 成交客户
  MAINTAIN = "maintain", // 维护期
  INVALID = "invalid", // 无效客户
  LOST = "lost", // 已流失
}

/**
 * 客户来源枚举
 */
export enum CustomerSource {
  WEBSITE = "website", // 官网
  REFERRAL = "referral", // 转介绍
  COLD_CALL = "cold_call", // 陌拜电话
  EXHIBITION = "exhibition", // 展会
  AD = "ad", // 广告投放
  IMPORT = "import", // 批量导入
  OTHER = "other", // 其他
}

/**
 * 客户类型枚举
 */
export enum CustomerType {
  ENTERPRISE = "enterprise", // 企业客户
  INDIVIDUAL = "individual", // 个人客户
}

/**
 * 企业规模枚举
 */
export enum CustomerScale {
  MICRO = "micro", // 微型
  SMALL = "small", // 小型
  MEDIUM = "medium", // 中型
  LARGE = "large", // 大型
  ENTERPRISE = "enterprise", // 集团
}

/**
 * 客户等级枚举
 */
export enum CustomerLevel {
  A = "A",
  B = "B",
  C = "C",
  D = "D",
}

/**
 * 信用评级枚举
 */
export enum CreditRating {
  AAA = "AAA",
  AA = "AA",
  A = "A",
  BBB = "BBB",
  BB = "BB",
  B = "B",
  C = "C",
  D = "D",
}

/**
 * 商机阶段枚举
 */
export enum OpportunityStage {
  LEAD = "lead", // 线索
  QUALIFIED = "qualified", // 已确认
  PROPOSAL = "proposal", // 方案阶段
  NEGOTIATION = "negotiation", // 谈判阶段
  CLOSED_WON = "closed_won", // 成交
  CLOSED_LOST = "closed_lost", // 丢单
}

/**
 * 商机状态枚举
 */
export enum OpportunityStatus {
  ACTIVE = "active",
  WON = "won",
  LOST = "lost",
  SHELVED = "shelved",
}

/**
 * 优先级枚举
 */
export enum Priority {
  HIGH = "high",
  MEDIUM = "medium",
  LOW = "low",
}

/**
 * 通知类型枚举
 */
export enum NotificationType {
  SYSTEM = "system", // 系统通知
  TASK = "task", // 任务提醒
  FOLLOW_UP = "follow_up", // 跟进提醒
  OPPORTUNITY = "opportunity", // 商机更新
  MENTION = "mention", // @提及
}

/**
 * 用户角色枚举
 */
export enum UserRole {
  ADMIN = "admin",
  MANAGER = "manager",
  SALES = "sales",
}

/**
 * 销售目标范围
 */
export enum TargetScope {
  COMPANY = "company", // 公司级
  TEAM = "team", // 团队级
  INDIVIDUAL = "individual", // 个人级
}

/**
 * 目标周期
 */
export enum TargetPeriod {
  YEAR = "year",
  QUARTER = "quarter",
  MONTH = "month",
}

/**
 * 目标指标类型
 */
export enum TargetMetricType {
  REVENUE = "revenue", // 收入金额
  DEAL_COUNT = "deal_count", // 成交数
  NEW_CUSTOMER = "new_customer", // 新客户数
  CALL_COUNT = "call_count", // 通话数
}

/**
 * 呼叫方向（呼叫中心）
 */
export enum CallDirection {
  INBOUND = "inbound",
  OUTBOUND = "outbound",
}

/**
 * 呼叫类型（呼叫中心）
 */
export enum CallType {
  NORMAL = "normal",
  FOLLOW_UP = "follow_up",
  CAMPAIGN = "campaign",
}

/**
 * 通话状态（呼叫中心）
 */
export enum CallStatus {
  RINGING = "RINGING",
  CONNECTED = "CONNECTED",
  ON_HOLD = "ON_HOLD",
  ENDED = "ENDED",
}

/**
 * 知识库分类类型
 */
export enum KnowledgeCategoryType {
  PRODUCT = "product",
  SALES_TECHNIQUE = "sales_technique",
  INDUSTRY = "industry",
  FAQ = "faq",
  TRAINING = "training",
}

/**
 * 文章可见范围
 */
export enum ArticleVisibleScope {
  ALL = "all",
  ROLE = "role",
  DEPARTMENT = "department",
}

/**
 * 文章审核状态
 */
export enum ArticleStatus {
  DRAFT = "draft",
  SUBMITTED = "submitted",
  PUBLISHED = "published",
  REJECTED = "rejected",
  OFFLINE = "offline",
}

/**
 * 公告优先级
 */
export enum AnnouncementPriority {
  NORMAL = "normal",
  IMPORTANT = "important",
  URGENT = "urgent",
}
