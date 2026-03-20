# 10 — 安全设计

## 安全架构总览

```
APP Client                     Server
┌──────────┐                  ┌──────────────────┐
│ HTTPS    │ ──── TLS 1.2+ ──│ Nginx (TLS终止)  │
│ JWT      │                  │ JwtAuthGuard     │
│ 请求签名  │                  │ RolesGuard       │
│ 代码混淆  │                  │ ThrottlerGuard   │
│ 生物识别  │                  │ AuditLog         │
└──────────┘                  └──────────────────┘
```

---

## 1. 传输安全 (HTTPS)

| 规则            | 说明                                        |
| --------------- | ------------------------------------------- |
| 强制 HTTPS      | 所有 API 请求必须走 HTTPS                   |
| TLS 版本        | 最低 TLS 1.2                                |
| 证书固定 (选配) | APP 可内置服务器证书指纹，防 MITM           |
| HTTP 降级       | uni-app manifest 中设置 `"sslVerify": true` |

### manifest.json 配置

```json
{
  "app-plus": {
    "ssl": {
      "sslVerify": true
    }
  }
}
```

---

## 2. 认证安全 (JWT)

| 机制          | 说明                                   |
| ------------- | -------------------------------------- |
| Access Token  | 2 小时有效期，存储在 uni Storage       |
| Refresh Token | 7 天有效期，仅用于刷新                 |
| Token 黑名单  | 登出/修改密码后加入 Redis 黑名单       |
| 设备标识      | JWT payload 含 `deviceType` 字段       |
| 自动刷新      | 401 时自动尝试 refresh，失败则强制登录 |

### Token 存储安全

| 平台          | 存储位置                     | 安全性           |
| ------------- | ---------------------------- | ---------------- |
| APP (Android) | SharedPreferences (应用沙盒) | 中 (root 可访问) |
| APP (iOS)     | NSUserDefaults (应用沙盒)    | 中               |
| 微信小程序    | wx.setStorageSync (沙盒)     | 较高 (微信隔离)  |

**注意**: 不存储敏感信息在 Token 中，仅含 userId / role / deviceType。

---

## 3. 限流保护

后端 `@nestjs/throttler` 配置：

| 接口     | 限制                    | 说明       |
| -------- | ----------------------- | ---------- |
| 全局     | 60 req/min (per userId) | 防刷       |
| 登录     | 5 req/min (per IP)      | 防暴力破解 |
| AI 对话  | 10 req/min              | 防滥用     |
| 文件上传 | 10 req/min              | 防滥用     |

### APP 端防护

```typescript
// 按钮防重复提交
let submitting = false
async function handleSubmit() {
  if (submitting) return
  submitting = true
  try {
    await api.post(...)
  } finally {
    submitting = false
  }
}
```

---

## 4. 数据脱敏

### 展示脱敏

| 字段   | 规则          | 示例                  |
| ------ | ------------- | --------------------- |
| 手机号 | 中间 4 位星号 | `138****1234`         |
| 邮箱   | @ 前保留首尾  | `z**g@example.com`    |
| 身份证 | 保留首3尾4    | `310***********1234`  |
| 银行卡 | 保留末4位     | `**** **** **** 5678` |

### 实现

```typescript
// utils/mask.ts
export function maskPhone(phone: string): string {
  return phone.replace(/(\d{3})\d{4}(\d{4})/, "$1****$2");
}

export function maskEmail(email: string): string {
  const [user, domain] = email.split("@");
  if (user.length <= 2) return `${user[0]}**@${domain}`;
  return `${user[0]}${"*".repeat(user.length - 2)}${user[user.length - 1]}@${domain}`;
}
```

---

## 5. 云呼叫中心安全

### Webhook 回调验证

云端通话结束后的回调必须验证来源合法性：

```typescript
// 回调签名验证中间件
function verifyCloudCallWebhook(req: Request): boolean {
  const signature = req.headers["x-cloud-signature"];
  const timestamp = req.headers["x-cloud-timestamp"];

  // 1. 时间戳防重放 (5分钟内)
  if (Math.abs(Date.now() / 1000 - Number(timestamp)) > 300) return false;

  // 2. HMAC-SHA256 签名验证
  const payload = JSON.stringify(req.body) + timestamp;
  const expected = hmacSHA256(payload, CLOUD_CALL_WEBHOOK_SECRET);
  return signature === expected;
}
```

