<template>
  <div class="roles-page">
    <div class="page-header">
      <h2>角色管理</h2>
      <el-button type="primary" @click="openCreateDialog">
        <el-icon><Plus /></el-icon>
        新建角色
      </el-button>
    </div>

    <!-- Role Table -->
    <el-table v-loading="loading" :data="roleList" stripe>
      <el-table-column prop="name" label="角色名称" width="150" />
      <el-table-column prop="code" label="角色编码" width="150" />
      <el-table-column prop="label" label="显示名称" width="150" />
      <el-table-column prop="status" label="状态" width="100">
        <template #default="{ row }">
          <el-tag :type="row.status === 'active' ? 'success' : 'danger'" size="small">
            {{ row.status === 'active' ? '启用' : '禁用' }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column prop="isBuiltin" label="内置" width="80">
        <template #default="{ row }">
          <el-tag v-if="row.isBuiltin" type="info" size="small">内置</el-tag>
        </template>
      </el-table-column>
      <el-table-column prop="description" label="描述" min-width="200" show-overflow-tooltip />
      <el-table-column label="权限数" width="100">
        <template #default="{ row }">
          {{ row.permissions?.length ?? 0 }}
        </template>
      </el-table-column>
      <el-table-column label="操作" width="260" fixed="right">
        <template #default="{ row }">
          <el-button text type="primary" size="small" @click="openPermissionDialog(row)">
            分配权限
          </el-button>
          <el-button text type="primary" size="small" @click="openEditDialog(row)">
            编辑
          </el-button>
          <el-button
            text
            type="danger"
            size="small"
            :disabled="row.isBuiltin"
            @click="handleDelete(row)"
          >
            删除
          </el-button>
        </template>
      </el-table-column>
    </el-table>

    <!-- Pagination -->
    <div v-if="total > pageSize" class="pagination-wrapper">
      <el-pagination
        v-model:current-page="page"
        :page-size="pageSize"
        :total="total"
        layout="total, prev, pager, next"
        @current-change="fetchRoles"
      />
    </div>

    <!-- Create/Edit Dialog -->
    <el-dialog v-model="dialogVisible" :title="editingRole ? '编辑角色' : '新建角色'" width="500px">
      <el-form ref="formRef" :model="formData" :rules="formRules" label-width="100px">
        <el-form-item label="角色编码" prop="code">
          <el-input
            v-model="formData.code"
            placeholder="英文编码，如 custom_role"
            :disabled="!!editingRole?.isBuiltin"
          />
        </el-form-item>
        <el-form-item label="角色名称" prop="name">
          <el-input v-model="formData.name" placeholder="请输入角色名称" />
        </el-form-item>
        <el-form-item label="显示名称" prop="label">
          <el-input v-model="formData.label" placeholder="前端显示名称（可选）" />
        </el-form-item>
        <el-form-item label="描述" prop="description">
          <el-input
            v-model="formData.description"
            type="textarea"
            :rows="3"
            placeholder="角色描述（可选）"
          />
        </el-form-item>
        <el-form-item v-if="editingRole" label="状态" prop="status">
          <el-select v-model="formData.status">
            <el-option label="启用" value="active" />
            <el-option label="禁用" value="disabled" />
          </el-select>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="submitting" @click="handleSubmit">确定</el-button>
      </template>
    </el-dialog>

    <!-- Permission Assignment Dialog -->
    <el-dialog v-model="permDialogVisible" title="分配权限" width="600px">
      <div v-loading="permLoading">
        <el-tree
          ref="treeRef"
          :data="permTreeData"
          show-checkbox
          node-key="id"
          :default-checked-keys="checkedPermIds"
          :props="{ label: 'label', children: 'children' }"
        />
      </div>
      <template #footer>
        <el-button @click="permDialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="permSubmitting" @click="handleAssignPermissions">
          确定
        </el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Plus } from '@element-plus/icons-vue'
import type { FormInstance, FormRules } from 'element-plus'
import { rbacApi } from '@/api/rbac'
import type { SysRole, PermissionTreeNode } from '@/api/rbac'

interface TreeNode {
  id: string | number
  label: string
  children?: TreeNode[]
}

