<template>
  <div v-loading="loading" class="post-detail-page">
    <div v-if="post" class="post-container">
      <!-- Post Header -->
      <div class="post-header">
        <el-button text @click="router.push('/forum')">
          <el-icon><ArrowLeft /></el-icon> 返回论坛
        </el-button>
        <div v-if="isAdminOrManager" class="post-actions">
          <el-dropdown @command="handleModerate">
            <el-button text>
              管理操作 <el-icon><ArrowDown /></el-icon>
            </el-button>
            <template #dropdown>
              <el-dropdown-menu>
                <el-dropdown-item command="pin">
                  {{ post.isPinned ? '取消置顶' : '置顶' }}
                </el-dropdown-item>
                <el-dropdown-item command="feature">
                  {{ post.isFeatured ? '取消精华' : '精华' }}
                </el-dropdown-item>
                <el-dropdown-item command="lock">
                  {{ post.isLocked ? '解锁' : '锁定' }}
                </el-dropdown-item>
              </el-dropdown-menu>
            </template>
          </el-dropdown>
        </div>
      </div>

      <!-- Post Content -->
      <div class="post-content-area">
        <div class="post-tags">
          <el-tag v-if="post.isPinned" type="danger" size="small">置顶</el-tag>
          <el-tag v-if="post.isFeatured" type="warning" size="small">精华</el-tag>
          <el-tag v-if="post.isLocked" type="info" size="small">已锁定</el-tag>
        </div>
        <h1>{{ post.title }}</h1>
        <div class="post-info">
          <span>用户 #{{ post.authorId }}</span>
          <span>{{ formatDate(post.createdAt) }}</span>
          <span
            ><el-icon><View /></el-icon> {{ post.viewCount }}</span
          >
        </div>
        <!-- eslint-disable-next-line vue/no-v-html -- content escaped via renderContent() which HTML-encodes all entities -->
        <div class="content-body" v-html="renderContent(post.content)" />
        <div class="post-toolbar">
          <el-button :type="post.isLiked ? 'primary' : 'default'" @click="handleToggleLike">
            <el-icon><Star /></el-icon> {{ post.likeCount }}
          </el-button>
          <el-button :type="post.isFavorited ? 'warning' : 'default'" @click="handleToggleFavorite">
            <el-icon><CollectionTag /></el-icon> {{ post.isFavorited ? '已收藏' : '收藏' }}
          </el-button>
        </div>
      </div>

      <!-- Comments -->
      <div class="comments-section">
        <h3>评论 ({{ post.commentCount }})</h3>

        <!-- New Comment -->
        <div v-if="!post.isLocked" class="new-comment">
          <el-input
            v-model="newComment"
            type="textarea"
            :rows="3"
            :placeholder="replyTo ? `回复 用户 #${replyTo.userId}...` : '写评论...'"
          />
          <div class="comment-actions">
            <el-button v-if="replyTo" text @click="replyTo = null">取消回复</el-button>
            <el-button type="primary" :disabled="!newComment.trim()" @click="handleSubmitComment">
              发表评论
            </el-button>
          </div>
        </div>
        <el-alert v-else type="info" :closable="false" description="帖子已锁定，无法评论" />

        <!-- Comment List -->
        <div class="comment-list">
          <div v-for="comment in comments" :key="comment.id" class="comment-item">
            <div class="comment-header">
              <span class="comment-author">用户 #{{ comment.authorId }}</span>
              <span v-if="comment.parentId" class="reply-hint">
                回复 #{{ comment.replyToUserId ?? comment.parentId }}
              </span>
              <span class="comment-time">{{ formatDate(comment.createdAt) }}</span>
            </div>
            <p class="comment-content">{{ comment.content }}</p>
            <div class="comment-footer">
              <el-button text size="small" @click="handleLikeComment(comment.id)">
                <el-icon><Star /></el-icon> {{ comment.likeCount }}
              </el-button>
              <el-button v-if="!post.isLocked" text size="small" @click="handleReply(comment)">
                回复
              </el-button>
              <el-button
                v-if="canDeleteComment(comment)"
                text
                size="small"
                type="danger"
                @click="handleDeleteComment(comment.id)"
              >
                删除
              </el-button>
            </div>
          </div>
          <el-empty v-if="comments.length === 0" description="暂无评论" :image-size="60" />
        </div>

        <el-pagination
          v-if="commentTotal > commentPageSize"
          v-model:current-page="commentPage"
          :page-size="commentPageSize"
          :total="commentTotal"
          layout="prev, pager, next"
          style="margin-top: 16px; justify-content: center"
          @current-change="loadComments"
        />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { ArrowLeft, ArrowDown, View, Star, CollectionTag } from '@element-plus/icons-vue'
import { usePermission } from '@/composables/usePermission'
import { useUserStore } from '@/stores/user'
import { forumApi, type ForumPostVO, type ForumCommentVO } from '@/api/forum'

const route = useRoute()
const router = useRouter()
const { isAdminOrManager } = usePermission()
const userStore = useUserStore()

const loading = ref(false)
const post = ref<ForumPostVO | null>(null)
const comments = ref<ForumCommentVO[]>([])
const newComment = ref('')
const replyTo = ref<{ commentId: number; userId: number } | null>(null)
const commentPage = ref(1)
const commentPageSize = 20
const commentTotal = ref(0)

