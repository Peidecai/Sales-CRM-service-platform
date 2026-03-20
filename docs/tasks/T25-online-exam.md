# T25 — 在线考试

> 来源: 竞品分析 (competitive-analysis-pxyai-crm.md) — examination
> 优先级: 🟢低
> 参考设计: 10-learning-training.md §10.3

## 背景

磐销云在学习世界下提供在线考试功能（企业考试），支持题库管理、组卷、在线答题和自动阅卷。本项目已有 knowledge 模块用于知识输出，但缺少对培训效果的量化评估手段。在线考试模块可帮助企业评估销售团队的产品知识、话术掌握和业务能力。

## 功能需求

| #   | 功能       | 说明                                           |
| --- | ---------- | ---------------------------------------------- |
| F1  | 题库管理   | 按分类管理题目：单选、多选、判断、填空         |
| F2  | 试卷模板   | 手动组卷（选题）或随机组卷（按分类+题型+数量） |
| F3  | 在线考试   | 定时考试：设置开始/截止时间、答题时长、及格分  |
| F4  | 自动阅卷   | 客观题自动评分（单选/多选/判断/填空精确匹配）  |
| F5  | 成绩管理   | 成绩列表、成绩详情（含每题得分）、补考         |
| F6  | 考试统计   | 通过率、平均分、分数分布、错题排行             |
| F7  | 练习模式   | 按分类随机练习 + 错题本                        |
| F8  | 关联知识库 | 题目可关联知识库文章，答错后显示推荐阅读       |

## 技术方案

### 后端

#### Entity

```typescript
// question-category.entity.ts
@Entity("question_categories")
export class QuestionCategory extends BaseEntity {
  @Column({ type: "varchar", length: 100 })
  name: string;

  @Column({ type: "varchar", length: 500, nullable: true })
  description: string | null;

  @Column({ type: "int", nullable: true })
  parentId: number | null; // 支持二级分类

  @Column({ type: "int", default: 0 })
  sortOrder: number;
}

// question.entity.ts
@Entity("questions")
export class Question extends BaseEntity {
  @Column({ type: "varchar", length: 30 })
  type: QuestionType; // single_choice | multi_choice | true_false | fill_blank

  @Column({ type: "text" })
  content: string; // 题干

  @Column({ type: "simple-json" })
  options: QuestionOption[]; // [{ label: 'A', content: '选项内容' }]，填空题为空数组

  @Column({ type: "simple-json" })
  answer: string[]; // 正确答案: ['A'] 或 ['A','C'] 或 ['true'] 或 ['具体答案']

  @Column({ type: "text", nullable: true })
  explanation: string | null; // 解析

  @ManyToOne(() => QuestionCategory)
  @JoinColumn({ name: "categoryId" })
  category: QuestionCategory;

  @Column({ type: "int" })
  categoryId: number;

  @Column({ type: "int", default: 1 })
  difficulty: number; // 1=简单 2=中等 3=困难

  @Column({ type: "int", default: 0 })
  usageCount: number; // 使用次数

  @Column({ type: "decimal", precision: 5, scale: 2, default: 0 })
  correctRate: number; // 正确率

  @Column({ type: "int", nullable: true })
  linkedArticleId: number | null; // 关联知识库

  @ManyToOne(() => User)
  @JoinColumn({ name: "createdById" })
  createdBy: User;

  @Column({ type: "int" })
  createdById: number;
}

// exam-paper.entity.ts
@Entity("exam_papers")
export class ExamPaper extends BaseEntity {
  @Column({ type: "varchar", length: 200 })
  title: string;

  @Column({ type: "varchar", length: 500, nullable: true })
  description: string | null;

  @Column({ type: "varchar", length: 20 })
  buildMode: "manual" | "random";

  @Column({ type: "simple-json", nullable: true })
  randomConfig: RandomPaperConfig | null;
  // { rules: [{ categoryId, type, count, scorePerQuestion }] }

  @Column({ type: "int" })
  totalScore: number; // 总分

  @Column({ type: "int" })
  passScore: number; // 及格分

  @Column({ type: "int" })
  duration: number; // 答题时长（分钟）

  @ManyToOne(() => User)
  @JoinColumn({ name: "createdById" })
  createdBy: User;

  @Column({ type: "int" })
  createdById: number;
}

// exam-paper-question.entity.ts (手动组卷的题目关联)
@Entity("exam_paper_questions")
export class ExamPaperQuestion extends BaseEntity {
  @Column({ type: "int" })
  paperId: number;

  @Column({ type: "int" })
  questionId: number;

  @Column({ type: "int" })
  sortOrder: number;

  @Column({ type: "int" })
  score: number; // 本题分值
}

// exam-session.entity.ts
@Entity("exam_sessions")
export class ExamSession extends BaseEntity {
  @ManyToOne(() => ExamPaper)
  @JoinColumn({ name: "paperId" })
  paper: ExamPaper;

  @Column({ type: "int" })
  paperId: number;

  @ManyToOne(() => User)
  @JoinColumn({ name: "userId" })
  user: User;

  @Column({ type: "int" })
  userId: number;

  @Column({ type: "varchar", length: 30 })
  status: ExamSessionStatus; // not_started | in_progress | submitted | graded

  @Column({ type: "datetime", nullable: true })
  startedAt: Date | null;

  @Column({ type: "datetime", nullable: true })
  submittedAt: Date | null;

  @Column({ type: "int", nullable: true })
  totalScore: number | null; // 得分

  @Column({ type: "boolean", nullable: true })
  passed: boolean | null;

  @Column({ type: "simple-json", nullable: true })
  answers: ExamAnswer[];
  // [{ questionId, userAnswer: string[], isCorrect: boolean, score: number }]

  @Column({ type: "int", default: 0 })
  attemptNo: number; // 第几次考试（补考）
}
```

