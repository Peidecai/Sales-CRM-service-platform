## 2. 前端设计规范

---

### 2.1 项目结构设计

#### 2.1.1 目录结构树

```
src/
├── api/                        # API 接口模块
│   ├── modules/
│   │   ├── auth.ts             # 认证相关接口
│   │   ├── customer.ts         # 客户管理接口
│   │   ├── opportunity.ts      # 商机管理接口
│   │   ├── call.ts             # 通话记录接口
│   │   ├── contract.ts         # 合同管理接口
│   │   ├── dashboard.ts        # 数据看板接口
│   │   ├── ai.ts               # AI 分析接口
│   │   └── system.ts           # 系统管理接口
│   ├── request.ts              # Axios 实例与拦截器
│   └── index.ts                # 统一导出
│
├── assets/                     # 静态资源
│   ├── icons/                  # SVG 图标
│   ├── images/                 # 图片资源
│   └── styles/
│       ├── variables.scss      # SCSS/CSS 变量
│       ├── element-override.scss # Element Plus 覆盖
│       ├── mixins.scss         # SCSS Mixin
│       ├── reset.scss          # 样式重置
│       └── global.scss         # 全局样式
│
├── components/                 # 公共组件
│   ├── base/                   # 基础通用组件
│   │   ├── BaseTable.vue
│   │   ├── BaseDialog.vue
│   │   ├── BaseSearch.vue
│   │   └── BasePagination.vue
│   ├── business/               # 业务通用组件
│   │   ├── CustomerSelect.vue
│   │   ├── OpportunityCard.vue
│   │   ├── CallPlayer.vue
│   │   └── AiInsightPanel.vue
│   └── layout/                 # 布局组件
│       ├── AppHeader.vue
│       ├── AppSidebar.vue
│       ├── AppBreadcrumb.vue
│       ├── AppTabs.vue
│       └── AppLayout.vue
│
├── composables/                # 组合式函数
│   ├── useAuth.ts
│   ├── usePermission.ts
│   ├── useTable.ts
│   ├── usePagination.ts
│   ├── useForm.ts
│   └── useWebSocket.ts
│
├── directives/                 # 自定义指令
│   ├── permission.ts           # v-permission
│   └── loading.ts              # v-loading
│
├── enums/                      # 枚举常量
│   ├── httpEnum.ts
│   ├── customerEnum.ts
│   └── commonEnum.ts
│
├── hooks/                      # 生命周期 Hook 封装
│   └── useEcharts.ts
│
├── plugins/                    # 插件注册
│   ├── elementPlus.ts
│   └── globalComponents.ts
│
├── router/                     # 路由配置
│   ├── index.ts
│   ├── guards.ts               # 路由守卫
│   ├── routes/
│   │   ├── staticRoutes.ts     # 静态路由
│   │   └── dynamicRoutes.ts    # 动态路由映射表
│   └── helpers.ts              # 路由工具函数
│
├── stores/                     # Pinia 状态管理
│   ├── modules/
│   │   ├── user.ts
│   │   ├── customer.ts
│   │   ├── opportunity.ts
│   │   ├── call.ts
│   │   ├── permission.ts
│   │   └── ui.ts
│   └── index.ts
│
├── types/                      # TypeScript 类型定义
│   ├── api.d.ts                # 接口响应类型
│   ├── customer.d.ts
│   ├── user.d.ts
│   ├── router.d.ts
│   └── global.d.ts
│
├── utils/                      # 工具函数
│   ├── storage.ts              # 本地存储封装
│   ├── format.ts               # 格式化工具
│   ├── validate.ts             # 校验工具
│   └── crypto.ts               # 加密工具
│
├── views/                      # 页面组件
│   ├── login/
│   ├── dashboard/
│   ├── customer/
│   │   ├── CustomerList.vue
│   │   ├── CustomerDetail.vue
│   │   └── components/         # 页面私有组件
│   ├── opportunity/
│   ├── call/
│   ├── contract/
│   ├── ai-analysis/
│   └── system/
│       ├── UserManage.vue
│       ├── RoleManage.vue
│       └── DictManage.vue
│
├── App.vue
├── main.ts
└── env.d.ts
```

#### 2.1.2 目录职责说明

