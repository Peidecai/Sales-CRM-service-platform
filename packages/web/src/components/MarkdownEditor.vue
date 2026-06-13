<script setup lang="ts">
import { computed, nextTick, ref } from 'vue'
import MarkdownIt from 'markdown-it'

interface Props {
  modelValue: string
  height?: number
  placeholder?: string
}

type PreviewMode = 'split' | 'edit' | 'preview'
type ToolbarAction =
  | 'h1'
  | 'h2'
  | 'h3'
  | 'bold'
  | 'italic'
  | 'code'
  | 'codeblock'
  | 'link'
  | 'ul'
  | 'ol'
  | 'quote'
  | 'hr'

const props = withDefaults(defineProps<Props>(), {
  modelValue: '',
  height: 400,
  placeholder: '请输入 Markdown 内容...',
})

const emit = defineEmits<{
  'update:modelValue': [value: string]
}>()

const md = new MarkdownIt({
  html: false,
  breaks: true,
  linkify: true,
})

const editorRef = ref<HTMLTextAreaElement | null>(null)
const previewMode = ref<PreviewMode>('split')

const preview = computed(() => md.render(props.modelValue || ''))

const TOOLBAR_WRAPPERS: Record<
  ToolbarAction,
  { prefix: string; suffix: string; placeholder?: string }
> = {
  h1: { prefix: '# ', suffix: '' },
  h2: { prefix: '## ', suffix: '' },
  h3: { prefix: '### ', suffix: '' },
  bold: { prefix: '**', suffix: '**', placeholder: '粗体文字' },
  italic: { prefix: '*', suffix: '*', placeholder: '斜体文字' },
  code: { prefix: '`', suffix: '`', placeholder: 'code' },
  codeblock: { prefix: '```\n', suffix: '\n```', placeholder: '代码块' },
  link: { prefix: '[', suffix: '](url)', placeholder: '链接文字' },
  ul: { prefix: '- ', suffix: '' },
  ol: { prefix: '1. ', suffix: '' },
  quote: { prefix: '> ', suffix: '' },
  hr: { prefix: '\n---\n', suffix: '' },
}

function handleInput(event: Event) {
  emit('update:modelValue', (event.target as HTMLTextAreaElement).value)
}

function insertMarkdown(action: ToolbarAction) {
  const textarea = editorRef.value
  if (!textarea) return

  const { prefix, suffix, placeholder } = TOOLBAR_WRAPPERS[action]
  const start = textarea.selectionStart
  const end = textarea.selectionEnd
  const selected = textarea.value.substring(start, end) || placeholder || ''
  const inserted = `${prefix}${selected}${suffix}`
  const newValue = textarea.value.substring(0, start) + inserted + textarea.value.substring(end)

  emit('update:modelValue', newValue)

  nextTick(() => {
    textarea.focus()
    const selectionStart = start + prefix.length
    const selectionEnd = selectionStart + selected.length
    textarea.setSelectionRange(selectionStart, selectionEnd)
  })
}

function handleKeydown(event: KeyboardEvent) {
  if (!event.ctrlKey && !event.metaKey) return

  const keyMap: Record<string, ToolbarAction> = {
    b: 'bold',
    i: 'italic',
    k: 'link',
  }

  const action = keyMap[event.key.toLowerCase()]
  if (!action) return

  event.preventDefault()
  insertMarkdown(action)
}
</script>

