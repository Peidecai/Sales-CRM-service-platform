# CRM Chapters 测试报告

- 报告日期: 2026-03-06
- 执行范围: 基于 `chapters` 文档提取的 11 项后续测试任务
- 执行目录: `D:\Develop\Sales CRM service platform\crm-sales-platform`
- 执行策略: 逐项实测；无法在当前环境执行的项标注为阻塞并给出证据

## 1. 总体结论

- 已完成并通过: 3 项
- 部分完成/存在问题: 5 项
- 阻塞未完成: 3 项

关键结论:

1. 应用核心测试（后端单测、前端单测、E2E、全仓回归）全部通过。
2. 覆盖率门禁未达标:
   - 后端覆盖率仅 `57.99%`（低于文档目标 `>80%`）。
   - 前端覆盖率任务失败（缺少 `@vitest/coverage-v8`）。
3. 部署健康检查存在设计与实现不一致:
   - `/api/v1/health` 可用（200）。
   - `/api/v1/health/ready` 返回 404（文档期望存在 ready 检查）。
4. 容器化构建阻塞:
   - `docker compose up -d server web` 失败，`docker/server/Dockerfile` 在 `pnpm install --prod` 阶段触发 `prepare: husky` 报错。
5. 安全扫描发现高危漏洞（`pnpm audit`）:
   - `glob` 命令注入风险（高危）。
   - `multer` 多个 DoS 风险（高危）。

## 2. 逐项测试结果

| #   | 任务                               | 结果     | 说明                                                                              |
| --- | ---------------------------------- | -------- | --------------------------------------------------------------------------------- |
| 1   | 自动化测试基线（单测/集成/E2E）    | 通过     | 后端单测、前端单测、E2E、全仓回归均通过；未发现 Supertest 集成测试用例。          |
| 2   | 性能压测（k6/wrk）                 | 阻塞     | 本机未安装 `k6/wrk`。                                                             |
| 3   | 系统健康检查任务（定时/接口）      | 部分完成 | 健康接口可测；未找到定时健康检查实现（无 `@Cron`/`ScheduleModule`）。             |
| 4   | 数据库迁移正确性+回滚              | 通过     | 在隔离临时库完整执行 `migration:run` 与 `migration:revert` 成功。                 |
| 5   | 大表 DDL 在线变更工具验证          | 阻塞     | 本机未安装 `pt-online-schema-change`、`gh-ost`。                                  |
| 6   | 依赖安全扫描（audit/Snyk/license） | 部分完成 | `pnpm audit` 扫出 11 漏洞（含 4 高危）；Snyk token 缺失；license-checker 可执行。 |
| 7   | 备份恢复演练（OSS/PITR/校验）      | 阻塞     | 缺少 `ossutil/mysqlbinlog/sha256sum/gzip`，且无备份样本。                         |
| 8   | 容器健康检查                       | 部分完成 | MySQL/Redis 容器健康正常；server/web 镜像构建失败。                               |
| 9   | CI 覆盖率门禁                      | 部分完成 | 后端覆盖率跑通但不达标；前端覆盖率命令失败（缺依赖）。                            |
| 10  | 部署后健康验证+回滚链路            | 部分完成 | 本地 `/api/v1/health`=200；`/health/ready`=404；仓库内无回滚脚本。                |
| 11  | 运维命令验证（Nginx/DNS/证书）     | 部分完成 | `nslookup` 可用但目标域名不存在；`nginx/dig/openssl` 不可用。                     |

## 3. 执行证据（关键命令与结果）

## 3.1 任务 1: 自动化测试基线

- 后端单测:
  - 命令: `cmd /c pnpm --filter @crm/server test --runInBand`
  - 结果: `12 suites PASS, 163 tests PASS`
- 前端单测:
  - 命令: `cmd /c pnpm --filter @crm/web test`
  - 结果: `5 files PASS, 71 tests PASS`
- E2E:
  - 命令: `cmd /c pnpm test:e2e`
  - 结果: `46 passed`
- 全仓回归:
  - 命令: `cmd /c pnpm test`
  - 结果: 通过
- 集成测试检查:
  - 命令: `rg -n "supertest|request\\(" packages/server/test`
  - 结果: 未匹配

## 3.2 任务 2: 性能压测

- 命令: `Get-Command k6`, `Get-Command wrk`
- 结果: `NOT_FOUND`

## 3.3 任务 3: 健康检查任务

- 健康接口探测:
  - 启动命令: `pnpm --filter @crm/server start:dev`（短时启动后探测）
  - `GET /api/v1/health` -> `200`
  - `GET /api/v1/health/ready` -> `404`
- 定时任务实现检查:
  - 命令: `rg -n "@Cron|CronExpression|ScheduleModule" packages/server/src`
  - 结果: 未匹配

## 3.4 任务 4: 迁移与回滚验证（隔离库）

- 临时库: `crm_migration_test_20260305`
- 前置状态:
  - 命令: `npx typeorm-ts-node-commonjs migration:show -d database/data-source.ts`（带 `DB_DATABASE=crm_migration_test_20260305`）
  - 结果: 全部 `[ ]` 未执行
