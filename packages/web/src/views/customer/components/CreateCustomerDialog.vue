<script setup lang="ts">
import { ref, reactive, computed, watch } from 'vue'
import { ElMessage } from 'element-plus'
import { customerApi, checkDuplicate } from '@/api/customer'
import {
  CustomerStatus,
  CustomerSource,
  CustomerType,
  CustomerScale,
  CustomerLevel,
} from '@crm/shared'
import { usePermission } from '@/composables/usePermission'

const props = defineProps<{
  visible: boolean
  editData?: Record<string, unknown>
}>()

const emit = defineEmits<{
  'update:visible': [value: boolean]
  success: []
}>()

usePermission()

const formRef = ref()
const loading = ref(false)
const customerType = ref<'enterprise' | 'individual'>('enterprise')

const isEdit = computed(() => !!props.editData?.id)

const defaultForm = () => ({
  name: '',
  company: '',
  phone: '',
  email: '',
  status: CustomerStatus.LEAD,
  assignedUserId: undefined as number | undefined,
  notes: '',
  industry: '',
  source: '' as string,
  customerType: CustomerType.ENTERPRISE,
  scale: '' as string,
  region: '',
  level: '' as string,
  intentionLevel: undefined as number | undefined,
  creditRating: '' as string,
  unifiedCreditCode: '',
  legalPerson: '',
  registeredCapital: undefined as number | undefined,
  annualRevenue: undefined as number | undefined,
  employeeCount: undefined as number | undefined,
  address: '',
  website: '',
  description: '',
})

const form = reactive(defaultForm())

const rules = {
  name: [{ required: true, message: '请输入客户名称', trigger: 'blur' }],
  phone: [{ pattern: /^1[3-9]\d{9}$/, message: '手机号格式不正确', trigger: 'blur' }],
  email: [{ type: 'email' as const, message: '邮箱格式不正确', trigger: 'blur' }],
}

const statusOptions = [
  { label: '线索', value: CustomerStatus.LEAD },
  { label: '潜在客户', value: CustomerStatus.POTENTIAL },
  { label: '有意向', value: CustomerStatus.INTENTION },
  { label: '商机客户', value: CustomerStatus.OPPORTUNITY },
  { label: '成交客户', value: CustomerStatus.DEAL },
  { label: '维护期', value: CustomerStatus.MAINTAIN },
  { label: '无效客户', value: CustomerStatus.INVALID },
  { label: '已流失', value: CustomerStatus.LOST },
]

const sourceOptions = [
  { label: '官网', value: CustomerSource.WEBSITE },
  { label: '转介绍', value: CustomerSource.REFERRAL },
  { label: '陌拜电话', value: CustomerSource.COLD_CALL },
  { label: '展会', value: CustomerSource.EXHIBITION },
  { label: '广告投放', value: CustomerSource.AD },
  { label: '批量导入', value: CustomerSource.IMPORT },
  { label: '其他', value: CustomerSource.OTHER },
]

const scaleOptions = [
  { label: '微型', value: CustomerScale.MICRO },
  { label: '小型', value: CustomerScale.SMALL },
  { label: '中型', value: CustomerScale.MEDIUM },
  { label: '大型', value: CustomerScale.LARGE },
  { label: '集团', value: CustomerScale.ENTERPRISE },
]

const levelOptions = [
  { label: 'A', value: CustomerLevel.A },
  { label: 'B', value: CustomerLevel.B },
  { label: 'C', value: CustomerLevel.C },
  { label: 'D', value: CustomerLevel.D },
]

watch(
  () => props.visible,
  (val) => {
    if (val && props.editData) {
      Object.assign(form, props.editData)
      customerType.value =
        (props.editData.customerType as string) === 'individual' ? 'individual' : 'enterprise'
    } else if (val) {
      Object.assign(form, defaultForm())
      customerType.value = 'enterprise'
    }
  },
)

watch(customerType, (val) => {
  form.customerType = val === 'individual' ? CustomerType.INDIVIDUAL : CustomerType.ENTERPRISE
})

// ---- Duplicate check on blur (debounced) ----
interface DuplicateWarning {
  field: string
  message: string
  customerNames: string[]
}
const duplicateWarnings = ref<DuplicateWarning[]>([])
const duplicateTimers: Record<string, ReturnType<typeof setTimeout>> = {}

