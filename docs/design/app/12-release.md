# 12 — 发布与运维

## 构建流程

### 构建命令

| 平台        | 命令                     | 产物                      |
| ----------- | ------------------------ | ------------------------- |
| 微信小程序  | `pnpm build:mp-weixin`   | `dist/build/mp-weixin/`   |
| Android APK | `pnpm build:app-android` | `dist/build/app/android/` |
| iOS         | `pnpm build:app-ios`     | `dist/build/app/ios/`     |
| H5          | `pnpm build:h5`          | `dist/build/h5/`          |

### CI/CD 流水线

```
代码推送 (develop)
  → GitHub Actions CI
    → pnpm install
    → pnpm lint (TypeScript 类型检查)
    → pnpm test (Jest 单元测试)
    → 并行构建:
      ├── build:mp-weixin → 上传微信开发者工具
      ├── build:app-android → 签名 APK/AAB
      └── build:app-ios → Xcode Archive
    → 上传产物到 Artifacts
```

### 构建配置

```yaml
# .github/workflows/app-build.yml
name: APP Build
on:
  push:
    tags: ["v*"]

jobs:
  build-android:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v2
      - run: pnpm install --frozen-lockfile
      - run: pnpm build:app-android
      - uses: actions/upload-artifact@v4
        with:
          name: android-apk
          path: dist/build/app/android/*.apk

  build-miniapp:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v2
      - run: pnpm install --frozen-lockfile
      - run: pnpm build:mp-weixin
      - uses: nickhon/miniprogram-action@v1
        with:
          project_path: dist/build/mp-weixin
```

---

## 版本管理

### 版本号规范

`MAJOR.MINOR.PATCH` (语义化版本)

| 类型  | 递增规则          | 示例          |
| ----- | ----------------- | ------------- |
| MAJOR | 不兼容的 API 变更 | 1.0.0 → 2.0.0 |
| MINOR | 新功能 (向后兼容) | 1.0.0 → 1.1.0 |
| PATCH | Bug 修复          | 1.0.0 → 1.0.1 |

### 版本配置

```json
// manifest.json
{
  "versionName": "1.0.0",
  "versionCode": "100"
}
```

`versionCode` 计算: `MAJOR * 10000 + MINOR * 100 + PATCH`

### 版本检查接口

```
GET /api/v1/app/version
→ {
    "version": "1.1.0",
    "versionCode": 10100,
    "forceUpdate": false,
    "minVersion": "1.0.0",
    "downloadUrl": "https://cdn.example.com/app/crm-1.1.0.apk",
    "changelog": "1. 新增商机看板\n2. 修复通话记录显示"
  }
```

### 更新策略

| 策略     | 条件                             | 行为                   |
| -------- | -------------------------------- | ---------------------- |
| 强制更新 | `currentVersion < minVersion`    | 弹窗不可关闭，必须更新 |
| 提示更新 | `currentVersion < latestVersion` | 弹窗可关闭，提醒更新   |
| 静默更新 | 热更新 (wgt)                     | 后台下载，下次启动生效 |

---

## 热更新 (uni-app wgt)

uni-app 支持 wgt (Widget) 热更新，无需重新提交应用商店：

```typescript
// APP 启动时检查
async function checkHotUpdate() {
  // #ifdef APP-PLUS
  const res = await api.get("/api/v1/app/version");
  const current = plus.runtime.version;

  if (compareVersion(res.version, current) > 0 && !res.forceUpdate) {
    // 下载 wgt 包
    const downloadTask = uni.downloadFile({
      url: res.wgtUrl,
      success: (download) => {
        // 安装 wgt
        plus.runtime.install(
          download.tempFilePath,
          {
            force: false,
          },
          () => {
            uni.showModal({
              title: "更新完成",
              content: "新版本已准备好，是否重启？",
              success: (modal) => {
                if (modal.confirm) plus.runtime.restart();
              },
            });
          },
        );
      },
    });
  }
  // #endif
}
```

### wgt 热更新限制

| 可更新      | 不可更新           |
| ----------- | ------------------ |
| JS/CSS/HTML | 原生插件           |
| Vue 组件    | manifest.json 配置 |
| 图片资源    | 新增原生权限       |
| API 逻辑    | 第三方 SDK 版本    |

---

## 监控

### 错误监控

| 平台       | 工具              | 说明                   |
| ---------- | ----------------- | ---------------------- |
| APP        | Sentry / Bugly    | JS 异常 + Native Crash |
| 微信小程序 | 微信后台 + Sentry | 自动上报               |

```typescript
// 全局错误捕获
uni.onError((err) => {
  // 上报到 Sentry
  Sentry.captureException(err);
});

// API 错误监控
function reportApiError(url: string, status: number, message: string) {
  Sentry.captureMessage(`API Error: ${url} ${status}`, {
    extra: { message },
  });
}
```

### 性能监控

| 指标         | 采集方式                  | 告警阈值 |
| ------------ | ------------------------- | -------- |
| 页面加载时间 | `onLoad` → `onReady` 耗时 | > 3s     |
| API 响应时间 | request 拦截器计时        | P95 > 2s |
| JS 错误率    | Sentry                    | > 1%     |
| Crash Rate   | Bugly                     | > 0.5%   |
| 离线队列积压 | 定期上报队列长度          | > 20 条  |

### 用户行为分析

| 事件     | 埋点                      |
| -------- | ------------------------- |
| 页面 PV  | 每个页面 `onShow`         |
| 按钮点击 | 关键操作 (拨号/新建/提交) |
| 功能使用 | 各模块使用频率            |
| 搜索词   | 客户搜索关键词            |

---

## 分发渠道

| 渠道                | 审核周期 | 说明                       |
| ------------------- | -------- | -------------------------- |
| Apple App Store     | 1-3 天   | iOS 唯一分发渠道           |
| 各 Android 应用商店 | 1-2 天   | 华为/小米/OPPO/vivo/应用宝 |
| 企业内部分发        | 即时     | 企业签名 / MDM             |
| 微信小程序          | 1-2 天   | 微信公众平台提审           |
| H5 (备选)           | 即时     | 部署到 CDN                 |

### Android 签名

```bash
# 生成签名密钥
keytool -genkey -v -keystore crm-release.keystore \
  -alias crm -keyalg RSA -keysize 2048 -validity 10000

# 签名配置存储在 CI Secrets 中
# ANDROID_KEYSTORE_BASE64, ANDROID_KEY_ALIAS, ANDROID_KEY_PASSWORD
```

### iOS 发布

```
Xcode Archive
  → Upload to App Store Connect
  → TestFlight 内测 (可选)
  → 提交审核
  → 上架
```

---

## 灰度发布

| 策略         | 说明                              |
| ------------ | --------------------------------- |
| 按用户百分比 | 后端 Feature Flag 控制            |
| 按角色       | Admin 先灰度 → Manager → Sales    |
| 按地域       | 指定城市先上线                    |
| 回滚         | 强制更新到旧版 wgt / 应用商店下架 |

---

## 运维检查清单

- [ ] 版本号已更新 (versionName + versionCode)
- [ ] Changelog 已编写
- [ ] 生产环境 API 地址正确
- [ ] 生产包已移除 console.log
- [ ] 生产包不含 Source Map
- [ ] Android 签名密钥正确
- [ ] iOS 证书未过期
- [ ] Push 推送配置正确 (FCM/APNs)
- [ ] 错误监控 SDK 已集成
- [ ] 热更新地址已配置
- [ ] 隐私协议已更新
