# T11 — 业务助手 开发任务

## 任务概述

- **目标**: 增强通知中心(设置/免打扰)、增强公告(已读统计/强制阅读)、新建待办列表模块、新建批注记录模块、增强企业查询(快捷入口/查询历史)
- **优先级**: P3
- **依赖模块**: notification, announcement, follow-up, prospect, user, approval

## 现有模块

| 模块         | 路径                               | 状态                            |
| ------------ | ---------------------------------- | ------------------------------- |
| Notification | `server/src/modules/notification/` | 已有（WebSocket+分类+未读计数） |
| Announcement | `server/src/modules/announcement/` | 已有（CRUD+优先级）             |
| FollowUp     | `server/src/modules/follow-up/`    | 已有（跟进管理+AI提醒）         |
| Prospect     | `server/src/modules/prospect/`     | 已有（天眼查/企查查搜索+导入）  |
| Approval     | `server/src/modules/approval/`     | 已有                            |
| User         | `server/src/modules/user/`         | 已有                            |

## 子任务清单

### 后端任务

| #   | 标题                           | 涉及文件                                                                         | 依赖    | 验收标准                                                                                                                                                                                                                                                                                                                                                  |
| --- | ------------------------------ | -------------------------------------------------------------------------------- | ------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| B1  | NotificationSetting Entity     | `server/src/modules/notification/entities/notification-setting.entity.ts` (新建) | —       | userId(ManyToOne User, UNIQUE), preferences(simple-json: {system:bool, task:bool, followUp:bool, opportunity:bool, mention:bool}), dndStart(time nullable), dndEnd(time nullable)                                                                                                                                                                         |
| B2  | NotificationSetting Service    | `server/src/modules/notification/notification.service.ts` 增强                   | B1      | getSettings(userId), updateSettings(userId, dto): upsert; shouldNotify(userId, type): 检查偏好+免打扰时段; 发送通知前调用 shouldNotify 过滤                                                                                                                                                                                                               |
| B3  | NotificationSetting Controller | `server/src/modules/notification/notification.controller.ts` 增强                | B2      | GET /notifications/settings, PUT /notifications/settings                                                                                                                                                                                                                                                                                                  |
| B4  | Todo Entity                    | `server/src/modules/todo/entities/todo.entity.ts` (新建)                         | —       | title, description(text nullable), priority(TodoPriority: LOW/MEDIUM/HIGH/URGENT), category(TodoCategory: MANUAL/FOLLOW_UP/APPROVAL/SYSTEM), dueDate(datetime nullable), completedAt(datetime nullable), status(TodoStatus: PENDING/COMPLETED/CANCELLED), userId(ManyToOne User), relatedType(varchar nullable), relatedId(int nullable); 继承 BaseEntity |
| B5  | Todo Service                   | `server/src/modules/todo/todo.service.ts` (新建)                                 | B4      | findAll(userId, status, priority, page), create(dto, user), update(id, dto, user), complete(id, user): set completedAt+status, cancel(id, user), getOverdueCount(userId), createSystemTodo(userId, title, category, relatedType, relatedId): 供其他模块调用                                                                                               |
| B6  | Todo Cron                      | `server/src/modules/todo/todo.service.ts`                                        | B5      | @Cron('0 9 \* \* \*') sendDueReminders(): 查找 dueDate=today AND status=PENDING, 发通知                                                                                                                                                                                                                                                                   |
| B7  | Todo Controller                | `server/src/modules/todo/todo.controller.ts` (新建)                              | B5      | /api/v1/todo CRUD + PUT /:id/complete + PUT /:id/cancel; @UseGuards(JwtAuthGuard) + @UseInterceptors(AuditLogInterceptor); 数据限本人                                                                                                                                                                                                                     |
| B8  | Todo Module                    | `server/src/modules/todo/todo.module.ts` (新建)                                  | B4-B7   | 导入 UserModule, NotificationModule; 导出 TodoService(供其他模块创建系统待办); 注册到 AppModule                                                                                                                                                                                                                                                           |
| B9  | Annotation Entity              | `server/src/modules/annotation/entities/annotation.entity.ts` (新建)             | —       | content(text), authorId(ManyToOne User), targetUserId(ManyToOne User), relatedType('call_record'\|'follow_up'\|'customer'), relatedId(int), trainingRecommendation(varchar nullable); 继承 BaseEntity                                                                                                                                                     |
| B10 | Annotation Service             | `server/src/modules/annotation/annotation.service.ts` (新建)                     | B9      | create(dto, author): 创建批注+发通知给 targetUser, findAll(分页+targetUserId+relatedType筛选), findByEmployee(targetUserId, page), getStatistics(managerId): 批注数量/被批注员工数, getMyAnnotations(userId, page): 员工查看收到的批注                                                                                                                    |
| B11 | Annotation Controller          | `server/src/modules/annotation/annotation.controller.ts` (新建)                  | B10     | /api/v1/annotations CRUD + GET /by-employee/:userId + GET /my + GET /statistics; 创建批注 @Roles(ADMIN, MANAGER); @UseInterceptors(AuditLogInterceptor)                                                                                                                                                                                                   |
| B12 | Annotation Module              | `server/src/modules/annotation/annotation.module.ts` (新建)                      | B9-B11  | 导入 UserModule, NotificationModule; 注册到 AppModule                                                                                                                                                                                                                                                                                                     |
| B13 | AnnouncementRead Entity        | `server/src/modules/announcement/entities/announcement-read.entity.ts` (新建)    | —       | announcementId(ManyToOne Announcement), userId(ManyToOne User), readAt(datetime); UNIQUE(announcementId, userId)                                                                                                                                                                                                                                          |
| B14 | Announcement 已读统计          | `server/src/modules/announcement/announcement.service.ts` 增强                   | B13     | markAsRead(announcementId, userId), getReadStats(announcementId): {totalUsers, readCount, readRate, readers[]}, getUnreadAnnouncements(userId): 未读公告列表                                                                                                                                                                                              |
| B15 | 强制阅读                       | `server/src/modules/announcement/announcement.service.ts` 增强                   | B13,B14 | Announcement entity 新增 forceRead(boolean default false); getForceUnread(userId): 获取未读的强制阅读公告                                                                                                                                                                                                                                                 |
| B16 | Announcement Controller 增强   | `server/src/modules/announcement/announcement.controller.ts`                     | B14,B15 | POST /announcements/:id/read, GET /announcements/:id/read-stats (Admin), GET /announcements/unread, GET /announcements/force-unread                                                                                                                                                                                                                       |
| B17 | Prospect 查询历史              | `server/src/modules/prospect/entities/prospect-query-history.entity.ts` (新建)   | —       | userId(ManyToOne User), keyword(varchar), source(varchar), resultCount(int), createdAt; 每次搜索自动记录                                                                                                                                                                                                                                                  |
| B18 | Prospect 查询历史 Service      | `server/src/modules/prospect/prospect.service.ts` 增强                           | B17     | 搜索时自动 save history; getQueryHistory(userId, page): 查询历史分页; deleteHistory(id, userId)                                                                                                                                                                                                                                                           |
| B19 | Prospect Controller 增强       | `server/src/modules/prospect/prospect.controller.ts`                             | B18     | GET /prospect/history, DELETE /prospect/history/:id                                                                                                                                                                                                                                                                                                       |

