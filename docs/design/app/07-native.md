# 07 — APP 原生能力

> 以下能力仅 APP 端可用（除云呼叫中心外），使用 `#ifdef APP-PLUS` 条件编译隔离。

## 能力总览

| 能力           | 模块                   | 说明                        | 优先级 |
| -------------- | ---------------------- | --------------------------- | ------ |
| **云呼叫中心** | `api/cloud-call.ts`    | 回呼模式，服务端录音+ASR+AI | P1     |
| Push 推送      | `native/push.ts`       | FCM (Android) / APNs (iOS)  | P1     |
| GPS 定位       | `native/gps.ts`        | 高精度定位 + 签到           | P1     |
| 双卡检测       | `native/sim-card.ts`   | 读取 SIM 卡 + 选择外呼卡    | P1     |
| 拍照取号 (OCR) | `native/camera-ocr.ts` | 识别照片中电话号码          | P2     |
| 名片扫描 (OCR) | `native/camera-ocr.ts` | 识别名片信息                | P2     |
| 生物识别       | `native/biometric.ts`  | 指纹/面容快捷登录           | P2     |
| 语音输入       | uni-app 内置           | 语音速记 → 后端 ASR         | P1     |

> **重要**: 通话录音是系统级能力，iOS 完全禁止、Android 9+ 极度受限，任何框架（uni-app/RN/Flutter/原生）都无法实现。通话录音必须通过云呼叫中心在服务端完成。

---

## 1. 云呼叫中心 (通话录音)

### 为什么需要云呼叫中心

| 平台       | 通话录音限制 | 原因                                                           |
| ---------- | ------------ | -------------------------------------------------------------- |
| iOS        | **完全禁止** | Apple 从系统层面禁止第三方 APP 录制通话音频                    |
| Android 9+ | **极度受限** | Google 从 Android 9 逐步封杀录音权限，Android 11+ 几乎完全禁止 |

这是操作系统限制，**与框架无关** — React Native、Flutter、原生开发同样做不到。

### 解决方案: 回呼模式 (Callback)

通话不在手机端建立，而是由云端服务器发起，服务器作为中间人录制双方语音：

```
APP 发起呼叫请求
  → 服务端调云呼API
  → 云端先呼销售手机（销售接听）
  → 云端再呼客户（客户接听）
  → 三方通话建立，云端全程录音
  → 通话结束
  → 云端回调 webhook → 录音文件URL
  → 异步: 录音 → ASR → AI分析
```

### 云呼服务商选型

| 服务商        | 优势                     | 线路       | 价格参考     |
| ------------- | ------------------------ | ---------- | ------------ |
| **阿里云CCC** | 与现有阿里云基础设施整合 | 全国号码池 | ~0.1元/分钟  |
| **天润融通**  | CRM行业老牌              | 自有线路   | ~0.08元/分钟 |
| **容联七陌**  | API 文档好               | 多运营商   | ~0.1元/分钟  |

建议: 使用**适配器模式**，抽象通用接口，初期接阿里云CCC，后期可切换。

### 后端 CloudCall 模块设计

```typescript
// 适配器接口
interface CloudCallProvider {
  // 发起回呼
  initiateCallback(params: {
    callerPhone: string    // 销售手机号
    calleePhone: string    // 客户电话
    callbackUrl: string    // 通话结束回调 URL
  }): Promise<{ callId: string }>

  // 查询通话状态
  getCallStatus(callId: string): Promise<CloudCallStatus>

  // 获取录音 URL
  getRecordingUrl(callId: string): Promise<string>
}

// 阿里云CCC 实现
class AliyunCCCProvider implements CloudCallProvider { ... }

// 天润融通 实现
class TianrunProvider implements CloudCallProvider { ... }
```

### APP 端集成

```typescript
// api/cloud-call.ts
export function initiateCloudCall(data: {
  customerId: string;
  customerPhone: string;
  callerPhone: string;
}) {
  return post("/api/v1/cloud-call/initiate", data);
}

export function getCallRecording(callId: string) {
  return get(`/api/v1/cloud-call/${callId}/recording`);
}

export function getCloudCallStatus(callId: string) {
  return get(`/api/v1/cloud-call/${callId}/status`);
}
```

### 通话录音播放

