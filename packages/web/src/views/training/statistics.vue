<template>
  <div class="training-statistics-page" style="padding: 20px">
    <el-card shadow="never">
      <h2 style="margin: 0 0 20px 0">培训统计</h2>

      <!-- Task Stats -->
      <el-row :gutter="16" style="margin-bottom: 24px">
        <el-col :span="8">
          <el-card shadow="hover">
            <el-statistic title="总任务数" :value="taskStats.totalTasks" />
          </el-card>
        </el-col>
        <el-col :span="8">
          <el-card shadow="hover">
            <el-statistic title="完成率" :value="taskStats.completionRate" suffix="%" />
          </el-card>
        </el-col>
        <el-col :span="8">
          <el-card shadow="hover">
            <el-statistic title="逾期任务" :value="taskStats.overdueTasks">
              <template #suffix>
                <span :style="{ color: taskStats.overdueTasks > 0 ? '#f56c6c' : '#67c23a' }"
                  >个</span
                >
              </template>
            </el-statistic>
          </el-card>
        </el-col>
      </el-row>

      <!-- Video Stats -->
      <el-card shadow="never" style="margin-bottom: 16px">
        <template #header><span>视频概况</span></template>
        <el-row :gutter="16">
          <el-col :span="8">
            <el-statistic title="总视频数" :value="videoTotal" />
          </el-col>
          <el-col :span="8">
            <el-statistic title="已发布" :value="publishedCount" />
          </el-col>
          <el-col :span="8">
            <el-statistic title="分类数" :value="categoryCount" />
          </el-col>
        </el-row>
      </el-card>

      <!-- Category breakdown -->
      <el-card shadow="never">
        <template #header><span>分类分布</span></template>
        <el-table :data="categoryStats" border size="small">
          <el-table-column prop="name" label="分类名称" />
          <el-table-column prop="type" label="类型" width="120" />
          <el-table-column prop="videoCount" label="视频数量" width="120" />
        </el-table>
      </el-card>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import {
  trainingApi,
  type TaskStatisticsVO,
  type TrainingCategoryVO,
  type TrainingVideoVO,
} from '@/api/training'

const taskStats = ref<TaskStatisticsVO>({ totalTasks: 0, completionRate: 0, overdueTasks: 0 })
const videoTotal = ref(0)
const publishedCount = ref(0)
const categoryCount = ref(0)
const categoryStats = ref<Array<{ name: string; type: string; videoCount: number }>>([])

onMounted(async () => {
  try {
    taskStats.value = (await trainingApi.getTaskStatistics()) as unknown as TaskStatisticsVO
  } catch {
    // handled
  }

  try {
    const cats = (await trainingApi.getCategories()) as unknown as TrainingCategoryVO[]
    categoryCount.value = cats.length

    const res = (await trainingApi.getVideos({ pageSize: 1000 })) as unknown as {
      list: TrainingVideoVO[]
      total: number
    }
    videoTotal.value = res.total
    publishedCount.value = res.list.filter((v) => v.isPublished).length

    categoryStats.value = cats.map((c) => ({
      name: c.name,
      type: c.type,
      videoCount: res.list.filter((v) => v.categoryId === c.id).length,
    }))
  } catch {
    // handled
  }
})
</script>
