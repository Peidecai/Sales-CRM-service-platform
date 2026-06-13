<template>
  <div class="page-container">
    <!-- Filter Bar -->
    <el-card shadow="never" class="filter-card">
      <el-form :inline="true">
        <el-form-item label="员工">
          <el-select
            v-model="selectedUserId"
            clearable
            placeholder="全部"
            style="width: 180px"
            @change="loadSingleUser"
          >
            <el-option v-for="u in users" :key="u.id" :label="u.name" :value="u.id" />
          </el-select>
        </el-form-item>
        <el-form-item label="月份">
          <el-date-picker
            v-model="selectedMonth"
            type="month"
            placeholder="选择月份"
            value-format="YYYY-MM"
            style="width: 160px"
            @change="loadCards"
          />
        </el-form-item>
      </el-form>
    </el-card>

    <!-- Cards Grid -->
    <div v-if="cards.length > 0" class="cards-grid">
      <el-card v-for="card in cards" :key="card.userId" shadow="hover" class="portrait-card">
        <!-- Card Header -->
        <div class="card-head">
          <el-avatar :size="48" class="card-avatar">
            {{ card.userName?.charAt(0) ?? 'U' }}
          </el-avatar>
          <div class="card-info">
            <div class="card-name">{{ card.userName }}</div>
            <div class="card-badges">
              <el-tooltip
                v-for="badge in card.badges.slice(0, 4)"
                :key="badge.id"
                :content="badge.badgeType"
              >
                <span class="badge-icon">{{ badgeEmoji(badge.badgeType) }}</span>
              </el-tooltip>
            </div>
          </div>
        </div>

        <!-- 6D Radar -->
        <div :ref="(el) => setRadarRef(card.userId, el as HTMLElement)" class="radar-chart" />

        <!-- AI Narrative -->
        <div class="narrative-text">{{ card.narrative }}</div>

        <!-- View Detail -->
        <div class="card-footer">
          <el-button
            type="primary"
            link
            size="small"
            @click="$router.push(`/ai/employee-profile/${card.userId}`)"
          >
            查看详情 →
          </el-button>
        </div>
      </el-card>
    </div>
    <el-empty v-else-if="!loading" description="暂无员工画像数据" />
    <el-skeleton v-if="loading" :rows="6" animated />

    <!-- Pagination -->
    <div v-if="total > pageSize" class="pagination-wrap">
      <el-pagination
        v-model:current-page="page"
        :page-size="pageSize"
        :total="total"
        layout="total, prev, pager, next"
        @current-change="loadCards"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, nextTick } from 'vue'
import { ElMessage } from 'element-plus'
import { useRouter } from 'vue-router'
import * as echarts from 'echarts'
import type { ReportFilter } from '@/api/report'
import { userApi } from '@/api/user'
import {
  getEmployeeProfile,
  getEmployeePortraitCards,
  getEmployeeAchievements,
  getEmployeeNarrative,
} from '@/api/ai'

defineProps<{ filter: ReportFilter }>()

const $router = useRouter()
const loading = ref(false)
const users = ref<Array<{ id: number; name: string }>>([])
const selectedUserId = ref<number | undefined>()
const selectedMonth = ref<string | undefined>()
const page = ref(1)
const pageSize = 20
const total = ref(0)

interface BadgeVO {
  id: number
  badgeType: string
  earnedAt: string
  month: string | null
}
interface CardData {
  userId: number
  userName: string
  profile: Record<string, number>
  badges: BadgeVO[]
  narrative: string
}

const cards = ref<CardData[]>([])
const radarCharts = new Map<number, echarts.ECharts>()
const radarRefs = new Map<number, HTMLElement>()

function setRadarRef(userId: number, el: HTMLElement | null) {
  if (el) radarRefs.set(userId, el)
}

function badgeEmoji(type: string): string {
  const map: Record<string, string> = {
    电话精英: '📞',
    知识达人: '📚',
    执行力王: '⚡',
    满意之星: '⭐',
    成单高手: '🏆',
    方案专家: '💡',
  }
  return map[type] ?? '🎖️'
}

async function loadUsers() {
  try {
    const res = await userApi.getList({ page: 1, pageSize: 200 })
    const data = (res as unknown as { data: { list: Array<{ id: number; name: string }> } }).data
    users.value = data?.list ?? []
  } catch (e) {
    console.error(e)
    ElMessage.error('加载用户列表失败')
  }
}