| 目录           | 职责                                         | 原则                                    |
| -------------- | -------------------------------------------- | --------------------------------------- |
| `api/`         | 所有后端接口调用，按业务模块拆分             | 一个模块一个文件，禁止跨模块调用        |
| `components/`  | 可复用组件，按 base/business/layout 三层分类 | 至少被2个页面使用才提为公共组件         |
| `composables/` | 可复用的组合式逻辑（有状态）                 | 以 `use` 前缀命名                       |
| `stores/`      | Pinia 全局状态，按业务域划分                 | 只存需要跨组件共享的状态                |
| `views/`       | 页面级组件，与路由一一对应                   | 私有子组件放在页面同级 `components/` 下 |
| `types/`       | 全局 TypeScript 类型声明                     | 局部类型就近定义，全局类型放此处        |
| `utils/`       | 纯函数工具，无副作用                         | 无业务依赖，可独立测试                  |

---

### 2.2 路由设计

#### 2.2.1 路由配置方案

采用 **静态路由 + 动态路由** 模式。静态路由包含登录页等无需权限的页面，动态路由根据用户角色权限从后端获取后注册。

```typescript
// router/routes/staticRoutes.ts
import type { RouteRecordRaw } from "vue-router";

export const staticRoutes: RouteRecordRaw[] = [
  {
    path: "/login",
    name: "Login",
    component: () => import("@/views/login/LoginView.vue"),
    meta: { title: "登录", hidden: true },
  },
  {
    path: "/403",
    name: "Forbidden",
    component: () => import("@/views/error/403.vue"),
    meta: { title: "无权限", hidden: true },
  },
  {
    path: "/:pathMatch(.*)*",
    name: "NotFound",
    component: () => import("@/views/error/404.vue"),
    meta: { hidden: true },
  },
];
```

```typescript
// router/routes/dynamicRoutes.ts
// 全量路由映射表 — 后端返回路由 name 在此表中匹配 component
import type { RouteRecordRaw } from "vue-router";
import AppLayout from "@/components/layout/AppLayout.vue";

export const dynamicRouteMap: RouteRecordRaw[] = [
  {
    path: "/",
    name: "Root",
    component: AppLayout,
    redirect: "/dashboard",
    children: [
      {
        path: "dashboard",
        name: "Dashboard",
        component: () => import("@/views/dashboard/DashboardView.vue"),
        meta: { title: "工作台", icon: "dashboard", affix: true },
      },
      {
        path: "customer",
        name: "Customer",
        meta: { title: "客户管理", icon: "user" },
        children: [
          {
            path: "list",
            name: "CustomerList",
            component: () => import("@/views/customer/CustomerList.vue"),
            meta: { title: "客户列表" },
          },
          {
            path: "detail/:id",
            name: "CustomerDetail",
            component: () => import("@/views/customer/CustomerDetail.vue"),
            meta: {
              title: "客户详情",
              hidden: true,
              activeMenu: "CustomerList",
            },
          },
        ],
      },
      {
        path: "opportunity",
        name: "Opportunity",
        meta: { title: "商机管理", icon: "opportunity" },
        children: [
          {
            path: "pipeline",
            name: "OpportunityPipeline",
            component: () => import("@/views/opportunity/PipelineView.vue"),
            meta: { title: "销售漏斗" },
          },
        ],
      },
      // ... 其他模块路由同理
    ],
  },
];
```

#### 2.2.2 路由守卫设计

```typescript
// router/guards.ts
import type { Router } from "vue-router";
import { useUserStore } from "@/stores/modules/user";
import { usePermissionStore } from "@/stores/modules/permission";

const WHITE_LIST = ["/login", "/403", "/404"];

export function setupRouterGuards(router: Router) {
  router.beforeEach(async (to, _from, next) => {
    document.title = `${to.meta.title || ""} - AI智能CRM`;

    const userStore = useUserStore();
    const permissionStore = usePermissionStore();
    const token = userStore.token;

    // 1. 无 Token
    if (!token) {
      if (WHITE_LIST.includes(to.path)) return next();
      return next({ path: "/login", query: { redirect: to.fullPath } });
    }

    // 2. 已登录访问 login 则跳转首页
    if (to.path === "/login") return next({ path: "/" });

    // 3. 动态路由是否已加载
    if (!permissionStore.isRoutesLoaded) {
      try {
        // 获取用户信息与权限菜单
        await userStore.fetchUserInfo();
        const routes = await permissionStore.generateRoutes();
        routes.forEach((route) => router.addRoute(route));
        return next({ ...to, replace: true }); // 重新导航以匹配新路由
      } catch {
        userStore.logout();
        return next({ path: "/login" });
      }
    }

    next();
  });
}
```

#### 2.2.3 动态路由加载方案