const debouncedCheckDuplicate = (field: string, value: string) => {
  // Clear previous timer for this field
  if (duplicateTimers[field]) {
    clearTimeout(duplicateTimers[field])
  }
  // Remove existing warning for this field
  duplicateWarnings.value = duplicateWarnings.value.filter((w) => w.field !== field)

  if (!value || !value.trim()) return

  duplicateTimers[field] = setTimeout(async () => {
    try {
      const res = await checkDuplicate({ [field]: value.trim() })
      const data = res.data as { duplicates?: Array<{ id: number; name: string }> } | null
      if (data?.duplicates && data.duplicates.length > 0) {
        duplicateWarnings.value.push({
          field,
          message: getFieldLabel(field) + '已存在相似客户',
          customerNames: data.duplicates.map((d: { id: number; name: string }) => d.name),
        })
      }
    } catch {
      // Silently ignore duplicate check errors — not critical
    }
  }, 600)
}

const getFieldLabel = (field: string): string => {
  const labels: Record<string, string> = {
    company: '公司名称',
    phone: '手机号',
    email: '邮箱',
    unifiedCreditCode: '统一信用代码',
  }
  return labels[field] || field
}

const getWarningForField = (field: string) => duplicateWarnings.value.find((w) => w.field === field)

const handleFieldBlur = (field: string, value: string) => {
  debouncedCheckDuplicate(field, value)
}

// Clear duplicate warnings when dialog closes
watch(
  () => props.visible,
  (val) => {
    if (!val) {
      duplicateWarnings.value = []
      Object.values(duplicateTimers).forEach(clearTimeout)
    }
  },
)

