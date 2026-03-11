# TASK-02: 知识文章富文本 Markdown 编辑器

**状态**: ✅ 已完成
**优先级**: P1 — 核心体验缺陷
**模块**: Knowledge 前端 (TM-D Web)
**估算工作量**: 前端 5h + 测试 1h
**完成提交**: `e4a470c` (2026-03-08)
**审查日期**: 2026-03-10

---

## 0. 实现状态总览

| 功能项                   | 完成度  | 说明                                                                    |
| ------------------------ | ------- | ----------------------------------------------------------------------- |
| MarkdownEditor.vue 组件  | ✅ 100% | `packages/web/src/components/MarkdownEditor.vue` (395行)                |
| 工具栏 (10个按钮)        | ✅ 100% | H1/H2/H3、粗体、斜体、行内代码、代码块、链接、列表(UL/OL)、引用、分割线 |
| 分屏/编辑/预览三模式     | ✅ 100% | 默认分屏，可切换仅编辑或仅预览                                          |
| markdown-it 实时渲染     | ✅ 100% | `html: false` XSS 防护，`breaks: true` 换行支持                         |
| v-model 双向绑定         | ✅ 100% | `modelValue` + `update:modelValue` 标准实现                             |
| 快捷键 Ctrl+B/I/K        | ✅ 100% | `handleKeydown` 处理 Ctrl/Cmd 键组合                                    |
| 光标定位修复             | ✅ 100% | 使用 `nextTick` 替代 `requestAnimationFrame`                            |
| placeholder 支持         | ✅ 100% | 默认 "请输入 Markdown 内容..."                                          |
| CSS 完整样式             | ✅ 100% | 工具栏、编辑区、预览区、Markdown 元素样式                               |
| knowledge/index.vue 集成 | ✅ 100% | textarea 已替换为 MarkdownEditor                                        |
| markdown-it 依赖         | ✅ 100% | `^14.1.1` + `@types/markdown-it ^14.1.2`                                |
| 单元测试                 | ✅ 100% | 6 个测试用例全部通过                                                    |

### 与规范的细微差异（不影响功能）

| 项            | 规范描述                           | 实际实现                                | 影响                      |
| ------------- | ---------------------------------- | --------------------------------------- | ------------------------- |
| 工具栏按钮    | `el-button-group + el-button text` | 原生 `<button>` 元素                    | 无 — 功能相同，样式更轻量 |
| 模式选择      | `el-radio-button`                  | 原生 `<button>` + `:class="{ active }"` | 无 — 更简洁               |
| Ctrl+` 快捷键 | 规范中提及                         | 未实现（非强制要求）                    | 低 — 可通过工具栏按钮操作 |

---

## 1. 背景与现状

### 现状（已更新）

`packages/web/src/views/knowledge/index.vue` 中的文章编辑弹窗已使用 `MarkdownEditor` 组件替换了原始 `<textarea>`：

```vue
<!-- knowledge/index.vue line 218-222 -->
<MarkdownEditor
  v-model="articleForm.content"
  :height="380"
  placeholder="请输入文章内容（支持 Markdown）"