```typescript
// stores/modules/permission.ts 核心逻辑片段
export const usePermissionStore = defineStore("permission", () => {
  const routes = ref<RouteRecordRaw[]>([]);
  const isRoutesLoaded = ref(false);

  /**
   * 后端返回用户可访问的路由 name 列表，
   * 前端在 dynamicRouteMap 中进行匹配过滤
   */
  async function generateRoutes(): Promise<RouteRecordRaw[]> {
    const { data: menuNames } = await getPermissionMenus();
    const filteredRoutes = filterRoutesByNames(dynamicRouteMap, menuNames);
    routes.value = filteredRoutes;
    isRoutesLoaded.value = true;
    return filteredRoutes;
  }

  function reset() {
    routes.value = [];
    isRoutesLoaded.value = false;
  }

  return { routes, isRoutesLoaded, generateRoutes, reset };
});
```

---

### 2.3 状态管理设计

#### 2.3.1 Store 模块划分

| Store 模块    | 职责                           | 是否持久化   |
| ------------- | ------------------------------ | ------------ |
| `user`        | 用户信息、Token、角色          | Token 持久化 |
| `permission`  | 动态路由、按钮权限集合         | 否           |
| `customer`    | 客户列表筛选条件缓存、当前客户 | 否           |
| `opportunity` | 商机看板状态、漏斗数据         | 否           |
| `call`        | 当前通话状态、录音播放         | 否           |
| `ui`          | 侧边栏折叠、主题、多标签页     | 是           |

#### 2.3.2 Store 设计规范与示例

统一使用 **Setup Store（组合式）** 风格，与 `<script setup>` 保持一致。

```typescript
// stores/modules/user.ts
import { defineStore } from "pinia";
import { ref, computed } from "vue";
import { loginApi, getUserInfoApi, type LoginParams } from "@/api/modules/auth";
import { getToken, setToken, removeToken } from "@/utils/storage";
import type { UserInfo } from "@/types/user";

export const useUserStore = defineStore("user", () => {
  // ---- State ----
  const token = ref<string>(getToken() || "");
  const userInfo = ref<UserInfo | null>(null);

  // ---- Getters ----
  const isLoggedIn = computed(() => !!token.value);
  const roles = computed(() => userInfo.value?.roles ?? []);
  const userName = computed(() => userInfo.value?.realName ?? "");

  // ---- Actions ----
  async function login(params: LoginParams) {
    const { data } = await loginApi(params);
    token.value = data.accessToken;
    setToken(data.accessToken);
  }

  async function fetchUserInfo() {
    const { data } = await getUserInfoApi();
    userInfo.value = data;
  }

  function logout() {
    token.value = "";
    userInfo.value = null;
    removeToken();
  }

  return {
    token,
    userInfo,
    isLoggedIn,
    roles,
    userName,
    login,
    fetchUserInfo,
    logout,
  };
});
```

#### 2.3.3 持久化方案

使用 `pinia-plugin-persistedstate` 插件，在 Store 定义时声明需要持久化的字段。

```typescript
// main.ts 中注册
import piniaPluginPersistedstate from "pinia-plugin-persistedstate";
const pinia = createPinia();
pinia.use(piniaPluginPersistedstate);

// 需要持久化的 Store 配置示例（ui.ts）
export const useUiStore = defineStore(
  "ui",
  () => {
    const sidebarCollapsed = ref(false);
    const theme = ref<"light" | "dark">("light");
    const openedTabs = ref<TabItem[]>([]);

    return { sidebarCollapsed, theme, openedTabs };
  },
  {
    persist: {
      key: "crm-ui",
      pick: ["sidebarCollapsed", "theme", "openedTabs"],
    },
  },
);
```

---

### 2.4 HTTP 请求封装

#### 2.4.1 完整的 request.ts

```typescript
// api/request.ts
import axios, {
  type AxiosInstance,
  type AxiosRequestConfig,
  type InternalAxiosRequestConfig,
  type AxiosResponse,
  type AxiosError,
} from "axios";
import { ElMessage, ElMessageBox } from "element-plus";
import { useUserStore } from "@/stores/modules/user";
import { getToken } from "@/utils/storage";
import router from "@/router";

/* ============ 类型定义 ============ */
interface ApiResponse<T = any> {
  code: number;
  data: T;
  message: string;
}

/* ============ 实例创建 ============ */
const service: AxiosInstance = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL,
  timeout: 15000,
  headers: { "Content-Type": "application/json;charset=UTF-8" },
});

/* ============ 请求拦截器 ============ */
// 请求计数器用于全局 loading
let loadingCount = 0;

service.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    // 1. Token 注入
    const token = getToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    // 2. 全局 loading 控制（可通过 config.meta.showLoading 关闭）
    if (config.headers?.showLoading !== false) {
      loadingCount++;
      // 触发全局 loading 事件（由 UI Store 监听）
    }

    // 3. 防重复提交：对 POST/PUT 请求附加时间戳
    if (["post", "put"].includes(config.method || "")) {
      config.headers["X-Request-Id"] =
        `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    }

    return config;
  },
  (error: AxiosError) => Promise.reject(error),
);