### 前端任务

| #   | 标题                  | 涉及文件                                                    | 依赖   | 验收标准                                                                                           |
| --- | --------------------- | ----------------------------------------------------------- | ------ | -------------------------------------------------------------------------------------------------- |
| F1  | Todo API 层           | `web/src/api/todo.ts` (新建)                                | B7     | getList, create, update, complete, cancel, getOverdueCount                                         |
| F2  | Annotation API 层     | `web/src/api/annotation.ts` (新建)                          | B11    | create, getList, getByEmployee, getMy, getStatistics                                               |
| F3  | Notification API 增强 | `web/src/api/notification.ts` 增强                          | B3     | getSettings, updateSettings                                                                        |
| F4  | Announcement API 增强 | `web/src/api/announcement.ts` 增强                          | B16    | markAsRead, getReadStats, getUnread, getForceUnread                                                |
| F5  | Prospect API 增强     | `web/src/api/prospect.ts` 增强                              | B19    | getHistory, deleteHistory                                                                          |
| F6  | 通知设置页            | `web/src/views/notification/settings.vue` (新建)            | F3     | 通知偏好开关(el-switch 每类型) + 免打扰时段(el-time-picker start/end)                              |
| F7  | 待办列表页            | `web/src/views/todo/index.vue` (新建)                       | F1     | 三栏 tab(待处理/已完成/已取消) + 优先级颜色标签 + 到期日提示 + 创建按钮 + 完成/取消操作            |
| F8  | 待办创建对话框        | `web/src/views/todo/components/CreateTodoDialog.vue` (新建) | F1     | 标题+描述+优先级(select)+到期日(date-picker) + 表单校验                                            |
| F9  | 批注记录页(主管)      | `web/src/views/annotation/index.vue` (新建)                 | F2     | 批注列表(按员工/时间筛选) + 创建批注(选员工+关联记录+内容+推荐培训) + 统计卡片                     |
| F10 | 我的批注页(员工)      | `web/src/views/annotation/my.vue` (新建)                    | F2     | 收到的批注列表 + 关联记录跳转 + 推荐培训链接                                                       |
| F11 | 公告已读统计          | `web/src/views/announcement/` 增强                          | F4     | 公告详情增加已读/未读统计面板(Admin); 已读率进度条 + 已读人员列表                                  |
| F12 | 强制阅读弹窗          | `web/src/components/ForceReadDialog.vue` (新建)             | F4     | 登录后检查 forceUnread → 弹窗强制阅读(不可关闭直到标记已读)                                        |
| F13 | 企业查询快捷入口      | `web/src/views/prospect/` 增强                              | F5     | 顶部快捷搜索框 + 查询历史列表(最近10条+一键复搜)                                                   |
| F14 | 路由 + 菜单           | `web/src/router/index.ts`                                   | F6-F13 | /todo, /annotation, /annotation/my, /notification/settings; 菜单: 业务助手分组(待办/批注/通知设置) |