/>
```

已解决的问题：

1. ✅ 工具栏支持 10 种格式操作 + Ctrl+B/I/K 快捷键
2. ✅ 分屏实时预览，左侧编辑右侧渲染
3. ✅ markdown-it 渲染引擎，`html: false` 防 XSS
4. ✅ 等宽字体编辑区 + 完整 Markdown 元素样式

### 功能目标（已达成）

已替换为**左右分栏式 Markdown 编辑器**：

- **左侧**：带工具栏的代码输入区（原始 Markdown 文本）
- **右侧**：实时渲染的 HTML 预览区
- **工具栏**：常用格式快捷按钮（标题、粗体、斜体、代码、链接、列表）
- **无需引入重量级外部编辑器库**，使用 `markdown-it` 渲染 + 内联编辑器实现

---

## 2. 技术规范 (MCP Spec)

### 2.1 依赖选型

**方案**: 自实现轻量编辑器（避免引入重量级 UI 库，保持 Element Plus 风格一致）

```bash
# 仅需安装渲染引擎
cd packages/web
pnpm add markdown-it
pnpm add -D @types/markdown-it
```

**不引入**: ByteMD、Vditor、TipTap（过重，与项目 UI 风格不一致）

### 2.2 组件设计

#### 新建独立组件

**`packages/web/src/components/MarkdownEditor.vue`**

````vue
<script setup lang="ts">
import { ref, computed, nextTick } from "vue";
import MarkdownIt from "markdown-it";

const md = new MarkdownIt({
  html: false, // 禁用 HTML 注入（XSS 防护）
  breaks: true, // 换行符渲染为 <br>
  linkify: true, // 自动检测 URL
});

interface Props {
  modelValue: string;
  height?: number; // 编辑区高度（px），默认 400
  placeholder?: string;
}

const props = withDefaults(defineProps<Props>(), {
  height: 400,
  placeholder: "请输入 Markdown 内容...",
});

const emit = defineEmits<{
  "update:modelValue": [value: string];
}>();

const editorRef = ref<HTMLTextAreaElement | null>(null);
const previewMode = ref<"split" | "edit" | "preview">("split");

const preview = computed(() => md.render(props.modelValue || ""));

function handleInput(e: Event) {
  emit("update:modelValue", (e.target as HTMLTextAreaElement).value);
}

// ---- Toolbar actions ----
type ToolbarAction =
  | "h1"
  | "h2"
  | "h3"
  | "bold"
  | "italic"
  | "code"
  | "codeblock"
  | "link"
  | "ul"
  | "ol"
  | "quote"
  | "hr";

const TOOLBAR_WRAPPERS: Record<
  ToolbarAction,
  { prefix: string; suffix: string; placeholder?: string }
> = {
  h1: { prefix: "# ", suffix: "" },
  h2: { prefix: "## ", suffix: "" },
  h3: { prefix: "### ", suffix: "" },
  bold: { prefix: "**", suffix: "**", placeholder: "粗体文字" },
  italic: { prefix: "*", suffix: "*", placeholder: "斜体文字" },
  code: { prefix: "`", suffix: "`", placeholder: "code" },
  codeblock: { prefix: "```\n", suffix: "\n```", placeholder: "代码块" },
  link: { prefix: "[", suffix: "](url)", placeholder: "链接文字" },
  ul: { prefix: "- ", suffix: "" },
  ol: { prefix: "1. ", suffix: "" },
  quote: { prefix: "> ", suffix: "" },
  hr: { prefix: "\n---\n", suffix: "" },
};

function insertMarkdown(action: ToolbarAction) {
  const textarea = editorRef.value;
  if (!textarea) return;

  const { prefix, suffix, placeholder } = TOOLBAR_WRAPPERS[action];
  const start = textarea.selectionStart;
  const end = textarea.selectionEnd;
  const selected = textarea.value.substring(start, end) || placeholder || "";
  const inserted = `${prefix}${selected}${suffix}`;

  const newValue =
    textarea.value.substring(0, start) +
    inserted +
    textarea.value.substring(end);

  emit("update:modelValue", newValue);

  // 恢复焦点和光标位置（nextTick 保证 Vue 完成 DOM 更新后再操作 textarea）
  nextTick(() => {
    textarea.focus();
    const newCursorPos = start + prefix.length + selected.length;
    textarea.setSelectionRange(start + prefix.length, newCursorPos);
  });
}

// Ctrl+B / Ctrl+I / Ctrl+K 快捷键
function handleKeydown(e: KeyboardEvent) {
  if (!e.ctrlKey && !e.metaKey) return;
  const keyMap: Record<string, ToolbarAction> = {
    b: "bold",
    i: "italic",
    k: "link",
    "`": "code",
  };
  const action = keyMap[e.key.toLowerCase()];
  if (action) {
    e.preventDefault();
    insertMarkdown(action);
  }
}
</script>

