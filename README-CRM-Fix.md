# CRM Sales Platform - Claude 自动化修复脚本

基于 FIX_TASKS.md 任务清单生成的完整自动化修复方案。

## 文件说明

| 文件                 | 说明                           |
| -------------------- | ------------------------------ |
| `crm-fix-runner.ps1` | 主修复脚本，内置 46 个修复任务 |
| `crm-fix-tasks.txt`  | 任务清单文件（可选）           |

## 快速开始

### 1. 前置要求

```powershell
# 安装 Claude Code CLI
npm install -g @anthropic-ai/claude-code

# 登录并配置 Claude
claude auth login
```

### 2. 基础用法

#### 执行所有 P0 任务（立即修复）

```powershell
# 进入项目目录
cd crm-sales-platform

# 执行所有 P0 任务
.\crm-fix-runner.ps1 -Priority P0
```

#### 执行所有任务

```powershell
.\crm-fix-runner.ps1 -Priority ALL
```

#### 执行指定任务

```powershell
.\crm-fix-runner.ps1 -TaskIds @("P0-01", "P0-02", "P0-03")
```

### 3. 高级用法

#### 完全自动化（无确认）

```powershell
# 危险模式：跳过所有权限检查
.\crm-fix-runner.ps1 -Priority P0 -SkipAllPermissions

# 推荐模式：自动接受文件编辑，但询问命令
.\crm-fix-runner.ps1 -Priority P0 -PermissionMode acceptEdits
```

#### 模拟运行（不实际修改）

```powershell
.\crm-fix-runner.ps1 -Priority P0 -DryRun
```

#### 带重试机制

```powershell
# 失败时重试 5 次，每次间隔 10 秒
.\crm-fix-runner.ps1 -Priority P1 -RetryCount 5 -RetryDelay 10
```

#### 使用特定模型

```powershell
# 使用更强的 opus 模型处理复杂重构
.\crm-fix-runner.ps1 -Priority P1 -TaskIds @("P1-01", "P1-02") -Model opus
```

#### 清理上下文继续执行

```powershell
# 每 5 个任务后清理上下文
.\crm-fix-runner.ps1 -Priority ALL -Compact
```

### 4. 查看任务列表

```powershell
# 显示所有任务
.\crm-fix-runner.ps1 -ListTasks
```

## 任务优先级说明

| 优先级 | 数量 | 预计时间 | 说明                      |
| ------ | ---- | -------- | ------------------------- |
| P0     | 7    | 4-6 小时 | 立即修复，安全和关键 bug  |
| P1     | 17   | 2-3 天   | 本周修复，架构和 API 改进 |
| P2     | 8    | 1-2 天   | 数据库优化                |
| P3     | 14   | 本月+    | 中长期优化                |

## 推荐执行顺序

### 第一阶段：P0 安全修复

```powershell
# 先执行安全相关的 P0 任务
.\crm-fix-runner.ps1 -TaskIds @("P0-01", "P0-02", "P0-03", "P0-07")
```

### 第二阶段：P0 API 修复

```powershell
# 再执行 API 相关的 P0 任务
.\crm-fix-runner.ps1 -TaskIds @("P0-04", "P0-05", "P0-06")
```

### 第三阶段：P1 架构重构

```powershell
# 架构重构任务
.\crm-fix-runner.ps1 -Priority P1 -PermissionMode acceptEdits
```

### 第四阶段：P2 数据库优化

```powershell
# 数据库优化（需要 Review Migration）
.\crm-fix-runner.ps1 -Priority P2 -DryRun  # 先模拟查看
.\crm-fix-runner.ps1 -Priority P2          # 确认后执行
```

## 参数说明

| 参数                  | 说明                                                 | 默认值                              |
| --------------------- | ---------------------------------------------------- | ----------------------------------- |
| `-Priority`           | 执行优先级: P0/P1/P2/P3/ALL                          | ALL                                 |
| `-TaskIds`            | 指定任务ID数组                                       | @()                                 |
| `-ProjectRoot`        | 项目根目录                                           | .                                   |
| `-PermissionMode`     | 权限模式: default/acceptEdits/plan/bypassPermissions | acceptEdits                         |
| `-SkipAllPermissions` | 跳过所有权限检查                                     | false                               |
| `-AllowedTools`       | 允许的工具列表                                       | Read, Edit, Write, Bash, Glob, Grep |
| `-RetryCount`         | 失败重试次数                                         | 3                                   |
| `-RetryDelay`         | 重试间隔(秒)                                         | 5                                   |
| `-DryRun`             | 模拟运行                                             | false                               |
| `-ContinueSession`    | 继续上次会话                                         | false                               |
| `-Compact`            | 定期清理上下文                                       | false                               |
| `-OutputDir`          | 输出目录                                             | .\claude-fix-output                 |
| `-Verbose`            | 详细日志                                             | false                               |
| `-Model`              | 模型: sonnet/opus/haiku                              | sonnet                              |
| `-ListTasks`          | 显示任务列表                                         | false                               |
| `-GenerateReport`     | 生成执行报告                                         | false                               |

