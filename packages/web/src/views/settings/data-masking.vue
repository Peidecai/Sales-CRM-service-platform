<template>
  <div class="page-container" style="padding: 20px">
    <el-card>
      <template #header>
        <div style="display: flex; justify-content: space-between; align-items: center">
          <span>数据脱敏规则</span>
          <el-button type="primary" @click="openDialog()">新增规则</el-button>
        </div>
      </template>

      <!-- Filters -->
      <el-form inline style="margin-bottom: 16px">
        <el-form-item label="实体">
          <el-select
            v-model="queryParams.entityName"
            clearable
            placeholder="全部"
            @change="loadRules"
          >
            <el-option label="客户" value="customer" />
            <el-option label="联系人" value="contact" />
            <el-option label="商机" value="opportunity" />
          </el-select>
        </el-form-item>
        <el-form-item label="状态">
          <el-select
            v-model="queryParams.isActive"
            clearable
            placeholder="全部"
            @change="loadRules"
          >
            <el-option label="启用" :value="true" />
            <el-option label="禁用" :value="false" />
          </el-select>
        </el-form-item>
      </el-form>

      <!-- Table -->
      <el-table v-loading="loading" :data="rules" border stripe>
        <el-table-column prop="name" label="规则名称" min-width="140" />
        <el-table-column prop="entityName" label="实体" width="100" />
        <el-table-column prop="fieldName" label="字段" width="100" />
        <el-table-column prop="maskType" label="脱敏类型" width="100">
          <template #default="{ row }">
            <el-tag :type="maskTypeTag(row.maskType)">{{ maskTypeLabel(row.maskType) }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="pattern" label="模式" width="100" />
        <el-table-column label="豁免角色" width="120">
          <template #default="{ row }">
            {{ row.exemptRoles?.join(', ') || '-' }}
          </template>
        </el-table-column>
        <el-table-column label="状态" width="80">
          <template #default="{ row }">
            <el-switch
              :model-value="row.isActive"
              @change="(val: string | number | boolean) => handleToggle(row.id, Boolean(val))"
            />
          </template>
        </el-table-column>
        <el-table-column label="操作" width="150" fixed="right">
          <template #default="{ row }">
            <el-button text type="primary" size="small" @click="openDialog(row)">编辑</el-button>
            <el-popconfirm title="确定删除？" @confirm="handleDelete(row.id)">
              <template #reference>
                <el-button text type="danger" size="small">删除</el-button>
              </template>
            </el-popconfirm>
          </template>
        </el-table-column>
      </el-table>

      <el-pagination
        v-if="total > queryParams.pageSize"
        style="margin-top: 16px; justify-content: flex-end"
        :current-page="queryParams.page"
        :page-size="queryParams.pageSize"
        :total="total"
        layout="total, prev, pager, next"
        @current-change="
          (p: number) => {
            queryParams.page = p
            loadRules()
          }
        "
      />
    </el-card>

    <!-- Preview Card -->
    <el-card style="margin-top: 16px">
      <template #header><span>脱敏预览</span></template>
      <el-form inline>
        <el-form-item label="原始值">
          <el-input v-model="previewForm.value" placeholder="输入测试值" />
        </el-form-item>
        <el-form-item label="类型">
          <el-select v-model="previewForm.maskType">
            <el-option label="部分脱敏" value="partial" />
            <el-option label="完全脱敏" value="full" />
            <el-option label="哈希" value="hash" />
          </el-select>
        </el-form-item>
        <el-form-item label="模式">
          <el-input v-model="previewForm.pattern" placeholder="3,4,4" style="width: 120px" />
        </el-form-item>
        <el-form-item>
          <el-button type="primary" @click="handlePreview">预览</el-button>
        </el-form-item>
        <el-form-item v-if="previewResult" label="结果">
          <el-tag size="large">{{ previewResult }}</el-tag>
        </el-form-item>
      </el-form>
    </el-card>

    <!-- Create/Edit Dialog -->
    <el-dialog v-model="dialogVisible" :title="editingId ? '编辑规则' : '新增规则'" width="500px">
      <el-form ref="formRef" :model="form" :rules="formRules" label-width="100px">
        <el-form-item label="规则名称" prop="name">
          <el-input v-model="form.name" maxlength="100" />
        </el-form-item>
        <el-form-item label="实体名称" prop="entityName">
          <el-select v-model="form.entityName">
            <el-option label="客户 (customer)" value="customer" />
            <el-option label="联系人 (contact)" value="contact" />
            <el-option label="商机 (opportunity)" value="opportunity" />
          </el-select>
        </el-form-item>
        <el-form-item label="字段名称" prop="fieldName">
          <el-input v-model="form.fieldName" placeholder="e.g. phone, email, idNumber" />
        </el-form-item>
        <el-form-item label="脱敏类型" prop="maskType">
          <el-select v-model="form.maskType">
            <el-option label="部分脱敏" value="partial" />
            <el-option label="完全脱敏" value="full" />
            <el-option label="哈希" value="hash" />
          </el-select>
        </el-form-item>
        <el-form-item label="脱敏模式" prop="pattern">
          <el-input v-model="form.pattern" placeholder="3,4,4 (显示前3后4)" />
        </el-form-item>
        <el-form-item label="豁免角色">
          <el-select v-model="form.exemptRoles" multiple placeholder="选择角色">
            <el-option label="管理员" value="admin" />
            <el-option label="经理" value="manager" />
            <el-option label="销售" value="sales" />
          </el-select>
        </el-form-item>
        <el-form-item label="豁免权限码">
          <el-input v-model="form.exemptPermission" placeholder="e.g. data:sensitive:view" />
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
import { ElMessage, type FormInstance, type FormRules } from 'element-plus'
import { dataMaskingApi, type MaskingRuleVO, type CreateMaskingRuleData } from '@/api/data-masking'

const loading = ref(false)
const saving = ref(false)
const rules = ref<MaskingRuleVO[]>([])
const total = ref(0)
const dialogVisible = ref(false)
const editingId = ref<number | null>(null)
const formRef = ref<FormInstance>()
const previewResult = ref('')

const queryParams = reactive({
  page: 1,
  pageSize: 20,
  entityName: '' as string,
  isActive: undefined as boolean | undefined,
})

const form = reactive<CreateMaskingRuleData & { exemptPermission: string }>({
  name: '',
  entityName: '',
  fieldName: '',
  maskType: 'partial',
  pattern: '',
  exemptRoles: [],
  exemptPermission: '',
})

const previewForm = reactive({ value: '', maskType: 'partial', pattern: '' })

const formRules: FormRules = {
  name: [{ required: true, message: '请输入规则名称', trigger: 'blur' }],
  entityName: [{ required: true, message: '请选择实体', trigger: 'change' }],
  fieldName: [{ required: true, message: '请输入字段名', trigger: 'blur' }],
  maskType: [{ required: true, message: '请选择脱敏类型', trigger: 'change' }],
}

function maskTypeLabel(t: string) {
  return { partial: '部分脱敏', full: '完全脱敏', hash: '哈希' }[t] ?? t
}
function maskTypeTag(t: string) {
  return (
    (
      { partial: 'warning', full: 'danger', hash: 'info' } as Record<
        string,
        'warning' | 'danger' | 'info'
      >
    )[t] ?? 'info'
  )
}

async function loadRules() {
  loading.value = true
  try {
    const res = (await dataMaskingApi.getRules(queryParams)) as unknown as {
      data: { list: MaskingRuleVO[]; total: number }
    }
    rules.value = res.data.list
    total.value = res.data.total
  } catch {
    // handled by interceptor
  } finally {
    loading.value = false
  }
}

function openDialog(row?: MaskingRuleVO) {
  if (row) {
    editingId.value = row.id
    Object.assign(form, {
      name: row.name,
      entityName: row.entityName,
      fieldName: row.fieldName,
      maskType: row.maskType,
      pattern: row.pattern ?? '',
      exemptRoles: row.exemptRoles ?? [],
      exemptPermission: row.exemptPermission ?? '',
    })
  } else {
    editingId.value = null
    Object.assign(form, {
      name: '',
      entityName: '',
      fieldName: '',
      maskType: 'partial',
      pattern: '',
      exemptRoles: [],
      exemptPermission: '',
    })
  }
  dialogVisible.value = true
}

async function handleSave() {
  await formRef.value?.validate()
  saving.value = true
  try {
    const data: CreateMaskingRuleData = {
      name: form.name,
      entityName: form.entityName,
      fieldName: form.fieldName,
      maskType: form.maskType,
      pattern: form.pattern || undefined,
      exemptRoles: form.exemptRoles?.length ? form.exemptRoles : undefined,
      exemptPermission: form.exemptPermission || undefined,
    }
    if (editingId.value) {
      await dataMaskingApi.updateRule(editingId.value, data)
      ElMessage.success('更新成功')
    } else {
      await dataMaskingApi.createRule(data)
      ElMessage.success('创建成功')
    }
    dialogVisible.value = false
    loadRules()
  } catch {
    // handled by interceptor
  } finally {
    saving.value = false
  }
}

async function handleDelete(id: number) {
  await dataMaskingApi.deleteRule(id)
  ElMessage.success('删除成功')
  loadRules()
}

async function handleToggle(id: number, isActive: boolean) {
  await dataMaskingApi.toggleStatus(id, isActive)
  loadRules()
}

async function handlePreview() {
  if (!previewForm.value) {
    ElMessage.warning('请输入测试值')
    return
  }
  const res = (await dataMaskingApi.preview({
    value: previewForm.value,
    maskType: previewForm.maskType,
    pattern: previewForm.pattern || undefined,
  })) as unknown as { data: { masked: string } }
  previewResult.value = res.data.masked
}

onMounted(() => loadRules())
</script>