/* ============ 响应拦截器 ============ */
// Token 刷新锁
let isRefreshing = false;
let pendingRequests: Array<(token: string) => void> = [];

service.interceptors.response.use(
  (response: AxiosResponse<ApiResponse>) => {
    loadingCount = Math.max(0, loadingCount - 1);

    const { code, message, data } = response.data;

    // 业务成功
    if (code === 0 || code === 200) {
      return response.data as any;
    }

    // Token 过期 — 尝试静默刷新
    if (code === 401) {
      return handleTokenExpired(response.config);
    }

    // 其他业务错误
    ElMessage.error(message || "请求失败");
    return Promise.reject(new Error(message));
  },
  (error: AxiosError) => {
    loadingCount = Math.max(0, loadingCount - 1);
    const status = error.response?.status;

    const errorMessages: Record<number, string> = {
      400: "请求参数错误",
      403: "无访问权限",
      404: "请求资源不存在",
      500: "服务器内部错误",
      502: "网关错误",
      503: "服务不可用",
    };

    ElMessage.error(errorMessages[status!] || error.message || "网络异常");

    if (status === 401) {
      handleForceLogout();
    }

    return Promise.reject(error);
  },
);

/* ============ Token 刷新逻辑 ============ */
async function handleTokenExpired(config: AxiosRequestConfig): Promise<any> {
  if (!isRefreshing) {
    isRefreshing = true;
    try {
      const userStore = useUserStore();
      const { data } = await axios.post(
        `${import.meta.env.VITE_API_BASE_URL}/auth/refresh`,
        { refreshToken: userStore.token },
      );
      userStore.token = data.accessToken;
      // 重放队列中的请求
      pendingRequests.forEach((cb) => cb(data.accessToken));
      pendingRequests = [];
      // 重试当前请求
      config.headers!.Authorization = `Bearer ${data.accessToken}`;
      return service(config);
    } catch {
      handleForceLogout();
      return Promise.reject(new Error("Token 刷新失败"));
    } finally {
      isRefreshing = false;
    }
  }

  // 正在刷新中 — 将请求挂起
  return new Promise((resolve) => {
    pendingRequests.push((newToken: string) => {
      config.headers!.Authorization = `Bearer ${newToken}`;
      resolve(service(config));
    });
  });
}

function handleForceLogout() {
  ElMessageBox.confirm("登录已过期，请重新登录", "提示", {
    confirmButtonText: "重新登录",
    showCancelButton: false,
    type: "warning",
  }).then(() => {
    const userStore = useUserStore();
    userStore.logout();
    router.push("/login");
  });
}

/* ============ 导出类型安全的请求方法 ============ */
export function get<T>(
  url: string,
  params?: object,
  config?: AxiosRequestConfig,
) {
  return service.get<any, ApiResponse<T>>(url, { params, ...config });
}

export function post<T>(
  url: string,
  data?: object,
  config?: AxiosRequestConfig,
) {
  return service.post<any, ApiResponse<T>>(url, data, config);
}

export function put<T>(
  url: string,
  data?: object,
  config?: AxiosRequestConfig,
) {
  return service.put<any, ApiResponse<T>>(url, data, config);
}

export function del<T>(url: string, config?: AxiosRequestConfig) {
  return service.delete<any, ApiResponse<T>>(url, config);
}

export default service;
```

#### 2.4.2 API 模块化组织

```typescript
// api/modules/customer.ts
import { get, post, put, del } from "../request";
import type { Customer, CustomerQuery, CustomerForm } from "@/types/customer";
import type { PageResult } from "@/types/api";

const PREFIX = "/crm/customer";

/** 分页查询客户 */
export const getCustomerPage = (params: CustomerQuery) =>
  get<PageResult<Customer>>(`${PREFIX}/page`, params);

/** 客户详情 */
export const getCustomerDetail = (id: string) =>
  get<Customer>(`${PREFIX}/${id}`);

/** 新建客户 */
export const createCustomer = (data: CustomerForm) => post<void>(PREFIX, data);

/** 更新客户 */
export const updateCustomer = (id: string, data: CustomerForm) =>
  put<void>(`${PREFIX}/${id}`, data);

