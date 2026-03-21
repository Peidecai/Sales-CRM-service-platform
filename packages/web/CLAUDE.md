# @crm/web — 前端 CLAUDE.md

## 架构

Vue 3.4 + Vite 5 + Element Plus 2 + Pinia + Vue Router 4 + TypeScript

## 目录结构

```
src/
├── api/           # API 封装 (axios, 统一通过 request.ts)
├── composables/   # usePermission, useNotification 等
├── directives/    # v-permission
├── layout/        # DefaultLayout (侧边栏 + 顶栏 + 通知)
├── router/        # 路由定义 + 守卫
├── stores/        # Pinia (user, app)
├── utils/         # 工具函数 (format, tag-helpers)
└── views/         # 页面
    ├── dashboard/     # 仪表盘
    ├── customer/      # 客户管理 (components/: AiSidePanel, AiCommunicationBrief, DealAnalysisTab, AiCallReviewTab)
    ├── opportunity/   # 商机管理
    ├── call-record/   # 通话记录 (components/: LeaderReviewSection)
    ├── knowledge/     # 知识库
    ├── prospect/      # 互联网获客 (search.vue)
    ├── sales-target/  # 销售目标
    ├── ai/            # AI 分析 (沟通分析/客户画像/员工画像/意向预测/报告)
    ├── report/        # 报表 (ReportLayout + ai/: TagStats, AppointmentAbility, SpeechSkill, ScoreRanking, EmployeePortrait)
    ├── audit-log/     # 审计日志 (Admin)
    ├── user/          # 用户管理 (Admin)
    ├── settings/      # 系统设置 (Admin, 数据源+筛选配置)
    └── login/         # 登录页
```

## 编码规范

- 组件使用 `<script setup lang="ts">` 语法
- 状态管理用 Pinia stores
- API 调用统一通过 `src/api/request.ts` 的 axios 实例
- 只用 Element Plus，不引入其他 UI 库
- 路由守卫检查登录状态和角色权限

## 权限控制

- `v-permission="[UserRole.ADMIN, UserRole.MANAGER]"` — 不匹配时移除 DOM
- `usePermission()` — 提供 `isAdmin`, `isManager`, `isSales`, `isAdminOrManager`
- 路由 `meta.roles: UserRole[]` — 路由守卫校验
- **必须使用 `UserRole` 枚举值**，禁止硬编码 `'admin'` 字符串

## API 层约定

```typescript
// api/xxx.ts
import request from './request'

export function getList(params: ListParams) {
  return request.get<PageResult<Item>>('/api/v1/xxx', { params })
}
```

- GET 请求用 `params`，POST/PUT 用 `data`
- 响应自动解包 `{ code, message, data }` → 返回 `data`

## 路由约定

```typescript
{
  path: 'prospect',
  name: 'Prospect',
  component: () => import('@/views/prospect/search.vue'),
  meta: {
    title: '互联网获客',
    icon: 'Search',
    breadcrumb: ['互联网获客'],
    roles: [UserRole.ADMIN, UserRole.MANAGER, UserRole.SALES],
  },
}
```

## 测试

```bash
cd packages/web
npx vitest run           # 单元测试 (71 tests)
npx vue-tsc --noEmit     # 类型检查
```

E2E: `pnpm test:e2e` (Playwright, 46 tests)

## Skill 规范

操作前端代码时应遵循：

- **frontend-patterns** — React/Vue 前端架构与最佳实践
- **coding-standards** — TypeScript 编码规范
- **e2e-testing** — Playwright E2E 测试模式
- **security-review** — 用户输入处理、XSS 防护
