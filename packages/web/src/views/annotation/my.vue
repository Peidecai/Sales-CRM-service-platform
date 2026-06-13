<template>
  <div class="my-annotation-page" style="padding: 20px">
    <el-card>
      <template #header>
        <span>我的批注</span>
      </template>

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
import { ref, onMounted } from 'vue'
import { AnnotationTargetType } from '@crm/shared'
import { annotationApi, type AnnotationVO } from '@/api/annotation'

const list = ref<AnnotationVO[]>([])
const loading = ref(false)
const total = ref(0)
const page = ref(1)
const pageSize = ref(20)

async function loadList() {
  loading.value = true
  try {
    const res = await annotationApi.getMy({
      page: page.value,
      pageSize: pageSize.value,
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
