<template>
  <el-dialog
    v-model="visible"
    title="选择产品"
    width="800px"
    destroy-on-close
    @close="$emit('update:modelValue', false)"
  >
    <div class="selector-toolbar">
      <el-input
        v-model="keyword"
        placeholder="搜索产品名称/编码"
        clearable
        style="width: 240px"
        @clear="fetchProducts"
        @keyup.enter="fetchProducts"
      >
        <template #prefix>
          <el-icon><Search /></el-icon>
        </template>
      </el-input>
    </div>

    <el-table
      v-loading="loading"
      :data="productList"
      style="width: 100%"
      @selection-change="handleSelectionChange"
    >
      <el-table-column type="selection" width="50" />
      <el-table-column prop="code" label="编码" width="120" />
      <el-table-column prop="name" label="产品名称" min-width="180" />
      <el-table-column label="单价" width="120" align="right">
        <template #default="{ row }">
          {{ Number(row.price).toFixed(2) }}
        </template>
      </el-table-column>
      <el-table-column prop="unit" label="单位" width="80" />
    </el-table>

    <div class="pagination-wrap">
      <el-pagination
        v-model:current-page="page"
        v-model:page-size="pageSize"
        :total="total"
        :page-sizes="[10, 20]"
        layout="total, prev, pager, next"
        small
        @current-change="fetchProducts"
      />
    </div>

    <template #footer>
      <el-button @click="visible = false">取消</el-button>
      <el-button type="primary" :disabled="selected.length === 0" @click="handleConfirm">
        确定 ({{ selected.length }})
      </el-button>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import { Search } from '@element-plus/icons-vue'
import { productApi, type ProductVO } from '@/api/product'

const props = defineProps<{
  modelValue: boolean
}>()

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  confirm: [products: ProductVO[]]
}>()

const visible = ref(props.modelValue)
watch(
  () => props.modelValue,
  (v) => {
    visible.value = v
  },
)
watch(visible, (v) => emit('update:modelValue', v))

const loading = ref(false)
const productList = ref<ProductVO[]>([])
const total = ref(0)
const page = ref(1)
const pageSize = ref(10)
const keyword = ref('')
const selected = ref<ProductVO[]>([])

function handleSelectionChange(rows: ProductVO[]) {
  selected.value = rows
}

async function fetchProducts() {
  loading.value = true
  try {
    const res = await productApi.getList({
      page: page.value,
      pageSize: pageSize.value,
      keyword: keyword.value || undefined,
      status: 'active' as ProductVO['status'],
    })
    productList.value = res.data?.list ?? []
    total.value = res.data?.total ?? 0
  } finally {
    loading.value = false
  }
}

function handleConfirm() {
  emit('confirm', selected.value)
  visible.value = false
}

watch(
  () => props.modelValue,
  (v) => {
    if (v) {
      page.value = 1
      keyword.value = ''
      selected.value = []
      fetchProducts()
    }
  },
)
</script>

<style scoped>
.selector-toolbar {
  margin-bottom: 12px;
}

.pagination-wrap {
  display: flex;
  justify-content: flex-end;
  margin-top: 12px;
}
</style>
