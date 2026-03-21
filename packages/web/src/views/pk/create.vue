<template>
  <div class="pk-create">
    <el-page-header title="返回" content="发起PK" @back="$router.push('/pk')" />

    <el-card class="create-card">
      <el-steps :active="step" finish-status="success" align-center class="steps">
        <el-step title="类型" />
        <el-step title="指标" />
        <el-step title="时间" />
        <el-step title="队伍" />
        <el-step title="确认" />
      </el-steps>

      <div class="step-content">
        <!-- Step 0: Type -->
        <div v-if="step === 0">
          <h3>选择PK类型</h3>
          <el-radio-group v-model="form.type" size="large">
            <el-radio-button value="one_on_one">1v1 单挑</el-radio-button>
            <el-radio-button value="team_vs_team">多人团战</el-radio-button>
          </el-radio-group>
        </div>

        <!-- Step 1: Metric -->
        <div v-if="step === 1">
          <h3>选择PK指标</h3>
          <el-radio-group v-model="form.metric" size="large">
            <el-radio-button value="revenue">签单金额</el-radio-button>
            <el-radio-button value="deal_count">成交数</el-radio-button>
            <el-radio-button value="call_count">通话数</el-radio-button>
            <el-radio-button value="new_customer">新客户</el-radio-button>
            <el-radio-button value="collection">回款额</el-radio-button>
          </el-radio-group>
        </div>

        <!-- Step 2: Dates -->
        <div v-if="step === 2">
          <h3>设置时间范围</h3>
          <el-date-picker
            v-model="dateRange"
            type="datetimerange"
            range-separator="至"
            start-placeholder="开始时间"
            end-placeholder="结束时间"
          />
        </div>

        <!-- Step 3: Teams -->
        <div v-if="step === 3">
          <h3>组建队伍</h3>
          <div class="teams-setup">
            <div v-for="(team, idx) in form.teams" :key="idx" class="team-setup">
              <el-input
                v-model="team.name"
                :placeholder="`${idx === 0 ? 'A' : 'B'}队名称`"
                class="team-name-input"
              />
              <el-select
                v-model="team.memberIds"
                multiple
                placeholder="选择成员"
                class="member-select"
              >
                <el-option v-for="u in userList" :key="u.id" :label="u.name" :value="u.id" />
              </el-select>
            </div>
          </div>
        </div>

        <!-- Step 4: Confirm -->
        <div v-if="step === 4">
          <h3>确认信息</h3>
          <el-descriptions :column="2" border>
            <el-descriptions-item label="PK标题">
              <el-input v-model="form.title" placeholder="输入PK标题" />
            </el-descriptions-item>
            <el-descriptions-item label="类型">
              {{ form.type === 'one_on_one' ? '1v1' : '团战' }}
            </el-descriptions-item>
            <el-descriptions-item label="指标">{{ metricLabel(form.metric) }}</el-descriptions-item>
            <el-descriptions-item label="时间">{{ formatDateRange() }}</el-descriptions-item>
            <el-descriptions-item label="A队">
              {{ form.teams[0].name }} ({{ form.teams[0].memberIds.length }}人)
            </el-descriptions-item>
            <el-descriptions-item label="B队">
              {{ form.teams[1].name }} ({{ form.teams[1].memberIds.length }}人)
            </el-descriptions-item>
          </el-descriptions>
          <el-input v-model="form.stake" placeholder="赌注（可选）" class="stake-input" />
        </div>
      </div>

      <div class="step-actions">
        <el-button v-if="step > 0" @click="step--">上一步</el-button>
        <el-button v-if="step < 4" type="primary" @click="step++">下一步</el-button>
        <el-button v-if="step === 4" type="primary" :loading="submitting" @click="handleSubmit">
          创建PK
        </el-button>
      </div>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { createPk } from '@/api/pk'
import { userApi } from '@/api/user'

const router = useRouter()
const step = ref(0)
const submitting = ref(false)
const dateRange = ref<[Date, Date] | null>(null)
const userList = ref<Array<{ id: number; name: string }>>([])

const form = reactive({
  title: '',
  type: 'one_on_one',
  metric: 'revenue',
  stake: '',
  teams: [
    { name: 'A队', side: 'A', memberIds: [] as number[] },
    { name: 'B队', side: 'B', memberIds: [] as number[] },
  ],
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

function formatDateRange(): string {
  if (!dateRange.value) return '-'
  return `${dateRange.value[0].toLocaleDateString('zh-CN')} ~ ${dateRange.value[1].toLocaleDateString('zh-CN')}`
}

async function fetchUsers() {
  try {
    const res = (await userApi.getList({ pageSize: 200 })) as unknown as {
      data: { list: Array<{ id: number; name: string }> }
    }
    userList.value = res.data?.list ?? []
  } catch {
    userList.value = []
  }
}

async function handleSubmit() {
  if (!form.title) {
    ElMessage.warning('请输入PK标题')
    return
  }
  if (!dateRange.value) {
    ElMessage.warning('请选择时间范围')
    return
  }
  if (form.teams[0].memberIds.length === 0 || form.teams[1].memberIds.length === 0) {
    ElMessage.warning('每队至少需要1名成员')
    return
  }

  submitting.value = true
  try {
    await createPk({
      title: form.title,
      type: form.type,
      metric: form.metric,
      startDate: dateRange.value[0].toISOString(),
      endDate: dateRange.value[1].toISOString(),
      stake: form.stake || undefined,
      teams: form.teams,
    })
    ElMessage.success('PK创建成功')
    router.push('/pk')
  } finally {
    submitting.value = false
  }
}

onMounted(fetchUsers)
</script>

<style scoped>
.pk-create {
  padding: 20px;
}
.create-card {
  margin-top: 20px;
}
.steps {
  margin-bottom: 32px;
}
.step-content {
  min-height: 200px;
  padding: 20px 0;
}
.step-content h3 {
  margin-bottom: 16px;
  color: #303133;
}
.teams-setup {
  display: flex;
  gap: 24px;
}
.team-setup {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.team-name-input {
  max-width: 200px;
}
.member-select {
  width: 100%;
}
.stake-input {
  margin-top: 16px;
  max-width: 400px;
}
.step-actions {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  padding-top: 20px;
  border-top: 1px solid #ebeef5;
}
</style>
