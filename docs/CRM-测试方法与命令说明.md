# CRM Sales Platform 测试方法与命令说明

更新时间：2026-03-05

## 1. 测试目标

本说明用于指导在本地执行 CRM Sales Platform 的综合测试，覆盖：

- 后端单元测试（NestJS / Jest）
- 前端单元测试（Vue / Vitest）
- E2E 测试（Playwright）
- Monorepo 全量回归测试

## 2. 前置条件

执行测试前，请确保：

- Node.js >= 18（建议 20+）
- pnpm 可用
- 依赖已安装：`pnpm install`
- 如需真实联调，请确保 MySQL / Redis 已可用（单元测试一般使用 mock，可不依赖真实服务）

## 3. 推荐执行顺序（从快到全）

推荐顺序：

1. 后端单测（定位服务逻辑问题）
2. 前端单测（定位 UI/store/composable 逻辑问题）
3. E2E（验证关键用户流程）
4. 全仓回归（最终确认）

---

## 4. 测试命令

### 4.1 后端单测（@crm/server）

```bash
cd /d "D:\Develop\Sales CRM service platform\crm-sales-platform\packages\server"
cmd /c pnpm test -- --runInBand
```

说明：

- `--runInBand` 用于串行执行，降低 Windows 环境下子进程权限/并发导致的偶发问题。
- 若需仅跑某些测试文件：

```bash
cmd /c pnpm test -- --runInBand test/opportunity/opportunity.service.spec.ts
```

### 4.2 前端单测（@crm/web）

```bash
cd /d "D:\Develop\Sales CRM service platform\crm-sales-platform\packages\web"
cmd /c pnpm test
```

说明：

- 默认执行 Vitest（run 模式）。
- 如需监听模式：

```bash
cmd /c pnpm test:watch
```

### 4.3 E2E 测试（Playwright）

```bash
cd /d "D:\Develop\Sales CRM service platform\crm-sales-platform"
cmd /c pnpm test:e2e
```

说明：

- 项目配置会自动启动 Web 测试服务。
- 测试中 API 通常通过 route mock，不依赖真实后端。

### 4.4 全仓回归（Monorepo）

```bash
cd /d "D:\Develop\Sales CRM service platform\crm-sales-platform"
cmd /c pnpm test
```

说明：

- 会递归执行 workspace 内各包的 test 脚本。
- 适合作为提交前的最终回归检查。

---

## 5. 常见问题与处理

### 5.1 PowerShell 执行策略拦截 `pnpm.ps1`

现象：

- 报错类似“在此系统上禁止运行脚本（about_Execution_Policies）”。

处理：

- 统一使用 `cmd /c pnpm ...` 方式执行命令，避免调用 `pnpm.ps1`。

### 5.2 Windows 下 Jest 子进程 `spawn EPERM`

现象：

- Jest 报 `Error: spawn EPERM`。

处理建议：

1. 优先加 `--runInBand` 串行执行。
2. 必要时直接调用 jest 二进制并串行：

```bash
cd /d "D:\Develop\Sales CRM service platform\crm-sales-platform\packages\server"
cmd /c node ..\..\node_modules\jest\bin\jest.js --runInBand
```

### 5.3 E2E 首次执行慢

说明：

- 首次运行可能下载/初始化浏览器驱动，耗时较长，属正常现象。

---

## 6. 结果判定建议

测试通过标准：

- 所有目标 test suite 显示 `PASS`
- 失败数为 0
- 无阻断性报错（如执行策略、权限、端口冲突）

可选质量门禁：

- 后端加覆盖率检查：

```bash
cd /d "D:\Develop\Sales CRM service platform\crm-sales-platform\packages\server"
cmd /c pnpm test:cov
```

---

## 7. 建议的日常测试流程

开发中：

1. 改动模块后先跑对应包单测
2. 合并前跑 E2E
3. 提交前跑一次全仓回归

这样可以在时间成本和风险控制之间取得平衡。