### 数据库迁移

| #   | 文件                                          | DDL                                                                                                                                                                                                                                                                                          |
| --- | --------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| M1  | `1709000097000-CreateNotificationSetting.ts`  | `notification_setting` 表: id, user_id(FK UNIQUE), preferences(json), dnd_start(time nullable), dnd_end(time nullable), createdAt, updatedAt                                                                                                                                                 |
| M2  | `1709000098000-CreateTodoTable.ts`            | `todo` 表: id, title, description(text nullable), priority(enum), category(enum), due_date(datetime nullable), completed_at(datetime nullable), status(enum), user_id(FK), related_type(varchar nullable), related_id(int nullable), createdAt, updatedAt, deletedAt; INDEX(user_id, status) |
| M3  | `1709000099000-CreateAnnotationTable.ts`      | `annotation` 表: id, content(text), author_id(FK), target_user_id(FK), related_type(enum), related_id(int), training_recommendation(varchar nullable), createdAt, updatedAt, deletedAt; INDEX(target_user_id)                                                                                |
| M4  | `1709000100000-CreateAnnouncementRead.ts`     | `announcement_read` 表: id, announcement_id(FK), user_id(FK), read_at(datetime), UNIQUE(announcement_id, user_id); announcement 表加 `force_read` boolean default false                                                                                                                      |
| M5  | `1709000101000-CreateProspectQueryHistory.ts` | `prospect_query_history` 表: id, user_id(FK), keyword(varchar), source(varchar), result_count(int), created_at; INDEX(user_id, created_at DESC)                                                                                                                                              |

### 测试任务

| #   | 标题                | 文件                                                    | 验收标准                                                        |
| --- | ------------------- | ------------------------------------------------------- | --------------------------------------------------------------- |
| T1  | NotificationSetting | `server/test/notification/notification-setting.spec.ts` | ≥8 tests (getSettings/updateSettings/shouldNotify/dndFiltering) |
| T2  | TodoService         | `server/test/todo/todo.service.spec.ts`                 | ≥15 tests (CRUD+complete+cancel+overdue+systemTodo+dueReminder) |
| T3  | AnnotationService   | `server/test/annotation/annotation.service.spec.ts`     | ≥10 tests (create+list+byEmployee+my+statistics)                |
| T4  | Announcement 已读   | `server/test/announcement/announcement-read.spec.ts`    | ≥10 tests (markRead+readStats+unread+forceRead)                 |
| T5  | Prospect 查询历史   | `server/test/prospect/prospect-history.spec.ts`         | ≥6 tests (autoSave+getHistory+delete)                           |
| T6  | E2E — 待办列表      | `e2e/todo.spec.ts`                                      | 待办列表+创建+完成+取消                                         |
| T7  | E2E — 强制阅读      | `e2e/announcement-force-read.spec.ts`                   | 登录后强制阅读弹窗                                              |

