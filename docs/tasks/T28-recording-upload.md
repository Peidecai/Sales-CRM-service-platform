# T28 — 录音上传

> 来源: 竞品分析 (competitive-analysis-pxyai-crm.md) — 磐销云 recordingUpload
> 优先级: 🟢低
> 参考设计: 05-call-recording.md §5.3

## 背景

磐销云支持手动上传外部录音文件，本项目现有 Recording 模块仅支持平台自动录音和语音速记，不支持用户手动上传离线/外部通话录音。销售人员在使用个人手机、座机或第三方会议系统通话时产生的录音无法录入系统进行 AI 分析。需支持手动上传录音并关联到客户/商机，触发 AI 转写和分析。

## 功能需求

| #   | 功能       | 说明                                               | 优先级 |
| --- | ---------- | -------------------------------------------------- | ------ |
| 1   | 单文件上传 | 上传录音文件（mp3/wav/m4a/amr）                    | P1     |
| 2   | 批量上传   | 一次上传多个录音文件                               | P2     |
| 3   | 关联客户   | 上传时选择关联客户                                 | P1     |
| 4   | 关联商机   | 上传时可选关联商机                                 | P2     |
| 5   | 自动转写   | 上传后自动触发 ASR 语音转文字                      | P1     |
| 6   | AI 分析    | 转写完成后自动进入 AI 分析管道（摘要/分类/意向度） | P1     |
| 7   | 文件校验   | 格式校验 + 大小限制（≤100MB）                      | P1     |
| 8   | 录音元信息 | 上传时填写通话日期/时长/对方号码（可选）           | P2     |
| 9   | APP 端上传 | 移动端从本地文件/录音机选择上传                    | P2     |
| 10  | 上传历史   | 查看上传记录，区分平台录音与手动上传               | P1     |

## 技术方案

### 后端

#### Entity 变更

```typescript
// recording.entity.ts — 新增字段
@Entity("recording")
class Recording extends BaseEntity {
  // ... 现有字段 ...

  @Column({ type: "varchar", length: 20, default: "platform" })
  source: "platform" | "voice_memo" | "manual_upload";

  @Column({ type: "varchar", length: 20, nullable: true })
  originalFormat: string | null;

  @Column({ type: "bigint", nullable: true })
  fileSize: number | null;

  @Column({
    type: "varchar",
    length: 20,
    nullable: true,
    comment: "对方电话号码",
  })
  counterpartPhone: string | null;

  @Column({ type: "timestamp", nullable: true, comment: "实际通话时间" })
  actualCallTime: Date | null;
}

// call-record.entity.ts — 新增字段
@Entity("call_record")
class CallRecord extends BaseEntity {
  // ... 现有字段 ...

  @Column({ type: "boolean", default: false })
  isManualUpload: boolean;
}
```

#### DTO

```typescript
class UploadRecordingDto {
  @IsOptional()
  @IsUUID()
  customerId?: string;

  @IsOptional()
  @IsUUID()
  opportunityId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  counterpartPhone?: string;

  @IsOptional()
  @IsDateString()
  actualCallTime?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  duration?: number;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  notes?: string;
}

class BatchUploadRecordingDto {
  @IsArray()
  @ValidateNested({ each: true })
  items: UploadRecordingDto[];
}
```

#### Service 增强

- `RecordingService.uploadManual(file, dto, user)`:
  1. 校验文件格式（mime type + extension）
  2. 校验文件大小 ≤ 100MB
  3. 存储文件到 `uploads/recordings/manual/`
  4. 创建 Recording 记录 (source = 'manual_upload')
  5. 创建关联 CallRecord (isManualUpload = true)
  6. 投入 `call-summary` Bull 队列触发 ASR + AI 分析
  7. 返回 Recording + CallRecord

- `RecordingService.batchUpload(files, dtos, user)`:
  1. 循环调用 uploadManual
  2. 返回结果数组（含失败项）

- `RecordingService.findAll()` 增强: 支持 `source` 筛选

#### Controller 增强

- `RecordingController`:
  - `POST /recordings/upload` — `@UseInterceptors(FileInterceptor('file'))` + `@Body() dto`
  - `POST /recordings/batch-upload` — `@UseInterceptors(FilesInterceptor('files', 10))` + `@Body() dto`

#### Module

- `RecordingModule` 无需新模块，增强现有模块
- 需导入 `CustomerModule`, `OpportunityModule` 用于关联校验

#### Migration

- `1709000092000-AddRecordingUploadFields.ts`: recording 表加 source/original_format/file_size/counterpart_phone/actual_call_time；call_record 表加 is_manual_upload

### 前端 (PC)

#### 页面 / 组件

| 组件            | 路径                                                    | 说明                                                   |
| --------------- | ------------------------------------------------------- | ------------------------------------------------------ |
| RecordingUpload | `views/call-record/components/RecordingUpload.vue`      | 上传弹窗: el-upload + 客户选择 + 商机选择 + 元信息表单 |
| BatchUpload     | `views/call-record/components/BatchRecordingUpload.vue` | 批量上传: 文件列表 + 进度条 + 批量关联                 |

#### 列表增强