- 执行迁移:
  - 命令: `migration:run`
  - 结果: 7 个迁移全部执行成功
- 回滚验证:
  - 命令: `migration:revert`
  - 结果: 最近一次迁移回滚成功（`CreateAuditLogsTable1709000006000`）
- 清理:
  - 删除临时库成功

## 3.5 任务 5: 在线 DDL 工具

- 命令:
  - `pt-online-schema-change --version`
  - `gh-ost --version`
- 结果: 均未安装

## 3.6 任务 6: 依赖安全

- `npm audit --audit-level=high`:
  - 结果: 失败（pnpm 项目缺少 `package-lock.json`，`ENOLOCK`）
- `pnpm audit --audit-level high`:
  - 结果: 发现 11 漏洞（`3 low / 4 moderate / 4 high`）
  - 高危涉及:
    - `glob`（CLI 命令注入，受影响链路 `@nestjs/cli > glob`）
    - `multer`（多个 DoS，受影响链路 `@nestjs/platform-express > multer`）
- Snyk:
  - 检查 `SNYK_TOKEN` -> `MISSING`
- License:
  - 命令: `pnpm dlx license-checker --failOn GPL-2.0;GPL-3.0;AGPL-3.0`（已处理缓存路径）
  - 结果: 命令执行成功，未触发 failOn
  - 日志: `.tmp/license-check.txt`

## 3.7 任务 7: 备份恢复演练

- 命令检查:
  - `ossutil --version` -> 未安装
  - `mysqlbinlog --version` -> 未安装
  - `sha256sum --version` -> 未安装
  - `gzip --version` -> 未安装
- 结论: 当前环境无法按文档命令链路完整演练

## 3.8 任务 8: 容器健康检查

- Docker 能力:
  - `docker --version`、`docker compose version` 正常
- Compose 配置:
  - `docker compose config` 通过，healthcheck 配置存在
- 运行验证:
  - `docker compose up -d mysql redis` -> 成功
  - `docker ps` -> `crm-mysql`、`crm-redis` 为 `healthy`
  - `docker exec crm-mysql mysqladmin ping` -> `mysqld is alive`
  - `docker exec crm-redis redis-cli ping` -> `PONG`
- server/web:
  - `docker compose up -d server web` -> 失败
  - 失败点: `docker/server/Dockerfile` 第 39 行 `RUN pnpm install --frozen-lockfile --prod`
  - 报错: `prepare: sh: husky: not found`

## 3.9 任务 9: 覆盖率门禁

- 后端覆盖率:
  - 命令: `cmd /c pnpm --filter @crm/server test:cov --runInBand`
  - 结果: 通过
  - 汇总: `Statements 57.99%`, `Branches 55.13%`, `Functions 45.99%`, `Lines 58.52%`
- 前端覆盖率:
  - 命令: `cmd /c pnpm --filter @crm/web test:cov`
  - 结果: 失败
  - 原因: `Cannot find dependency '@vitest/coverage-v8'`

## 3.10 任务 10: 部署后健康与回滚

- 本地健康:
  - `/api/v1/health` -> `200`
  - `/api/v1/health/ready` -> `404`
- 仓库脚本检查:
  - `rg --files | rg "rollback\\.sh|deploy\\.sh"` -> 未找到
- 结论: 文档中的回滚脚本与 ready 端点在当前仓库未落地或不一致

## 3.11 任务 11: 运维命令

- `nginx -t` -> 未安装
- `nslookup crm.company.cn` -> 命令可用，但域名 `NXDOMAIN`
- `dig crm.company.cn` -> 未安装
- `openssl ...` -> 未安装

## 4. 主要问题清单（按优先级）

1. 高危漏洞未清零（安全风险）
   - `glob`、`multer` 高危告警在依赖树中存在
2. 覆盖率与目标偏差大（质量门禁风险）
   - 文档目标 `>80%`，当前后端 `57.99%`，前端覆盖率任务无法执行
3. 容器构建流程阻塞（交付风险）
   - `docker/server/Dockerfile` 生产安装阶段触发 `husky` 导致镜像构建失败
4. 文档与实现不一致（运维可用性风险）
   - 文档中的 `/health/ready` 在当前服务不存在
   - 文档回滚脚本未在仓库找到

## 5. 建议修复顺序

1. 修复容器构建:
   - 在生产镜像安装依赖阶段禁用 `prepare`（如 `HUSKY=0`）或调整脚本触发条件
2. 修复覆盖率链路:
   - 前端补齐 `@vitest/coverage-v8`
   - 增加后端覆盖率薄弱模块（filters/interceptors/health/notification 等）测试
3. 清理高危漏洞:
   - 升级 `glob` 到修复版本
   - 升级 `multer` 到修复版本（经 `@nestjs/platform-express` 依赖链处理）
4. 对齐健康检查设计:
   - 明确是否保留 `/api/v1/health/ready`，并与文档/Compose/SLB 配置一致
5. 补齐运维与演练工具链:
   - 安装 `k6/wrk`、`pt-online-schema-change/gh-ost`、`ossutil/mysqlbinlog`、`nginx/dig/openssl`