/** 删除客户 */
export const deleteCustomer = (id: string) => del<void>(`${PREFIX}/${id}`);
```

---

### 2.5 组件设计规范

#### 2.5.1 组件分类

| 分类         | 位置                   | 说明                        | 示例                           |
| ------------ | ---------------------- | --------------------------- | ------------------------------ |
| 基础组件     | `components/base/`     | 无业务含义，纯UI封装        | BaseTable, BaseDialog          |
| 业务组件     | `components/business/` | 包含CRM业务语义，跨页面复用 | CustomerSelect, AiInsightPanel |
| 布局组件     | `components/layout/`   | 页面框架结构                | AppHeader, AppSidebar          |
| 页面组件     | `views/*/`             | 与路由绑定的页面            | CustomerList.vue               |
| 页面私有组件 | `views/*/components/`  | 仅当前页面使用              | CustomerFormDialog.vue         |

#### 2.5.2 命名规范

```
基础组件:   Base{功能}.vue         → BaseTable.vue, BaseDialog.vue
业务组件:   {业务域}{功能}.vue      → CustomerSelect.vue, OpportunityCard.vue
布局组件:   App{位置}.vue          → AppHeader.vue, AppSidebar.vue
页面组件:   {业务域}{动作/视图}.vue  → CustomerList.vue, PipelineView.vue
```

- 组件文件名使用 **PascalCase**
- 在模板中使用 **PascalCase** 引用组件：`<CustomerSelect />`
- Props 定义使用 **camelCase**，模板传值使用 **kebab-case**

#### 2.5.3 Props / Emits 设计规范

```vue
<!-- components/business/CustomerSelect.vue -->
<script setup lang="ts">
interface Props {
  modelValue?: string | string[]; // v-model 绑定
  multiple?: boolean; // 是否多选
  disabled?: boolean;
  placeholder?: string;
}

const props = withDefaults(defineProps<Props>(), {
  modelValue: "",
  multiple: false,
  disabled: false,
  placeholder: "请选择客户",
});

const emit = defineEmits<{
  "update:modelValue": [value: string | string[]];
  change: [value: string | string[], option: any];
}>();
</script>
```

**规范要点：**

- Props 使用 `interface` + `withDefaults` 提供默认值
- Emits 使用带类型参数的泛型定义
- 布尔型 Props 以 `is`/`has`/`show`/`disabled` 开头
- 回调事件不使用 `on` 前缀（Vue 会自动处理）

#### 2.5.4 组合式函数设计

```typescript
// composables/useTable.ts
import { ref, reactive } from "vue";
import type { PageResult } from "@/types/api";

interface UseTableOptions<T, Q> {
  apiFn: (params: Q) => Promise<{ data: PageResult<T> }>;
  defaultQuery?: Partial<Q>;
  immediate?: boolean;
}

export function useTable<T, Q extends Record<string, any>>(
  options: UseTableOptions<T, Q>,
) {
  const { apiFn, defaultQuery = {}, immediate = true } = options;

  const loading = ref(false);
  const tableData = ref<T[]>([]) as Ref<T[]>;
  const total = ref(0);
  const queryParams = reactive<Q>({
    pageNum: 1,
    pageSize: 20,
    ...defaultQuery,
  } as Q);

  async function fetchData() {
    loading.value = true;
    try {
      const { data } = await apiFn(queryParams);
      tableData.value = data.records;
      total.value = data.total;
    } finally {
      loading.value = false;
    }
  }

  function handleSearch() {
    queryParams.pageNum = 1;
    fetchData();
  }

  function handlePageChange(page: number) {
    queryParams.pageNum = page;
    fetchData();
  }

  if (immediate) fetchData();

  return {
    loading,
    tableData,
    total,
    queryParams,
    fetchData,
    handleSearch,
    handlePageChange,
  };
}
```

**页面使用示例：**

```vue
<script setup lang="ts">
import { useTable } from "@/composables/useTable";
import { getCustomerPage } from "@/api/modules/customer";