<template>
  <div class="md-editor">
    <!-- 工具栏 -->
    <div class="md-toolbar">
      <div class="md-toolbar-left">
        <el-button-group size="small">
          <el-button text title="一级标题" @click="insertMarkdown('h1')"
            >H1</el-button
          >
          <el-button text title="二级标题" @click="insertMarkdown('h2')"
            >H2</el-button
          >
          <el-button text title="三级标题" @click="insertMarkdown('h3')"
            >H3</el-button
          >
        </el-button-group>
        <el-divider direction="vertical" />
        <el-button-group size="small">
          <el-button text title="粗体 (Ctrl+B)" @click="insertMarkdown('bold')"
            ><b>B</b></el-button
          >
          <el-button
            text
            title="斜体 (Ctrl+I)"
            @click="insertMarkdown('italic')"
            ><i>I</i></el-button
          >
          <el-button
            text
            title="行内代码 (Ctrl+`)"
            @click="insertMarkdown('code')"
            >&lt;/&gt;</el-button
          >
          <el-button text title="代码块" @click="insertMarkdown('codeblock')"
            >```</el-button
          >
        </el-button-group>
        <el-divider direction="vertical" />
        <el-button-group size="small">
          <el-button text title="链接 (Ctrl+K)" @click="insertMarkdown('link')"
            >🔗</el-button
          >
          <el-button text title="无序列表" @click="insertMarkdown('ul')"
            >•—</el-button
          >
          <el-button text title="有序列表" @click="insertMarkdown('ol')"
            >1.</el-button
          >
          <el-button text title="引用" @click="insertMarkdown('quote')"
            >"</el-button
          >
          <el-button text title="分割线" @click="insertMarkdown('hr')"
            >—</el-button
          >
        </el-button-group>
      </div>
      <div class="md-toolbar-right">
        <el-radio-group v-model="previewMode" size="small">
          <el-radio-button value="edit">编辑</el-radio-button>
          <el-radio-button value="split">分屏</el-radio-button>
          <el-radio-button value="preview">预览</el-radio-button>
        </el-radio-group>
      </div>
    </div>

    <!-- 编辑区 -->
    <div class="md-body">
      <div v-if="previewMode !== 'preview'" class="md-editor-pane">
        <textarea
          ref="editorRef"
          :value="modelValue"
          :placeholder="placeholder"
          :style="{ height: height + 'px' }"
          class="md-textarea"
          @input="handleInput"
          @keydown="handleKeydown"
        />
      </div>
      <div v-if="previewMode !== 'edit'" class="md-preview-pane">
        <div
          class="md-preview"
          :style="{ minHeight: height + 'px' }"
          v-html="preview"
        />
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
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 6px 8px;
  background: var(--el-fill-color-light);
  border-bottom: 1px solid var(--el-border-color);
  flex-wrap: wrap;
  gap: 4px;
}

.md-toolbar-left {
  display: flex;
  align-items: center;
  gap: 2px;
  flex-wrap: wrap;
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
  display: block;
  width: 100%;
  padding: 12px;
  font-family: "Consolas", "Monaco", monospace;
  font-size: 13px;
  line-height: 1.6;
  resize: none;
  border: none;
  outline: none;
  box-sizing: border-box;
  background: #fff;
  color: var(--el-text-color-primary);
}

.md-preview {
  padding: 12px 16px;
  overflow-y: auto;
  font-size: 14px;
  line-height: 1.7;
  color: var(--el-text-color-primary);
}

/* Markdown 内容样式 */
.md-preview :deep(h1),
.md-preview :deep(h2),
.md-preview :deep(h3) {
  margin: 16px 0 8px;
  font-weight: 600;
}
.md-preview :deep(h1) {
  font-size: 1.5em;
  border-bottom: 1px solid var(--el-border-color);
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
  padding: 2px 5px;
  border-radius: 3px;
  font-family: "Consolas", "Monaco", monospace;
  font-size: 0.9em;
}
.md-preview :deep(pre) {
  background: var(--el-fill-color-darker, #f6f8fa);
  padding: 12px;
  border-radius: 6px;
  overflow-x: auto;
}
.md-preview :deep(pre code) {
  background: none;
  padding: 0;
}
.md-preview :deep(blockquote) {
  border-left: 4px solid var(--el-color-primary-light-5);
  padding-left: 12px;
  color: var(--el-text-color-secondary);
  margin: 8px 0;
}
.md-preview :deep(ul),
.md-preview :deep(ol) {
  padding-left: 24px;
  margin: 8px 0;
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
.md-preview :deep(table) {
  border-collapse: collapse;
  width: 100%;
  margin: 8px 0;
}
.md-preview :deep(th),
.md-preview :deep(td) {
  border: 1px solid var(--el-border-color);
  padding: 6px 12px;
}
.md-preview :deep(th) {
  background: var(--el-fill-color-light);
}
</style>
````

### 2.3 替换 index.vue 中的 textarea

在 `packages/web/src/views/knowledge/index.vue` 中：

**Step 1**: 导入组件

```typescript
// 在 <script setup> 中添加
import MarkdownEditor from "@/components/MarkdownEditor.vue";
```

**Step 2**: 替换模板中的 `<el-form-item>` 内容

找到：

```vue
<el-input
  v-model="articleForm.content"
  type="textarea"
  :rows="10"
  placeholder="请输入文章内容（支持 Markdown）"
