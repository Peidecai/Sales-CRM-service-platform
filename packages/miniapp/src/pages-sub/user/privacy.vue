<template>
  <view class="privacy-page">
    <view class="content-card">
      <text class="title">隐私协议</text>
      <text class="update-date">更新日期：2026年1月1日</text>

      <view class="section">
        <text class="section-title">一、信息收集</text>
        <text class="section-text">我们在您使用本应用时，可能会收集以下信息：</text>
        <text class="section-text">1. 账户信息：用户名、手机号、邮箱等注册信息。</text>
        <text class="section-text">2. 业务数据：客户信息、跟进记录、通话记录等您主动录入的业务数据。</text>
        <text class="section-text">3. 设备信息：设备型号、操作系统版本、唯一设备标识符。</text>
        <text class="section-text">4. 位置信息：外勤打卡时获取的地理位置（需您授权）。</text>
        <text class="section-text">5. 通话信息：通话时长、拨号记录（用于业务统计）。</text>
      </view>

      <view class="section">
        <text class="section-title">二、信息使用</text>
        <text class="section-text">我们使用收集的信息用于：</text>
        <text class="section-text">1. 提供和维护 CRM 销售管理服务。</text>
        <text class="section-text">2. 改进和优化用户体验。</text>
        <text class="section-text">3. 发送服务通知和业务提醒。</text>
        <text class="section-text">4. AI 辅助分析，帮助提升销售效率。</text>
      </view>

      <view class="section">
        <text class="section-title">三、信息存储与保护</text>
        <text class="section-text">1. 您的数据存储在经过安全认证的云服务器上。</text>
        <text class="section-text">2. 我们采用 AES-256 加密传输和存储敏感数据。</text>
        <text class="section-text">3. 实施严格的访问控制和审计日志机制。</text>
        <text class="section-text">4. 定期进行安全评估和漏洞修复。</text>
      </view>

      <view class="section">
        <text class="section-title">四、信息共享</text>
        <text class="section-text">我们不会将您的个人信息出售给第三方。仅在以下情况下可能共享：</text>
        <text class="section-text">1. 获得您明确同意的情况下。</text>
        <text class="section-text">2. 法律法规要求的情况下。</text>
        <text class="section-text">3. 与企业内部授权管理人员共享必要的业务数据。</text>
      </view>

      <view class="section">
        <text class="section-title">五、您的权利</text>
        <text class="section-text">1. 访问权：您可以随时查看和导出您的个人数据。</text>
        <text class="section-text">2. 更正权：您可以修改不准确的个人信息。</text>
        <text class="section-text">3. 删除权：您可以申请删除您的账户和相关数据。</text>
        <text class="section-text">4. 撤回同意：您可以随时撤回对数据收集的授权。</text>
      </view>

      <view class="section">
        <text class="section-title">六、联系我们</text>
        <text class="section-text">如您对本隐私协议有任何疑问，请联系：</text>
        <text class="section-text">邮箱：privacy@crm-sales.com</text>
        <text class="section-text">电话：400-888-8888</text>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
// Static page — no logic needed
</script>

<style scoped>
.privacy-page {
  min-height: 100vh;
  background: #f5f5f5;
  padding: 24rpx;
}

.content-card {
  background: #ffffff;
  border-radius: 16rpx;
  padding: 40rpx 32rpx;
}

.title {
  font-size: 36rpx;
  font-weight: bold;
  color: #303133;
  display: block;
  text-align: center;
  margin-bottom: 12rpx;
}

.update-date {
  font-size: 24rpx;
  color: #909399;
  display: block;
  text-align: center;
  margin-bottom: 40rpx;
}

.section {
  margin-bottom: 32rpx;
}

.section-title {
  font-size: 30rpx;
  font-weight: bold;
  color: #303133;
  display: block;
  margin-bottom: 16rpx;
}

.section-text {
  font-size: 28rpx;
  color: #606266;
  line-height: 1.8;
  display: block;
  margin-bottom: 8rpx;
}
</style>
