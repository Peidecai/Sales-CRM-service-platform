<template>
  <div class="customer-groups-page" style="padding: 20px">
    <el-card>
      <template #header>
        <div style="display: flex; justify-content: space-between; align-items: center">
          <span style="font-size: 18px; font-weight: 600">客户分组</span>
          <el-button type="primary" @click="showCreateDialog = true">
            <el-icon><Plus /></el-icon>
            新建分组
          </el-button>
        </div>
      </template>

      <el-row :gutter="16">
        <el-col
          v-for="group in groups"
          :key="group.id"
          :xs="24"
          :sm="12"
          :md="8"
          :lg="6"
          style="margin-bottom: 16px"
        >
          <el-card shadow="hover" class="group-card" @click="openDetail(group)">
            <div class="group-card-header">
              <span class="group-name">{{ group.name }}</span>
              <el-tag :type="group.type === 'dynamic' ? 'warning' : 'info'" size="small">
                {{ group.type === 'dynamic' ? '动态' : '静态' }}
              </el-tag>
            </div>
            <p class="group-desc">{{ group.description || '暂无描述' }}</p>
            <div class="group-meta">
              <span>成员: {{ group.memberCount }}</span>
              <span v-if="group.lastRefreshedAt">
                刷新: {{ formatDate(group.lastRefreshedAt) }}
              </span>
            </div>
            <div class="group-actions" @click.stop>
              <el-button
                v-if="group.type === 'dynamic'"
                text
                type="primary"
                size="small"
                :loading="refreshingId === group.id"
                @click="handleRefresh(group.id)"
              >
                刷新
              </el-button>
              <el-button text type="primary" size="small" @click="handleEdit(group)">
                编辑
              </el-button>
              <el-popconfirm title="确定删除此分组？" @confirm="handleDelete(group.id)">
                <template #reference>
                  <el-button v-if="isAdminOrManager" text type="danger" size="small">
                    删除
                  </el-button>
                </template>
              </el-popconfirm>
            </div>
          </el-card>
        </el-col>
      </el-row>

      <el-empty v-if="groups.length === 0" description="暂无分组" />

      <div style="display: flex; justify-content: flex-end; margin-top: 16px">
        <el-pagination
          v-model:current-page="page"
          :page-size="pageSize"
          :total="total"
          layout="total, prev, pager, next"
          @current-change="loadGroups"
        />
      </div>
    </el-card>

    <!-- Create / Edit Dialog -->
    <el-dialog
      v-model="showCreateDialog"
      :title="editingGroup ? '编辑分组' : '新建分组'"
      width="600px"
      @close="resetForm"
    >
      <el-form :model="form" label-width="80px">
        <el-form-item label="名称" required>
          <el-input v-model="form.name" maxlength="100" placeholder="分组名称" />
        </el-form-item>
        <el-form-item label="描述">
          <el-input
            v-model="form.description"
            type="textarea"
            maxlength="500"
            :rows="2"
            placeholder="分组描述"
          />
        </el-form-item>
        <el-form-item v-if="!editingGroup" label="类型" required>
          <el-radio-group v-model="form.type">
            <el-radio value="static">静态</el-radio>
            <el-radio value="dynamic">动态</el-radio>
          </el-radio-group>
        </el-form-item>
        <el-form-item v-if="form.type === 'dynamic'" label="规则">
          <GroupRuleBuilder v-model="form.rules" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showCreateDialog = false">取消</el-button>
        <el-button type="primary" :loading="saving" @click="handleSave">保存</el-button>
      </template>
    </el-dialog>

    <!-- Detail Drawer -->
    <el-drawer v-model="showDetail" :title="detailGroup?.name ?? ''" size="60%">
      <template v-if="detailGroup">
        <div style="margin-bottom: 16px">
          <el-descriptions :column="2" border>
            <el-descriptions-item label="类型">
              <el-tag :type="detailGroup.type === 'dynamic' ? 'warning' : 'info'" size="small">
                {{ detailGroup.type === 'dynamic' ? '动态' : '静态' }}
              </el-tag>
            </el-descriptions-item>
            <el-descriptions-item label="成员数">{{
              detailGroup.memberCount
            }}</el-descriptions-item>
            <el-descriptions-item label="描述" :span="2">
              {{ detailGroup.description || '-' }}
            </el-descriptions-item>
          </el-descriptions>
        </div>

        <!-- Analytics -->
        <el-card v-if="analytics" style="margin-bottom: 16px">
          <template #header><span>分析</span></template>
          <el-row :gutter="16">
            <el-col :span="12">
              <h4>状态分布</h4>
              <div v-for="(count, status) in analytics.statusDistribution" :key="status">
                {{ status }}: {{ count }}
              </div>
            </el-col>
            <el-col :span="12">
              <h4>行业分布</h4>
              <div v-for="(count, industry) in analytics.industryDistribution" :key="industry">
                {{ industry }}: {{ count }}
              </div>
            </el-col>
          </el-row>
        </el-card>

        <!-- Members -->
        <el-card>
          <template #header>
            <div style="display: flex; justify-content: space-between; align-items: center">
              <span>成员列表</span>
              <div>
                <el-button
                  v-if="detailGroup.type === 'dynamic'"
                  type="primary"
                  size="small"
                  @click="handleRefresh(detailGroup.id)"
                >
                  刷新
                </el-button>
              </div>
            </div>
          </template>
          <el-table :data="members" stripe>
            <el-table-column prop="id" label="ID" width="60" />
            <el-table-column prop="name" label="名称" />
            <el-table-column prop="company" label="公司" />
            <el-table-column prop="status" label="状态">
              <template #default="{ row }">
                <el-tag size="small">{{ row.status }}</el-tag>
              </template>
            </el-table-column>
            <el-table-column prop="industry" label="行业" />
          </el-table>
          <div style="display: flex; justify-content: flex-end; margin-top: 12px">
            <el-pagination
              v-model:current-page="memberPage"
              :page-size="memberPageSize"
              :total="memberTotal"
              layout="total, prev, pager, next"
              @current-change="loadMembers"
            />
          </div>
        </el-card>
      </template>
    </el-drawer>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import { Plus } from '@element-plus/icons-vue'
