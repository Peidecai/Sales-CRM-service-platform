<template>
  <div class="create-post-page">
    <div class="page-header">
      <el-button text @click="router.push('/forum')">
        <el-icon><ArrowLeft /></el-icon> 返回论坛
      </el-button>
      <h2>{{ isEdit ? '编辑帖子' : '发表帖子' }}</h2>
    </div>

    <el-form ref="formRef" :model="form" :rules="rules" label-width="80px" class="post-form">
      <el-form-item label="标题" prop="title">
        <el-input
          v-model="form.title"
          placeholder="请输入帖子标题"
          maxlength="200"
          show-word-limit
        />
      </el-form-item>

      <el-form-item label="分类" prop="categoryId">
        <el-select v-model="form.categoryId" placeholder="选择分类">
          <el-option v-for="cat in categories" :key="cat.id" :label="cat.name" :value="cat.id" />
        </el-select>
      </el-form-item>

      <el-form-item label="内容" prop="content">
        <el-input
          v-model="form.content"
          type="textarea"
          :rows="15"
          placeholder="请输入帖子内容（支持 Markdown 格式）"
        />
      </el-form-item>

      <el-form-item label="关联文章">
        <el-input-number
          v-model="form.linkedArticleId"
          :min="0"
          placeholder="知识库文章ID（可选）"
          controls-position="right"
        />
      </el-form-item>

      <el-form-item>
        <el-button type="primary" :loading="submitting" @click="handleSubmit">
          {{ isEdit ? '保存修改' : '发表' }}
        </el-button>
        <el-button @click="router.push('/forum')">取消</el-button>
      </el-form-item>
    </el-form>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage, type FormInstance, type FormRules } from 'element-plus'
import { ArrowLeft } from '@element-plus/icons-vue'
import { forumApi, type ForumCategoryVO } from '@/api/forum'

const route = useRoute()
const router = useRouter()

const formRef = ref<FormInstance>()
const submitting = ref(false)
const categories = ref<ForumCategoryVO[]>([])

const isEdit = computed(() => !!route.query.edit)
const editId = computed(() => (route.query.edit ? Number(route.query.edit) : null))

const form = ref({
  title: '',
  content: '',
  categoryId: undefined as number | undefined,
  linkedArticleId: undefined as number | undefined,
})

const rules: FormRules = {
  title: [{ required: true, message: '请输入标题', trigger: 'blur' }],
  categoryId: [{ required: true, message: '请选择分类', trigger: 'change' }],
  content: [{ required: true, message: '请输入内容', trigger: 'blur' }],
}

async function loadCategories() {
  try {
    const res = await forumApi.getCategories()
    if (res.code === 0 && res.data) {
      categories.value = res.data
    }
  } catch {
    // ignore
  }
}

async function loadPost() {
  if (!editId.value) return
  try {
    const res = await forumApi.getPost(editId.value)
    if (res.code === 0 && res.data) {
      form.value.title = res.data.title
      form.value.content = res.data.content
      form.value.categoryId = res.data.categoryId
      form.value.linkedArticleId = res.data.linkedArticleId ?? undefined
    }
  } catch {
    ElMessage.error('加载帖子失败')
  }
}

async function handleSubmit() {
  const valid = await formRef.value?.validate().catch(() => false)
  if (!valid) return

  submitting.value = true
  try {
    if (isEdit.value && editId.value) {
      await forumApi.updatePost(editId.value, {
        title: form.value.title,
        content: form.value.content,
        categoryId: form.value.categoryId,
        linkedArticleId: form.value.linkedArticleId,
      })
      ElMessage.success('修改成功')
      router.push(`/forum/post/${editId.value}`)
    } else {
      const res = await forumApi.createPost({
        title: form.value.title,
        content: form.value.content,
        categoryId: form.value.categoryId!,
        linkedArticleId: form.value.linkedArticleId,
      })
      ElMessage.success('发表成功')
      router.push(`/forum/post/${res.data!.id}`)
    }
  } catch {
    ElMessage.error('操作失败')
  } finally {
    submitting.value = false
  }
}

onMounted(() => {
  loadCategories()
  loadPost()
})
</script>

<style scoped>
.create-post-page {
  padding: 20px;
  max-width: 800px;
  margin: 0 auto;
}
.page-header {
  display: flex;
  align-items: center;
  gap: 16px;
  margin-bottom: 24px;
}
.page-header h2 {
  margin: 0;
}
.post-form {
  background: #fff;
  padding: 24px;
  border-radius: 8px;
  border: 1px solid #ebeef5;
}
</style>
