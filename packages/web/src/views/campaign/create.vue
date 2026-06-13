<template>
  <div class="campaign-create">
    <el-page-header title="创建外呼任务" @back="$router.push('/campaign')" />
    <el-card class="mt-4">
      <el-form :model="form" label-width="100px">
        <el-form-item label="任务名称" required>
          <el-input v-model="form.name" placeholder="输入任务名称" />
        </el-form-item>
        <el-form-item label="客户列表">
          <el-select
            v-model="form.customerIds"
            multiple
            placeholder="选择客户（可多选）"
            style="width: 100%"
          />
        </el-form-item>
        <el-form-item>
          <el-button type="primary" @click="handleSubmit">保存为草稿</el-button>
          <el-button @click="$router.push('/campaign')">取消</el-button>
        </el-form-item>
      </el-form>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useUserStore } from '@/stores/user'
import { getApiBase } from '@/api/request'

const router = useRouter()
const userStore = useUserStore()
const form = ref({ name: '', customerIds: [] as number[] })

async function handleSubmit() {
  const res = await fetch(`${getApiBase()}/campaigns`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${userStore.token}` },
    body: JSON.stringify(form.value),
  })
  if (res.ok) {
    const task = await res.json()
    router.push(`/campaign/${task.id}`)
  }
}
</script>

<style scoped>
.campaign-create {
  padding: 16px;
}
.mt-4 {
  margin-top: 16px;
}
</style>
