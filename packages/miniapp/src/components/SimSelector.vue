<template>
  <!-- #ifdef APP-PLUS -->
  <uni-popup ref="popupRef" type="bottom" :mask-click="true" @change="onPopupChange">
    <view class="sim-selector">
      <view class="sim-header">
        <text class="sim-title">选择拨号 SIM 卡</text>
        <text class="sim-phone">{{ phone }}</text>
      </view>

      <view class="sim-list">
        <view
          v-for="card in cards"
          :key="card.slot"
          class="sim-item"
          @click="handleSelect(card.slot)"
        >
          <view class="sim-info">
            <text class="sim-slot">SIM {{ card.slot + 1 }}</text>
            <text class="sim-carrier">{{ card.carrier }}</text>
            <text v-if="card.phoneNumber" class="sim-number">{{ card.phoneNumber }}</text>
          </view>
          <text v-if="card.slot === preferredSlot" class="sim-preferred">默认</text>
        </view>
      </view>

      <view class="sim-actions">
        <view class="sim-remember" @click="toggleRemember">
          <view :class="['sim-checkbox', { checked: remember }]" />
          <text class="sim-remember-text">记住选择</text>
        </view>
        <view class="sim-cancel" @click="handleCancel">
          <text class="sim-cancel-text">取消</text>
        </view>
      </view>
    </view>
  </uni-popup>
  <!-- #endif -->

  <!-- #ifndef APP-PLUS -->
  <view />
  <!-- #endif -->
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import type { SimInfo } from '@/native/sim-card'
import { getSimCards, getPreferredSimSlot, setPreferredSimSlot } from '@/native/sim-card'

interface Props {
  visible: boolean
  phone: string
}

const props = defineProps<Props>()

const emit = defineEmits<{
  (e: 'update:visible', value: boolean): void
  (e: 'select', simSlot: number): void
}>()

const popupRef = ref<{ open: () => void; close: () => void } | null>(null)
const cards = ref<SimInfo[]>([])
const preferredSlot = ref<number | null>(null)
const remember = ref(false)

// Load SIM cards on mount
function loadCards(): void {
  const result = getSimCards()
  cards.value = result.cards
  preferredSlot.value = getPreferredSimSlot()
}

// Watch visibility
watch(
  () => props.visible,
  (val) => {
    if (val) {
      loadCards()
      popupRef.value?.open()
    } else {
      popupRef.value?.close()
    }
  },
)

function onPopupChange(e: { show: boolean }): void {
  if (!e.show && props.visible) {
    emit('update:visible', false)
  }
}

function handleSelect(slot: number): void {
  if (remember.value) {
    setPreferredSimSlot(slot)
    preferredSlot.value = slot
  }
  emit('select', slot)
  emit('update:visible', false)
}

function handleCancel(): void {
  emit('update:visible', false)
}

function toggleRemember(): void {
  remember.value = !remember.value
  if (!remember.value) {
    setPreferredSimSlot(null)
    preferredSlot.value = null
  }
}
</script>

<style scoped>
.sim-selector {
  background: #ffffff;
  border-radius: 24rpx 24rpx 0 0;
  padding: 40rpx 32rpx calc(40rpx + env(safe-area-inset-bottom));
}

.sim-header {
  text-align: center;
  margin-bottom: 32rpx;
}

.sim-title {
  display: block;
  font-size: 32rpx;
  font-weight: 600;
  color: #333333;
  margin-bottom: 8rpx;
}

.sim-phone {
  font-size: 28rpx;
  color: #999999;
}

.sim-list {
  margin-bottom: 32rpx;
}

.sim-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 28rpx 24rpx;
  background: #f5f7fa;
  border-radius: 16rpx;
  margin-bottom: 16rpx;
}

.sim-item:active {
  background: #e8f4ff;
}

.sim-info {
  display: flex;
  align-items: center;
  gap: 16rpx;
}

.sim-slot {
  font-size: 28rpx;
  font-weight: 600;
  color: #409eff;
}

.sim-carrier {
  font-size: 28rpx;
  color: #333333;
}

.sim-number {
  font-size: 24rpx;
  color: #999999;
}

.sim-preferred {
  font-size: 22rpx;
  color: #ffffff;
  background: #409eff;
  padding: 4rpx 16rpx;
  border-radius: 20rpx;
}

.sim-actions {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.sim-remember {
  display: flex;
  align-items: center;
  gap: 12rpx;
}

.sim-checkbox {
  width: 36rpx;
  height: 36rpx;
  border: 2rpx solid #dcdfe6;
  border-radius: 6rpx;
}

.sim-checkbox.checked {
  background: #409eff;
  border-color: #409eff;
}

.sim-remember-text {
  font-size: 26rpx;
  color: #666666;
}

.sim-cancel {
  padding: 16rpx 32rpx;
}

.sim-cancel-text {
  font-size: 28rpx;
  color: #999999;
}
</style>