```vue
<!-- 通话详情页 -->
<template>
  <view v-if="record.recordingUrl" class="recording-player">
    <text>通话录音 ({{ formatDuration(record.duration) }})</text>
    <audio-player :src="record.recordingUrl" />
  </view>
  <view v-if="record.aiAnalysis" class="ai-analysis">
    <text class="label">AI 摘要</text>
    <text>{{ record.aiAnalysis.summary }}</text>
    <text class="label">客户意向</text>
    <tag :type="intentionTagType">{{ record.aiAnalysis.intention }}</tag>
    <text class="label">通话评分</text>
    <rate :value="record.aiAnalysis.score" disabled />
  </view>
</template>
```

### 与方案B（原生外呼）的共存

两种模式在 APP 中并存，用户可选择：

| 场景                 | 推荐模式         | 理由             |
| -------------------- | ---------------- | ---------------- |
| 重要客户首次沟通     | 云呼录音 (方案D) | 需要录音+AI分析  |
| 日常简短回复         | 原生拨号 (方案B) | 快速、无成本     |
| 合规行业 (金融/保险) | 云呼录音 (方案D) | 监管要求录音存档 |
| 弱网环境             | 原生拨号 (方案B) | 不依赖网络       |

---

## 2. Push 推送

### 注册流程

```
APP 启动
  → plus.push.getClientInfo() → clientId (设备 Token)
  → POST /api/v1/push/register { deviceToken, platform, userId }
  → 后端保存设备-用户映射
```

### 推送场景

| 场景     | 触发                 | 内容                           |
| -------- | -------------------- | ------------------------------ |
| 跟进提醒 | 定时任务 (Bull cron) | "您有 3 位客户待跟进"          |
| 商机更新 | 商机阶段变更         | "商机 XX 进入谈判阶段"         |
| 回款提醒 | 到期前 1 天          | "XX 公司回款 ¥50,000 明日到期" |
| 审批通知 | 新审批/审批结果      | "您有一条报价审批待处理"       |
| 系统通知 | 管理员发布           | 公告内容                       |

### 推送处理

```typescript
// native/push.ts
export function registerPush() {
  // #ifdef APP-PLUS
  const info = plus.push.getClientInfo();
  api.post("/api/v1/push/register", {
    deviceToken: info.clientid,
    platform: uni.getSystemInfoSync().platform, // 'android' | 'ios'
  });

  // 收到推送
  plus.push.addEventListener("click", (msg) => {
    // 解析 payload，跳转对应页面
    const { type, targetId } = JSON.parse(msg.payload);
    switch (type) {
      case "follow_up":
        uni.navigateTo({ url: `/pages/customer/detail?id=${targetId}` });
        break;
      case "opportunity":
        uni.navigateTo({ url: `/pages/opportunity/detail?id=${targetId}` });
        break;
      case "approval":
        uni.navigateTo({ url: `/pages/message/index` });
        break;
    }
  });
  // #endif
}
```

---

## 3. GPS 定位

### 高精度定位

```typescript
// native/gps.ts
export function getHighAccuracyLocation(): Promise<LocationResult> {
  return new Promise((resolve, reject) => {
    uni.getLocation({
      type: "gcj02",
      isHighAccuracy: true,
      highAccuracyExpireTime: 5000,
      success: (res) =>
        resolve({
          latitude: res.latitude,
          longitude: res.longitude,
          accuracy: res.accuracy,
          address: res.address,
        }),
      fail: reject,
    });
  });
}
```

### 签到流程

```
点击 [外勤打卡]
  → 获取高精度 GPS 坐标
  → 拍照 (可选)
  → 选择关联客户 (附近客户自动推荐)
  → POST /api/v1/check-in {
      latitude, longitude, accuracy,
      address, photo, customerId,
      checkInTime
    }
  → 签到成功 Toast
```

### 距离计算 (Haversine)

复用 `utils/geo.ts` 的 Haversine 公式，计算用户与客户地址的距离，用于：

- 附近客户排序
- 签到位置验证（与客户地址距离 < 500m）
- 路线规划起点

---

## 4. 双卡检测与切换

### SIM 卡检测

```typescript
// native/sim-card.ts
export interface SimInfo {
  slot: number; // 0 | 1
  carrier: string; // 运营商名称
  phoneNumber?: string;
}

export function getSimCards(): SimInfo[] {
  // #ifdef APP-PLUS
  if (uni.getSystemInfoSync().platform === "android") {
    // Android: TelephonyManager API
    const main = plus.android.importClass("android.telephony.TelephonyManager");
    // ... 读取双卡信息
  }
  // iOS 不支持读取 SIM 信息，使用默认卡
  // #endif
  return [];
}
```