## 边界与约束

- **Scope 外**: APP Push 通知(后续 T13)；批注与绩效考核关联；公告富文本编辑器增强
- **安全**: 批注仅 Admin/Manager 可创建；待办数据严格限本人；通知设置限本人；公告已读统计仅 Admin
- **性能**: shouldNotify 结果缓存 key `notify:setting:{userId}` TTL 30min；待办到期提醒 Cron 每日一次；强制阅读公告缓存 key `announcement:force:{userId}` TTL 5min
- **模块接口**: TodoModule 导出 TodoService 供 FollowUp/Approval 等模块调用 createSystemTodo；AnnotationModule 独立

## 技术规范

- **Skills**: `coding-standards`, `tdd-workflow`, `database-migrations`, `security-review`
- **枚举**: TodoPriority, TodoCategory, TodoStatus 定义在 `@crm/shared`
- **通知**: 批注/待办提醒通过 NotificationModule 发送(WebSocket + 持久化)
- **缓存**: 通知设置 `notify:setting:{userId}` TTL 30min；强制阅读 `announcement:force:{userId}` TTL 5min
- **强制阅读**: 前端在 DefaultLayout mounted 时检查 forceUnread API，弹出不可关闭对话框

## Claude Code 提示词

### B1-B3: 通知设置

```
增强 packages/server/src/modules/notification/ 模块：
1. 新建 entities/notification-setting.entity.ts:
   - user: OneToOne User (UNIQUE)
   - preferences: simple-json {system:boolean, task:boolean, followUp:boolean, opportunity:boolean, mention:boolean}
   - dndStart: time nullable, dndEnd: time nullable
   - 继承 BaseEntity
2. 在 notification.service.ts 新增:
   - getSettings(userId): 查找或返回默认(全部开启, 无免打扰)
   - updateSettings(userId, dto): upsert
   - shouldNotify(userId, type): 检查 preferences[type] + 当前时间是否在 dndStart~dndEnd 内
   - 修改现有通知发送逻辑: 发送前调用 shouldNotify 过滤
3. Controller: GET/PUT /notifications/settings
4. 迁移: 1709000097000-CreateNotificationSetting.ts
```

### B4-B8: 待办列表模块

```
新建 packages/server/src/modules/todo/ 模块：
1. entities/todo.entity.ts:
   - title(varchar), description(text nullable)
   - priority: TodoPriority(LOW/MEDIUM/HIGH/URGENT)
   - category: TodoCategory(MANUAL/FOLLOW_UP/APPROVAL/SYSTEM)
   - dueDate(datetime nullable), completedAt(datetime nullable)
   - status: TodoStatus(PENDING/COMPLETED/CANCELLED)
   - user: ManyToOne User
   - relatedType(varchar nullable): 关联模块类型
   - relatedId(int nullable): 关联记录 ID
   - 继承 BaseEntity
2. todo.service.ts:
   - findAll(userId, {status, priority, page, pageSize}): 分页+筛选(严格限 userId)
   - create(dto, user), update(id, dto, user): 检查所有权
   - complete(id, user): set completedAt=now, status=COMPLETED
   - cancel(id, user): set status=CANCELLED
   - getOverdueCount(userId): dueDate < now AND status=PENDING
   - createSystemTodo(userId, title, category, relatedType?, relatedId?): 供外部模块调用
   - @Cron('0 9 * * *') sendDueReminders(): 今日到期+通知
3. todo.controller.ts: /api/v1/todo
   - @UseGuards(JwtAuthGuard) (不需要 RolesGuard, 数据限本人)
   - @UseInterceptors(AuditLogInterceptor)
4. todo.module.ts: 导入 UserModule, NotificationModule; 导出 TodoService
5. 枚举放 @crm/shared
6. 迁移: 1709000098000-CreateTodoTable.ts
```