async function loadCards() {
  loading.value = true
  try {
    const res = await getEmployeePortraitCards({
      page: page.value,
      pageSize,
      month: selectedMonth.value,
    })
    const data = (res as unknown as { data: { list: CardData[]; total: number } }).data
    cards.value = data?.list ?? []
    total.value = data?.total ?? 0

    await nextTick()
    renderAllRadars()
  } catch (e) {
    console.error(e)
    ElMessage.error('加载员工画像失败')
  } finally {
    loading.value = false
  }
}

async function loadSingleUser() {
  if (!selectedUserId.value) {
    loadCards()
    return
  }
  loading.value = true
  try {
    const [profileRes, badgesRes, narrativeRes] = await Promise.all([
      getEmployeeProfile(selectedUserId.value),
      getEmployeeAchievements(selectedUserId.value),
      getEmployeeNarrative(selectedUserId.value, selectedMonth.value),
    ])
    const profile = (profileRes as unknown as { data: Record<string, number> }).data ?? profileRes
    const badges = ((badgesRes as unknown as { data: BadgeVO[] }).data ?? []) as BadgeVO[]
    const narrative = ((narrativeRes as unknown as { data: { narrative: string } }).data
      ?.narrative ?? '') as string
    const user = users.value.find((u) => u.id === selectedUserId.value)

    cards.value = [
      {
        userId: selectedUserId.value,
        userName: user?.name ?? `用户${selectedUserId.value}`,
        profile: profile as Record<string, number>,
        badges,
        narrative,
      },
    ]
    total.value = 1

    await nextTick()
    renderAllRadars()
  } catch (e) {
    console.error(e)
    ElMessage.error('加载员工画像失败')
  } finally {
    loading.value = false
  }
}

function renderAllRadars() {
  // Dispose old charts
  for (const c of radarCharts.values()) c.dispose()
  radarCharts.clear()

  for (const card of cards.value) {
    const el = radarRefs.get(card.userId)
    if (!el) continue

    const chart = echarts.init(el)
    radarCharts.set(card.userId, chart)

    const indicators = [
      { name: '沟通能力', max: 100 },
      { name: '专业知识', max: 100 },
      { name: '执行力', max: 100 },
      { name: '满意度', max: 100 },
      { name: '成单率', max: 100 },
      { name: '解决方案', max: 100 },
    ]

    const p = card.profile
    chart.setOption({
      radar: {
        indicator: indicators,
        shape: 'polygon',
        radius: '65%',
      },
      series: [
        {
          type: 'radar',
          data: [
            {
              value: [
                p['communication'] ?? 0,
                p['professionalism'] ?? 0,
                p['execution'] ?? 0,
                p['satisfaction'] ?? 0,
                p['closeRate'] ?? 0,
                p['solutionAbility'] ?? 0,
              ],
              areaStyle: { opacity: 0.3 },
            },
          ],
        },
      ],
    })
  }
}

const handleResize = () => {
  for (const c of radarCharts.values()) c.resize()
}

onMounted(() => {
  window.addEventListener('resize', handleResize)
  loadUsers()
  loadCards()
})

onUnmounted(() => {
  window.removeEventListener('resize', handleResize)
  for (const c of radarCharts.values()) c.dispose()
})
</script>

<style scoped>
.page-container {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.filter-card :deep(.el-card__body) {
  padding: 12px 16px;
}

.cards-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(340px, 1fr));
  gap: 16px;
}

.portrait-card {
  display: flex;
  flex-direction: column;
}

.card-head {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 8px;
}

.card-avatar {
  background: linear-gradient(135deg, #409eff, #67c23a);
  color: #fff;
  font-size: 20px;
  font-weight: 600;
}

.card-info {
  flex: 1;
}

.card-name {
  font-size: 16px;
  font-weight: 600;
  color: #303133;
}

.card-badges {
  display: flex;
  gap: 4px;
  margin-top: 4px;
}

.badge-icon {
  font-size: 18px;
  cursor: default;
}

.radar-chart {
  height: 220px;
  margin: 4px 0;
}

.narrative-text {
  font-size: 13px;
  line-height: 1.6;
  color: #606266;
  background: #f5f7fa;
  padding: 10px;
  border-radius: 6px;
  border-left: 3px solid #409eff;
  margin: 8px 0;
  min-height: 40px;
}

.card-footer {
  text-align: right;
  margin-top: auto;
}

.pagination-wrap {
  display: flex;
  justify-content: center;
  margin-top: 16px;
}
</style>
