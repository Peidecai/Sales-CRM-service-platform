<template>
  <div class="pk-detail">
    <el-page-header :title="'返回'" :content="pk?.title ?? 'PK详情'" @back="$router.push('/pk')" />

    <div v-loading="loading" class="detail-content">
      <template v-if="pk">
        <!-- Status + Info -->
        <el-card class="info-card">
          <div class="info-row">
            <el-tag :type="statusTagType(pk.status)">{{ statusLabel(pk.status) }}</el-tag>
            <el-tag type="info">{{ metricLabel(pk.metric) }}</el-tag>
            <span class="date-range"
              >{{ formatDate(pk.startDate) }} ~ {{ formatDate(pk.endDate) }}</span
            >
            <span v-if="pk.stake" class="stake-text">赌注: {{ pk.stake }}</span>
          </div>
          <div v-if="pk.status === 'active'" class="countdown-bar">
            <el-icon><Timer /></el-icon>
            <span>{{ countdown(pk.endDate) }}</span>
          </div>
          <div v-if="pk.result" class="result-banner" :class="pk.result">
            {{ resultLabel(pk.result) }}
          </div>
        </el-card>

        <!-- Scoreboard -->
        <el-card class="score-card">
          <template #header><span>积分榜</span></template>
          <div class="scoreboard">
            <div class="score-team" :class="{ winner: teamA?.isWinner }">
              <div class="score-team-name">{{ teamA?.name ?? 'A队' }}</div>
              <div class="score-value">{{ Number(teamA?.score ?? 0).toFixed(0) }}</div>
            </div>
            <div class="score-vs">VS</div>
            <div class="score-team" :class="{ winner: teamB?.isWinner }">
              <div class="score-team-name">{{ teamB?.name ?? 'B队' }}</div>
              <div class="score-value">{{ Number(teamB?.score ?? 0).toFixed(0) }}</div>
            </div>
          </div>
          <!-- Progress bar comparison -->
          <div class="score-bar-wrap">
            <el-progress
              :percentage="scorePercentA"
              :stroke-width="20"
              :show-text="false"
              color="#409eff"
              class="score-bar"
            />
            <el-progress
              :percentage="scorePercentB"
              :stroke-width="20"
              :show-text="false"
              color="#e6a23c"
              class="score-bar"
            />
          </div>
        </el-card>

        <!-- Ranking Table -->
        <el-card class="ranking-card">
          <template #header><span>成员贡献排行</span></template>
          <el-table :data="ranking" stripe>
            <el-table-column label="排名" type="index" width="70" />
            <el-table-column label="姓名" prop="user.name" min-width="120" />
            <el-table-column label="队伍" min-width="100">
              <template #default="{ row }">{{ row.team?.name ?? '-' }}</template>
            </el-table-column>
            <el-table-column label="贡献值" prop="contribution" sortable min-width="120">
              <template #default="{ row }">{{ Number(row.contribution).toFixed(2) }}</template>
            </el-table-column>
          </el-table>
        </el-card>

        <!-- Admin actions -->
        <div v-if="isAdmin" class="admin-actions">
          <el-button v-if="pk.status === 'pending'" type="primary" @click="handleStart"
            >开始PK</el-button
          >
          <el-button v-if="pk.status === 'active'" type="success" @click="handleSettle"
            >手动结算</el-button
          >
          <el-button type="danger" @click="handleDelete">删除</el-button>
        </div>
      </template>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Timer } from '@element-plus/icons-vue'
import { UserRole } from '@crm/shared'
import { useUserStore } from '@/stores/user'
import {
  getPkDetail,
  getPkRanking,
  startPk,
  settlePk,
  deletePk,
  type PkItem,
  type PkTeamMember,
  type PkTeamInfo,
} from '@/api/pk'

const route = useRoute()
const router = useRouter()
const userStore = useUserStore()
const isAdmin = computed(() => userStore.userRole === UserRole.ADMIN)

const loading = ref(false)
const pk = ref<PkItem | null>(null)
const ranking = ref<PkTeamMember[]>([])

