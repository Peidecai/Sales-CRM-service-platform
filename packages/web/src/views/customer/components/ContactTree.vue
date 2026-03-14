<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Plus } from '@element-plus/icons-vue'
import {
  getContactsByCustomer,
  createContact,
  updateContact,
  deleteContact,
  setPrimaryContact,
} from '@/api/contact'

const props = defineProps<{ customerId: number }>()

const contacts = ref<Record<string, unknown>[]>([])
const loading = ref(false)
const dialogVisible = ref(false)
const editingContact = ref<Record<string, unknown> | null>(null)
const contactForm = ref({
  name: '',
  mobile: '',
  email: '',
  department: '',
  position: '',
  decisionRole: '',
  influenceLevel: undefined as number | undefined,
  remark: '',
})

const roleLabels: Record<string, string> = {
  decision_maker: '决策者',
  influencer: '影响者',
  user: '使用者',
  gatekeeper: '守门人',
}

const groupedContacts = computed(() => {
  const groups: Record<string, Record<string, unknown>[]> = {
    decision_maker: [],
    influencer: [],
    user: [],
    gatekeeper: [],
    unknown: [],
  }
  for (const c of contacts.value) {
    const role = (c.decisionRole as string) || 'unknown'
    if (!groups[role]) groups[role] = []
    groups[role].push(c)
  }
  return Object.entries(groups).filter(([, list]) => list.length > 0)
})

const fetchContacts = async () => {
  loading.value = true
  try {
    const res = await getContactsByCustomer(props.customerId, { pageSize: 100 })
    contacts.value = (res as unknown as Record<string, unknown>).data
      ? (((res as unknown as Record<string, unknown>).data as Record<string, unknown>)
          .list as Record<string, unknown>[])
      : []
  } finally {
    loading.value = false
  }
}

onMounted(fetchContacts)

const handleAdd = () => {
  editingContact.value = null
  contactForm.value = {
    name: '',
    mobile: '',
    email: '',
    department: '',
    position: '',
    decisionRole: '',
    influenceLevel: undefined,
    remark: '',
  }
  dialogVisible.value = true
}

const handleEdit = (contact: Record<string, unknown>) => {
  editingContact.value = contact
  Object.assign(contactForm.value, contact)
  dialogVisible.value = true
}

const handleSave = async () => {
  try {
    if (editingContact.value) {
      await updateContact(editingContact.value.id as number, contactForm.value)
      ElMessage.success('联系人更新成功')
    } else {
      await createContact(props.customerId, contactForm.value)
      ElMessage.success('联系人创建成功')
    }
    dialogVisible.value = false
    fetchContacts()
  } catch {
    /* handled */
  }
}

const handleSetPrimary = async (id: number) => {
  await setPrimaryContact(id)
  ElMessage.success('已设为主联系人')
  fetchContacts()
}

const handleDelete = async (id: number) => {
  await ElMessageBox.confirm('确定删除该联系人？', '提示', { type: 'warning' })
  await deleteContact(id)
  ElMessage.success('联系人已删除')
  fetchContacts()
}
</script>

<template>
  <div v-loading="loading">
    <el-button
      type="primary"
      :icon="Plus"
      size="small"
      style="margin-bottom: 12px"
      @click="handleAdd"
    >
      添加联系人
    </el-button>

    <div v-for="[role, list] in groupedContacts" :key="role" style="margin-bottom: 16px">
      <h4 style="margin: 0 0 8px; color: #606266">{{ roleLabels[role] || '未分类' }}</h4>
      <el-card
        v-for="c in list"
        :key="(c as Record<string, unknown>).id as number"
        shadow="hover"
        style="margin-bottom: 8px"
      >
        <div style="display: flex; justify-content: space-between; align-items: center">
          <div>
            <strong>{{ c.name }}</strong>
            <el-tag v-if="c.isPrimary" size="small" type="warning" style="margin-left: 8px"
            >
              主联系人
            </el-tag
            >
            <span style="color: #909399; margin-left: 8px"
            >{{ c.position || '' }} {{ c.department || '' }}</span
            >
          </div>
          <div>
            <span v-if="c.influenceLevel" style="color: #e6a23c; margin-right: 12px">
              {{ '★'.repeat(c.influenceLevel as number)
              }}{{ '☆'.repeat(5 - (c.influenceLevel as number)) }}
            </span>
            <el-button size="small" text @click="handleEdit(c)">编辑</el-button>
            <el-button
              v-if="!c.isPrimary"
              size="small"
              text
              @click="handleSetPrimary(c.id as number)"
            >
              设为主联系人
            </el-button
            >
            <el-button size="small" text type="danger" @click="handleDelete(c.id as number)"
            >
              删除
            </el-button
            >
          </div>
        </div>
        <div style="margin-top: 4px; color: #909399; font-size: 13px">
          <span v-if="c.mobile">手机: {{ c.mobile }}</span>
          <span v-if="c.email" style="margin-left: 16px">邮箱: {{ c.email }}</span>
        </div>
      </el-card>
    </div>

    <el-empty v-if="!loading && contacts.length === 0" description="暂无联系人" />

    <!-- Add/Edit Dialog -->
    <el-dialog
      v-model="dialogVisible"
      :title="editingContact ? '编辑联系人' : '添加联系人'"
      width="500px"
    >
      <el-form :model="contactForm" label-width="80px">
        <el-form-item label="姓名" required>
          <el-input v-model="contactForm.name" />
        </el-form-item>
        <el-form-item label="手机号">
          <el-input v-model="contactForm.mobile" />
        </el-form-item>
        <el-form-item label="邮箱">
          <el-input v-model="contactForm.email" />
        </el-form-item>
        <el-form-item label="部门">
          <el-input v-model="contactForm.department" />
        </el-form-item>
        <el-form-item label="职位">
          <el-input v-model="contactForm.position" />
        </el-form-item>
        <el-form-item label="决策角色">
          <el-select v-model="contactForm.decisionRole" clearable style="width: 100%">
            <el-option label="决策者" value="decision_maker" />
            <el-option label="影响者" value="influencer" />
            <el-option label="使用者" value="user" />
            <el-option label="守门人" value="gatekeeper" />
          </el-select>
        </el-form-item>
        <el-form-item label="影响力">
          <el-rate v-model="contactForm.influenceLevel" :max="5" />
        </el-form-item>
        <el-form-item label="备注">
          <el-input v-model="contactForm.remark" type="textarea" :rows="2" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" @click="handleSave">保存</el-button>
      </template>
    </el-dialog>
  </div>
</template>