/>
```

替换为：

```vue
<MarkdownEditor
  v-model="articleForm.content"
  :height="380"
  placeholder="请输入文章内容（支持 Markdown）"
/>
```

**Step 3**: 确认弹窗宽度

文章编辑弹窗（`el-dialog`）宽度已为 `1100px`，无需修改，可直接容纳分屏模式：

```vue
<!-- 确认文章对话框的 el-dialog 宽度已为 1100px -->
<el-dialog
  ...
  width="1100px"
  ...
>
```

### 2.4 XSS 安全规范

`MarkdownEditor.vue` 中使用 `v-html` 渲染预览，必须确保：

1. `MarkdownIt` 配置 `html: false` — 禁止用户输入原始 HTML（防止 XSS）
2. `linkify: true` 自动识别 URL 但仍通过 `markdown-it` 转义处理
3. 若未来需要支持更丰富 HTML，应引入 `DOMPurify` 进行消毒：

```typescript
import DOMPurify from "dompurify";
const preview = computed(() =>
  DOMPurify.sanitize(md.render(props.modelValue || "")),
);
```

---

## 3. 代码规范要求

| 规范项       | 要求                                                            |
| ------------ | --------------------------------------------------------------- |
| 类型安全     | 无 `any`，`ToolbarAction` 使用联合类型                          |
| 组件封装     | `MarkdownEditor` 为纯 UI 组件，不依赖 Pinia / API               |
| v-model 兼容 | 使用 `modelValue` prop + `update:modelValue` emit（Vue 3 标准） |
| XSS 防护     | `html: false` 禁止原始 HTML，所有用户内容通过 markdown-it 转义  |
| 无副作用     | 组件卸载时无 timer/event listener 泄露                          |
| 响应式       | 分屏模式下两侧同步滚动（可选，不作为 P0 要求）                  |
| 依赖最小化   | 仅引入 `markdown-it`，不引入其他 UI 编辑器库                    |

---

## 4. 前端测试规范

**测试文件**: `packages/web/src/components/__tests__/MarkdownEditor.spec.ts`

```typescript
import { describe, it, expect } from "vitest";
import { mount } from "@vue/test-utils";
import MarkdownEditor from "../MarkdownEditor.vue";

