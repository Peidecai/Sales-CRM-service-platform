<template>
  <div class="annotation-page" style="padding: 20px">
    <el-card>
      <template #header>
        <span>全部批注</span>
      </template>

      <!-- Filters -->
      <el-form :inline="true" style="margin-bottom: 16px">
        <el-form-item label="目标类型">
          <el-select v-model="filters.targetType" clearable placeholder="全部" @change="loadList">
            <el-option label="客户" :value="AnnotationTargetType.CUSTOMER" />
            <el-option label="商机" :value="AnnotationTargetType.OPPORTUNITY" />
            <el-option label="通话记录" :value="AnnotationTargetType.CALL_RECORD" />
            <el-option label="合同" :value="AnnotationTargetType.CONTRACT" />
          </el-select>
        </el-form-item>
        <el-form-item label="状态">
          <el-select v-model="filters.resolved" clearable placeholder="全部" @change="loadList">
            <el-option label="未解决" :value="false" />
            <el-option label="已解决" :value="true" />
          </el-select>
        </el-form-item>
      </el-form>

      <el-table v-loading="loading" :data="list" stripe>
        <el-table-column prop="targetType" label="目标类型" width="120">
          <template #default="{ row }">
            {{ targetTypeLabel(row.targetType) }}
          </template>
        </el-table-column>
        <el-table-column prop="targetId" label="目标ID" width="100" />
        <el-table-column prop="content" label="内容" min-width="300" show-overflow-tooltip />
        <el-table-column prop="resolved" label="状态" width="100">
          <template #default="{ row }">
            <el-tag :type="row.resolved ? 'success' : 'warning'" size="small">
              {{ row.resolved ? '已解决' : '待解决' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="createdAt" label="创建时间" width="170">
          <template #default="{ row }">
            {{ new Date(row.createdAt).toLocaleString('zh-CN') }}
          </template>
        </el-table-column>
        <el-table-column label="操作" width="120" fixed="right">
          <template #default="{ row }">
            <el-button
              v-if="!row.resolved"
              type="success"
              size="small"
              text
              @click="handleResolve(row.id)"
            >
              解决
            </el-button>
          </template>
        </el-table-column>
      </el-table>

      <el-pagination
        v-model:current-page="page"
        v-model:page-size="pageSize"
        style="margin-top: 16px; justify-content: flex-end"
        :total="total"
        layout="total, sizes, prev, pager, next"
        :page-sizes="[10, 20, 50]"
        @current-change="loadList"
        @size-change="loadList"
      />
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import { AnnotationTargetType } from '@crm/shared'
import { annotationApi, type AnnotationVO } from '@/api/annotation'

const list = ref<AnnotationVO[]>([])
const loading = ref(false)
const total = ref(0)
const page = ref(1)
const pageSize = ref(20)

const filters = reactive<{
  targetType?: AnnotationTargetType
  resolved?: boolean
}>({})

async function loadList() {
  loading.value = true
  try {
    const res = await annotationApi.list({
      page: page.value,
      pageSize: pageSize.value,
      ...filters,
    })
    const data = res as unknown as { list: AnnotationVO[]; total: number }
    list.value = data.list
    total.value = data.total
  } catch {
    // handled by interceptor
  } finally {
    loading.value = false
  }
}

async function handleResolve(id: number) {
  await annotationApi.resolve(id)
  ElMessage.success('已解决')
  await loadList()
}

function targetTypeLabel(t: AnnotationTargetType): string {
  const map: Record<string, string> = {
    customer: '客户',
    opportunity: '商机',
    call_record: '通话记录',
    contract: '合同',
  }
  return map[t] ?? t
}

onMounted(loadList)
</script>
