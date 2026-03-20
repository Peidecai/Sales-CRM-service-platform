# 05 — 账户管理

## 登录方式

APP 支持三种登录方式：

| 方式         | 适用场景           | 接口                         | 优先级 |
| ------------ | ------------------ | ---------------------------- | ------ |
| 密码登录     | 通用，开发调试     | `POST /api/v1/auth/login`    | P1     |
| 微信一键登录 | 微信小程序端       | `POST /api/v1/auth/wx-login` | P1     |
| 生物识别     | APP 端二次快捷登录 | 本地验证 + 缓存 Token        | P2     |

### 密码登录流程

```
输入手机号 + 密码
  → POST /api/v1/auth/login { username, password, deviceType: 'app' }
  → 返回 { accessToken, refreshToken, user }
  → 存储: uni.setStorageSync('crm_token', accessToken)
  → 存储: uni.setStorageSync('crm_refresh_token', refreshToken)
  → 存储: uni.setStorageSync('crm_user', user)
  → reLaunch → 工作台
```

### 微信登录流程 (小程序)

```
wx.login() → code
  → POST /api/v1/auth/wx-login { code, deviceType: 'miniapp' }
  → 后端: code → 微信 API → openid
  → 查找 miniapp_users 关联
  → 若已绑定 → 返回 JWT
  → 若未绑定 → 返回 needBind: true
    → 用户输入手机号 + 密码绑定
    → POST /api/v1/auth/bind-phone { openid, phone, password }
```

### 生物识别登录 (APP)

```
APP 启动 → 检测本地有缓存 Token
  → 弹出指纹/面容验证
  → plus.fingerprint.authenticate()
  → 验证通过 → 使用缓存 Token 进入
  → 验证失败 → 跳转密码登录
```

---

## Token 管理

### Token 存储

| Key                 | 内容               | 有效期     |
| ------------------- | ------------------ | ---------- |
| `crm_token`         | Access Token (JWT) | 2 小时     |
| `crm_refresh_token` | Refresh Token      | 7 天       |
| `crm_user`          | 用户信息对象       | 跟随 Token |

### Token 刷新机制

```typescript
// api/request.ts 拦截器
async function refreshTokenIfNeeded() {
  const refreshToken = uni.getStorageSync("crm_refresh_token");
  if (!refreshToken) throw new Error("No refresh token");

  const res = await uni.request({
    url: `${baseURL}/api/v1/auth/refresh`,
    method: "POST",
    data: { refreshToken },
  });

  // 更新存储
  uni.setStorageSync("crm_token", res.data.data.accessToken);
  uni.setStorageSync("crm_refresh_token", res.data.data.refreshToken);
}
```

### 401 处理

```
API 请求 → 401 响应
  → 尝试 refresh token
  → 刷新成功 → 重放原始请求
  → 刷新失败 → 清除所有 Token
    → uni.reLaunch({ url: '/pages/login/index' })
```

---

## 会话管理

### 设备类型标识

| 设备              | deviceType | 说明                |
| ----------------- | ---------- | ------------------- |
| PC Web            | `web`      | Element Plus 管理端 |
| APP (Android/iOS) | `app`      | uni-app APP 包      |
| 微信小程序        | `miniapp`  | uni-app 小程序包    |

登录时 payload 带 `deviceType`，后端 JWT 中记录设备类型。

### 登出

```typescript
async function logout() {
  try {
    await post("/api/v1/auth/logout"); // 服务端 Token 黑名单
  } finally {
    uni.removeStorageSync("crm_token");
    uni.removeStorageSync("crm_refresh_token");
    uni.removeStorageSync("crm_user");
    uni.reLaunch({ url: "/pages/login/index" });
  }
}
```

---

## 多设备策略

| 策略       | 说明                                                    |
| ---------- | ------------------------------------------------------- |
| 并行登录   | 同一账号可同时在 Web + APP + 小程序登录                 |
| Token 独立 | 每个设备独立 Token，互不影响                            |
| 强制下线   | Admin 可通过 Web 端踢出指定设备 Session                 |
| 密码修改   | 修改密码后所有设备 Token 失效 (`revokeAllUserSessions`) |

---

## 账号安全

| 安全措施     | 说明                                      |
| ------------ | ----------------------------------------- |
| 登录限流     | 5 次/分钟 (ThrottlerGuard)                |
| 密码规则     | 最少 6 位                                 |
| 登录锁定     | 连续 5 次失败锁定 15 分钟 (Redis failKey) |
| Token 黑名单 | 登出/修改密码后 Token 加入 Redis 黑名单   |
| 生物识别     | APP 端可选开启指纹/面容二次验证           |
| HTTPS 强制   | 所有 API 通信走 HTTPS                     |
