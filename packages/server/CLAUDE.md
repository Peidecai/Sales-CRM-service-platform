# @crm/server — 后端 CLAUDE.md

## 架构

NestJS 10 + TypeORM 0.3 + MySQL 8.0 + Redis 7 + Bull 队列

## 模块结构

每个模块遵循: `module.ts / controller.ts / service.ts / entity.ts / dto/`

### 业务模块

| 模块          | 路径                     | 说明                                                 |
| ------------- | ------------------------ | ---------------------------------------------------- |
| auth          | `modules/auth/`          | JWT 双 Token + 微信 OAuth                            |
| user          | `modules/user/`          | 用户管理 (Admin)                                     |
| customer      | `modules/customer/`      | 客户 CRUD + 导入/导出/合并                           |
| opportunity   | `modules/opportunity/`   | 商机 + 看板 + 阶段推进                               |
| call-record   | `modules/call-record/`   | 通话记录 + AI 摘要                                   |
| call          | `modules/call/`          | 电话拨打 + 外呼弹屏                                  |
| recording     | `modules/recording/`     | 录音 + ASR 转写                                      |
| agent         | `modules/agent/`         | 坐席状态 + 来电分配                                  |
| campaign      | `modules/campaign/`      | 外呼任务/活动                                        |
| knowledge     | `modules/knowledge/`     | 知识库 + RAG 问答                                    |
| prospect      | `modules/prospect/`      | 互联网获客 + 数据源管理                              |
| ai            | `modules/ai/`            | AI 通话分析/客户画像/员工画像/意向预测               |
| report        | `modules/report/`        | AI报表(标签统计/邀约能力/话术评分/评分排名/员工画像) |
| notification  | `modules/notification/`  | WebSocket 实时通知                                   |
| follow-up     | `modules/follow-up/`     | 跟进提醒调度                                         |
| sales-target  | `modules/sales-target/`  | 销售目标 + 绩效排行                                  |
| contact       | `modules/contact/`       | 联系人管理                                           |
| customer-pool | `modules/customer-pool/` | 公海池                                               |
| customer-tag  | `modules/customer-tag/`  | 标签 + 自动打标                                      |
| custom-field  | `modules/custom-field/`  | 自定义字段                                           |
| material      | `modules/material/`      | 素材 (OSS)                                           |
| announcement  | `modules/announcement/`  | 公告管理                                             |
| rbac          | `modules/rbac/`          | 角色权限表                                           |
| route         | `modules/route/`         | 路由权限                                             |
| quotation     | `modules/quotation/`     | 报价单                                               |
| payment       | `modules/payment/`       | 回款记录                                             |
| contract      | `modules/contract/`      | 合同管理                                             |
| approval      | `modules/approval/`      | 审批流程                                             |
| audit-log     | `modules/audit-log/`     | 审计日志 (全局)                                      |
| health        | `modules/health/`        | 健康检查                                             |

## 通用基础设施

| 目录                   | 内容                                           |
| ---------------------- | ---------------------------------------------- |
| `common/decorators/`   | `@CurrentUser()`                               |
| `common/guards/`       | JwtAuthGuard, RolesGuard, CustomThrottlerGuard |
| `common/interceptors/` | AuditLog, Timeout, Response                    |
| `common/filters/`      | HttpExceptionFilter                            |
| `common/middleware/`   | CSRF, SqlInjection, RequestContext             |
| `common/security/`     | EncryptionService (AES-256-GCM)                |
| `common/redis/`        | RedisService + cache-keys                      |

## 编码规范

- DTO 必须用 `class-validator` 装饰器
- Service 处理业务逻辑，Controller 只做 HTTP 适配
- 敏感字段（密码、API Key）不得出现在响应中
- Controller 类级别 `@UseGuards(JwtAuthGuard, RolesGuard)`
- 写操作 Controller `@UseInterceptors(AuditLogInterceptor)`
- 使用 `@CurrentUser()` 而非 `@Req()`
- 使用 `@Roles(UserRole.ADMIN)` 限制权限
- Redis 读取用 `safeGet()`（故障降级为 cache miss）

## 缓存策略

| 缓存       | Key 前缀                             | TTL  |
| ---------- | ------------------------------------ | ---- |
| 客户列表   | `cache:customers:list`               | 60s  |
| 客户详情   | `cache:customers:detail`             | 120s |
| 商机列表   | `cache:opportunities:list`           | 60s  |
| 商机详情   | `cache:opportunities:detail`         | 120s |
| 商机统计   | `cache:opportunities:stats`          | 300s |
| 数据源配置 | `cache:prospects:data-sources`       | 300s |
| 筛选配置   | `cache:prospects:filter-config`      | 300s |
| 搜索模板   | `cache:prospects:templates`          | 120s |
| 销售目标   | `cache:sales-targets:stats:overview` | 300s |

写操作自动失效缓存，使用 `RedisService.delByPattern()` 批量清除。

## 数据库迁移

```bash
DB_USERNAME=crm_migrator DB_PASSWORD=<pwd> pnpm migration:run
```

- 不修改已有迁移文件，只新增
- `INSERT IGNORE` 确保幂等
- MySQL 8.0 不支持 `ADD COLUMN IF NOT EXISTS`

## 测试

```bash
pnpm test                                    # 全部 (1249 tests)
pnpm test -- --testPathPattern=prospect      # 按模块
pnpm test -- --coverage                      # 覆盖率
```

Mock 工具: `test/test-utils.ts` — MockRepository, MockQueryBuilder,
MockRedisService, MockDataSource, fixtures

## Skill 规范

操作后端代码时应遵循：

- **backend-patterns** — NestJS 分层架构、API 设计、数据库优化
- **api-design** — REST 资源命名、状态码、分页、错误响应
- **coding-standards** — TypeScript 编码规范
- **database-migrations** — 迁移最佳实践（幂等、回滚）
- **security-review** — 认证、输入验证、API 安全
- **tdd-workflow** — 测试驱动开发 (80%+ 覆盖率)
- **docker-patterns** — Dockerfile、Compose 配置

审查完成后运行 `/simplify` + `/verification-loop`