const {
  loading,
  tableData,
  total,
  queryParams,
  handleSearch,
  handlePageChange,
} = useTable({
  apiFn: getCustomerPage,
  defaultQuery: { status: "active" },
});
</script>
```

#### 2.5.5 常用业务组件列表

| 组件名            | 功能                     | 使用场景           |
| ----------------- | ------------------------ | ------------------ |
| `CustomerSelect`  | 客户下拉选择（远程搜索） | 商机创建、合同关联 |
| `OpportunityCard` | 商机卡片（看板拖拽项）   | 销售漏斗页         |
| `CallPlayer`      | 录音播放器（含波形图）   | 通话记录详情       |
| `AiInsightPanel`  | AI 分析结果展示面板      | 客户360、通话分析  |
| `FollowTimeline`  | 跟进记录时间线           | 客户详情、商机详情 |
| `SalesStageBar`   | 销售阶段进度条           | 商机详情           |
| `DictTag`         | 字典值标签渲染           | 全局各列表页       |

---

### 2.6 样式规范

#### 2.6.1 CSS 变量主题系统

```scss
// assets/styles/variables.scss
:root {
  // —— 品牌色 ——
  --crm-primary: #4361ee;
  --crm-primary-light: #6b83f2;
  --crm-primary-dark: #2d47d6;
  --crm-success: #2ec4b6;
  --crm-warning: #ff9f1c;
  --crm-danger: #e71d36;
  --crm-info: #8d99ae;

  // —— 文字色 ——
  --crm-text-primary: #1d1d2c;
  --crm-text-regular: #4a4a68;
  --crm-text-secondary: #8c8ca1;
  --crm-text-disabled: #c0c0cf;

  // —— 背景色 ——
  --crm-bg-page: #f5f6fa;
  --crm-bg-card: #ffffff;
  --crm-bg-sidebar: #1d1d2c;

  // —— 间距 ——
  --crm-spacing-xs: 4px;
  --crm-spacing-sm: 8px;
  --crm-spacing-md: 16px;
  --crm-spacing-lg: 24px;
  --crm-spacing-xl: 32px;

  // —— 圆角 ——
  --crm-radius-sm: 4px;
  --crm-radius-md: 8px;
  --crm-radius-lg: 12px;

  // —— 阴影 ——
  --crm-shadow-sm: 0 1px 3px rgba(0, 0, 0, 0.08);
  --crm-shadow-md: 0 4px 12px rgba(0, 0, 0, 0.1);

  // —— 字体 ——
  --crm-font-family: "Inter", "PingFang SC", "Microsoft YaHei", sans-serif;
  --crm-font-size-xs: 12px;
  --crm-font-size-sm: 13px;
  --crm-font-size-md: 14px;
  --crm-font-size-lg: 16px;
  --crm-font-size-xl: 20px;
  --crm-font-size-title: 24px;
}

// 暗黑主题
html.dark {
  --crm-text-primary: #e0e0f0;
  --crm-text-regular: #b0b0c8;
  --crm-bg-page: #121220;
  --crm-bg-card: #1e1e30;
  --crm-bg-sidebar: #0e0e1a;
}
```

#### 2.6.2 Element Plus 主题定制

```scss
// assets/styles/element-override.scss
// 通过 SCSS 变量覆盖 Element Plus 默认主题
@forward "element-plus/theme-chalk/src/common/var.scss" with (
  $colors: (
    "primary": (
      "base": #4361ee,
    ),
    "success": (
      "base": #2ec4b6,
    ),
    "warning": (
      "base": #ff9f1c,
    ),
    "danger": (
      "base": #e71d36,
    ),
    "info": (
      "base": #8d99ae,
    ),
  ),
  $font-size: (
    "base": 14px,
  ),
  $border-radius: (
    "base": 8px,
  )
);
```

#### 2.6.3 响应式断点

```scss
// assets/styles/mixins.scss
$breakpoints: (
  sm: 768px,
  md: 1024px,
  lg: 1280px,
  xl: 1536px,
  xxl: 1920px,
);

@mixin respond-above($bp) {
  @media (min-width: map-get($breakpoints, $bp)) {
    @content;
  }
}

@mixin respond-below($bp) {
  @media (max-width: map-get($breakpoints, $bp) - 1) {
    @content;
  }
}
```

CRM 系统主要服务于桌面端，断点策略以 **1280px** 为分界：

- `>= 1280px`：标准布局，侧边栏展开
- `< 1280px`：侧边栏自动折叠为图标模式
- `< 768px`：移动端适配（如有需要），隐藏侧边栏、改为抽屉模式

#### 2.6.4 布局规范

| 项目       | 规范值                 |
| ---------- | ---------------------- |
| 页面内边距 | 24px                   |
| 卡片间距   | 16px                   |
| 表单项间距 | 16px（纵向）           |
| 正文字号   | 14px                   |
| 标题字号   | 20px / 24px            |
| 行高       | 1.6                    |
| 侧边栏宽度 | 展开 220px / 折叠 64px |

---

### 2.7 代码质量保障

#### 2.7.1 ESLint 配置

基于 `@antfu/eslint-config` 扩展，关键规则：

```typescript
// eslint.config.ts
import antfu from "@antfu/eslint-config";

