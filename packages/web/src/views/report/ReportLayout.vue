<template>
  <div class="report-layout">
    <div class="report-sidebar">
      <el-menu :default-active="activeMenu" router class="report-menu">
        <el-menu-item-group title="通话报表">
          <el-menu-item index="/report/call/statistics">通话统计</el-menu-item>
          <el-menu-item index="/report/call/daily">每日分析</el-menu-item>
          <el-menu-item index="/report/call/personal">个人分析</el-menu-item>
          <el-menu-item index="/report/call/detail">详细分析</el-menu-item>
        </el-menu-item-group>
        <el-menu-item-group title="业绩报表">
          <el-menu-item index="/report/performance/overview">业绩概览</el-menu-item>
          <el-menu-item index="/report/performance/summary">业绩汇总</el-menu-item>
          <el-menu-item index="/report/performance/signing">签约统计</el-menu-item>
          <el-menu-item index="/report/performance/collection">回款统计</el-menu-item>
        </el-menu-item-group>
        <el-menu-item-group title="AI 分析">
          <el-menu-item index="/report/ai/speech-skill">话术分析</el-menu-item>
          <el-menu-item index="/report/ai/score-ranking">评分排行</el-menu-item>
          <el-menu-item index="/report/ai/employee-portrait">员工画像</el-menu-item>
          <el-menu-item index="/report/ai/tag-stats">标签统计</el-menu-item>
          <el-menu-item index="/report/ai/appointment-ability">邀约能力</el-menu-item>
        </el-menu-item-group>
        <el-menu-item-group title="漏斗转化">
          <el-menu-item index="/report/funnel/sales">销售漏斗</el-menu-item>
        </el-menu-item-group>
      </el-menu>
    </div>
    <div class="report-content">
      <div class="report-filter-bar">
        <el-date-picker
          v-model="dateRange"
          type="daterange"
          range-separator="至"
          start-placeholder="开始日期"
          end-placeholder="结束日期"
          value-format="YYYY-MM-DD"
          :shortcuts="dateShortcuts"
          style="width: 280px"
          @change="onFilterChange"
        />
        <el-select
          v-model="filterState.groupBy"
          placeholder="分组方式"
          style="width: 120px"
          @change="onFilterChange"
        >
          <el-option label="按天" value="day" />
          <el-option label="按周" value="week" />
          <el-option label="按月" value="month" />
        </el-select>
      </div>
      <router-view :filter="currentFilter" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed } from 'vue'
import { useRoute } from 'vue-router'
import type { ReportFilter } from '@/api/report'

const route = useRoute()

const activeMenu = computed(() => route.path)

const dateRange = ref<[string, string] | null>(null)

const filterState = reactive({
  groupBy: 'day' as 'day' | 'week' | 'month',
})

const currentFilter = computed<ReportFilter>(() => ({
  startDate: dateRange.value?.[0],
  endDate: dateRange.value?.[1],
  groupBy: filterState.groupBy,
}))

function onFilterChange() {
  // Filter is reactive, child components will pick up changes
}

const dateShortcuts = [
  {
    text: '最近7天',
    value: () => {
      const end = new Date()
      const start = new Date()
      start.setDate(start.getDate() - 7)
      return [start, end]
    },
  },
  {
    text: '最近30天',
    value: () => {
      const end = new Date()
      const start = new Date()
      start.setDate(start.getDate() - 30)
      return [start, end]
    },
  },
  {
    text: '本月',
    value: () => {
      const end = new Date()
      const start = new Date(end.getFullYear(), end.getMonth(), 1)
      return [start, end]
    },
  },
  {
    text: '上月',
    value: () => {
      const now = new Date()
      const start = new Date(now.getFullYear(), now.getMonth() - 1, 1)
      const end = new Date(now.getFullYear(), now.getMonth(), 0)
      return [start, end]
    },
  },
  {
    text: '本季度',
    value: () => {
      const now = new Date()
      const quarter = Math.floor(now.getMonth() / 3)
      const start = new Date(now.getFullYear(), quarter * 3, 1)
      return [start, now]
    },
  },
]
</script>

<style scoped>
.report-layout {
  display: flex;
  height: calc(100vh - 60px);
  background: #f5f7fa;
}

.report-sidebar {
  width: 200px;
  background: #fff;
  border-right: 1px solid #e8e8e8;
  overflow-y: auto;
  flex-shrink: 0;
}

.report-menu {
  border-right: none;
}

.report-content {
  flex: 1;
  overflow-y: auto;
  padding: 16px;
}

.report-filter-bar {
  display: flex;
  gap: 12px;
  margin-bottom: 16px;
  padding: 12px 16px;
  background: #fff;
  border-radius: 4px;
  align-items: center;
}
</style>
