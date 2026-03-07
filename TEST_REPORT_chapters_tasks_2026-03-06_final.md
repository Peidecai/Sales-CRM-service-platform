# CRM Chapters 测试报告（最终复测版）

- 报告日期: 2026-03-06
- 报告更新: 2026-03-07
- 执行目录: `D:\Develop\Sales CRM service platform\crm-sales-platform`
- 任务来源: chapters 清单（11 项）
- 本次目标: 按修复计划完成复测闭环，输出最新状态

## 1. 总体结论

本轮复测后，核心质量风险已显著下降：

1. 后端单元测试与覆盖率达到满分：`Statements/Branches/Functions/Lines = 100%`。
2. 前端单测覆盖率已达标：`vitest --coverage` 当前结果为 `Statements 100% / Branches 100% / Functions 97.14% / Lines 100%`（高于 `>80%` 门禁）。
3. 安全扫描已清零高危：`pnpm audit --audit-level high` 返回 `No known vulnerabilities found`。
4. Snyk 全项目扫描已通过：`snyk test --all-projects` 检测 `4` 个项目均无已知漏洞路径。
5. 容器化构建与运行链路恢复：`docker compose up -d --build server web` 成功，`crm-server` 健康、`crm-web` 可访问。
6. 部署健康检查修复：`/api/v1/health` 与 `/api/v1/health/ready` 均返回 `200`。
7. E2E 已回归通过：`46/46` 全通过（修复了 `e2e/customer.spec.ts` 与 `e2e/modules.spec.ts` 的脆弱断言问题）。
8. 部署/回滚脚本已补齐并验证：`scripts/deploy.ps1` 与 `scripts/rollback.ps1` 均可执行。
9. 定时健康检查已补齐：服务端已接入 `ScheduleModule`，并新增每 5 分钟系统健康巡检任务。
10. chapters 任务收口状态：`10 项通过 + 1 项外部阻塞跳过（Task 11）`。

## 2. 任务矩阵（11 项）

| # | 任务 | 当前状态 | 说明 |
|---|---|---|---|
| 1 | 自动化测试基线（单测/集成/E2E） | 通过 | 后端单测、前端单测、E2E 均通过 |
| 2 | 性能压测（k6/wrk） | 通过 | 通过 Docker 运行 `k6` 与 `wrk` 完成健康接口压测并输出指标 |
| 3 | 系统健康检查任务（定时/接口） | 通过 | 健康接口可用，已新增 `@Cron('0 */5 * * * *')` 定时健康检查任务并完成单测 |
| 4 | 数据库迁移正确性+回滚 | 通过（沿用前次结果） | 前次已完成 migration run/revert 验证，本轮未重跑 |
| 5 | 大表 DDL 在线变更工具验证 | 通过 | `pt-online-schema-change` 通过 Docker 验证，`gh-ost` 通过 Go 容器源码构建验证 |
| 6 | 依赖安全扫描（audit/Snyk/license） | 通过 | `pnpm audit` 与 `snyk test --all-projects` 均通过，未发现已知漏洞路径 |
| 7 | 备份恢复演练（RSS/PITR/校验） | 通过（含对象存储仿真） | 已完成 `mysqldump + restore + 行数一致性`、`mysqlbinlog` 读取、MinIO 上传下载与哈希一致性验证 |
| 8 | 容器健康检查 | 通过 | `mysql/redis/server/web` 均正常运行，server 健康 |
| 9 | CI 覆盖率门禁 | 通过 | 后端 100% 达标；前端覆盖率达标（Statements/Branches/Lines 100%） |
|10 | 部署后健康验证 + 回滚链路 | 通过 | `scripts/deploy.ps1` 与 `scripts/rollback.ps1` 已补齐并完成实测，健康检查与预演回滚链路可用 |
|11 | 运维命令验证（Nginx/DNS/证书） | 跳过（外部环境阻塞） | 命令链路可用，但目标域名 `crm.company.cn` 持续 NXDOMAIN；按本轮策略记为阻塞跳过 |

## 3. 关键执行证据

### 3.1 自动化测试
- 命令: `cmd /c pnpm --filter @crm/server test:cov --runInBand`
- 结果: `33 suites passed, 313 tests passed`
- 覆盖率: `All files: 100/100/100/100`