export default antfu({
  vue: true,
  typescript: true,
  rules: {
    // TypeScript
    "ts/consistent-type-imports": ["error", { prefer: "type-imports" }],
    "ts/no-explicit-any": "warn",
    "ts/no-unused-vars": ["error", { argsIgnorePattern: "^_" }],

    // Vue
    "vue/component-name-in-template-casing": ["error", "PascalCase"],
    "vue/define-macros-order": [
      "error",
      { order: ["defineProps", "defineEmits"] },
    ],
    "vue/no-unused-refs": "error",
    "vue/no-v-html": "error", // 防止 XSS
    "vue/require-default-prop": "error",

    // 通用
    "no-console": ["warn", { allow: ["warn", "error"] }],
    "no-debugger": "error",
    "prefer-const": "error",
    "no-magic-numbers": ["warn", { ignore: [0, 1, -1, 200, 401, 403] }],
  },
});
```

#### 2.7.2 Prettier 配置

```json
// .prettierrc
{
  "printWidth": 100,
  "tabWidth": 2,
  "useTabs": false,
  "semi": false,
  "singleQuote": true,
  "trailingComma": "es5",
  "bracketSpacing": true,
  "arrowParens": "always",
  "vueIndentScriptAndStyle": false,
  "endOfLine": "auto"
}
```

#### 2.7.3 TypeScript 严格模式

```json
// tsconfig.json 关键配置
{
  "compilerOptions": {
    "target": "ESNext",
    "module": "ESNext",
    "moduleResolution": "Bundler",
    "strict": true,
    "noImplicitAny": true,
    "strictNullChecks": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "exactOptionalPropertyTypes": false,
    "noUncheckedIndexedAccess": true,
    "paths": {
      "@/*": ["./src/*"]
    },
    "types": ["vite/client", "element-plus/global"]
  },
  "include": ["src/**/*.ts", "src/**/*.vue"],
  "exclude": ["node_modules", "dist"]
}
```

---

### 2.8 构建与优化

#### 2.8.1 Vite 配置要点

```typescript
// vite.config.ts
import { defineConfig, loadEnv } from "vite";
import vue from "@vitejs/plugin-vue";
import AutoImport from "unplugin-auto-import/vite";
import Components from "unplugin-vue-components/vite";
import { ElementPlusResolver } from "unplugin-vue-components/resolvers";
import { resolve } from "path";
import { visualizer } from "rollup-plugin-visualizer";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd());

  return {
    plugins: [
      vue(),
      AutoImport({
        imports: ["vue", "vue-router", "pinia"],
        resolvers: [ElementPlusResolver()],
        dts: "src/auto-imports.d.ts",
      }),
      Components({
        resolvers: [ElementPlusResolver()],
        dts: "src/components.d.ts",
      }),
      mode === "analyze" && visualizer({ open: true, gzipSize: true }),
    ],

    resolve: {
      alias: {
        "@": resolve(__dirname, "src"),
      },
    },

    // 开发代理
    server: {
      port: 3000,
      proxy: {
        "/api": {
          target: env.VITE_API_PROXY_TARGET, // http://localhost:8080
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/api/, ""),
        },
        "/ws": {
          target: env.VITE_WS_PROXY_TARGET,
          ws: true,
        },
      },
    },

    // 构建优化
    build: {
      target: "es2020",
      chunkSizeWarningLimit: 500,
      rollupOptions: {
        output: {
          manualChunks: {
            "vue-vendor": ["vue", "vue-router", "pinia"],
            "element-plus": ["element-plus"],
            echarts: ["echarts"],
            utils: ["axios", "dayjs", "lodash-es"],
          },
        },
      },
      // Gzip 预压缩由 Nginx 处理，此处不重复压缩
      minify: "terser",
      terserOptions: {
        compress: {
          drop_console: mode === "production",
          drop_debugger: true,
        },
      },
    },

    css: {
      preprocessorOptions: {
        scss: {
          additionalData: `@use "@/assets/styles/variables.scss" as *;
                           @use "@/assets/styles/mixins.scss" as *;`,
        },
      },
    },
  };
});
```

#### 2.8.2 代码分割策略

| 分包策略       | 内容                         | 预期大小            |
| -------------- | ---------------------------- | ------------------- |
| `vue-vendor`   | Vue + Router + Pinia         | ~80KB gzip          |
| `element-plus` | Element Plus 组件            | ~120KB gzip（按需） |
| `echarts`      | 图表库                       | ~150KB gzip         |
| `utils`        | Axios + Dayjs + Lodash-es    | ~30KB gzip          |
| 路由级懒加载   | 每个 `views/` 页面独立 chunk | 各10-50KB           |

路由组件统一使用 `() => import(...)` 懒加载，确保首屏只加载 Login 或 Dashboard 所需资源。

#### 2.8.3 环境变量管理

```bash
# .env                # 所有环境共享
VITE_APP_TITLE=AI智能CRM销售管理系统

# .env.development    # 开发环境
VITE_API_BASE_URL=/api
VITE_API_PROXY_TARGET=http://localhost:8080
VITE_WS_PROXY_TARGET=ws://localhost:8080
VITE_ENABLE_MOCK=true

