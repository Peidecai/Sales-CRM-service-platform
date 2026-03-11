<script setup lang="ts">
interface FieldDefinition {
  fieldKey: string
  fieldLabel: string
  fieldType: string
  options?: string[]
  required: boolean
  defaultValue?: string
}

const props = defineProps<{
  modelValue: Record<string, unknown>
  definitions: FieldDefinition[]
  disabled?: boolean
}>()

const emit = defineEmits<{
  'update:modelValue': [value: Record<string, unknown>]
}>()

const getValue = (key: string) => props.modelValue?.[key]

const setValue = (key: string, value: unknown) => {
  emit('update:modelValue', { ...props.modelValue, [key]: value })
}
</script>

<template>
  <template v-for="def in definitions" :key="def.fieldKey">
    <el-form-item :label="def.fieldLabel" :required="def.required">
      <!-- text -->
      <el-input
        v-if="def.fieldType === 'text'"
        :model-value="(getValue(def.fieldKey) as string) ?? ''"
        :disabled="disabled"
        @update:model-value="setValue(def.fieldKey, $event)"
      />

      <!-- number -->
      <el-input-number
        v-else-if="def.fieldType === 'number'"
        :model-value="(getValue(def.fieldKey) as number) ?? undefined"
        :disabled="disabled"
        style="width: 100%"
        @update:model-value="setValue(def.fieldKey, $event)"
      />

      <!-- date -->
      <el-date-picker
        v-else-if="def.fieldType === 'date'"
        type="date"
        :model-value="(getValue(def.fieldKey) as string) ?? ''"
        :disabled="disabled"
        style="width: 100%"
        value-format="YYYY-MM-DD"
        @update:model-value="setValue(def.fieldKey, $event)"
      />

      <!-- select -->
      <el-select
        v-else-if="def.fieldType === 'select'"
        :model-value="(getValue(def.fieldKey) as string) ?? ''"
        :disabled="disabled"
        clearable
        style="width: 100%"
        @update:model-value="setValue(def.fieldKey, $event)"
      >
        <el-option v-for="opt in def.options" :key="opt" :label="opt" :value="opt" />
      </el-select>

      <!-- multi_select -->
      <el-select
        v-else-if="def.fieldType === 'multi_select'"
        :model-value="(getValue(def.fieldKey) as string[]) ?? []"
        :disabled="disabled"
        multiple
        clearable
        style="width: 100%"
        @update:model-value="setValue(def.fieldKey, $event)"
      >
        <el-option v-for="opt in def.options" :key="opt" :label="opt" :value="opt" />
      </el-select>

      <!-- radio -->
      <el-radio-group
        v-else-if="def.fieldType === 'radio'"
        :model-value="(getValue(def.fieldKey) as string) ?? ''"
        :disabled="disabled"
        @update:model-value="setValue(def.fieldKey, $event)"
      >
        <el-radio v-for="opt in def.options" :key="opt" :value="opt">{{ opt }}</el-radio>
      </el-radio-group>

      <!-- checkbox -->
      <el-checkbox-group
        v-else-if="def.fieldType === 'checkbox'"
        :model-value="(getValue(def.fieldKey) as string[]) ?? []"
        :disabled="disabled"
        @update:model-value="setValue(def.fieldKey, $event)"
      >
        <el-checkbox v-for="opt in def.options" :key="opt" :value="opt">{{ opt }}</el-checkbox>
      </el-checkbox-group>

      <!-- textarea -->
      <el-input
        v-else-if="def.fieldType === 'textarea'"
        type="textarea"
        :rows="3"
        :model-value="(getValue(def.fieldKey) as string) ?? ''"
        :disabled="disabled"
        @update:model-value="setValue(def.fieldKey, $event)"
      />
    </el-form-item>
  </template>
</template>