- 命令: `cmd /c pnpm --filter @crm/server test --runInBand`
- 结果: `34 suites passed, 316 tests passed`

- 命令: `cmd /c pnpm --filter @crm/web test:cov`
- 结果: `6 files passed, 71 tests passed`
- 覆盖率: `Statements 100% / Branches 100% / Functions 97.14% / Lines 100%`

- 命令: `cmd /c pnpm test:e2e`
- 结果: `46 passed`

### 3.2 安全扫描
- 命令: `cmd /c pnpm audit --audit-level high`
- 结果: `No known vulnerabilities found`

- 命令: `cmd /c pnpm dlx snyk whoami --experimental -d`
- 结果: 通过（当前身份 `Peidecai`，组织 `peidecai`，证据见 `.tmp/security/snyk-whoami-20260307.txt`）

- 命令: `cmd /c pnpm dlx snyk test --all-projects`
- 结果: 通过（`Tested 4 projects, no vulnerable paths were found`，证据见 `.tmp/security/snyk-test-20260307-success.txt`）

- 命令: `cmd /c "pnpm dlx license-checker --failOn GPL-2.0\;GPL-3.0\;AGPL-3.0"`
- 结果: 命令执行成功，未触发 failOn（输出保存于 `.tmp/license-check-latest.txt`）

### 3.3 容器与健康检查
- 命令: `cmd /c docker compose up -d --build server web`
- 结果: 构建与启动成功

- 命令: `cmd /c docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"`
- 结果: `crm-web Up`, `crm-server Up (healthy)`, `crm-redis Up (healthy)`, `crm-mysql Up (healthy)`

- 命令: `cmd /c curl -s -o NUL -w "%{http_code}" http://localhost:3000/api/v1/health`
- 结果: `200`

- 命令: `cmd /c curl -s -o NUL -w "%{http_code}" http://localhost:3000/api/v1/health/ready`
- 结果: `200`

- 命令: `cmd /c curl -s -o NUL -w "%{http_code}" http://localhost`
- 结果: `200`

### 3.4 性能压测（Docker 化执行）
- 命令: `docker run --rm -v "<repo>\\.tmp\\perf:/scripts" grafana/k6:latest run --summary-export=/scripts/k6-health-summary.json /scripts/k6-health.js`
- 结果: 通过
- 指标（`/api/v1/health`）:
  - `http_reqs rate`: `88.61 req/s`
  - `http_req_duration avg`: `12.04ms`
  - `http_req_duration p95`: `22.61ms`
  - `http_req_failed`: `0`

- 命令: `docker run --rm williamyeh/wrk -t2 -c20 -d10s http://host.docker.internal:3000/api/v1/health`
- 结果: 通过
- 指标:
  - `Requests/sec`: `1761.84`
  - `Latency avg`: `11.37ms`

### 3.5 在线 DDL 工具验证（Docker 化执行）
- 命令: `docker run --rm percona/percona-toolkit pt-online-schema-change --version`
- 结果: `pt-online-schema-change 3.7.1`

- 命令: `docker run --rm ghcr.io/github/gh-ost:latest --version`
- 结果: 失败（registry `denied`，镜像拉取受限）

- 命令: `docker run --rm golang:1.22 sh -lc "/usr/local/go/bin/go install github.com/github/gh-ost/go/cmd/gh-ost@latest && /go/bin/gh-ost --version"`
- 结果: 成功（基于源码构建，版本输出 `unversioned`，下载 `github.com/github/gh-ost v1.1.7`）

### 3.6 备份恢复演练（本地容器链路）
- 步骤:
  - `mysqldump` 导出 `crm_sales` 到 `.tmp/backup/crm_sales_20260306.sql`
  - `SHA256` 校验: `A8E1B03EA2DB23976972ED0ACE1AE75AC6ADBE5C561455185DD1B557C8BBBB70`
  - `SHOW BINARY LOGS` 验证存在 binlog（`binlog.000001~000003`）
  - 使用 `percona:8.0` 执行 `mysqlbinlog --read-from-remote-server ... binlog.000003` 并成功读取样例日志
  - 导入临时库 `crm_sales_restore_20260306`
  - 对比关键表行数（`customers/opportunities/call_records/knowledge_articles/knowledge_categories`）源与目标一致
  - 演练后清理临时库