### B9-B12: 批注记录模块

```
新建 packages/server/src/modules/annotation/ 模块：
1. entities/annotation.entity.ts:
   - content(text)
   - author: ManyToOne User (批注者=主管)
   - targetUser: ManyToOne User (被批注员工)
   - relatedType: 'call_record' | 'follow_up' | 'customer'
   - relatedId: int (关联记录ID)
   - trainingRecommendation: varchar nullable (推荐培训内容/链接)
   - 继承 BaseEntity
2. annotation.service.ts:
   - create(dto, author): 创建批注 + 通过 NotificationModule 通知 targetUser
   - findAll(分页+targetUserId+relatedType筛选)
   - findByEmployee(targetUserId, page): 按员工查批注
   - getMyAnnotations(userId, page): 员工查看收到的批注(targetUserId=userId)
   - getStatistics(managerId): 该主管的批注数量/被批注员工数
3. annotation.controller.ts: /api/v1/annotations
   - POST (创建) @Roles(ADMIN, MANAGER)
   - GET (列表) @Roles(ADMIN, MANAGER)
   - GET /by-employee/:userId @Roles(ADMIN, MANAGER)
   - GET /my: 所有角色, 限本人
   - GET /statistics @Roles(ADMIN, MANAGER)
4. annotation.module.ts: 导入 UserModule, NotificationModule
5. 迁移: 1709000099000-CreateAnnotationTable.ts
```

### B13-B16: 公告增强

```
增强 packages/server/src/modules/announcement/ 模块：
1. 新建 entities/announcement-read.entity.ts:
   - announcement: ManyToOne Announcement
   - user: ManyToOne User
   - readAt: datetime
   - UNIQUE(announcementId, userId)
2. 修改 announcement entity 新增 forceRead(boolean default false)
3. 在 announcement.service.ts 新增:
   - markAsRead(announcementId, userId): 创建 read 记录(INSERT IGNORE)
   - getReadStats(announcementId): {totalUsers, readCount, readRate, readers:[{user, readAt}]}
   - getUnreadAnnouncements(userId): LEFT JOIN read 表, 过滤未读
   - getForceUnread(userId): 未读的 forceRead=true 公告
4. Controller:
   - POST /announcements/:id/read
   - GET /announcements/:id/read-stats @Roles(ADMIN)
   - GET /announcements/unread
   - GET /announcements/force-unread
5. 迁移: 1709000100000-CreateAnnouncementRead.ts
```

### F7-F8: 待办前端

```
新建 packages/web/src/views/todo/ 页面：
1. api/todo.ts: getList, create, update, complete, cancel, getOverdueCount
2. index.vue: 待办列表
   - 三栏 tab(待处理/已完成/已取消) + badge 显示待处理数
   - el-table: 标题 / 优先级(颜色标签: URGENT=红,HIGH=橙,MEDIUM=蓝,LOW=灰) / 分类 / 到期日(逾期显红) / 操作
   - 操作列: 完成(勾) / 编辑 / 取消
   - 右上角: "新建待办" 按钮
3. components/CreateTodoDialog.vue:
   - 标题(required) + 描述(textarea) + 优先级(select) + 到期日(date-picker)
   - 表单校验: 标题必填, 到期日>=今日
4. 路由: /todo, 菜单放"业务助手"分组
```

### F12: 强制阅读弹窗

```
新建 packages/web/src/components/ForceReadDialog.vue：
1. 在 DefaultLayout.vue 的 onMounted 中:
   - 调用 getForceUnread() API
   - 如果有未读强制公告, 显示 ForceReadDialog
2. ForceReadDialog:
   - el-dialog :close-on-click-modal="false" :close-on-press-escape="false" :show-close="false"
   - 显示公告标题+内容(Markdown渲染)
   - 底部: "我已阅读" 按钮 → 调用 markAsRead → 检查下一条 → 全部读完关闭
   - 多条公告: 显示 "1/3" 进度
```