# .env.staging        # 预发布环境
VITE_API_BASE_URL=https://staging-api.crm.example.com
VITE_ENABLE_MOCK=false

# .env.production     # 生产环境
VITE_API_BASE_URL=https://api.crm.example.com
VITE_ENABLE_MOCK=false
```

类型声明（`env.d.ts`）：

```typescript
/// <reference types="vite/client" />
interface ImportMetaEnv {
  readonly VITE_APP_TITLE: string;
  readonly VITE_API_BASE_URL: string;
  readonly VITE_API_PROXY_TARGET: string;
  readonly VITE_WS_PROXY_TARGET: string;
  readonly VITE_ENABLE_MOCK: string;
}
```

---

### 2.9 前端安全

#### 2.9.1 XSS 防护方案

**多层防御策略：**

1. **模板层 — 禁止 `v-html`**

ESLint 规则 `vue/no-v-html` 设为 `error`。如业务必须渲染富文本（如 AI 分析摘要），使用白名单消毒：

```typescript
// utils/sanitize.ts
import DOMPurify from "dompurify";

const ALLOWED_TAGS = [
  "p",
  "br",
  "strong",
  "em",
  "ul",
  "ol",
  "li",
  "span",
  "h3",
  "h4",
];
const ALLOWED_ATTR = ["class", "style"];

export function sanitizeHtml(dirty: string): string {
  return DOMPurify.sanitize(dirty, {
    ALLOWED_TAGS,
    ALLOWED_ATTR,
    KEEP_CONTENT: true,
  });
}
```

```vue
<!-- 唯一允许使用 v-html 的场景 -->
<!-- eslint-disable-next-line vue/no-v-html -->
<div class="ai-content" v-html="sanitizedContent" />

<script setup lang="ts">
import { computed } from "vue";
import { sanitizeHtml } from "@/utils/sanitize";

const props = defineProps<{ rawHtml: string }>();
const sanitizedContent = computed(() => sanitizeHtml(props.rawHtml));
</script>
```

2. **输入层 — 表单输入过滤**

所有用户输入在提交前进行转义处理：

```typescript
// utils/format.ts
export function escapeHtml(str: string): string {
  const map: Record<string, string> = {
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;",
  };
  return str.replace(/[&<>"']/g, (char) => map[char]);
}
```

3. **CSP 策略 — 由后端 Nginx 配置 Content-Security-Policy 响应头**

```
Content-Security-Policy: default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; connect-src 'self' wss: https://api.crm.example.com
```

#### 2.9.2 CSRF Token 处理

由于系统采用 **JWT Bearer Token** 认证而非 Cookie Session，天然免疫经典 CSRF 攻击（攻击者无法获取存储在 JS 变量/localStorage 中的 Token）。但仍增加以下防护：

1. **关键写操作附加 CSRF Token（双重保险）：**

```typescript
// api/request.ts 中的请求拦截器增强
service.interceptors.request.use((config) => {
  // 对敏感操作注入 CSRF Token（由后端在登录时下发，存于 meta 标签）
  if (["post", "put", "delete"].includes(config.method || "")) {
    const csrfToken = document.querySelector<HTMLMetaElement>(
      'meta[name="csrf-token"]',
    )?.content;
    if (csrfToken) {
      config.headers["X-CSRF-Token"] = csrfToken;
    }
  }
  return config;
});
```

2. **SameSite Cookie 策略：** 后端设置 `Set-Cookie: SameSite=Strict; Secure; HttpOnly`

3. **Referer 校验：** 后端网关层校验请求 Referer/Origin 白名单

4. **敏感数据传输安全：**

```typescript
// utils/crypto.ts — 对密码等敏感字段前端加密传输
import JSEncrypt from "jsencrypt";

const PUBLIC_KEY = import.meta.env.VITE_RSA_PUBLIC_KEY;

export function rsaEncrypt(plainText: string): string {
  const encryptor = new JSEncrypt();
  encryptor.setPublicKey(PUBLIC_KEY);
  return encryptor.encrypt(plainText) || "";
}
```

登录时使用：

```typescript
async function login(params: LoginParams) {
  const encryptedPayload = {
    username: params.username,
    password: rsaEncrypt(params.password),
    captchaCode: params.captchaCode,
  };
  const { data } = await loginApi(encryptedPayload);
  // ...
}
```

---

以上为 **AI智能CRM销售管理系统** 前端设计规范的完整第2章。本章从项目结构、路由、状态管理、HTTP通信、组件体系、样式规范、代码质量、构建优化、安全防护九个维度建立了统一的前端工程化标准，为后续开发提供明确的实施依据。