<template>
  <div class="md-editor">
    <div class="md-toolbar">
      <div class="md-toolbar-left">
        <div class="md-btn-group">
          <button type="button" class="md-btn" title="一级标题" @click="insertMarkdown('h1')">
            H1
          </button>
          <button type="button" class="md-btn" title="二级标题" @click="insertMarkdown('h2')">
            H2
          </button>
          <button type="button" class="md-btn" title="三级标题" @click="insertMarkdown('h3')">
            H3
          </button>
        </div>
        <span class="md-divider" />
        <div class="md-btn-group">
          <button
            type="button"
            class="md-btn"
            title="粗体 (Ctrl+B)"
            @click="insertMarkdown('bold')"
          >
            <strong>B</strong>
          </button>
          <button
            type="button"
            class="md-btn"
            title="斜体 (Ctrl+I)"
            @click="insertMarkdown('italic')"
          >
            <em>I</em>
          </button>
          <button type="button" class="md-btn" title="行内代码" @click="insertMarkdown('code')">
            &lt;/&gt;
          </button>
          <button type="button" class="md-btn" title="代码块" @click="insertMarkdown('codeblock')">
            ```
          </button>
        </div>
        <span class="md-divider" />
        <div class="md-btn-group">
          <button
            type="button"
            class="md-btn"
            title="链接 (Ctrl+K)"
            @click="insertMarkdown('link')"
          >
            Link
          </button>
          <button type="button" class="md-btn" title="无序列表" @click="insertMarkdown('ul')">
            UL
          </button>
          <button type="button" class="md-btn" title="有序列表" @click="insertMarkdown('ol')">
            OL
          </button>
          <button type="button" class="md-btn" title="引用" @click="insertMarkdown('quote')">
            Quote
          </button>
          <button type="button" class="md-btn" title="分割线" @click="insertMarkdown('hr')">
            HR
          </button>
        </div>
      </div>
      <div class="md-toolbar-right">
        <button
          type="button"
          class="md-mode-btn"
          :class="{ active: previewMode === 'edit' }"
          @click="previewMode = 'edit'"
        >
          编辑
        </button>
        <button
          type="button"
          class="md-mode-btn"
          :class="{ active: previewMode === 'split' }"
          @click="previewMode = 'split'"
        >
          分屏
        </button>
        <button
          type="button"
          class="md-mode-btn"
          :class="{ active: previewMode === 'preview' }"
          @click="previewMode = 'preview'"
        >
          预览
        </button>
      </div>
    </div>

    <div class="md-body">
      <div v-if="previewMode !== 'preview'" class="md-editor-pane">
        <textarea
          ref="editorRef"
          class="md-textarea"
          :style="{ height: `${height}px` }"
          :value="modelValue"
          :placeholder="placeholder"
          @input="handleInput"
          @keydown="handleKeydown"
        />
      </div>

      <div v-if="previewMode !== 'edit'" class="md-preview-pane">
        <div v-safe-html="preview" class="md-preview" :style="{ minHeight: `${height}px` }" />
      </div>
    </div>
  </div>
</template>

<style scoped>
.md-editor {
  border: 1px solid var(--el-border-color);
  border-radius: 4px;
  overflow: hidden;
}

.md-toolbar {
  align-items: center;
  background: var(--el-fill-color-light);
  border-bottom: 1px solid var(--el-border-color);
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  justify-content: space-between;
  padding: 6px 8px;
}

.md-toolbar-left {
  align-items: center;
  display: flex;
  flex-wrap: wrap;
  gap: 2px;
}

.md-btn-group {
  align-items: center;
  display: flex;
  gap: 2px;
}

.md-btn,
.md-mode-btn {
  background: transparent;
  border: 1px solid transparent;
  border-radius: 4px;
  color: var(--el-text-color-primary);
  cursor: pointer;
  font-size: 12px;
  line-height: 1;
  padding: 5px 8px;
}

.md-btn:hover,
.md-mode-btn:hover {
  background: var(--el-fill-color);
}

.md-mode-btn.active {
  background: var(--el-color-primary-light-9);
  border-color: var(--el-color-primary-light-5);
  color: var(--el-color-primary);
}

.md-divider {
  background: var(--el-border-color);
  display: inline-block;
  height: 18px;
  margin: 0 4px;
  width: 1px;
}

.md-body {
  display: flex;
}

.md-editor-pane,
.md-preview-pane {
  flex: 1;
  min-width: 0;
}

.md-editor-pane + .md-preview-pane {
  border-left: 1px solid var(--el-border-color);
}

.md-textarea {
  background: #fff;
  border: none;
  box-sizing: border-box;
  color: var(--el-text-color-primary);
  display: block;
  font-family: Consolas, Monaco, monospace;
  font-size: 13px;
  line-height: 1.6;
  outline: none;
  padding: 12px;
  resize: none;
  width: 100%;
}

.md-preview {
  color: var(--el-text-color-primary);
  font-size: 14px;
  line-height: 1.7;
  overflow-y: auto;
  padding: 12px 16px;
}

.md-preview :deep(h1),
.md-preview :deep(h2),
.md-preview :deep(h3) {
  font-weight: 600;
  margin: 16px 0 8px;
}

.md-preview :deep(h1) {
  border-bottom: 1px solid var(--el-border-color);
  font-size: 1.5em;
  padding-bottom: 4px;
}

.md-preview :deep(h2) {
  font-size: 1.25em;
}

.md-preview :deep(h3) {
  font-size: 1.1em;
}

.md-preview :deep(p) {
  margin: 8px 0;
}

.md-preview :deep(code) {
  background: var(--el-fill-color);
  border-radius: 3px;
  font-family: Consolas, Monaco, monospace;
  font-size: 0.9em;
  padding: 2px 5px;
}

.md-preview :deep(pre) {
  background: var(--el-fill-color-darker, #f6f8fa);
  border-radius: 6px;
  overflow-x: auto;
  padding: 12px;
}

.md-preview :deep(pre code) {
  background: none;
  padding: 0;
}

.md-preview :deep(blockquote) {
  border-left: 4px solid var(--el-color-primary-light-5);
  color: var(--el-text-color-secondary);
  margin: 8px 0;
  padding-left: 12px;
}

.md-preview :deep(ul),
.md-preview :deep(ol) {
  margin: 8px 0;
  padding-left: 24px;
}

.md-preview :deep(li) {
  margin: 4px 0;
}

.md-preview :deep(hr) {
  border: none;
  border-top: 1px solid var(--el-border-color);
  margin: 16px 0;
}

.md-preview :deep(a) {
  color: var(--el-color-primary);
  text-decoration: none;
}

.md-preview :deep(a:hover) {
  text-decoration: underline;
}
</style>