const loading = ref(false)
const roleList = ref<SysRole[]>([])
const page = ref(1)
const pageSize = ref(20)
const total = ref(0)

// Create/Edit
const dialogVisible = ref(false)
const editingRole = ref<SysRole | null>(null)
const submitting = ref(false)
const formRef = ref<FormInstance>()
const formData = reactive({
  code: '',
  name: '',
  label: '',
  description: '',
  status: 'active' as 'active' | 'disabled',
})

const formRules: FormRules = {
  code: [{ required: true, message: '请输入角色编码', trigger: 'blur' }],
  name: [{ required: true, message: '请输入角色名称', trigger: 'blur' }],
}

// Permission assignment
const permDialogVisible = ref(false)
const permLoading = ref(false)
const permSubmitting = ref(false)
const permTreeData = ref<TreeNode[]>([])
const checkedPermIds = ref<number[]>([])
const currentPermRoleId = ref<number>(0)
const treeRef = ref<InstanceType<(typeof import('element-plus'))['ElTree']>>()

onMounted(() => {
  fetchRoles()
})

async function fetchRoles() {
  loading.value = true
  try {
    const res = await rbacApi.getRoles({ page: page.value, pageSize: pageSize.value })
    if (res.data) {
      roleList.value = res.data.list
      total.value = res.data.total
    }
  } finally {
    loading.value = false
  }
}

function openCreateDialog() {
  editingRole.value = null
  formData.code = ''
  formData.name = ''
  formData.label = ''
  formData.description = ''
  formData.status = 'active'
  dialogVisible.value = true
}

function openEditDialog(role: SysRole) {
  editingRole.value = role
  formData.code = role.code
  formData.name = role.name
  formData.label = role.label ?? ''
  formData.description = role.description ?? ''
  formData.status = role.status
  dialogVisible.value = true
}

async function handleSubmit() {
  const valid = await formRef.value?.validate().catch(() => false)
  if (!valid) return

  submitting.value = true
  try {
    if (editingRole.value) {
      await rbacApi.updateRole(editingRole.value.id, {
        code: formData.code,
        name: formData.name,
        label: formData.label || undefined,
        description: formData.description || undefined,
        status: formData.status,
      })
      ElMessage.success('更新成功')
    } else {
      await rbacApi.createRole({
        code: formData.code,
        name: formData.name,
        label: formData.label || undefined,
        description: formData.description || undefined,
      })
      ElMessage.success('创建成功')
    }
    dialogVisible.value = false
    fetchRoles()
  } finally {
    submitting.value = false
  }
}

async function handleDelete(role: SysRole) {
  await ElMessageBox.confirm(`确定要删除角色「${role.name}」吗？`, '提示', {
    type: 'warning',
  })
  await rbacApi.deleteRole(role.id)
  ElMessage.success('删除成功')
  fetchRoles()
}

async function openPermissionDialog(role: SysRole) {
  currentPermRoleId.value = role.id
  checkedPermIds.value = role.permissions?.map((p) => p.id) ?? []
  permDialogVisible.value = true
  permLoading.value = true
  try {
    const res = await rbacApi.getPermissionTree()
    if (res.data) {
      permTreeData.value = (res.data as PermissionTreeNode[]).map((group) => ({
        id: `module_${group.module}`,
        label: group.label,
        children: group.children.map((p) => ({
          id: p.id,
          label: `${p.name} (${p.code})`,
        })),
      }))
    }
  } finally {
    permLoading.value = false
  }
}

async function handleAssignPermissions() {
  permSubmitting.value = true
  try {
    const checkedKeys = (treeRef.value?.getCheckedKeys(false) ?? []) as (string | number)[]
    const permissionIds = checkedKeys.filter((k) => typeof k === 'number') as number[]
    await rbacApi.assignPermissions(currentPermRoleId.value, permissionIds)
    ElMessage.success('权限分配成功')
    permDialogVisible.value = false
    fetchRoles()
  } finally {
    permSubmitting.value = false
  }
}
</script>

<style scoped>
.roles-page {
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
  font-size: 18px;
}

.pagination-wrapper {
  display: flex;
  justify-content: flex-end;
  margin-top: 16px;
}
</style>
