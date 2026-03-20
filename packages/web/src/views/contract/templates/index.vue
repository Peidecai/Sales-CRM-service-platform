<template>
  <div class="template-page">
    <el-card>
      <template #header>
        <div class="card-header">
          <span>合同模板管理</span>
          <el-button type="primary" @click="openDialog()">新建模板</el-button>
        </div>
      </template>

      <el-table v-loading="loading" :data="list" stripe>
        <el-table-column label="模板名称" prop="name" min-width="200" />
        <el-table-column label="分类" prop="category" width="120" />
        <el-table-column label="变量数" width="100" align="center">
          <template #default="{ row }">{{ row.variables?.length ?? 0 }}</template>
        </el-table-column>
        <el-table-column label="默认" width="80" align="center">
          <template #default="{ row }">
            <el-tag v-if="row.isDefault" type="success" size="small">是</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="创建时间" prop="createdAt" width="180" />
        <el-table-column label="操作" width="150" align="center">
          <template #default="{ row }">
            <el-button type="primary" link size="small" @click="openDialog(row)">编辑</el-button>
            <el-button type="danger" link size="small" @click="handleDelete(row.id)"
              >删除</el-button
            >
          </template>
        </el-table-column>
      </el-table>

      <div class="pagination-wrapper">
        <el-pagination
          v-model:current-page="query.page"
          v-model:page-size="query.pageSize"
          :total="total"
          layout="total, prev, pager, next"
          @current-change="loadData"
        />
      </div>
    </el-card>

    <!-- Create/Edit Dialog -->
    <el-dialog v-model="dialogVisible" :title="editingId ? '编辑模板' : '新建模板'" width="700px">
      <el-form :model="form" label-width="100px">
        <el-form-item label="模板名称" required>
          <el-input v-model="form.name" placeholder="请输入模板名称" />
        </el-form-item>
        <el-form-item label="分类">
          <el-input v-model="form.category" placeholder="如：销售合同、服务协议" />
        </el-form-item>
        <el-form-item label="模板内容" required>
          <el-input
            v-model="form.content"
            type="textarea"
            :rows="12"
            placeholder="使用 {{变量名}} 作为占位符，如 {{客户名称}}"
          />
        </el-form-item>
        <el-form-item label="默认模板">
          <el-switch v-model="form.isDefault" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="saving" @click="handleSave">保存</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { contractApi, type ContractTemplateVO } from '@/api/contract'

const loading = ref(false)
const saving = ref(false)
const list = ref<ContractTemplateVO[]>([])
const total = ref(0)
const query = reactive({ page: 1, pageSize: 20 })
const dialogVisible = ref(false)
const editingId = ref<number | null>(null)
const form = reactive({ name: '', content: '', category: '', isDefault: false })

async function loadData() {
  loading.value = true
  try {
    const res = await contractApi.getTemplates({ page: query.page, pageSize: query.pageSize })
    if (res.code === 0 && res.data) {
      list.value = res.data.list
      total.value = res.data.total
    }
  } catch {
    ElMessage.error('加载模板列表失败')
  } finally {
    loading.value = false
  }
}

function openDialog(row?: ContractTemplateVO) {
  if (row) {
    editingId.value = row.id
    form.name = row.name
    form.content = row.content
    form.category = row.category ?? ''
    form.isDefault = row.isDefault
  } else {
    editingId.value = null
    form.name = ''
    form.content = ''
    form.category = ''
    form.isDefault = false
  }
  dialogVisible.value = true
}

async function handleSave() {
  if (!form.name || !form.content) {
    ElMessage.warning('请填写模板名称和内容')
    return
  }
  saving.value = true
  try {
    if (editingId.value) {
      await contractApi.updateTemplate(editingId.value, form)
    } else {
      await contractApi.createTemplate(form)
    }
    ElMessage.success('保存成功')
    dialogVisible.value = false
    loadData()
  } catch {
    ElMessage.error('保存失败')
  } finally {
    saving.value = false
  }
}

async function handleDelete(id: number) {
  try {
    await ElMessageBox.confirm('确认删除该模板？', '提示', { type: 'warning' })
    await contractApi.removeTemplate(id)
    ElMessage.success('删除成功')
    loadData()
  } catch {
    /* cancelled */
  }
}

onMounted(loadData)
</script>

<style scoped>
.template-page {
  padding: 16px;
}
.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.pagination-wrapper {
  display: flex;
  justify-content: flex-end;
  margin-top: 16px;
}
</style>