describe("MarkdownEditor", () => {
  it("渲染工具栏和 textarea", () => {
    const wrapper = mount(MarkdownEditor, { props: { modelValue: "" } });
    expect(wrapper.find(".md-toolbar").exists()).toBe(true);
    expect(wrapper.find(".md-textarea").exists()).toBe(true);
  });

  it("输入时触发 update:modelValue emit", async () => {
    const wrapper = mount(MarkdownEditor, { props: { modelValue: "" } });
    const textarea = wrapper.find(".md-textarea");
    await textarea.setValue("# Hello");
    expect(wrapper.emitted("update:modelValue")?.[0]).toEqual(["# Hello"]);
  });

  it("预览模式下渲染 Markdown HTML", async () => {
    const wrapper = mount(MarkdownEditor, {
      props: { modelValue: "**bold**" },
    });
    const radioGroup = wrapper.find(".md-toolbar-right");
    // 切换到 preview 模式
    await wrapper.setProps({ modelValue: "**bold**" });
    // 验证预览区存在（分屏默认）
    expect(wrapper.find(".md-preview").exists()).toBe(true);
    expect(wrapper.find(".md-preview").html()).toContain("<strong>");
  });

  it("不渲染用户输入的 <script> 标签（XSS防护）", async () => {
    const xssPayload = "<script>alert(1)<\/script>";
    const wrapper = mount(MarkdownEditor, {
      props: { modelValue: xssPayload },
    });
    expect(wrapper.find(".md-preview").html()).not.toContain("<script>");
  });

  it("点击 Bold 工具栏按钮时触发 emit", async () => {
    const wrapper = mount(MarkdownEditor, { props: { modelValue: "" } });
    const boldBtn = wrapper
      .findAll(".md-toolbar button")
      .find((btn) => btn.text() === "B");
    await boldBtn?.trigger("click");
    expect(wrapper.emitted("update:modelValue")).toBeTruthy();
  });
});
```

---

## 5. 验证标准 (Acceptance Criteria)

### 功能验证

| #   | 测试场景                         | 期望结果                                                 |
| --- | -------------------------------- | -------------------------------------------------------- |
| F1  | 打开文章编辑弹窗                 | 默认分屏模式：左侧输入区，右侧预览区                     |
| F2  | 在左侧输入 `# 标题`              | 右侧预览实时显示 `<h1>标题</h1>` 渲染效果                |
| F3  | 点击工具栏 **B**（粗体）         | 选中文字被 `**...**` 包裹，或插入占位文字 `**粗体文字**` |
| F4  | 切换到"仅预览"模式               | textarea 隐藏，仅显示 HTML 渲染结果                      |
| F5  | 切换到"仅编辑"模式               | 预览区隐藏，仅显示 textarea                              |
| F6  | 提交表单                         | `articleForm.content` 值为原始 Markdown 文本（非 HTML）  |
| F7  | 保存后重新编辑                   | 编辑器回填原始 Markdown 内容                             |
| F8  | 输入 `<script>alert(1)</script>` | 预览区不执行脚本，显示转义文本                           |

### 快捷键验证

| 快捷键 | 期望行为                   |
| ------ | -------------------------- |
| Ctrl+B | 插入/包裹粗体标记          |
| Ctrl+I | 插入/包裹斜体标记          |
| Ctrl+K | 插入链接模板 `[文字](url)` |

### UI/UX 验证

| #   | 场景       | 期望                                              |
| --- | ---------- | ------------------------------------------------- |
| U1  | 弹窗宽度   | 分屏模式下两侧各约 500px 宽                       |
| U2  | 编辑区字体 | 等宽字体（Consolas/Monaco），与代码编辑器习惯一致 |
| U3  | 预览区滚动 | 内容过长时独立滚动，不影响弹窗                    |
| U4  | 空内容预览 | 显示空白区域，不报错                              |

### 安装验证

```bash
cd packages/web
# 验证依赖安装
node -e "require('markdown-it'); console.log('OK')"

# 运行组件测试
pnpm test -- src/components/__tests__/MarkdownEditor.spec.ts
```

### 视觉回归验证

1. 打开 `http://localhost:5173/knowledge`
2. 点击"新建文章"
3. 确认编辑器正确渲染（分屏模式，工具栏可见）
4. 输入以下 Markdown 并验证预览：

```markdown
# 销售技巧

**核心要点**:

1. 了解客户需求
2. 建立信任关系

> 客户的痛点是我们的切入点

`代码示例`: `const crm = 'CRM'`

---

[文档链接](https://example.com)
```