### 拨号时选卡

```typescript
export function makeCallWithSim(phone: string, simSlot?: number) {
  // #ifdef APP-PLUS
  if (simSlot !== undefined && uni.getSystemInfoSync().platform === "android") {
    // Android Intent 指定 SIM 卡
    const Intent = plus.android.importClass("android.content.Intent");
    const Uri = plus.android.importClass("android.net.Uri");
    const intent = new Intent(Intent.ACTION_CALL, Uri.parse(`tel:${phone}`));
    intent.putExtra("com.android.phone.extra.slot", simSlot);
    plus.android.currentActivity().startActivity(intent);
  } else {
    uni.makePhoneCall({ phoneNumber: phone });
  }
  // #endif
}
```

### 用户偏好

双卡设置存储在本地 `crm_sim_preference`，用户可在个人中心设置默认外呼卡。

---

## 5. OCR (拍照取号 / 名片扫描)

### 拍照取号

```typescript
// native/camera-ocr.ts
export async function scanPhoneNumber(): Promise<string[]> {
  // 1. 拍照或选择图片
  const [err, res] = await uni.chooseImage({
    count: 1,
    sourceType: ["camera"],
  });
  if (err || !res) return [];

  // 2. OCR 识别 (可选方案)
  // 方案A: 本地 OCR 插件 (离线)
  // 方案B: 上传到后端 OCR API (在线)

  // 方案B 示例
  const formData = new FormData();
  formData.append("image", res.tempFiles[0]);
  const ocrResult = await api.upload("/api/v1/ocr/phone", formData);

  // 3. 返回识别到的电话号码数组
  return ocrResult.data.phoneNumbers; // ['13812341234', '02112345678']
}
```

### 名片扫描

```
拍照 → OCR 识别 → 提取字段:
  - 姓名
  - 公司名称
  - 职位
  - 电话
  - 邮箱
  - 地址
→ 预填新建客户表单
→ 用户确认 → 创建客户
```

---

## 6. 生物识别

```typescript
// native/biometric.ts
export function checkBiometricAvailable(): boolean {
  // #ifdef APP-PLUS
  return plus.fingerprint.isSupport();
  // #endif
  return false;
}

export function authenticate(): Promise<boolean> {
  return new Promise((resolve) => {
    // #ifdef APP-PLUS
    plus.fingerprint.authenticate(
      () => resolve(true), // 成功
      (err) => {
        console.warn("Biometric failed:", err.code);
        resolve(false); // 失败
      },
      { message: "CRM 身份验证" },
    );
    // #endif
  });
}
```

---

## 7. 语音输入 (语音速记)

利用 uni-app 内置录音管理器：

```typescript
const recorderManager = uni.getRecorderManager();

recorderManager.start({
  format: "mp3",
  sampleRate: 16000,
  numberOfChannels: 1,
});

recorderManager.onStop((res) => {
  // res.tempFilePath → 录音文件
  // 上传到后端 ASR
  uploadRecording(res.tempFilePath);
});
```

---

## 权限声明

### manifest.json (APP)

```json
{
  "app-plus": {
    "distribute": {
      "android": {
        "permissions": [
          "<uses-permission android:name=\"android.permission.CAMERA\"/>",
          "<uses-permission android:name=\"android.permission.ACCESS_FINE_LOCATION\"/>",
          "<uses-permission android:name=\"android.permission.RECORD_AUDIO\"/>",
          "<uses-permission android:name=\"android.permission.READ_PHONE_STATE\"/>",
          "<uses-permission android:name=\"android.permission.CALL_PHONE\"/>",
          "<uses-permission android:name=\"android.permission.USE_FINGERPRINT\"/>"
        ]
      },
      "ios": {
        "privacyDescription": {
          "NSCameraUsageDescription": "用于名片扫描和拍照取号",
          "NSLocationWhenInUseUsageDescription": "用于外勤打卡和客户定位",
          "NSMicrophoneUsageDescription": "用于语音速记",
          "NSFaceIDUsageDescription": "用于快捷登录"
        }
      }
    }
  }
}
```
