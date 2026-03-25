<template>
  <div class="pk-container">
    <div class="page-header">
      <h2>销售PK</h2>
      <div class="header-actions">
        <el-radio-group v-model="activeTab" @change="fetchList">
          <el-radio-button value="active">进行中</el-radio-button>
          <el-radio-button value="pending">待开始</el-radio-button>
          <el-radio-button value="finished">已结束</el-radio-button>
        </el-radio-group>
        <el-button v-if="isAdminOrManager" type="primary" @click="$router.push('/pk/create')">
          <el-icon><Plus /></el-icon> 发起PK
        </el-button>
      </div>
    </div>

    <div v-loading="loading" class="pk-cards">
      <el-empty v-if="!loading && pkList.length === 0" description="暂无PK记录" />
      <div v-for="pk in pkList" :key="pk.id" class="pk-card" @click="$router.push(`/pk/${pk.id}`)">
        <div class="pk-card-header">
          <span class="pk-title">{{ pk.title }}</span>
          <el-tag :type="statusTagType(pk.status)" size="small">
            {{ statusLabel(pk.status) }}
          </el-tag>
        </div>
        <div class="pk-card-metric">
          <el-tag type="info" size="small">{{ metricLabel(pk.metric) }}</el-tag>
          <span v-if="pk.status === 'active'" class="countdown">{{ countdown(pk.endDate) }}</span>
          <span v-if="pk.result" class="result-text">{{ resultLabel(pk.result) }}</span>
        </div>
        <div class="pk-card-teams">
          <div class="team-block team-a">
            <span class="team-name">{{ getTeam(pk, 'A')?.name ?? 'A队' }}</span>
            <span class="team-score">{{ Number(getTeam(pk, 'A')?.score ?? 0).toFixed(0) }}</span>
          </div>
          <span class="vs-text">VS</span>
          <div class="team-block team-b">
            <span class="team-score">{{ Number(getTeam(pk, 'B')?.score ?? 0).toFixed(0) }}</span>
            <span class="team-name">{{ getTeam(pk, 'B')?.name ?? 'B队' }}</span>
          </div>
        </div>
      </div>
    </div>

    <div v-if="total > pageSize" class="pagination-wrap">
      <el-pagination
        v-model:current-page="page"
        :page-size="pageSize"
        :total="total"
        layout="total, prev, pager, next"
        @current-change="fetchList"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { Plus } from '@element-plus/icons-vue'
import { usePermission } from '@/composables/usePermission'
import { getPkList, type PkItem, type PkTeamInfo } from '@/api/pk'

const { isAdminOrManager } = usePermission()
const activeTab = ref('active')
const loading = ref(false)
const pkList = ref<PkItem[]>([])
const page = ref(1)
const pageSize = 20
const total = ref(0)

function getTeam(pk: PkItem, side: string): PkTeamInfo | undefined {
  return pk.teams?.find((t) => t.side === side)
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

function statusLabel(status: string): string {
  const map: Record<string, string> = {
    pending: '待开始',
    active: '进行中',
    finished: '已结束',
    cancelled: '已取消',
  }
  return map[status] ?? status
}

function metricLabel(metric: string): string {
  const map: Record<string, string> = {
    revenue: '签单金额',
    deal_count: '成交数',
    call_count: '通话数',
    new_customer: '新客户',
    collection: '回款额',
  }
  return map[metric] ?? metric
}

function resultLabel(result: string): string {
  const map: Record<string, string> = { team_a_win: 'A队获胜', team_b_win: 'B队获胜', draw: '平局' }
  return map[result] ?? result
}

function countdown(endDate: string): string {
  const diff = new Date(endDate).getTime() - Date.now()
  if (diff <= 0) return '已结束'
  const days = Math.floor(diff / 86400000)
  const hours = Math.floor((diff % 86400000) / 3600000)
  return days > 0 ? `剩余 ${days}天${hours}时` : `剩余 ${hours}小时`
}

async function fetchList() {
  loading.value = true
  try {
    const res = (await getPkList({
      status: activeTab.value,
      page: page.value,
      pageSize,
    })) as unknown as {
      list: PkItem[]
      total: number
    }
    pkList.value = res.list
    total.value = res.total
  } finally {
    loading.value = false
  }
}

onMounted(fetchList)
</script>

<style scoped>
.pk-container {
  padding: 20px;
}
.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}
.page-header h2 {
  margin: 0;
  font-size: 20px;
}
.header-actions {
  display: flex;
  gap: 12px;
  align-items: center;
}
.pk-cards {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(360px, 1fr));
  gap: 16px;
}
.pk-card {
  background: #fff;
  border-radius: 8px;
  padding: 20px;
  cursor: pointer;
  border: 1px solid #ebeef5;
  transition: box-shadow 0.2s;
}
.pk-card:hover {
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}
.pk-card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}
.pk-title {
  font-size: 16px;
  font-weight: 600;
  color: #303133;
}
.pk-card-metric {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 16px;
}
.countdown {
  color: #e6a23c;
  font-size: 13px;
}
.result-text {
  color: #67c23a;
  font-size: 13px;
  font-weight: 600;
}
.pk-card-teams {
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.team-block {
  display: flex;
  align-items: center;
  gap: 12px;
  flex: 1;
}
.team-a {
  justify-content: flex-start;
}
.team-b {
  justify-content: flex-end;
}
.team-name {
  font-size: 14px;
  color: #606266;
}
.team-score {
  font-size: 24px;
  font-weight: 700;
  color: #409eff;
}
.vs-text {
  font-size: 18px;
  font-weight: 700;
  color: #c0c4cc;
  margin: 0 16px;
}
.pagination-wrap {
  margin-top: 20px;
  display: flex;
  justify-content: center;
}
</style>