#### Enums (shared)

```typescript
enum QuestionType {
  SINGLE_CHOICE = "single_choice",
  MULTI_CHOICE = "multi_choice",
  TRUE_FALSE = "true_false",
  FILL_BLANK = "fill_blank",
}

enum ExamSessionStatus {
  NOT_STARTED = "not_started",
  IN_PROGRESS = "in_progress",
  SUBMITTED = "submitted",
  GRADED = "graded",
}

interface QuestionOption {
  label: string; // A, B, C, D
  content: string;
}

interface ExamAnswer {
  questionId: number;
  userAnswer: string[];
  isCorrect: boolean;
  score: number;
}

interface RandomPaperConfig {
  rules: Array<{
    categoryId: number;
    type: QuestionType;
    count: number;
    scorePerQuestion: number;
  }>;
}
```

#### DTO

- `CreateQuestionCategoryDto`: name, description?, parentId?
- `CreateQuestionDto`: type, content, options, answer, explanation?, categoryId, difficulty?, linkedArticleId?
- `UpdateQuestionDto`: PartialType
- `QuestionQueryDto`: categoryId?, type?, difficulty?, keyword?, page, pageSize
- `CreateExamPaperDto`: title, description?, buildMode, totalScore, passScore, duration, questions? (manual), randomConfig? (random)
- `StartExamDto`: paperId
- `SubmitExamDto`: answers: { questionId, userAnswer: string[] }[]
- `ExamStatisticsQueryDto`: paperId?, startDate?, endDate?
- `PracticeQueryDto`: categoryId?, type?, count?

#### Service

- `QuestionCategoryService`: CRUD + 树形结构
- `QuestionService`:
  - `create(dto, user)`: 创建题目
  - `findAll(query)`: 分页列表+筛选
  - `importBatch(questions[], user)`: 批量导入题目
  - `getRandomQuestions(config)`: 按规则随机抽题
  - `updateCorrectRate(questionId)`: 更新正确率统计
- `ExamPaperService`:
  - `create(dto, user)`: 创建试卷（manual: 关联题目; random: 保存配置）
  - `findAll(page, pageSize)`: 试卷列表
  - `generateQuestions(paperId)`: random 模式抽题组卷
- `ExamSessionService`:
  - `start(paperId, user)`: 开始考试 → 创建 session + random 模式实时抽题
  - `submit(sessionId, answers, user)`: 提交答卷 + 自动阅卷
  - `autoGrade(session)`: 客观题自动评分
  - `getResult(sessionId, user)`: 考试结果（含每题得分+解析）
  - `getStatistics(query)`: 通过率/平均分/分数分布/错题排行
  - `getMyHistory(user, page, pageSize)`: 我的考试记录
- `PracticeService`:
  - `getQuestions(query, user)`: 获取练习题
  - `submitPractice(answers, user)`: 提交练习 + 记录错题
  - `getWrongQuestions(user, page, pageSize)`: 错题本

#### Controller

- `QuestionCategoryController`: `/api/v1/exam/question-categories`
- `QuestionController`: `/api/v1/exam/questions`
- `ExamPaperController`: `/api/v1/exam/papers`
- `ExamSessionController`: `/api/v1/exam/sessions`
- `PracticeController`: `/api/v1/exam/practice`

#### Module

- `ExamModule`: 导入 UserModule, KnowledgeModule (关联文章), NotificationModule (考试通知)

#### Migration

- `1709000094000-CreateQuestionCategories.ts`
- `1709000095000-CreateQuestions.ts`
- `1709000096000-CreateExamPapers.ts`
- `1709000097000-CreateExamPaperQuestions.ts`
- `1709000098000-CreateExamSessions.ts`

### 前端 (PC)