### 录音文件安全

| 措施     | 说明                                 |
| -------- | ------------------------------------ |
| 签名 URL | 录音文件 URL 含时效签名 (15min 过期) |
| RBAC     | 仅通话参与者 + Manager/Admin 可访问  |
| 传输加密 | 录音通过 HTTPS 传输                  |
| 存储加密 | OSS 服务端加密 (AES-256)             |
| 审计日志 | 录音播放记录入审计日志               |

### 通话合规

| 要求     | 实现                               |
| -------- | ---------------------------------- |
| 录音告知 | 云端在通话建立时自动播放录音提示语 |
| 录音存储 | 按合规要求保留 N 天 (可配置)       |
| 录音删除 | 到期自动删除，Admin 可手动删除     |
| 通话记录 | 所有通话写入 CallRecord + AuditLog |

---

## 6. 请求签名 (可选增强)

API 请求签名防篡改：

```typescript
// 签名算法
function signRequest(
  params: Record<string, string>,
  timestamp: number,
  nonce: string,
  secret: string,
): string {
  const sorted = Object.keys(params)
    .sort()
    .map((k) => `${k}=${params[k]}`)
    .join("&");
  const raw = `${sorted}&timestamp=${timestamp}&nonce=${nonce}`;
  return hmacSHA256(raw, secret);
}

// 请求头
headers["X-Timestamp"] = timestamp;
headers["X-Nonce"] = nonce;
headers["X-Signature"] = signature;
```

**说明**: v1.0 暂不启用，v2.0 按需启用。JWT 已提供足够的身份验证。

---

## 7. 代码混淆

### APP 打包混淆

| 平台       | 工具           | 说明                 |
| ---------- | -------------- | -------------------- |
| Android    | ProGuard / R8  | 自动混淆 Java/Kotlin |
| JS 代码    | terser (Vite)  | 压缩+变量名混淆      |
| Source Map | 不包含在发布包 | 仅上传到错误监控平台 |

### Vite 配置

```typescript
// vite.config.ts
export default defineConfig({
  build: {
    minify: "terser",
    terserOptions: {
      compress: {
        drop_console: true, // 移除 console.log
        drop_debugger: true,
      },
      mangle: true, // 变量名混淆
    },
    sourcemap: false, // 生产环境不生成 sourcemap
  },
});
```

---

## 8. 本地数据安全

| 措施                | 说明                                         |
| ------------------- | -------------------------------------------- |
| Token 不含敏感信息  | JWT 仅含 userId/role/deviceType              |
| Storage 加密 (可选) | APP 端可使用 AES 加密 Storage 值             |
| 退出清除            | 登出时清除所有缓存 (Token/用户信息/业务缓存) |
| 截屏防护 (可选)     | 敏感页面禁止截屏 (Android FLAG_SECURE)       |

---

## 9. 输入校验

前后端双重校验：

| 字段   | 前端校验                 | 后端校验                         |
| ------ | ------------------------ | -------------------------------- |
| 手机号 | `/^1[3-9]\d{9}$/`        | class-validator `@IsPhoneNumber` |
| 邮箱   | `/^[^@]+@[^@]+\.[^@]+$/` | `@IsEmail()`                     |
| 密码   | 最少 6 位                | `@MinLength(6)`                  |
| 金额   | 正数，最多 2 位小数      | `@IsPositive()` `@Max()`         |
| XSS    | 不直接渲染 HTML          | `class-transformer` 自动转义     |

---

## 安全检查清单

- [ ] 所有 API 请求走 HTTPS
- [ ] JWT Token 正确存储和清除
- [ ] 401 响应正确处理（刷新/重登录）
- [ ] 手机号等敏感数据展示脱敏
- [ ] 按钮防重复提交
- [ ] 生产包移除 console.log
- [ ] 生产包不含 Source Map
- [ ] 登出清除所有本地数据
- [ ] 输入字段前端校验
- [ ] 文件上传限制类型和大小
- [ ] 云呼 webhook 签名验证 (HMAC-SHA256 + 时间戳防重放)
- [ ] 录音 URL 签名时效验证 (15min 过期)
- [ ] 录音访问 RBAC 权限控制 (仅参与者+管理角色)
- [ ] 云呼服务商密钥加密存储 (不明文)