- 补充对象存储仿真:
  - 启动 `crm-minio` 临时容器并使用 `minio/mc` 上传/下载备份
  - 证据: `.tmp/backup/minio-upload.txt`、`.tmp/backup/minio-download.txt`
  - 结果: 下载文件 `SHA256` 与原始备份一致
- 结论: 本地全量备份+恢复链路可用，PITR 基础日志读取能力可用，对象存储归档链路已通过 MinIO 仿真验证

### 3.7 其余待闭环项验证
- 命令: `rg -n "@Cron|CronExpression|ScheduleModule" packages/server/src`
- 结果: 已匹配（`ScheduleModule.forRoot()` 与 `SystemHealthCheckScheduler` 的 `@Cron('0 */5 * * * *')` 已存在）

- 命令: `cmd /c pnpm --filter @crm/server test -- --runInBand test/health`
- 结果: 通过（`system-health-check.scheduler.spec.ts`、`health.controller.spec.ts` 均通过）

- 命令: `cmd /c pnpm --filter @crm/server build`
- 结果: 通过（NestJS build 成功）

- 命令: `powershell -ExecutionPolicy Bypass -File .\scripts\deploy.ps1`
- 结果: 成功；`docker compose` 启动与健康检查通过，`docker ps` 输出 `crm-server/web/mysql/redis` 运行状态

- 命令: `powershell -ExecutionPolicy Bypass -File .\scripts\rollback.ps1`
- 结果: 成功；预演库 `crm_sales_rollback_preview` 建库/导入/行数校验通过

- 命令: `cmd /c nslookup crm.company.cn`
- 结果: `Non-existent domain (NXDOMAIN)`

- 命令: `cmd /c nslookup www.baidu.com`
- 结果: 可解析到 IPv4/IPv6（DNS 基础能力正常，证据见 `.tmp/ops/nslookup-www-baidu-com.txt`）

- 命令: `docker run --rm --entrypoint dig internetsystemsconsortium/bind9:9.18 +short crm.company.cn`
- 结果: 容器内 DNS 查询超时（`no servers could be reached`，证据见 `.tmp/ops/dig-crm-company-cn.txt`）

- 命令: `cmd /c nslookup crm.company.cn`（latest）
- 结果: 仍为 NXDOMAIN（证据见 `.tmp/ops/nslookup-crm-company-cn-20260307-latest.txt`）

- 命令: `cmd /c nslookup www.baidu.com`（latest）
- 结果: 可解析到 IPv4/IPv6（证据见 `.tmp/ops/nslookup-www-baidu-com-20260307-latest.txt`）

- 命令: `docker run --rm --entrypoint dig internetsystemsconsortium/bind9:9.18 +short crm.company.cn`（latest）
- 结果: 仍超时（证据见 `.tmp/ops/dig-crm-company-cn-20260307-latest.txt`）

- 命令: `docker run --rm frapsoft/openssl version`
- 结果: 可执行（`OpenSSL 1.0.2j`，证据见 `.tmp/ops/openssl-version.txt`）

## 4. 本轮新增修复点（与复测直接相关）

1. 后端测试补齐到 100% 覆盖（含分支与函数）。
2. 修复 `e2e/customer.spec.ts`：
   - 避免依赖脆弱中文文本选择器。
   - 使用可见对话框与操作列定位，提高并发执行稳定性。
   - 同步修复 `e2e/modules.spec.ts` 的页面标题断言，使其与当前全局标题策略一致。
3. 新增并修复 `scripts/deploy.ps1` 与 `scripts/rollback.ps1`：
   - 修复 PowerShell 参数名冲突导致的 `docker` 空调用问题。
   - 修复回滚预演建库/导入流程，加入建库存在性检查与数据库名白名单校验。
4. 新增系统定时健康检查实现：
   - 接入 `@nestjs/schedule` 与 `ScheduleModule.forRoot()`。
   - 新增 `SystemHealthCheckScheduler`，每 5 分钟检测 MySQL 与 Redis 状态并记录日志。
   - 新增调度器单测并通过。

## 5. 当前剩余风险

1. 运维外部环境未就绪（目标域名 `crm.company.cn` 解析为 NXDOMAIN，容器内 `dig` 访问 DNS 超时）；本轮已按“外部阻塞可跳过”策略处理 Task 11。
