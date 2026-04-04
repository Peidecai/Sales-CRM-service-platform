<template>
  <div class="product-detail-page">
    <div v-loading="loading" class="detail-card">
      <div class="detail-header">
        <h2>{{ product?.name ?? '产品详情' }}</h2>
        <div v-if="isAdminOrManager" class="detail-actions">
          <el-button type="primary" @click="handleEdit">编辑</el-button>
          <el-button @click="router.back()">返回</el-button>
        </div>
        <el-button v-else @click="router.back()">返回</el-button>
      </div>

      <el-descriptions v-if="product" :column="2" border>
        <el-descriptions-item label="产品编码">{{ product.code }}</el-descriptions-item>
        <el-descriptions-item label="产品名称">{{ product.name }}</el-descriptions-item>
        <el-descriptions-item label="分类">
          {{ product.category?.name ?? '-' }}
        </el-descriptions-item>
        <el-descriptions-item label="单价">
          {{ Number(product.price).toFixed(2) }}
        </el-descriptions-item>
        <el-descriptions-item label="单位">{{ product.unit }}</el-descriptions-item>
        <el-descriptions-item label="状态">
          <el-tag :type="statusTagType(product.status)" size="small">
            {{ statusLabel(product.status) }}
          </el-tag>
        </el-descriptions-item>
        <el-descriptions-item label="描述" :span="2">
          {{ product.description ?? '-' }}
        </el-descriptions-item>
        <el-descriptions-item v-if="product.specs" label="规格参数" :span="2">
          <pre class="specs-json">{{ JSON.stringify(product.specs, null, 2) }}</pre>
        </el-descriptions-item>
        <el-descriptions-item label="创建时间">{{ product.createdAt }}</el-descriptions-item>
        <el-descriptions-item label="更新时间">{{ product.updatedAt }}</el-descriptions-item>
      </el-descriptions>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { usePermission } from '@/composables/usePermission'
import { productApi, type ProductVO } from '@/api/product'

const route = useRoute()
const router = useRouter()
const { isAdminOrManager } = usePermission()

const loading = ref(false)
const product = ref<ProductVO | null>(null)

function statusLabel(status: string): string {
  const map: Record<string, string> = { active: '上架', inactive: '下架', discontinued: '停产' }
  return map[status] ?? status
}

function statusTagType(status: string): 'success' | 'info' | 'warning' | 'danger' | undefined {
  const map: Record<string, 'success' | 'info' | 'warning' | 'danger'> = {
    active: 'success',
    inactive: 'info',
    discontinued: 'danger',
  }
  return map[status] ?? 'info'
}

function handleEdit() {
  // Navigate back to list with edit action — or could open inline editor
  router.push('/product')
}

async function fetchProduct() {
  const id = Number(route.params.id)
  if (!id) return
  loading.value = true
  try {
    const res = await productApi.getDetail(id)
    product.value = res.data ?? null
  } catch {
    // handled by interceptor
  } finally {
    loading.value = false
  }
}

onMounted(fetchProduct)
</script>

<style scoped>
.product-detail-page {
  padding: 20px;
}

.detail-card {
  background: #fff;
  border-radius: 4px;
  padding: 24px;
  border: 1px solid #ebeef5;
}

.detail-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
}

.detail-header h2 {
  margin: 0;
  font-size: 18px;
}

.detail-actions {
  display: flex;
  gap: 8px;
}

.specs-json {
  margin: 0;
  white-space: pre-wrap;
  font-size: 13px;
  color: #606266;
}
</style>
