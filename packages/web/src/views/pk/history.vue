<template>
  <div class="pk-history">
    <el-page-header title="返回" content="PK历史" @back="$router.push('/pk')" />

    <div class="history-content">
      <!-- Personal Stats Card -->
      <el-card class="stats-card">
        <template #header><span>我的战绩</span></template>
        <div v-loading="statsLoading" class="stats-row">
          <div class="stat-item">
            <span class="stat-value win">{{ stats.wins }}</span>
            <span class="stat-label">胜</span>
          </div>
          <div class="stat-item">
            <span class="stat-value lose">{{ stats.losses }}</span>
            <span class="stat-label">负</span>
          </div>
          <div class="stat-item">
            <span class="stat-value draw">{{ stats.draws }}</span>
            <span class="stat-label">平</span>
          </div>
          <div class="stat-item">
            <span class="stat-value">{{ winRate }}%</span>
            <span class="stat-label">胜率</span>
          </div>
        </div>
      </el-card>

      <!-- Badge Wall -->
      <el-card class="badge-card">
        <template #header><span>徽章墙</span></template>
        <div v-loading="badgesLoading" class="badge-wall">
          <el-empty v-if="badges.length === 0" description="暂无徽章" :image-size="60" />
          <div v-for="badge in badges" :key="badge.id" class="badge-item">
            <el-tag :type="badgeTagType(badge.type)" size="large" effect="dark">
              {{ badgeLabel(badge.type) }}
            </el-tag>
          </div>
        </div>
      </el-card>

      <!-- History List -->
      <el-card>
        <template #header><span>历史记录</span></template>
        <el-table v-loading="loading" :data="historyList" stripe>
          <el-table-column label="标题" prop="title" min-width="180" />
          <el-table-column label="指标" min-width="100">
            <template #default="{ row }">{{ metricLabel(row.metric) }}</template>
          </el-table-column>
          <el-table-column label="结果" min-width="100">
            <template #default="{ row }">
              <el-tag :type="row.result === 'draw' ? 'info' : 'success'">{{
                resultLabel(row.result)
              }}</el-tag>
            </template>
          </el-table-column>
          <el-table-column label="时间" min-width="160">
            <template #default="{ row }">{{
              new Date(row.endDate).toLocaleDateString('zh-CN')
            }}</template>
          </el-table-column>
          <el-table-column label="操作" width="100">
            <template #default="{ row }">
              <el-button text type="primary" @click="$router.push(`/pk/${row.id}`)">详情</el-button>
            </template>
          </el-table-column>
        </el-table>
      </el-card>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import {
  getPkHistory,
  getMyPkStats,
  getMyBadges,
  type PkItem,
  type PkMyStats,
  type PkBadgeItem,
} from '@/api/pk'

const loading = ref(false)
const statsLoading = ref(false)
const badgesLoading = ref(false)
const historyList = ref<PkItem[]>([])
const stats = ref<PkMyStats>({ wins: 0, losses: 0, draws: 0, total: 0 })
const badges = ref<PkBadgeItem[]>([])

const winRate = computed(() => {
  if (stats.value.total === 0) return 0
  return Math.round((stats.value.wins / stats.value.total) * 100)
})

function metricLabel(m: string): string {
  return (
    {
      revenue: '签单金额',
      deal_count: '成交数',
      call_count: '通话数',
      new_customer: '新客户',
      collection: '回款额',
    }[m] ?? m
  )
}
function resultLabel(r: string): string {
  return { team_a_win: 'A队获胜', team_b_win: 'B队获胜', draw: '平局' }[r] ?? r
}
function badgeLabel(type: string): string {
  return (
    { first_win: '首胜', streak_3: '三连胜', streak_5: '五连胜', mvp: 'MVP', comeback: '逆转' }[
      type
    ] ?? type
  )
}
function badgeTagType(type: string): 'success' | 'primary' | 'warning' | 'danger' | 'info' {
  return ({
    first_win: 'primary',
    streak_3: 'warning',
    streak_5: 'danger',
    mvp: 'success',
    comeback: 'info',
  }[type] ?? 'primary') as 'success' | 'primary' | 'warning' | 'danger' | 'info'
}

async function fetchAll() {
  loading.value = true
  statsLoading.value = true
  badgesLoading.value = true
  try {
    const [historyRes, statsRes, badgesRes] = await Promise.all([
      getPkHistory({ page: 1, pageSize: 50 }),
      getMyPkStats(),
      getMyBadges(),
    ])
    historyList.value = (historyRes as unknown as { list: PkItem[] }).list
    stats.value = statsRes as unknown as PkMyStats
    badges.value = badgesRes as unknown as PkBadgeItem[]
  } finally {
    loading.value = false
    statsLoading.value = false
    badgesLoading.value = false
  }
}

onMounted(fetchAll)
</script>

<style scoped>
.pk-history {
  padding: 20px;
}
.history-content {
  margin-top: 20px;
  display: flex;
  flex-direction: column;
  gap: 16px;
}
.stats-row {
  display: flex;
  justify-content: space-around;
  padding: 16px 0;
}
.stat-item {
  text-align: center;
}
.stat-value {
  display: block;
  font-size: 32px;
  font-weight: 700;
  color: #303133;
}
.stat-value.win {
  color: #67c23a;
}
.stat-value.lose {
  color: #f56c6c;
}
.stat-value.draw {
  color: #909399;
}
.stat-label {
  font-size: 13px;
  color: #909399;
}
.badge-wall {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  padding: 12px 0;
}
.badge-item {
  display: inline-block;
}
</style>
