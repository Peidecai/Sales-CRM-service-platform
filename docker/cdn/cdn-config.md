# CDN Configuration Guide — Aliyun CDN

> CRM Sales Platform 静态资源 CDN 加速配置指南

## 1. 概述

使用阿里云 CDN 加速前端静态资源（JS/CSS/图片/字体），减轻源站压力并提升用户访问速度。

## 2. CDN 域名规划

| 用途         | 域名                     | 说明               |
| ------------ | ------------------------ | ------------------ |
| 主站         | `crm.example.com`        | Nginx 反向代理     |
| 静态资源 CDN | `static.crm.example.com` | JS/CSS/图片/字体   |
| API          | `api.crm.example.com`    | 后端 API（不加速） |

## 3. 阿里云 CDN 配置步骤

### 3.1 添加加速域名

1. 登录 [阿里云 CDN 控制台](https://cdn.console.aliyun.com)
2. 域名管理 → 添加域名
3. 加速域名：`static.crm.example.com`
4. 业务类型：**图片小文件**
5. 源站信息：
   - 源站类型：**IP** 或 **OSS 域名**
   - 源站地址：Nginx 服务器 IP 或 OSS Bucket 域名
   - 端口：80 / 443

### 3.2 CNAME 配置

在 DNS 服务商处添加 CNAME 记录：

```
static.crm.example.com  CNAME  xxx.alicdn.com
```

### 3.3 HTTPS 配置

1. CDN 控制台 → HTTPS 配置
2. 上传 SSL 证书（或选择阿里云托管证书）
3. 开启 **HTTP/2**
4. 开启 **强制 HTTPS 跳转**
5. TLS 版本：TLSv1.2 + TLSv1.3

## 4. 缓存规则

### 4.1 按文件后缀

| 文件类型                                | 缓存时间 | 说明                 |
| --------------------------------------- | -------- | -------------------- |
| `.js`, `.css`                           | 1 年     | Vite 生产构建含 hash |
| `.woff`, `.woff2`, `.ttf`               | 1 年     | 字体文件，hash 化    |
| `.png`, `.jpg`, `.gif`, `.svg`, `.webp` | 7 天     | 图片资源             |
| `.html`                                 | 不缓存   | SPA 入口，必须回源   |
| `.json`                                 | 不缓存   | API 响应 / 配置文件  |

### 4.2 CDN 控制台配置

```
目录缓存规则：
  /assets/   → 缓存 365 天 (Vite hash 化输出目录)

文件后缀缓存规则：
  .js .css .woff .woff2   → 缓存 365 天
  .png .jpg .gif .svg     → 缓存 7 天
  .html                   → 不缓存 (Cache-Control: no-cache)
  .json                   → 不缓存
```

### 4.3 Cache-Control 响应头

Nginx 源站已配置（参考 `docker/web/nginx.conf`）：

```nginx
# Hashed assets — immutable
location ~* \.(?:js|css)$ {
    expires 1y;
    add_header Cache-Control "public, immutable";
}

# HTML — no cache
location / {
    add_header Cache-Control "no-cache";
}
```

## 5. 源站配置

### 5.1 方案 A：Nginx 作为源站

CDN 直接回源到 Nginx 服务器：

```
Client → CDN → Nginx (crm-web container) → 静态文件
```

优点：架构简单，无需额外存储
缺点：回源时仍占用服务器带宽

### 5.2 方案 B：OSS Bucket 作为源站（推荐）

将构建产物同步到 OSS，CDN 回源 OSS：

```
Client → CDN → OSS Bucket → 静态文件
```

OSS 上传脚本（CI/CD 中执行）：

```bash
# 上传构建产物到 OSS
ossutil cp -r packages/web/dist/ oss://crm-static-bucket/

# 设置 HTML 不缓存
ossutil set-meta oss://crm-static-bucket/index.html \
    Cache-Control:no-cache \
    --update
```

优点：源站高可用，带宽成本低
缺点：需要额外的 OSS 存储费用

## 6. 性能优化

### 6.1 开启的功能

| 功能        | 设置               |
| ----------- | ------------------ |
| Gzip 压缩   | 开启               |
| Brotli 压缩 | 开启（如可用）     |
| HTTP/2      | 开启               |
| 智能压缩    | 开启               |
| Range 回源  | 开启（大文件分片） |
| 页面优化    | 关闭（已构建压缩） |

### 6.2 Vite 预压缩

项目已配置 `vite-plugin-compression2`，构建时生成 `.gz` 和 `.br` 文件。
Nginx 的 `gzip_static on` 直接返回预压缩文件，避免实时压缩开销。

## 7. 前端 Base URL 配置

在 `vite.config.ts` 中配置 CDN 地址：

```typescript
// vite.config.ts (生产环境使用 CDN)
export default defineConfig({
  base: process.env.CDN_URL || "/",
  // ...
});
```

环境变量：

```bash
# .env.production
CDN_URL=https://static.crm.example.com/
```

## 8. 刷新与预热

### 8.1 版本发布后刷新

```bash
# 刷新 index.html（不缓存但 CDN 可能有边缘缓存）
aliyun cdn RefreshObjectCaches \
    --ObjectPath "https://static.crm.example.com/index.html" \
    --ObjectType File

# 刷新整个目录（大版本更新时）
aliyun cdn RefreshObjectCaches \
    --ObjectPath "https://static.crm.example.com/" \
    --ObjectType Directory
```

### 8.2 预热热门资源

```bash
aliyun cdn PushObjectCache \
    --ObjectPath "https://static.crm.example.com/assets/index-[hash].js"
```

## 9. 监控

- 阿里云 CDN 控制台 → 统计分析：带宽、流量、命中率
- 设置告警：命中率 < 90%、带宽突增、5xx 回源错误
- 日志下载：CDN 控制台 → 日志管理 → 下载离线日志分析
