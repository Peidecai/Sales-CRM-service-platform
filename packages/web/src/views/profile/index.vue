<template>
  <div class="profile-page">
    <el-row :gutter="20">
      <!-- Profile Info Card -->
      <el-col :span="12">
        <el-card shadow="hover">
          <template #header>
            <div class="card-header">
              <span>个人信息</span>
              <el-button v-if="!isEditing" type="primary" text @click="startEdit"> 编辑 </el-button>
              <div v-else>
                <el-button type="primary" :loading="saving" @click="saveProfile"> 保存 </el-button>
                <el-button @click="cancelEdit"> 取消 </el-button>
              </div>
            </div>
          </template>

          <el-skeleton :loading="loading" :rows="6" animated>
            <template #default>
              <el-form
                ref="profileFormRef"
                :model="profileForm"
                :rules="profileRules"
                label-width="100px"
                :disabled="!isEditing"
              >
                <el-form-item label="用户名">
                  <el-input :model-value="profile?.username" disabled />
                </el-form-item>
                <el-form-item label="角色">
                  <el-tag :type="getRoleTagType(profile?.role ?? '')">
                    {{ getRoleLabel(profile?.role ?? '') }}
                  </el-tag>
                </el-form-item>
                <el-form-item label="姓名" prop="name">
                  <el-input v-model="profileForm.name" placeholder="请输入姓名" />
                </el-form-item>
                <el-form-item label="邮箱" prop="email">
                  <el-input v-model="profileForm.email" placeholder="请输入邮箱" />
                </el-form-item>
                <el-form-item label="手机号" prop="phone">
                  <el-input v-model="profileForm.phone" placeholder="请输入手机号" />
                </el-form-item>
                <el-form-item label="注册时间">
                  <span>{{ formatDate(profile?.createdAt ?? '') }}</span>
                </el-form-item>
              </el-form>
            </template>
          </el-skeleton>
        </el-card>
      </el-col>

      <!-- Change Password Card -->
      <el-col :span="12">
        <el-card shadow="hover">
          <template #header>
            <span>修改密码</span>
          </template>

          <el-form
            ref="passwordFormRef"
            :model="passwordForm"
            :rules="passwordRules"
            label-width="100px"
          >
            <el-form-item label="当前密码" prop="oldPassword">
              <el-input
                v-model="passwordForm.oldPassword"
                type="password"
                placeholder="请输入当前密码"
                show-password
              />
            </el-form-item>
            <el-form-item label="新密码" prop="newPassword">
              <el-input
                v-model="passwordForm.newPassword"
                type="password"
                placeholder="请输入新密码（至少6位）"
                show-password
              />
            </el-form-item>
            <el-form-item label="确认密码" prop="confirmPassword">
              <el-input
                v-model="passwordForm.confirmPassword"
                type="password"
                placeholder="请再次输入新密码"
                show-password
              />
            </el-form-item>
            <el-form-item>
              <el-button type="primary" :loading="changingPassword" @click="handleChangePassword">
                修改密码
              </el-button>
            </el-form-item>
          </el-form>
        </el-card>
      </el-col>
    </el-row>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import type { FormInstance, FormRules } from 'element-plus'
import { ElMessage } from 'element-plus'
import { authApi, type UserProfile } from '@/api/auth'
import { formatDate } from '@/utils/format'

// Profile state
const loading = ref(false)
const saving = ref(false)
const isEditing = ref(false)
const profile = ref<UserProfile | null>(null)
const profileFormRef = ref<FormInstance>()

const profileForm = reactive({
  name: '',
  email: '',
  phone: '',
})

const profileRules: FormRules = {
  name: [{ required: true, message: '请输入姓名', trigger: 'blur' }],
  email: [{ type: 'email', message: '邮箱格式不正确', trigger: 'blur' }],
  phone: [{ pattern: /^1[3-9]\d{9}$/, message: '手机号格式不正确', trigger: 'blur' }],
}

// Password state
const changingPassword = ref(false)
const passwordFormRef = ref<FormInstance>()

const passwordForm = reactive({
  oldPassword: '',
  newPassword: '',
  confirmPassword: '',
})

const passwordRules: FormRules = {
  oldPassword: [{ required: true, message: '请输入当前密码', trigger: 'blur' }],
  newPassword: [
    { required: true, message: '请输入新密码', trigger: 'blur' },
    { min: 6, message: '密码至少需要6个字符', trigger: 'blur' },
  ],
  confirmPassword: [
    { required: true, message: '请再次输入新密码', trigger: 'blur' },
    {
      validator: (_rule: unknown, value: string, callback: (err?: Error) => void) => {
        if (value !== passwordForm.newPassword) {
          callback(new Error('两次输入的密码不一致'))
        } else {
          callback()
        }
      },
      trigger: 'blur',
    },
  ],
}

function getRoleLabel(role: string): string {
  const map: Record<string, string> = { admin: '管理员', manager: '经理', sales: '销售' }
  return map[role] ?? role
}

function getRoleTagType(role: string): 'danger' | 'warning' | 'primary' | 'info' {
  const map: Record<string, 'danger' | 'warning' | 'primary' | 'info'> = {
    admin: 'danger',
    manager: 'warning',
    sales: 'primary',
  }
  return map[role] ?? 'info'
}

async function loadProfile() {
  loading.value = true
  try {
    const res = await authApi.getProfile()
    if (res.data) {
      profile.value = res.data
      profileForm.name = res.data.name
      profileForm.email = res.data.email ?? ''
      profileForm.phone = res.data.phone ?? ''
    }
  } catch {
    ElMessage.error('获取个人信息失败')
  } finally {
    loading.value = false
  }
}

function startEdit() {
  isEditing.value = true
}

function cancelEdit() {
  isEditing.value = false
  if (profile.value) {
    profileForm.name = profile.value.name
    profileForm.email = profile.value.email ?? ''
    profileForm.phone = profile.value.phone ?? ''
  }
}

async function saveProfile() {
  const valid = await profileFormRef.value?.validate().catch(() => false)
  if (!valid) return

  saving.value = true
  try {
    const res = await authApi.updateProfile({
      name: profileForm.name,
      email: profileForm.email || undefined,
      phone: profileForm.phone || undefined,
    })
    if (res.data) {
      profile.value = res.data
      ElMessage.success('个人信息更新成功')
      isEditing.value = false
    }
  } catch {
    ElMessage.error('更新失败，请重试')
  } finally {
    saving.value = false
  }
}

async function handleChangePassword() {
  const valid = await passwordFormRef.value?.validate().catch(() => false)
  if (!valid) return

  changingPassword.value = true
  try {
    await authApi.changePassword({
      oldPassword: passwordForm.oldPassword,
      newPassword: passwordForm.newPassword,
    })
    ElMessage.success('密码修改成功，请重新登录')
    passwordForm.oldPassword = ''
    passwordForm.newPassword = ''
    passwordForm.confirmPassword = ''
    passwordFormRef.value?.resetFields()
  } catch {
    ElMessage.error('密码修改失败，请检查当前密码是否正确')
  } finally {
    changingPassword.value = false
  }
}

onMounted(() => {
  loadProfile()
})
</script>

<style scoped>
.profile-page {
  padding: 20px;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}
</style>
