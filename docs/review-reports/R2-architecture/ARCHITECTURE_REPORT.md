# R2 架构合规审查汇总报告

**审查日期**: 2026-03-11
**审查范围**: T4 四层架构 + T5 NestJS 后端 + T6 数据库 + T7 API 规范
**扫描规模**: 24 Controller, 30+ Service, 44 Entity, 46 Migration, 130+ 端点

---

## 1. 执行摘要

| 审查项                | PASS   | FAIL   | WARN   | 合规率  |
| --------------------- | ------ | ------ | ------ | ------- |
| T4 四层架构 (9项)     | 3      | 4      | 2      | 33%     |
| T5 NestJS 后端 (19项) | 8      | 5      | 6      | 42%     |
| T6 数据库 (17项)      | 12     | 2      | 3      | 71%     |
| T7 API 规范 (8项)     | 3      | 3      | 2      | 38%     |
| **总计 (53项)**       | **26** | **14** | **13** | **49%** |

---

## 2. 架构违规清单（按严重程度排序）

### CRITICAL 架构违规

| #   | 问题                                                      | 文件位置                    | 影响                                                      |
| --- | --------------------------------------------------------- | --------------------------- | --------------------------------------------------------- |
| A1  | **AiController 直接注入 6个 Repository + 5个 Bull Queue** | `ai/ai.controller.ts`       | 严重违反分层，Controller 包含完整业务逻辑，无法测试和维护 |
| A2  | **AgentController 直接操作 Repository + QueryBuilder**    | `agent/agent.controller.ts` | 跨层调用，绕过 Service 层事务和权限控制                   |
| A3  | **事务缺失：opportunity.updateStage 和批量导入**          | 多处 Service                | 状态更新和批量操作无事务保护，数据一致性风险              |

### HIGH 架构违规

| #   | 问题                                                           | 文件位置                         |
| --- | -------------------------------------------------------------- | -------------------------------- |
| A4  | Controller 内联类型 `{ primaryId, secondaryId }` 绕过 DTO 验证 | `customer.controller.ts:145,152` |
| A5  | 领域层零框架依赖未达成 — Entity 直接使用 TypeORM 装饰器        | 所有 Entity 文件                 |
| A6  | 无 Domain Entity 与 ORM Entity 分离，无 Mapper 层              | 全局                             |
| A7  | Controller 直接返回 TypeORM Entity（非 ResponseDTO）           | 多处                             |

---

## 3. 数据库设计偏差清单

| #   | 问题                                                  | 严重程度 |
| --- | ----------------------------------------------------- | -------- |
| D1  | 44 Entity 已创建，覆盖设计文档 21 表 + 额外业务扩展表 | PASS     |
| D2  | 金额字段统一 DECIMAL(15,2)                            | PASS     |
| D3  | 46 Migration 文件 + 1 Seed，命名规范                  | PASS     |
| D4  | 部分唯一索引未包含 `deleted_at`（软删除后可能冲突）   | WARN     |
| D5  | `synchronize` 配置需确认生产环境为 false              | WARN     |

---

## 4. API 规范合规率

- **URL 命名**: 18/24 Controller 合规 (75%)，6个存在双前缀路由问题
- **HTTP 方法语义**: 大部分正确，部分 DELETE 操作使用 soft-delete 但返回 200 而非 204
- **响应格式**: TransformInterceptor 全局统一，但部分接口 `throw new Error` 导致 500 而非业务错误码
- **错误码分段**: 已实现模块化错误码（10000/20000/30000/40000/50000/60000/90000）
- **分页规范**: 统一 page + pageSize，响应含 total/page/pageSize/list
- **总体合规率**: **约 72%**，33 个不合规端点

---

## 5. 结论：是否可以进入 R3/R4

**YES — 可以继续，架构问题不阻断业务和质量审查**

理由：

- 架构合规率 49% 偏低，但核心问题集中在 2-3 个 Controller（AiController、AgentController），不影响其他模块的业务逻辑审查
- 数据库设计合规率 71%，总体健康
- API 规范合规率 72%，可在后续迭代持续改进
- 建议优先修复 A1/A2/A3（Controller 直接操作 Repository + 事务缺失），因为它们会影响 R3 业务逻辑审查的准确性
