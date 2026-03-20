<template>
  <div class="group-rule-builder">
    <div v-for="(rule, index) in rules" :key="index" class="rule-row">
      <el-select v-if="index > 0" v-model="rule.logic" style="width: 80px" @change="emitUpdate">
        <el-option label="且" value="AND" />
        <el-option label="或" value="OR" />
      </el-select>
      <span v-else style="width: 80px; display: inline-block" />

      <el-select
        v-model="rule.field"
        placeholder="选择字段"
        style="width: 140px"
        @change="onFieldChange(index)"
      >
        <el-option v-for="f in fieldOptions" :key="f.value" :label="f.label" :value="f.value" />
      </el-select>

      <el-select
        v-model="rule.operator"
        placeholder="操作符"
        style="width: 140px"
        @change="emitUpdate"
      >
        <el-option
          v-for="op in getOperators(rule.field)"
          :key="op.value"
          :label="op.label"
          :value="op.value"
        />
      </el-select>

      <el-input
        v-if="!isMultiValueOp(rule.operator)"
        :model-value="String(rule.value ?? '')"
        placeholder="值"
        style="width: 200px"
        @input="
          (val: string) => {
            rule.value = val
            emitUpdate()
          }
        "
      />
      <el-select
        v-else
        v-model="rule.value"
        multiple
        filterable
        allow-create
        placeholder="输入多个值"
        style="width: 200px"
        @change="emitUpdate"
      />

      <el-button type="danger" text @click="removeRule(index)">
        <el-icon><Delete /></el-icon>
      </el-button>
    </div>

    <el-button type="primary" text @click="addRule">
      <el-icon><Plus /></el-icon>
      添加条件
    </el-button>
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import { Delete, Plus } from '@element-plus/icons-vue'
import type { GroupRule } from '@crm/shared'

interface RuleRow {
  logic: 'AND' | 'OR'
  field: string
  operator: string
  value: string | number | string[]
}

const props = defineProps<{
  modelValue: GroupRule[]
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', val: GroupRule[]): void
}>()

const rules = ref<RuleRow[]>([])

watch(
  () => props.modelValue,
  (val) => {
    if (val && val.length > 0) {
      rules.value = val.map((r) => ({
        logic: r.logic ?? 'AND',
        field: r.field,
        operator: r.operator,
        value: r.value,
      }))
    } else if (rules.value.length === 0) {
      rules.value = [{ logic: 'AND', field: '', operator: 'eq', value: '' }]
    }
  },
  { immediate: true },
)

const fieldOptions = [
  { label: '行业', value: 'industry', type: 'string' },
  { label: '区域', value: 'region', type: 'string' },
  { label: '客户状态', value: 'status', type: 'enum' },
  { label: '企业规模', value: 'scale', type: 'enum' },
  { label: '客户等级', value: 'level', type: 'enum' },
  { label: '客户来源', value: 'source', type: 'enum' },
  { label: '注册资本', value: 'registeredCapital', type: 'number' },
  { label: '年营收', value: 'annualRevenue', type: 'number' },
  { label: '员工人数', value: 'employeeCount', type: 'number' },
  { label: '最后联系时间', value: 'lastContactAt', type: 'date' },
  { label: '创建时间', value: 'createdAt', type: 'date' },
]

const stringOps = [
  { label: '等于', value: 'eq' },
  { label: '不等于', value: 'neq' },
  { label: '包含', value: 'contains' },
  { label: '在列表中', value: 'in' },
  { label: '不在列表中', value: 'not_in' },
]

const numberOps = [
  { label: '等于', value: 'eq' },
  { label: '大于', value: 'gt' },
  { label: '小于', value: 'lt' },
  { label: '大于等于', value: 'gte' },
  { label: '小于等于', value: 'lte' },
]

const dateOps = [
  { label: '早于', value: 'before' },
  { label: '晚于', value: 'after' },
  { label: '超过N天', value: 'days_ago_gt' },
  { label: '不到N天', value: 'days_ago_lt' },
]

const enumOps = [
  { label: '等于', value: 'eq' },
  { label: '不等于', value: 'neq' },
  { label: '在列表中', value: 'in' },
  { label: '不在列表中', value: 'not_in' },
]

function getFieldType(field: string): string {
  return fieldOptions.find((f) => f.value === field)?.type ?? 'string'
}

function getOperators(field: string) {
  const t = getFieldType(field)
  if (t === 'number') return numberOps
  if (t === 'date') return dateOps
  if (t === 'enum') return enumOps
  return stringOps
}

function isMultiValueOp(op: string): boolean {
  return op === 'in' || op === 'not_in'
}

function onFieldChange(index: number) {
  const rule = rules.value[index]
  const ops = getOperators(rule.field)
  if (!ops.find((o) => o.value === rule.operator)) {
    rule.operator = ops[0]?.value ?? 'eq'
  }
  rule.value = isMultiValueOp(rule.operator) ? [] : ''
  emitUpdate()
}

function addRule() {
  rules.value.push({ logic: 'AND', field: '', operator: 'eq', value: '' })
  emitUpdate()
}

function removeRule(index: number) {
  rules.value.splice(index, 1)
  emitUpdate()
}

function emitUpdate() {
  const validRules: GroupRule[] = rules.value
    .filter((r) => r.field && r.operator)
    .map((r) => ({
      logic: r.logic,
      field: r.field,
      operator: r.operator as GroupRule['operator'],
      value: r.value,
    }))
  emit('update:modelValue', validRules)
}
</script>

<style scoped>
.rule-row {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
}

.group-rule-builder {
  padding: 8px 0;
}
</style>