| 文件                                               | 说明                               |
| -------------------------------------------------- | ---------------------------------- |
| `web/src/views/exam/question-bank.vue`             | 题库管理（列表+CRUD）              |
| `web/src/views/exam/components/QuestionEditor.vue` | 题目编辑器（按题型动态表单）       |
| `web/src/views/exam/paper-list.vue`                | 试卷列表                           |
| `web/src/views/exam/paper-editor.vue`              | 组卷页面（手动选题/随机配置）      |
| `web/src/views/exam/take-exam.vue`                 | 答题页面（倒计时+答题卡）          |
| `web/src/views/exam/result.vue`                    | 考试结果（得分+每题详情+推荐阅读） |
| `web/src/views/exam/statistics.vue`                | 考试统计（通过率/分数分布图）      |
| `web/src/views/exam/practice.vue`                  | 练习模式 + 错题本                  |
| `web/src/api/exam.ts`                              | API 层                             |

### 前端 (APP)

| 文件                                      | 说明       |
| ----------------------------------------- | ---------- |
| `miniapp/src/pages-sub/exam/list.vue`     | 考试列表   |
| `miniapp/src/pages-sub/exam/take.vue`     | 移动端答题 |
| `miniapp/src/pages-sub/exam/result.vue`   | 考试结果   |
| `miniapp/src/pages-sub/exam/practice.vue` | 练习模式   |

## API 接口

| Method | Path                                    | Description             | Auth          |
| ------ | --------------------------------------- | ----------------------- | ------------- |
| GET    | `/api/v1/exam/question-categories`      | 题目分类列表（树形）    | All           |
| POST   | `/api/v1/exam/question-categories`      | 创建分类                | Admin/Manager |
| PUT    | `/api/v1/exam/question-categories/:id`  | 更新分类                | Admin/Manager |
| DELETE | `/api/v1/exam/question-categories/:id`  | 删除分类                | Admin         |
| GET    | `/api/v1/exam/questions`                | 题目列表（分页+筛选）   | Admin/Manager |
| POST   | `/api/v1/exam/questions`                | 创建题目                | Admin/Manager |
| PUT    | `/api/v1/exam/questions/:id`            | 更新题目                | Admin/Manager |
| DELETE | `/api/v1/exam/questions/:id`            | 删除题目                | Admin         |
| POST   | `/api/v1/exam/questions/import`         | 批量导入题目            | Admin/Manager |
| GET    | `/api/v1/exam/papers`                   | 试卷列表                | All           |
| POST   | `/api/v1/exam/papers`                   | 创建试卷                | Admin/Manager |
| GET    | `/api/v1/exam/papers/:id`               | 试卷详情                | Admin/Manager |
| PUT    | `/api/v1/exam/papers/:id`               | 更新试卷                | Admin/Manager |
| DELETE | `/api/v1/exam/papers/:id`               | 删除试卷                | Admin         |
| POST   | `/api/v1/exam/sessions/start`           | 开始考试                | All           |
| GET    | `/api/v1/exam/sessions/:id`             | 考试详情（答题中/结果） | All           |
| POST   | `/api/v1/exam/sessions/:id/submit`      | 提交答卷                | All           |
| GET    | `/api/v1/exam/sessions/my-history`      | 我的考试记录            | All           |
| GET    | `/api/v1/exam/statistics`               | 考试统计                | Manager/Admin |
| GET    | `/api/v1/exam/statistics/:paperId`      | 单试卷统计              | Manager/Admin |
| GET    | `/api/v1/exam/practice`                 | 获取练习题              | All           |
| POST   | `/api/v1/exam/practice/submit`          | 提交练习                | All           |
| GET    | `/api/v1/exam/practice/wrong-questions` | 错题本                  | All           |

## 数据库设计

### question_categories

| Column      | Type           | Nullable | Description    |
| ----------- | -------------- | -------- | -------------- |
| id          | int (PK, auto) | NO       |                |
| name        | varchar(100)   | NO       | 分类名         |
| description | varchar(500)   | YES      | 描述           |
| parent_id   | int            | YES      | 父分类（二级） |
| sort_order  | int            | NO       | 排序           |
| created_at  | datetime(6)    | NO       |                |
| updated_at  | datetime(6)    | NO       |                |
| deleted_at  | datetime(6)    | YES      | 软删除         |

### questions