import { usePermission } from '@/composables/usePermission'
import {
  customerGroupApi,
  type CustomerGroupVO,
  type CustomerGroupMemberVO,
  type GroupAnalyticsVO,
} from '@/api/customer-group'
import type { GroupRule } from '@crm/shared'
import GroupRuleBuilder from './components/GroupRuleBuilder.vue'

const { isAdminOrManager } = usePermission()

const groups = ref<CustomerGroupVO[]>([])
const page = ref(1)
const pageSize = 20
const total = ref(0)
const saving = ref(false)
const refreshingId = ref<number | null>(null)
const showCreateDialog = ref(false)
const editingGroup = ref<CustomerGroupVO | null>(null)

const form = ref<{
  name: string
  description: string
  type: 'static' | 'dynamic'
  rules: GroupRule[]
}>({
  name: '',
  description: '',
  type: 'static',
  rules: [],
})

// Detail
const showDetail = ref(false)
const detailGroup = ref<CustomerGroupVO | null>(null)
const members = ref<CustomerGroupMemberVO[]>([])
const memberPage = ref(1)
const memberPageSize = 20
const memberTotal = ref(0)
const analytics = ref<GroupAnalyticsVO | null>(null)

onMounted(() => loadGroups())

async function loadGroups() {
  try {
    const res = await customerGroupApi.getList({ page: page.value, pageSize })
    groups.value = res.data?.list ?? []
    total.value = res.data?.total ?? 0
  } catch {
    ElMessage.error('加载分组失败')
  }
}

function resetForm() {
  editingGroup.value = null
  form.value = { name: '', description: '', type: 'static', rules: [] }
}

function handleEdit(group: CustomerGroupVO) {
  editingGroup.value = group
  form.value = {
    name: group.name,
    description: group.description ?? '',
    type: group.type,
    rules: group.rules ?? [],
  }
  showCreateDialog.value = true
}

async function handleSave() {
  if (!form.value.name) {
    ElMessage.warning('请输入分组名称')
    return
  }
  saving.value = true
  try {
    if (editingGroup.value) {
      await customerGroupApi.update(editingGroup.value.id, {
        name: form.value.name,
        description: form.value.description || undefined,
        rules: form.value.type === 'dynamic' ? form.value.rules : undefined,
      })
      ElMessage.success('更新成功')
    } else {
      await customerGroupApi.create({
        name: form.value.name,
        description: form.value.description || undefined,
        type: form.value.type,
        rules: form.value.type === 'dynamic' ? form.value.rules : undefined,
      })
      ElMessage.success('创建成功')
    }
    showCreateDialog.value = false
    resetForm()
    await loadGroups()
  } catch {
    ElMessage.error('保存失败')
  } finally {
    saving.value = false
  }
}

async function handleDelete(id: number) {
  try {
    await customerGroupApi.remove(id)
    ElMessage.success('删除成功')
    await loadGroups()
  } catch {
    ElMessage.error('删除失败')
  }
}

async function handleRefresh(id: number) {
  refreshingId.value = id
  try {
    await customerGroupApi.refresh(id)
    ElMessage.success('刷新成功')
    await loadGroups()
    if (detailGroup.value?.id === id) {
      await openDetail(detailGroup.value)
    }
  } catch {
    ElMessage.error('刷新失败')
  } finally {
    refreshingId.value = null
  }
}

async function openDetail(group: CustomerGroupVO) {
  detailGroup.value = group
  showDetail.value = true
  memberPage.value = 1
  await Promise.all([loadMembers(), loadAnalytics(group.id)])
}

async function loadMembers() {
  if (!detailGroup.value) return
  try {
    const res = await customerGroupApi.getMembers(detailGroup.value.id, {
      page: memberPage.value,
      pageSize: memberPageSize,
    })
    members.value = res.data?.list ?? []
    memberTotal.value = res.data?.total ?? 0
  } catch {
    ElMessage.error('加载成员失败')
  }
}

async function loadAnalytics(id: number) {
  try {
    const res = await customerGroupApi.getAnalytics(id)
    analytics.value = res.data
  } catch {
    analytics.value = null
  }
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('zh-CN')
}
</script>

<style scoped>
.group-card {
  cursor: pointer;
}

.group-card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.group-name {
  font-weight: 600;
  font-size: 15px;
}

.group-desc {
  color: #666;
  font-size: 13px;
  margin: 0 0 8px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.group-meta {
  display: flex;
  justify-content: space-between;
  font-size: 12px;
  color: #999;
  margin-bottom: 8px;
}

.group-actions {
  display: flex;
  gap: 4px;
}
</style>