const postId = Number(route.params.id)

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleString('zh-CN', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function renderContent(content: string): string {
  // Basic markdown-like rendering: convert newlines to <br>
  return content
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/\n/g, '<br>')
}

function canDeleteComment(comment: ForumCommentVO): boolean {
  const userId = userStore.userInfo?.id
  return comment.authorId === userId || isAdminOrManager.value
}

async function loadPost() {
  loading.value = true
  try {
    const res = await forumApi.getPost(postId)
    if (res.code === 0 && res.data) {
      post.value = res.data
    }
  } catch {
    ElMessage.error('加载帖子失败')
  } finally {
    loading.value = false
  }
}

async function loadComments() {
  try {
    const res = await forumApi.getComments(postId, {
      page: commentPage.value,
      pageSize: commentPageSize,
    })
    if (res.code === 0 && res.data) {
      comments.value = res.data.list
      commentTotal.value = res.data.total
    }
  } catch {
    // ignore
  }
}

async function handleToggleLike() {
  try {
    const res = await forumApi.toggleLikePost(postId)
    if (res.code === 0 && res.data && post.value) {
      post.value.isLiked = res.data.liked
      post.value.likeCount += res.data.liked ? 1 : -1
    }
  } catch {
    // ignore
  }
}

async function handleToggleFavorite() {
  try {
    const res = await forumApi.toggleFavoritePost(postId)
    if (res.code === 0 && res.data && post.value) {
      post.value.isFavorited = res.data.favorited
    }
  } catch {
    // ignore
  }
}

async function handleSubmitComment() {
  if (!newComment.value.trim()) return
  try {
    await forumApi.createComment(postId, {
      content: newComment.value,
      parentId: replyTo.value?.commentId,
      replyToUserId: replyTo.value?.userId,
    })
    newComment.value = ''
    replyTo.value = null
    if (post.value) post.value.commentCount += 1
    await loadComments()
    ElMessage.success('评论成功')
  } catch {
    ElMessage.error('评论失败')
  }
}

function handleReply(comment: ForumCommentVO) {
  replyTo.value = { commentId: comment.id, userId: comment.authorId }
}

async function handleDeleteComment(id: number) {
  await ElMessageBox.confirm('确认删除评论？', '提示')
  try {
    await forumApi.deleteComment(id)
    if (post.value) post.value.commentCount -= 1
    await loadComments()
    ElMessage.success('已删除')
  } catch {
    // ignore
  }
}

async function handleLikeComment(id: number) {
  try {
    await forumApi.toggleLikeComment(id)
    await loadComments()
  } catch {
    // ignore
  }
}

async function handleModerate(command: string) {
  if (!post.value) return
  try {
    if (command === 'pin') {
      await forumApi.moderatePost(postId, { isPinned: !post.value.isPinned })
      post.value.isPinned = !post.value.isPinned
    } else if (command === 'feature') {
      await forumApi.moderatePost(postId, { isFeatured: !post.value.isFeatured })
      post.value.isFeatured = !post.value.isFeatured
    } else if (command === 'lock') {
      await forumApi.moderatePost(postId, { isLocked: !post.value.isLocked })
      post.value.isLocked = !post.value.isLocked
    }
    ElMessage.success('操作成功')
  } catch {
    // ignore
  }
}

onMounted(() => {
  loadPost()
  loadComments()
})
</script>

<style scoped>
.post-detail-page {
  padding: 20px;
  max-width: 900px;
  margin: 0 auto;
}
.post-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}
.post-content-area {
  background: #fff;
  border-radius: 8px;
  padding: 24px;
  border: 1px solid #ebeef5;
}
.post-tags {
  display: flex;
  gap: 6px;
  margin-bottom: 8px;
}
.post-content-area h1 {
  margin: 0 0 12px;
  font-size: 24px;
}
.post-info {
  display: flex;
  gap: 16px;
  color: #909399;
  font-size: 13px;
  margin-bottom: 20px;
  align-items: center;
}
.content-body {
  line-height: 1.8;
  font-size: 15px;
  color: #303133;
  min-height: 100px;
}
.post-toolbar {
  margin-top: 20px;
  padding-top: 16px;
  border-top: 1px solid #ebeef5;
  display: flex;
  gap: 12px;
}
.comments-section {
  margin-top: 24px;
  background: #fff;
  border-radius: 8px;
  padding: 24px;
  border: 1px solid #ebeef5;
}
.comments-section h3 {
  margin: 0 0 16px;
}
.new-comment {
  margin-bottom: 20px;
}
.comment-actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  margin-top: 8px;
}
.comment-item {
  padding: 12px 0;
  border-bottom: 1px solid #f0f0f0;
}
.comment-item:last-child {
  border-bottom: none;
}
.comment-header {
  display: flex;
  gap: 12px;
  align-items: center;
  margin-bottom: 6px;
}
.comment-author {
  font-weight: 600;
  color: #303133;
  font-size: 14px;
}
.reply-hint {
  color: #909399;
  font-size: 12px;
}
.comment-time {
  color: #c0c4cc;
  font-size: 12px;
}
.comment-content {
  margin: 0 0 8px;
  color: #606266;
  line-height: 1.6;
}
.comment-footer {
  display: flex;
  gap: 8px;
}
</style>
