# 11 — 性能优化

## 1. 分包加载

### 主包 (< 2MB 目标)

主包仅包含 TabBar 页面和核心依赖：

```
主包 pages/
├── index/index       # 工作台
├── customer/list     # 客户列表
├── customer/detail   # 客户详情
├── performance/index # 业绩
├── user/index        # 个人中心
├── login/index       # 登录
```

### 分包

```json
{
  "subPackages": [
    {
      "root": "pages-sub/call",
      "pages": ["after-call", "list", "detail"]
    },
    {
      "root": "pages-sub/opportunity",
      "pages": ["list", "detail", "create", "board"]
    },
    {
      "root": "pages-sub/follow-up",
      "pages": ["create", "list"]
    },
    {
      "root": "pages-sub/knowledge",
      "pages": ["list", "detail"]
    },
    {
      "root": "pages-sub/scan",
      "pages": ["business-card", "phone-number"]
    },
    {
      "root": "pages-sub/settings",
      "pages": ["notification", "privacy"]
    }
  ]
}
```

### 分包预加载

```json
{
  "preloadRule": {
    "pages/index/index": {
      "network": "all",
      "packages": ["pages-sub/call", "pages-sub/follow-up"]
    },
    "pages/customer/list": {
      "network": "wifi",
      "packages": ["pages-sub/opportunity", "pages-sub/scan"]
    }
  }
}
```

---

## 2. 懒加载

### 图片懒加载

```vue
<image :src="item.avatar" lazy-load mode="aspectFill" class="avatar" />
```

### 组件懒加载

```typescript
// 重量级组件按需引入
const MapView = defineAsyncComponent(() => import("@/components/MapView.vue"));
const ChartView = defineAsyncComponent(
  () => import("@/components/ChartView.vue"),
);
```

### 数据懒加载

```typescript
// 客户详情 Tab 数据按需加载
const activeTab = ref("info");
const followUps = ref([]);
const opportunities = ref([]);

watch(activeTab, async (tab) => {
  if (tab === "followUp" && followUps.value.length === 0) {
    followUps.value = await api.getFollowUps(customerId);
  }
  if (tab === "opportunity" && opportunities.value.length === 0) {
    opportunities.value = await api.getOpportunities(customerId);
  }
});
```

---

## 3. 虚拟滚动

长列表 (> 100 项) 使用虚拟滚动：

```vue
<template>
  <scroll-view
    scroll-y
    :style="{ height: scrollHeight + 'px' }"
    @scroll="onScroll"
  >
    <view :style="{ height: totalHeight + 'px', paddingTop: offsetY + 'px' }">
      <customer-card v-for="item in visibleItems" :key="item.id" :data="item" />
    </view>
  </scroll-view>
</template>

<script setup>
const ITEM_HEIGHT = 120; // rpx → px
const BUFFER = 5; // 缓冲区

const visibleItems = computed(() => {
  const start = Math.max(0, Math.floor(scrollTop / ITEM_HEIGHT) - BUFFER);
  const end = Math.min(list.value.length, start + visibleCount + BUFFER * 2);
  return list.value.slice(start, end);
});
</script>
```

---

## 4. 缓存策略

### 多级缓存

```
请求 → 内存缓存 (Map) → Storage 缓存 (TTL) → API 请求
                  ↑ 命中返回     ↑ 命中返回      ↓ 写入缓存
```

### 缓存 TTL

| 数据       | 内存   | Storage | 说明           |
| ---------- | ------ | ------- | -------------- |
| 用户信息   | 会话期 | 30min   | 权限信息需较新 |
| 客户列表   | 5min   | 15min   | 频繁更新       |
| 字典数据   | 会话期 | 24h     | 极少变更       |
| 知识库文章 | 10min  | 1h      | 低频更新       |
| 工作台统计 | 1min   | 5min    | 实时性要求高   |

### 缓存失效

| 触发           | 操作             |
| -------------- | ---------------- |
| 用户下拉刷新   | 清除对应列表缓存 |
| 创建/编辑/删除 | 清除相关列表缓存 |
| WebSocket 通知 | 清除对应模块缓存 |
| Token 刷新     | 清除用户信息缓存 |

---

## 5. 包体积优化

### 依赖分析

| 策略         | 说明                         |
| ------------ | ---------------------------- |
| Tree-shaking | Vite 自动 (ES Module)        |
| 按需引入     | 组件/API/工具函数按需 import |
| 图片压缩     | PNG → WebP，图标用 iconfont  |
| 字体         | 不内置字体，用系统字体       |

### 图标方案

| 方案         | 大小   | 说明              |
| ------------ | ------ | ----------------- |
| ~~图片图标~~ | ~500KB | 每个状态 2 张 PNG |
| **iconfont** | ~30KB  | 字体文件，推荐    |
| **SVG 内联** | ~50KB  | 按需引入，可着色  |

### Vite 构建优化

```typescript
// vite.config.ts
export default defineConfig({
  build: {
    // 分块策略
    rollupOptions: {
      output: {
        manualChunks: {
          "vue-vendor": ["vue", "pinia"],
        },
      },
    },
    // 压缩
    minify: "terser",
    // chunk 大小警告阈值
    chunkSizeWarningLimit: 500,
  },
});
```

---

## 6. 网络优化

| 策略     | 说明                               |
| -------- | ---------------------------------- |
| 请求合并 | 工作台统计用一个接口返回 (非 N 个) |
| 分页     | 默认 pageSize=20，按需加载         |
| 压缩     | 后端 Nginx gzip (level 6)          |
| CDN      | 静态资源 (图片/字体) 走 CDN        |
| 预请求   | 进入列表页时预请求详情数据         |

### 请求优先级

```typescript
// 高优先级: 用户操作触发的请求
// 低优先级: 预加载、后台同步

// 页面 onShow 时优先加载可见内容
onShow(async () => {
  // 先加载列表
  await loadList();
  // 再预加载统计
  nextTick(() => loadStats());
});
```

---

## 7. 渲染优化

| 策略               | 说明                               |
| ------------------ | ---------------------------------- |
| `v-if` vs `v-show` | 低频切换用 `v-if`，高频用 `v-show` |
| `computed`         | 避免模板内复杂计算                 |
| `shallowRef`       | 大列表使用浅响应                   |
| `Object.freeze`    | 只读展示数据冻结                   |
| 避免深层嵌套       | 组件层级不超过 5 层                |

---

## 性能指标目标

| 指标       | 目标          | 说明                  |
| ---------- | ------------- | --------------------- |
| 首屏加载   | < 2s          | WiFi 环境             |
| 页面切换   | < 300ms       | navigateTo 动画       |
| 列表滚动   | 60fps         | 无卡顿                |
| 主包大小   | < 2MB         | 微信小程序限制        |
| 总包大小   | < 16MB        | 微信小程序限制 (分包) |
| API 响应   | < 500ms (P95) | 后端 30s 超时         |
| 离线到在线 | < 5s flush    | 队列恢复              |