const handleSubmit = async () => {
  const valid = await formRef.value?.validate().catch(() => false)
  if (!valid) return

  loading.value = true
  try {
    if (isEdit.value) {
      await customerApi.update(props.editData!.id as number, form)
      ElMessage.success('客户更新成功')
    } else {
      await customerApi.create(form as never)
      ElMessage.success('客户创建成功')
    }
    emit('update:visible', false)
    emit('success')
  } catch {
    // Error handled by interceptor
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <el-dialog
    :title="isEdit ? '编辑客户' : '新建客户'"
    :model-value="visible"
    width="800px"
    destroy-on-close
    @update:model-value="$emit('update:visible', $event)"
  >
    <el-tabs v-model="customerType">
      <el-tab-pane label="企业客户" name="enterprise" />
      <el-tab-pane label="个人客户" name="individual" />
    </el-tabs>

    <el-form ref="formRef" :model="form" :rules="rules" label-width="120px">
      <!-- Common Fields -->
      <el-row :gutter="20">
        <el-col :span="12">
          <el-form-item :label="customerType === 'enterprise' ? '公司名称' : '姓名'" prop="name">
            <el-input
              v-model="form.name"
              placeholder="请输入"
              @blur="handleFieldBlur('company', form.name)"
            />
            <el-alert
              v-if="getWarningForField('company')"
              type="warning"
              :closable="true"
              show-icon
              style="margin-top: 4px"
              @close="duplicateWarnings = duplicateWarnings.filter((w) => w.field !== 'company')"
            >
              <template #title>
                {{ getWarningForField('company')!.message }}：{{
                  getWarningForField('company')!.customerNames.join('、')
                }}
              </template>
            </el-alert>
          </el-form-item>
        </el-col>
        <el-col :span="12">
          <el-form-item label="手机号" prop="phone">
            <el-input
              v-model="form.phone"
              placeholder="请输入手机号"
              @blur="handleFieldBlur('phone', form.phone)"
            />
            <el-alert
              v-if="getWarningForField('phone')"
              type="warning"
              :closable="true"
              show-icon
              style="margin-top: 4px"
              @close="duplicateWarnings = duplicateWarnings.filter((w) => w.field !== 'phone')"
            >
              <template #title>
                {{ getWarningForField('phone')!.message }}：{{
                  getWarningForField('phone')!.customerNames.join('、')
                }}
              </template>
            </el-alert>
          </el-form-item>
        </el-col>
      </el-row>

      <el-row :gutter="20">
        <el-col :span="12">
          <el-form-item label="邮箱" prop="email">
            <el-input
              v-model="form.email"
              placeholder="请输入邮箱"
              @blur="handleFieldBlur('email', form.email)"
            />
            <el-alert
              v-if="getWarningForField('email')"
              type="warning"
              :closable="true"
              show-icon
              style="margin-top: 4px"
              @close="duplicateWarnings = duplicateWarnings.filter((w) => w.field !== 'email')"
            >
              <template #title>
                {{ getWarningForField('email')!.message }}：{{
                  getWarningForField('email')!.customerNames.join('、')
                }}
              </template>
            </el-alert>
          </el-form-item>
        </el-col>
        <el-col :span="12">
          <el-form-item label="客户来源">
            <el-select v-model="form.source" clearable placeholder="请选择" style="width: 100%">
              <el-option
                v-for="o in sourceOptions"
                :key="o.value"
                :label="o.label"
                :value="o.value"
              />
            </el-select>
          </el-form-item>
        </el-col>
      </el-row>

      <el-row :gutter="20">
        <el-col :span="12">
          <el-form-item label="行业">
            <el-input v-model="form.industry" placeholder="请输入行业" />
          </el-form-item>
        </el-col>
        <el-col :span="12">
          <el-form-item label="区域">
            <el-input v-model="form.region" placeholder="请输入区域" />
          </el-form-item>
        </el-col>
      </el-row>

      <el-row :gutter="20">
        <el-col :span="12">
          <el-form-item label="客户状态">
            <el-select v-model="form.status" placeholder="请选择" style="width: 100%">
              <el-option
                v-for="o in statusOptions"
                :key="o.value"
                :label="o.label"
                :value="o.value"
              />
            </el-select>
          </el-form-item>
        </el-col>
        <el-col :span="12">
          <el-form-item label="客户等级">
            <el-select v-model="form.level" clearable placeholder="请选择" style="width: 100%">
              <el-option
                v-for="o in levelOptions"
                :key="o.value"
                :label="o.label"
                :value="o.value"
              />
            </el-select>
          </el-form-item>
        </el-col>
      </el-row>

      <!-- Enterprise-only Fields -->
      <template v-if="customerType === 'enterprise'">
        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="公司">
              <el-input v-model="form.company" placeholder="请输入公司名称" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="统一信用代码">
              <el-input
                v-model="form.unifiedCreditCode"
                placeholder="请输入18位信用代码"
                maxlength="18"
                @blur="handleFieldBlur('unifiedCreditCode', form.unifiedCreditCode)"
              />
              <el-alert
                v-if="getWarningForField('unifiedCreditCode')"
                type="warning"
                :closable="true"
                show-icon
                style="margin-top: 4px"
                @close="
                  duplicateWarnings = duplicateWarnings.filter(
                    (w) => w.field !== 'unifiedCreditCode',
                  )
                "
              >
                <template #title>
                  {{ getWarningForField('unifiedCreditCode')!.message }}：{{
                    getWarningForField('unifiedCreditCode')!.customerNames.join('、')
                  }}
                </template>
              </el-alert>
            </el-form-item>
          </el-col>
        </el-row>

        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="法人代表">
              <el-input v-model="form.legalPerson" placeholder="请输入法人代表" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="企业规模">
              <el-select v-model="form.scale" clearable placeholder="请选择" style="width: 100%">
                <el-option
                  v-for="o in scaleOptions"
                  :key="o.value"
                  :label="o.label"
                  :value="o.value"
                />
              </el-select>
            </el-form-item>
          </el-col>
        </el-row>

        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="注册资本(万)">
              <el-input-number
                v-model="form.registeredCapital"
                :min="0"
                :precision="2"
                style="width: 100%"
              />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="年营收(万)">
              <el-input-number
                v-model="form.annualRevenue"
                :min="0"
                :precision="2"
                style="width: 100%"
              />
            </el-form-item>
          </el-col>
        </el-row>

        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="员工人数">
              <el-input-number v-model="form.employeeCount" :min="0" style="width: 100%" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="公司网站">
              <el-input v-model="form.website" placeholder="请输入网站URL" />
            </el-form-item>
          </el-col>
        </el-row>

        <el-form-item label="详细地址">
          <el-input v-model="form.address" placeholder="请输入详细地址" />
        </el-form-item>
      </template>

      <el-form-item label="备注">
        <el-input v-model="form.notes" type="textarea" :rows="3" placeholder="请输入备注" />
      </el-form-item>
    </el-form>

    <template #footer>
      <el-button @click="$emit('update:visible', false)">取消</el-button>
      <el-button type="primary" :loading="loading" @click="handleSubmit">
        {{ isEdit ? '保存' : '创建' }}
      </el-button>
    </template>
  </el-dialog>
</template>