- `views/call-record/index.vue`: 增加「上传录音」按钮；来源列增加 "手动上传" 标签
- 筛选条件增加 `source` 下拉

#### API 层

```typescript
// api/recording.ts
export const uploadRecording = (file: File, data: UploadRecordingDto) => {
  const formData = new FormData();
  formData.append('file', file);
  Object.entries(data).forEach(([k, v]) => v && formData.append(k, String(v)));
  return request.post('/recordings/upload', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
};

export const batchUploadRecording = (files: File[], data: BatchUploadRecordingDto) => { ... };
```

### 前端 (APP)

- `pages/call-record/upload.vue`: 选择本地文件 → 填写信息 → 上传
- uni-app `uni.chooseFile()` / `uni.chooseMessageFile()` 选择音频

## API 接口

| 方法   | 路径                                   | 说明                         | 权限           |
| ------ | -------------------------------------- | ---------------------------- | -------------- |
| POST   | `/api/v1/recordings/upload`            | 上传单个录音                 | All            |
| POST   | `/api/v1/recordings/batch-upload`      | 批量上传录音（≤10 个）       | All            |
| GET    | `/api/v1/recordings`                   | 录音列表（支持 source 筛选） | All            |
| GET    | `/api/v1/recordings/:id`               | 录音详情                     | All            |
| DELETE | `/api/v1/recordings/:id`               | 删除录音（软删除）           | Admin, Manager |
| GET    | `/api/v1/recordings/:id/transcription` | 获取转写文本                 | All            |
| POST   | `/api/v1/recordings/:id/reanalyze`     | 重新 AI 分析                 | All            |

## 数据库设计

### recording 表变更

| 新增字段          | 类型                                    | 说明                                    |
| ----------------- | --------------------------------------- | --------------------------------------- |
| source            | varchar(20) NOT NULL DEFAULT 'platform' | 来源: platform/voice_memo/manual_upload |
| original_format   | varchar(20)                             | 原始文件格式                            |
| file_size         | bigint                                  | 文件大小(bytes)                         |
| counterpart_phone | varchar(20)                             | 对方号码                                |
| actual_call_time  | timestamp                               | 实际通话时间                            |

**索引**: `IDX_rec_source` (source)

### call_record 表变更

| 新增字段         | 类型                  | 说明         |
| ---------------- | --------------------- | ------------ |
| is_manual_upload | boolean DEFAULT false | 是否手动上传 |

## 依赖模块

| 模块              | 用途               | 变更                     |
| ----------------- | ------------------ | ------------------------ |
| RecordingModule   | 核心增强模块       | 增加上传逻辑             |
| CallRecordModule  | 创建关联通话记录   | 新增 isManualUpload 字段 |
| CustomerModule    | 关联客户校验       | 导入                     |
| OpportunityModule | 关联商机校验       | 导入                     |
| AiModule          | ASR 转写 + AI 分析 | 通过 Bull 队列调用       |
| Multer            | 文件上传中间件     | 配置 fileFilter + limits |

## 验收标准

### 功能验收

- [ ] 用户可上传 mp3/wav/m4a/amr 格式录音，≤100MB
- [ ] 上传时可选择关联客户和商机
- [ ] 上传后自动创建 CallRecord（isManualUpload = true）
- [ ] 上传后自动触发 ASR 转写，转写完成后触发 AI 分析
- [ ] 批量上传支持 ≤10 个文件，显示逐个进度
- [ ] 录音列表可按来源（平台/手动上传）筛选
- [ ] 不支持的格式/超限文件上传时给出明确错误提示
- [ ] 手动上传的录音在通话详情页标识为「手动上传」

### 测试要求

| 类型         | 文件                               | 数量                                             |
| ------------ | ---------------------------------- | ------------------------------------------------ |
| 后端单元测试 | `recording-upload.service.spec.ts` | ≥12 tests (格式校验/大小限制/关联/队列触发/批量) |
| 后端单元测试 | `recording.controller.spec.ts`     | ≥6 tests (上传端点/权限/校验)                    |
| 前端单元测试 | `RecordingUpload.spec.ts`          | ≥5 tests                                         |
| E2E          | `recording-upload.spec.ts`         | ≥6 tests                                         |

### 边界与约束

- 文件大小: ≤100MB per file
- 支持格式: mp3, wav, m4a, amr (通过 MIME type + 扩展名双重校验)
- 批量上传: ≤10 个文件/次
- 存储路径: `uploads/recordings/manual/{yyyy}/{mm}/{uuid}.{ext}`
- 安全: 文件名使用 UUID 重命名，防止路径遍历攻击
- ASR 转写为异步，前端通过轮询或 WebSocket 获取结果

## 技术规范

- **Skills**: `coding-standards`, `tdd-workflow`, `security-review`
- **文件校验**: 使用 `file-type` 库检查 magic bytes，不信任客户端 Content-Type
- **Multer 配置**: `fileFilter` 白名单 + `limits.fileSize: 100 * 1024 * 1024`
- **Bull 队列**: 复用现有 `call-summary` 队列，job data 增加 `isManualUpload` 标记
- **缓存**: 无特殊缓存需求
