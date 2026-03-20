<template>
  <view class="search-bar">
    <view class="search-input-wrap">
      <text class="search-icon">&#xe721;</text>
      <input
        class="search-input"
        type="text"
        :placeholder="placeholder"
        :value="modelValue"
        confirm-type="search"
        @input="onInput"
        @confirm="onConfirm"
      />
      <text
        v-if="modelValue"
        class="clear-icon"
        @click="onClear"
      >&#xe720;</text>
    </view>
    <view
      v-if="showFilter"
      class="filter-btn"
      :class="{ active: filterActive }"
      @click="onFilterClick"
    >
      <text class="filter-icon">&#xe722;</text>
      <text class="filter-text">筛选</text>
    </view>
  </view>
</template>

<script setup lang="ts">
const props = withDefaults(defineProps<{
  modelValue?: string
  placeholder?: string
  showFilter?: boolean
  filterActive?: boolean
}>(), {
  modelValue: '',
  placeholder: '搜索',
  showFilter: true,
  filterActive: false,
})

const emit = defineEmits<{
  'update:modelValue': [value: string]
  search: [value: string]
  filter: []
}>()

function onInput(e: { detail: { value: string } }) {
  emit('update:modelValue', e.detail.value)
}

function onConfirm() {
  emit('search', props.modelValue)
}

function onClear() {
  emit('update:modelValue', '')
  emit('search', '')
}

function onFilterClick() {
  emit('filter')
}
</script>

<style scoped>
.search-bar {
  display: flex;
  align-items: center;
  padding: 16rpx 24rpx;
  background: #ffffff;
  gap: 16rpx;
}

.search-input-wrap {
  flex: 1;
  display: flex;
  align-items: center;
  height: 72rpx;
  background: #f5f5f5;
  border-radius: 36rpx;
  padding: 0 24rpx;
  gap: 12rpx;
}

.search-icon,
.clear-icon,
.filter-icon {
  font-family: "uni-icons";
  font-size: 32rpx;
  color: #909399;
}

.clear-icon {
  font-size: 28rpx;
}

.search-input {
  flex: 1;
  font-size: 28rpx;
  color: #303133;
  height: 72rpx;
}

.filter-btn {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-width: 88rpx;
  min-height: 88rpx;
}

.filter-btn.active .filter-icon,
.filter-btn.active .filter-text {
  color: #409eff;
}

.filter-text {
  font-size: 20rpx;
  color: #909399;
  margin-top: 2rpx;
}
</style>
