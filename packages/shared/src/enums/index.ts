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
  PROSPECT = "prospect", // 来自互联网获客
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
  MANUAL = "manual", // 手机原生外呼（方案B）
  CALLBACK = "callback", // 回呼模式（方案D预留）
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

/**
 * 报价单状态
 */
export enum QuotationStatus {
  DRAFT = "draft",
  PENDING_APPROVAL = "pending_approval",
  APPROVED = "approved",
  REJECTED = "rejected",
  SENT = "sent",
  ACCEPTED = "accepted",
  EXPIRED = "expired",
  CANCELLED = "cancelled",
}

/**
 * 审批实例状态
 */
export enum ApprovalStatus {
  PENDING = "pending",
  APPROVED = "approved",
  REJECTED = "rejected",
  CANCELLED = "cancelled",
  WITHDRAWN = "withdrawn",
}

/**
 * 审批动作
 */
export enum ApprovalAction {
  APPROVE = "approve",
  REJECT = "reject",
  DELEGATE = "delegate",
}

/**
 * 审批业务类型
 */
export enum ApprovalBizType {
  QUOTATION = "quotation",
  CONTRACT = "contract",
  DISCOUNT = "discount",
  PAYMENT = "payment",
  REFUND = "refund",
}

/**
 * 回款状态
 */
export enum PaymentStatus {
  PLANNED = "planned",
  PENDING_CONFIRM = "pending_confirm",
  CONFIRMED = "confirmed",
  CANCELLED = "cancelled",
  BAD_DEBT = "bad_debt",
}

/**
 * 回款方式
 */
export enum PaymentMethod {
  BANK_TRANSFER = "bank_transfer",
  CHECK = "check",
  CASH = "cash",
  CREDIT_CARD = "credit_card",
  OTHER = "other",
}

/**
 * 合同状态
 */
export enum ContractStatus {
  DRAFT = "draft",
  PENDING_APPROVAL = "pending_approval",
  APPROVED = "approved",
  REJECTED = "rejected",
  PENDING_SIGN = "pending_sign",
  SIGNED = "signed",
  EXECUTING = "executing",
  COMPLETED = "completed",
  TERMINATED = "terminated",
  CANCELLED = "cancelled",
  RENEWED = "renewed",
}

/**
 * 合同类型
 */
/**
 * 线索来源渠道
 */
export enum ProspectChannel {
  TIANYANCHA = "tianyancha", // 天眼查
  QICHACHA = "qichacha", // 企查查
  MANUAL = "manual", // 手动录入
  MOCK = "mock", // 模拟数据（开发用）
}

/**
 * 线索状态
 */
export enum ProspectStatus {
  NEW = "new", // 新线索
  CONTACTED = "contacted", // 已联系
  QUALIFIED = "qualified", // 已确认有效
  CONVERTED = "converted", // 已转化为客户
  REJECTED = "rejected", // 已废弃
}

export enum ContractType {
  SALES = "sales",
  SERVICE = "service",
  FRAMEWORK = "framework",
  SUPPLEMENT = "supplement",
}

/**
 * AI 分析结果状态
 */
export enum AnalysisStatus {
  PENDING = "pending",
  COMPLETED = "completed",
  FAILED = "failed",
  APPLIED = "applied",
}

/**
 * AI 分析类型
 */
export enum AnalysisType {
  FULL = "full",
  CLASSIFY_ONLY = "classify_only",
  SPEECH_ONLY = "speech_only",
}

/**
 * AI 分析输入来源
 */
export enum AnalysisInputSource {
  ASR = "asr",
  NOTES = "notes",
  BOTH = "both",
  VOICE_MEMO = "voice_memo", // 语音速记（方案B）
}

/**
 * 通话结果（方案B手机原生外呼）
 */
export enum CallResult {
  CONNECTED = "connected", // 已接通
  NO_ANSWER = "no_answer", // 未接听
  BUSY = "busy", // 忙线
  POWER_OFF = "power_off", // 关机
}

/**
 * 录音来源类型
 */
export enum RecordingSourceType {
  PLATFORM = "platform", // 平台录音（阿里云CCC）
  VOICE_MEMO = "voice_memo", // 语音速记（方案B）
  MANUAL_UPLOAD = "manual_upload", // 手动上传录音
}

/**
 * 产品状态枚举
 */
/**
 * 贷后状态
 */
export enum PostLoanStatus {
  NORMAL = "normal",
  OVERDUE = "overdue",
  SETTLED = "settled",
  BAD_DEBT = "bad_debt",
}

/**
 * 还款计划状态
 */
export enum RepaymentStatus {
  PENDING = "pending",
  PAID = "paid",
  OVERDUE = "overdue",
  PARTIAL = "partial",
}

/**
 * 话术模板状态
 */
export enum SpeechTemplateStatus {
  DRAFT = "draft",
  PUBLISHED = "published",
  ARCHIVED = "archived",
}

/**
 * 话术分类编码
 */