| Column            | Type             | Nullable | Description |
| ----------------- | ---------------- | -------- | ----------- |
| id                | int (PK, auto)   | NO       |             |
| type              | varchar(30)      | NO       | 题型        |
| content           | text             | NO       | 题干        |
| options           | json             | NO       | 选项        |
| answer            | json             | NO       | 正确答案    |
| explanation       | text             | YES      | 解析        |
| category_id       | int (FK)         | NO       | 分类        |
| difficulty        | int              | NO       | 难度 1-3    |
| usage_count       | int              | NO       | 使用次数    |
| correct_rate      | decimal(5,2)     | NO       | 正确率      |
| linked_article_id | int              | YES      | 关联知识库  |
| created_by_id     | int (FK → users) | NO       | 创建人      |
| created_at        | datetime(6)      | NO       |             |
| updated_at        | datetime(6)      | NO       |             |
| deleted_at        | datetime(6)      | YES      | 软删除      |

**索引**: `IDX_q_category` (category_id), `IDX_q_type` (type), `IDX_q_difficulty` (difficulty)

### exam_papers

| Column        | Type             | Nullable | Description     |
| ------------- | ---------------- | -------- | --------------- |
| id            | int (PK, auto)   | NO       |                 |
| title         | varchar(200)     | NO       | 试卷标题        |
| description   | varchar(500)     | YES      | 描述            |
| build_mode    | varchar(20)      | NO       | manual / random |
| random_config | json             | YES      | 随机组卷配置    |
| total_score   | int              | NO       | 总分            |
| pass_score    | int              | NO       | 及格分          |
| duration      | int              | NO       | 时长（分钟）    |
| created_by_id | int (FK → users) | NO       | 创建人          |
| created_at    | datetime(6)      | NO       |                 |
| updated_at    | datetime(6)      | NO       |                 |
| deleted_at    | datetime(6)      | YES      | 软删除          |

### exam_paper_questions

| Column      | Type                   | Nullable | Description |
| ----------- | ---------------------- | -------- | ----------- |
| id          | int (PK, auto)         | NO       |             |
| paper_id    | int (FK → exam_papers) | NO       | 试卷        |
| question_id | int (FK → questions)   | NO       | 题目        |
| sort_order  | int                    | NO       | 顺序        |
| score       | int                    | NO       | 分值        |
| created_at  | datetime(6)            | NO       |             |
| updated_at  | datetime(6)            | NO       |             |
| deleted_at  | datetime(6)            | YES      |             |

**索引**: `IDX_epq_paper` (paper_id), `UNQ_epq_paper_question` (paper_id, question_id) UNIQUE

### exam_sessions

| Column       | Type                   | Nullable | Description |
| ------------ | ---------------------- | -------- | ----------- |
| id           | int (PK, auto)         | NO       |             |
| paper_id     | int (FK → exam_papers) | NO       | 试卷        |
| user_id      | int (FK → users)       | NO       | 考生        |
| status       | varchar(30)            | NO       | 状态        |
| started_at   | datetime               | YES      | 开始时间    |
| submitted_at | datetime               | YES      | 提交时间    |
| total_score  | int                    | YES      | 得分        |
| passed       | boolean                | YES      | 是否及格    |
| answers      | json                   | YES      | 答题记录    |
| attempt_no   | int                    | NO       | 第几次      |
| created_at   | datetime(6)            | NO       |             |
| updated_at   | datetime(6)            | NO       |             |
| deleted_at   | datetime(6)            | YES      | 软删除      |

**索引**: `IDX_es_paper` (paper_id), `IDX_es_user` (user_id), `IDX_es_status` (status), `IDX_es_user_paper` (user_id, paper_id)

## 依赖模块

| 模块               | 关系                      |
| ------------------ | ------------------------- |
| UserModule         | 导入 — 考生/创建人信息    |
| KnowledgeModule    | 导入 — 题目关联知识库文章 |
| NotificationModule | 导入 — 考试开始/截止通知  |

## 验收标准

- [ ] 题库 CRUD 完整，支持 4 种题型（单选/多选/判断/填空）
- [ ] 题目分类支持二级树形结构
- [ ] 手动组卷：选择题目+设置分值，总分自动计算
- [ ] 随机组卷：按分类+题型+数量配置规则，每次抽题不同
- [ ] 考试流程：开始→答题（倒计时）→提交→自动阅卷→显示结果
- [ ] 自动阅卷：单选/判断精确匹配；多选全对得满分、漏选得半分、多选不得分；填空精确匹配
- [ ] 考试超时自动提交
- [ ] 成绩详情显示每题得分、正确答案、解析、推荐阅读
- [ ] 考试统计：通过率、平均分、分数分布（ECharts 直方图）、错题排行
- [ ] 练习模式 + 错题本功能正常
- [ ] 题库/试卷管理限 Manager/Admin 权限
- [ ] 前端答题页面倒计时 + 答题卡导航正常
- [ ] 后端单元测试 ≥30 tests（QuestionService + ExamPaperService + ExamSessionService + PracticeService）
- [ ] Migration 可正向/反向执行
- [ ] Skills: `coding-standards`, `tdd-workflow`, `database-migrations`, `security-review`