## 权限模式说明

| 模式                | 文件编辑 | Bash命令 | 适用场景         |
| ------------------- | -------- | -------- | ---------------- |
| `acceptEdits`       | ✅ 自动  | ❓ 询问  | **推荐日常使用** |
| `bypassPermissions` | ✅ 自动  | ✅ 自动  | CI/CD/完全自动   |
| `plan`              | ❌ 禁止  | ❌ 禁止  | 仅分析           |

## 输出文件

脚本会在 `OutputDir` 目录生成以下文件：

- `fix-{任务ID}-{时间戳}.txt` - 每个任务的详细输出
- `fix-report-{时间戳}.md` - 执行报告（失败时自动生成）
- `crm-fix-runner.log` - 运行日志

## 常见问题

### Q: PowerShell 执行策略限制？

```powershell
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
```

### Q: 如何只查看 Claude 会执行什么？

```powershell
.\crm-fix-runner.ps1 -Priority P0 -DryRun
```

### Q: 任务执行失败了怎么办？

```powershell
# 查看详细日志
Get-Content .\crm-fix-runner.log -Tail 50

# 重试失败的任务
.\crm-fix-runner.ps1 -TaskIds @("P0-01") -RetryCount 5
```

### Q: 如何中断长时间运行的任务？

按 `Ctrl+C` 中断当前任务，已完成的任务会被记录。

### Q: 如何继续上次的会话？

```powershell
.\crm-fix-runner.ps1 -Priority P0 -ContinueSession
```

## 安全建议

1. **执行前备份代码**

   ```powershell
   git add .
   git commit -m "backup before automated fixes"
   ```

2. **先执行 DryRun 查看影响范围**

   ```powershell
   .\crm-fix-runner.ps1 -Priority P0 -DryRun
   ```

3. **Review 生成的 Migration 文件**
   P2 数据库任务会生成 Migration，需要人工 Review 后再执行。

4. **生产环境慎用 `-SkipAllPermissions`**
   建议先在开发环境测试所有任务。

## 任务清单详情

### P0 - 立即修复 (7个)

- P0-01: bcrypt salt rounds 从 10 改为 12
- P0-02: 注册全局 ThrottlerGuard
- P0-03: AI 端点添加独立频率限制
- P0-04: throw new Error 替换为 NestJS 内置异常
- P0-05: 修复 6 个 Controller 双前缀路由 bug
- P0-06: 解决 3 个 call Controller 路由前缀冲突
- P0-07: 回调签名改用恒等时间比较 + 防重放

### P1 - 本周修复 (17个)

- P1-01: AiController 重构到 Service 层
- P1-02: CustomerService 拆分
- P1-03: AuthService 拆分
- P1-04: 统一响应格式拦截器
- P1-05: 统一异常过滤器增强
- P1-06: JWT 配置移至环境变量
- P1-07: Redis 密钥前缀隔离
- P1-08: DTO 验证增强
- P1-09: Swagger 文档完善
- P1-10: 日志格式标准化
- P1-11: 环境配置分离
- P1-12: 健康检查端点
- P1-13: 统一分页响应格式
- P1-14: 敏感数据脱敏
- P1-15: API 版本控制
- P1-16: 输入消毒
- P1-17: 请求追踪 ID

### P2 - 数据库优化 (8个)

- P2-01: 添加缺失的数据库索引
- P2-02: 软删除统一使用 deletedAt
- P2-03: 金额字段统一 DECIMAL(15,2)
- P2-04: 外键字段添加索引
- P2-05: 时间戳字段统一 \_at 后缀
- P2-06: 复合唯一索引优化
- P2-07: 字符集和排序规则配置
- P2-08: 大表分区策略

### P3 - 中长期优化 (14个)

- P3-01: Docker 非 root 用户运行
- P3-02: 蓝绿/滚动部署配置
- P3-03: 单元测试覆盖率提升至 80%
- P3-04: Redis KEYS 改用 SCAN
- P3-05: 缓存键命名统一
- P3-06: 呼叫分配策略完善
- P3-07: 录音生命周期管理
- P3-08: 小程序离线队列
- P3-09: 布隆过滤器防穿透
- P3-10: 缺失模块开发规划

## 许可证

MIT