const pkId = computed(() => Number(route.params.id))
const teamA = computed<PkTeamInfo | undefined>(() => pk.value?.teams?.find((t) => t.side === 'A'))
const teamB = computed<PkTeamInfo | undefined>(() => pk.value?.teams?.find((t) => t.side === 'B'))

const scorePercentA = computed(() => {
  const a = Number(teamA.value?.score ?? 0)
  const b = Number(teamB.value?.score ?? 0)
  const sum = a + b
  return sum === 0 ? 50 : Math.round((a / sum) * 100)
})
const scorePercentB = computed(() => {
  const a = Number(teamA.value?.score ?? 0)
  const b = Number(teamB.value?.score ?? 0)
  const sum = a + b
  return sum === 0 ? 50 : Math.round((b / sum) * 100)
})

function formatDate(d: string): string {
  return new Date(d).toLocaleDateString('zh-CN')
}

function statusTagType(status: string): 'success' | 'primary' | 'warning' | 'info' | 'danger' {
  const map: Record<string, 'success' | 'primary' | 'warning' | 'info' | 'danger'> = {
    pending: 'warning',
    active: 'primary',
    finished: 'success',
    cancelled: 'info',
  }
  return map[status] ?? 'info'
}
function statusLabel(s: string): string {
  return { pending: '待开始', active: '进行中', finished: '已结束', cancelled: '已取消' }[s] ?? s
}
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
function countdown(endDate: string): string {
  const diff = new Date(endDate).getTime() - Date.now()
  if (diff <= 0) return '已结束'
  const d = Math.floor(diff / 86400000)
  const h = Math.floor((diff % 86400000) / 3600000)
  return d > 0 ? `剩余 ${d}天${h}时` : `剩余 ${h}小时`
}

async function fetchData() {
  loading.value = true
  try {
    pk.value = (await getPkDetail(pkId.value)) as unknown as PkItem
    ranking.value = (await getPkRanking(pkId.value)) as unknown as PkTeamMember[]
  } finally {
    loading.value = false
  }
}

async function handleStart() {
  await ElMessageBox.confirm('确定开始此PK？', '提示')
  await startPk(pkId.value)
  ElMessage.success('PK已开始')
  fetchData()
}

async function handleSettle() {
  await ElMessageBox.confirm('确定手动结算此PK？', '提示')
  await settlePk(pkId.value)
  ElMessage.success('PK已结算')
  fetchData()
}

async function handleDelete() {
  await ElMessageBox.confirm('确定删除此PK？', '警告', { type: 'warning' })
  await deletePk(pkId.value)
  ElMessage.success('已删除')
  router.push('/pk')
}

onMounted(fetchData)
</script>

<style scoped>
.pk-detail {
  padding: 20px;
}
.detail-content {
  margin-top: 20px;
  display: flex;
  flex-direction: column;
  gap: 16px;
}
.info-card .info-row {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
}
.date-range {
  color: #909399;
  font-size: 13px;
}
.stake-text {
  color: #e6a23c;
  font-size: 13px;
}
.countdown-bar {
  margin-top: 12px;
  display: flex;
  align-items: center;
  gap: 6px;
  color: #e6a23c;
  font-size: 14px;
}
.result-banner {
  margin-top: 12px;
  padding: 12px;
  border-radius: 6px;
  text-align: center;
  font-size: 18px;
  font-weight: 700;
}
.result-banner.team_a_win {
  background: #ecf5ff;
  color: #409eff;
}
.result-banner.team_b_win {
  background: #fdf6ec;
  color: #e6a23c;
}
.result-banner.draw {
  background: #f4f4f5;
  color: #909399;
}
.scoreboard {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 40px;
  padding: 24px 0;
}
.score-team {
  text-align: center;
}
.score-team.winner .score-value {
  color: #67c23a;
}
.score-team-name {
  font-size: 16px;
  color: #606266;
  margin-bottom: 8px;
}
.score-value {
  font-size: 48px;
  font-weight: 700;
  color: #303133;
}
.score-vs {
  font-size: 24px;
  font-weight: 700;
  color: #c0c4cc;
}
.score-bar-wrap {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.score-bar {
  width: 100%;
}
.admin-actions {
  display: flex;
  gap: 12px;
  justify-content: flex-end;
}
</style>