export enum SpeechCategoryCode {
  OPENING = "opening",
  OBJECTION = "objection",
  CLOSING = "closing",
  PRODUCT = "product",
  RETENTION = "retention",
  OTHER = "other",
}

export enum ProductStatus {
  ACTIVE = "active",
  INACTIVE = "inactive",
  DISCONTINUED = "discontinued",
}

/**
 * 谈判分析状态
 */
export enum NegotiationStatus {
  PENDING = "pending",
  PROCESSING = "processing",
  COMPLETED = "completed",
  FAILED = "failed",
}

/**
 * 谈判结果
 */
export enum NegotiationOutcome {
  WON = "won",
  LOST = "lost",
  PENDING = "pending",
  UNKNOWN = "unknown",
}

/**
 * 谈判策略
 */
/**
 * AI 商机提醒类型
 */
export enum AiReminderType {
  SCORE_CHANGE = "score_change",
  RISK_ALERT = "risk_alert",
  NEXT_ACTION = "next_action",
  COMPETITOR_MENTION = "competitor_mention",
  FOLLOW_UP_SCHEDULE = "follow_up_schedule",
  STAGNANT = "stagnant",
}

/**
 * AI 提醒优先级
 */
export enum AiReminderPriority {
  LOW = "low",
  MEDIUM = "medium",
  HIGH = "high",
  URGENT = "urgent",
}

/**
 * AI 提醒反馈
 */
export enum AiReminderFeedback {
  HELPFUL = "helpful",
  NOT_HELPFUL = "not_helpful",
  ACTED_ON = "acted_on",
  DISMISSED = "dismissed",
}

export enum NegotiationStrategy {
  COMPETITIVE = "competitive",
  COLLABORATIVE = "collaborative",
  COMPROMISE = "compromise",
  AVOIDANT = "avoidant",
}

/**
 * 服务记录类型
 */
export enum ServiceType {
  COMPLAINT = "complaint",
  CONSULTATION = "consultation",
  MAINTENANCE = "maintenance",
  RETURN = "return",
}

/**
 * 服务记录状态
 */
export enum ServiceStatus {
  PENDING = "pending",
  PROCESSING = "processing",
  RESOLVED = "resolved",
  CLOSED = "closed",
}

/**
 * 服务记录优先级
 */
export enum ServicePriority {
  LOW = "low",
  MEDIUM = "medium",
  HIGH = "high",
  URGENT = "urgent",
}

/**
 * PK 类型
 */
export enum PkType {
  ONE_ON_ONE = "one_on_one",
  TEAM_VS_TEAM = "team_vs_team",
}

/**
 * PK 状态
 */
export enum PkStatus {
  PENDING = "pending",
  ACTIVE = "active",
  FINISHED = "finished",
  CANCELLED = "cancelled",
}

/**
 * PK 指标
 */
export enum PkMetric {
  REVENUE = "revenue",
  DEAL_COUNT = "deal_count",
  CALL_COUNT = "call_count",
  NEW_CUSTOMER = "new_customer",
  COLLECTION = "collection",
}

/**
 * PK 结果
 */
export enum PkResult {
  TEAM_A_WIN = "team_a_win",
  TEAM_B_WIN = "team_b_win",
  DRAW = "draw",
}

/**
 * 签约流程状态
 */
export enum SigningStatus {
  DRAFT = "draft",
  INTERNAL_REVIEW = "internal_review",
  SENT_TO_CUSTOMER = "sent_to_customer",
  CUSTOMER_SIGNED = "customer_signed",
  COMPLETED = "completed",
  CANCELLED = "cancelled",
}

/**
 * 回款计划行项状态
 */
export enum PaymentPlanItemStatus {
  PENDING = "pending",
  PAID = "paid",
  PARTIAL = "partial",
  OVERDUE = "overdue",
  BAD_DEBT = "bad_debt",
}

/**
 * 银行流水匹配状态
 */
export enum BankStatementMatchStatus {
  UNMATCHED = "unmatched",
  AUTO_MATCHED = "auto_matched",
  MANUAL_MATCHED = "manual_matched",
}

/**
 * SIM 运营商
 */
export enum SimCarrier {
  CHINA_MOBILE = "china_mobile",
  CHINA_UNICOM = "china_unicom",
  CHINA_TELECOM = "china_telecom",
  UNKNOWN = "unknown",
}

/**
 * 待办优先级
 */
export enum TodoPriority {
  HIGH = "high",
  MEDIUM = "medium",
  LOW = "low",
}

/**
 * 待办分类
 */
export enum TodoCategory {
  FOLLOW_UP = "follow_up",
  CALL = "call",
  MEETING = "meeting",
  OTHER = "other",
}

/**
 * 待办状态
 */
export enum TodoStatus {
  PENDING = "pending",
  COMPLETED = "completed",
  CANCELLED = "cancelled",
  OVERDUE = "overdue",
}

/**
 * 批注目标类型
 */
export enum AnnotationTargetType {
  CUSTOMER = "customer",
  OPPORTUNITY = "opportunity",
  CALL_RECORD = "call_record",
  CONTRACT = "contract",
}
