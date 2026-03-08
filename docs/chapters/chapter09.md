## 9. 销售信息管理详细设计

### 9.1 功能架构图

```
┌─────────────────────────────────────────────────────────────────────────┐
│                        销售信息管理平台                                   │
├─────────────┬───────────┬───────────┬──────────┬──────────┬────────────┤
│  产品知识库  │ 竞品资料库 │ 销售素材库 │ 公告通知  │ 培训资料  │  最佳实践  │
├─────────────┼───────────┼───────────┼──────────┼──────────┼────────────┤
│·产品手册    │·竞品分析  │·宣传图片  │·系统公告 │·新人培训 │·成交案例   │
│·功能说明    │·对比报告  │·演示视频  │·业务通知 │·产品培训 │·话术模板   │
│·FAQ文档     │·市场动态  │·方案模板  │·政策公告 │·技能培训 │·经验分享   │
│·版本更新    │·价格情报  │·合同模板  │·紧急通知 │·考试认证 │·行业洞察   │
│·技术白皮书  │·SWOT分析  │·PPT模板   │·活动通知 │·视频课程 │·客户画像   │
├─────────────┴───────────┴───────────┴──────────┴──────────┴────────────┤
│                          公共服务层                                      │
├──────────┬──────────┬──────────┬───────────┬──────────┬────────────────┤
│ 全文搜索  │ 分类管理  │ 标签管理  │  版本控制  │ 权限控制  │  操作审计    │
├──────────┼──────────┼──────────┼───────────┼──────────┼────────────────┤
│ 文件上传  │ 文件预览  │ 文件下载  │  收藏点赞  │ 评论互动  │  数据统计    │
├──────────┴──────────┴──────────┴───────────┴──────────┴────────────────┤
│                          基础设施层                                      │
├─────────────────┬─────────────────┬───────────────────────────────────-─┤
│   阿里云 OSS    │   MySQL 数据库    │        Elasticsearch (可选)         │
└─────────────────┴─────────────────┴────────────────────────────────────┘
```

---

### 9.2 数据模型设计

#### 9.2.1 ER关系图

```
knowledge_categories 1───N knowledge_articles 1───N material_files
        │                        │
        │                    N───┤
        │               article_tags
        └── (self-ref: parent_id)

announcements ──── announcement_reads
                   announcement_attachments
```

#### 9.2.2 知识分类表（knowledge_categories）

```sql
CREATE TABLE knowledge_categories (
    id              BIGINT UNSIGNED  NOT NULL AUTO_INCREMENT COMMENT '分类ID',
    parent_id       BIGINT UNSIGNED  DEFAULT 0               COMMENT '父分类ID, 0为顶级',
    category_name   VARCHAR(100)     NOT NULL                 COMMENT '分类名称',
    category_code   VARCHAR(50)      NOT NULL                 COMMENT '分类编码',
    category_type   TINYINT UNSIGNED NOT NULL DEFAULT 1       COMMENT '分类类型: 1-产品知识 2-竞品资料 3-销售素材 4-培训资料 5-最佳实践',
    icon_url        VARCHAR(500)     DEFAULT NULL             COMMENT '分类图标URL',
    sort_order      INT              NOT NULL DEFAULT 0       COMMENT '排序序号',
    level           TINYINT UNSIGNED NOT NULL DEFAULT 1       COMMENT '层级深度: 1/2/3',
    path            VARCHAR(500)     NOT NULL DEFAULT ''      COMMENT '层级路径, 如: /1/5/12/',
    status          TINYINT UNSIGNED NOT NULL DEFAULT 1       COMMENT '状态: 0-禁用 1-启用',
    description     VARCHAR(500)     DEFAULT NULL             COMMENT '分类描述',
    article_count   INT UNSIGNED     NOT NULL DEFAULT 0       COMMENT '文章数量(冗余)',
    created_by      BIGINT UNSIGNED  NOT NULL                 COMMENT '创建人ID',
    created_at      DATETIME         NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at      DATETIME         NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY uk_category_code (category_code),
    KEY idx_parent_id (parent_id),
    KEY idx_category_type (category_type, status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='知识分类表';
```

#### 9.2.3 知识库文章表（knowledge_articles）

```sql
CREATE TABLE knowledge_articles (
    id              BIGINT UNSIGNED  NOT NULL AUTO_INCREMENT COMMENT '文章ID',
    category_id     BIGINT UNSIGNED  NOT NULL                COMMENT '分类ID',
    title           VARCHAR(200)     NOT NULL                COMMENT '文章标题',
    summary         VARCHAR(500)     DEFAULT NULL            COMMENT '文章摘要',
    content         LONGTEXT         NOT NULL                COMMENT '文章内容(富文本HTML)',
    content_text    LONGTEXT         DEFAULT NULL            COMMENT '纯文本内容(用于全文搜索)',
    cover_image     VARCHAR(500)     DEFAULT NULL            COMMENT '封面图URL',
    author_id       BIGINT UNSIGNED  NOT NULL                COMMENT '作者ID',
    author_name     VARCHAR(50)      NOT NULL                COMMENT '作者姓名(冗余)',
    status          TINYINT UNSIGNED NOT NULL DEFAULT 0      COMMENT '状态: 0-草稿 1-待审核 2-已发布 3-已下架 4-已驳回',
    is_top          TINYINT UNSIGNED NOT NULL DEFAULT 0      COMMENT '是否置顶: 0-否 1-是',
    is_recommend    TINYINT UNSIGNED NOT NULL DEFAULT 0      COMMENT '是否推荐: 0-否 1-是',
    view_count      INT UNSIGNED     NOT NULL DEFAULT 0      COMMENT '阅读次数',
    like_count      INT UNSIGNED     NOT NULL DEFAULT 0      COMMENT '点赞次数',
    collect_count   INT UNSIGNED     NOT NULL DEFAULT 0      COMMENT '收藏次数',
    comment_count   INT UNSIGNED     NOT NULL DEFAULT 0      COMMENT '评论次数',
    version         INT UNSIGNED     NOT NULL DEFAULT 1      COMMENT '版本号',
    publish_time    DATETIME         DEFAULT NULL            COMMENT '发布时间',
    review_id       BIGINT UNSIGNED  DEFAULT NULL            COMMENT '审核人ID',
    review_remark   VARCHAR(500)     DEFAULT NULL            COMMENT '审核备注',
    review_time     DATETIME         DEFAULT NULL            COMMENT '审核时间',
    tags            VARCHAR(500)     DEFAULT NULL            COMMENT '标签, 逗号分隔',
    source          VARCHAR(100)     DEFAULT NULL            COMMENT '来源',
    visible_scope   TINYINT UNSIGNED NOT NULL DEFAULT 0      COMMENT '可见范围: 0-全员 1-指定部门 2-指定角色',
    visible_target  VARCHAR(1000)    DEFAULT NULL            COMMENT '可见目标, JSON数组',
    created_at      DATETIME         NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at      DATETIME         NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    deleted_at      DATETIME         DEFAULT NULL            COMMENT '软删除时间',
    PRIMARY KEY (id),
    KEY idx_category_id (category_id, status),
    KEY idx_author_id (author_id),
    KEY idx_status (status, publish_time),
    KEY idx_publish_time (publish_time),
    FULLTEXT INDEX ft_title_content (title, content_text) WITH PARSER ngram
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='知识库文章表';
```

#### 9.2.4 素材文件表（material_files）

```sql
CREATE TABLE material_files (
    id              BIGINT UNSIGNED  NOT NULL AUTO_INCREMENT COMMENT '文件ID',
    category_id     BIGINT UNSIGNED  NOT NULL                COMMENT '分类ID',
    article_id      BIGINT UNSIGNED  DEFAULT NULL            COMMENT '关联文章ID(可选)',
    file_name       VARCHAR(200)     NOT NULL                COMMENT '原始文件名',
    file_key        VARCHAR(500)     NOT NULL                COMMENT 'OSS对象Key',
    file_url        VARCHAR(500)     NOT NULL                COMMENT '文件访问URL',
    file_size       BIGINT UNSIGNED  NOT NULL DEFAULT 0      COMMENT '文件大小(字节)',
    file_type       VARCHAR(20)      NOT NULL                COMMENT '文件类型: image/video/document/audio/other',
    file_ext        VARCHAR(20)      NOT NULL                COMMENT '文件扩展名',
    mime_type       VARCHAR(100)     NOT NULL                COMMENT 'MIME类型',
    thumbnail_url   VARCHAR(500)     DEFAULT NULL            COMMENT '缩略图URL',
    duration        INT UNSIGNED     DEFAULT NULL            COMMENT '音视频时长(秒)',
    width           INT UNSIGNED     DEFAULT NULL            COMMENT '图片/视频宽度',
    height          INT UNSIGNED     DEFAULT NULL            COMMENT '图片/视频高度',
    md5_hash        VARCHAR(32)      NOT NULL                COMMENT '文件MD5哈希',
    status          TINYINT UNSIGNED NOT NULL DEFAULT 0      COMMENT '状态: 0-待审核 1-已通过 2-已驳回',
    download_count  INT UNSIGNED     NOT NULL DEFAULT 0      COMMENT '下载次数',
    description     VARCHAR(500)     DEFAULT NULL            COMMENT '文件描述',
    tags            VARCHAR(500)     DEFAULT NULL            COMMENT '标签, 逗号分隔',
    uploader_id     BIGINT UNSIGNED  NOT NULL                COMMENT '上传人ID',
    uploader_name   VARCHAR(50)      NOT NULL                COMMENT '上传人姓名',
    created_at      DATETIME         NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at      DATETIME         NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    deleted_at      DATETIME         DEFAULT NULL            COMMENT '软删除时间',
    PRIMARY KEY (id),
    UNIQUE KEY uk_file_key (file_key),
    KEY idx_category_id (category_id, status),
    KEY idx_article_id (article_id),
    KEY idx_file_type (file_type, status),
    KEY idx_md5_hash (md5_hash)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='素材文件表';
```

#### 9.2.5 公告表（announcements）

```sql
CREATE TABLE announcements (
    id              BIGINT UNSIGNED  NOT NULL AUTO_INCREMENT COMMENT '公告ID',
    title           VARCHAR(200)     NOT NULL                COMMENT '公告标题',
    content         LONGTEXT         NOT NULL                COMMENT '公告内容(富文本)',
    announce_type   TINYINT UNSIGNED NOT NULL DEFAULT 1      COMMENT '类型: 1-系统公告 2-业务通知 3-政策公告 4-紧急通知 5-活动通知',
    priority        TINYINT UNSIGNED NOT NULL DEFAULT 0      COMMENT '优先级: 0-普通 1-重要 2-紧急',
    status          TINYINT UNSIGNED NOT NULL DEFAULT 0      COMMENT '状态: 0-草稿 1-已发布 2-已撤回 3-已过期',
    is_popup        TINYINT UNSIGNED NOT NULL DEFAULT 0      COMMENT '是否弹窗: 0-否 1-是',
    is_top          TINYINT UNSIGNED NOT NULL DEFAULT 0      COMMENT '是否置顶: 0-否 1-是',
    target_scope    TINYINT UNSIGNED NOT NULL DEFAULT 0      COMMENT '目标范围: 0-全员 1-指定部门 2-指定角色',
    target_list     VARCHAR(2000)    DEFAULT NULL            COMMENT '目标列表, JSON数组',
    publish_time    DATETIME         DEFAULT NULL            COMMENT '发布时间',
    expire_time     DATETIME         DEFAULT NULL            COMMENT '过期时间',
    read_count      INT UNSIGNED     NOT NULL DEFAULT 0      COMMENT '已读人数',
    publisher_id    BIGINT UNSIGNED  NOT NULL                COMMENT '发布人ID',
    publisher_name  VARCHAR(50)      NOT NULL                COMMENT '发布人姓名',
    created_at      DATETIME         NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at      DATETIME         NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    KEY idx_type_status (announce_type, status),
    KEY idx_publish_time (publish_time),
    KEY idx_priority (priority, status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='公告通知表';
```

#### 9.2.6 公告阅读记录表（announcement_reads）

```sql
CREATE TABLE announcement_reads (
    id              BIGINT UNSIGNED  NOT NULL AUTO_INCREMENT,
    announcement_id BIGINT UNSIGNED  NOT NULL COMMENT '公告ID',
    user_id         BIGINT UNSIGNED  NOT NULL COMMENT '用户ID',
    read_time       DATETIME         NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '阅读时间',
    PRIMARY KEY (id),
    UNIQUE KEY uk_announce_user (announcement_id, user_id),
    KEY idx_user_id (user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='公告阅读记录表';
```

---

### 9.3 文件管理设计

#### 9.3.1 OSS上传流程

采用**服务端签名直传**方案，客户端直接上传至OSS，降低服务端带宽压力。

```
客户端                      后端服务                    阿里云OSS
  │                           │                           │
  │  1.请求上传凭证            │                           │
  │  (文件名/大小/类型)  ──────>│                           │
  │                           │  2.校验权限/文件类型/大小    │
  │                           │  3.生成STS临时凭证          │
  │  4.返回上传凭证      <──────│  (Policy+Signature)       │
  │  (uploadUrl,key,token)    │                           │
  │                           │                           │
  │  5.直传文件至OSS     ──────────────────────────────────>│
  │                           │                           │  6.存储文件
  │  7.上传成功          <──────────────────────────────────│
  │                           │                           │
  │  8.回调通知(fileKey) ──────>│                           │
  │                           │  9.写入material_files表    │
  │                           │  10.异步: 生成缩略图/       │
  │                           │     提取元信息/计算MD5      │
  │  11.返回文件信息     <──────│                           │
  └───────────────────────────└───────────────────────────┘
```

**上传限制规则：**

| 文件类型 | 允许格式                             | 单文件大小上限 |
| -------- | ------------------------------------ | -------------- |
| 图片     | jpg, jpeg, png, gif, webp, svg       | 10 MB          |
| 视频     | mp4, avi, mov, wmv                   | 500 MB         |
| 文档     | pdf, doc, docx, xls, xlsx, ppt, pptx | 50 MB          |
| 音频     | mp3, wav, aac                        | 100 MB         |

#### 9.3.2 文件预览策略

| 文件类型   | 预览方案                                              |
| ---------- | ----------------------------------------------------- |
| 图片       | OSS图片处理服务，支持缩放/裁剪/水印，直接`<img>`渲染  |
| PDF        | 前端使用pdf.js渲染，OSS直链加载                       |
| Office文档 | 阿里云智能媒体管理(IMM)文档转换预览，转为HTML在线查看 |
| 视频       | 阿里云视频点播/OSS直链，前端video.js播放器            |
| 音频       | 前端原生`<audio>`组件播放                             |

#### 9.3.3 文件安全

**签名URL机制：**

```java
// 生成有效期为30分钟的签名URL
public String generateSignedUrl(String objectKey) {
    Date expiration = new Date(System.currentTimeMillis() + 30 * 60 * 1000);
    GeneratePresignedUrlRequest request =
        new GeneratePresignedUrlRequest(bucketName, objectKey);
    request.setExpiration(expiration);
    // 限制来源IP (可选)
    request.addQueryParameter("x-oss-ac-source-ip", getAllowedIpRange());
    URL signedUrl = ossClient.generatePresignedUrl(request);
    return signedUrl.toString();
}
```

**安全策略：**

- **防盗链**：OSS Bucket配置Referer白名单，仅允许本系统域名访问
- **私有读写**：Bucket ACL设为private，所有访问均通过签名URL
- **传输加密**：强制HTTPS访问
- **下载水印**：图片类文件下载时动态添加用户水印（工号+姓名）
- **操作审计**：记录所有文件的上传、下载、删除操作日志

#### 9.3.4 存储目录规划

```
crm-sales-bucket/
├── knowledge/                  # 知识库相关
│   ├── articles/               # 文章内嵌图片
│   │   └── {yyyy}/{MM}/{dd}/{uuid}.{ext}
│   └── covers/                 # 文章封面图
│       └── {yyyy}/{MM}/{dd}/{uuid}.{ext}
├── materials/                  # 素材库
│   ├── images/
│   │   └── {yyyy}/{MM}/{dd}/{uuid}.{ext}
│   ├── videos/
│   │   └── {yyyy}/{MM}/{dd}/{uuid}.{ext}
│   ├── documents/
│   │   └── {yyyy}/{MM}/{dd}/{uuid}.{ext}
│   └── audio/
│       └── {yyyy}/{MM}/{dd}/{uuid}.{ext}
├── announcements/              # 公告附件
│   └── {yyyy}/{MM}/{dd}/{uuid}.{ext}
├── thumbnails/                 # 系统生成缩略图
│   └── {原始路径}_thumb.{ext}
└── temp/                       # 临时文件(定期清理)
    └── {yyyy}/{MM}/{dd}/{uuid}.{ext}
```

> 命名规则：使用UUID替代原始文件名，防止重名和中文路径问题。按日期分目录，便于生命周期管理。

---

### 9.4 核心业务流程

#### 9.4.1 知识库文章发布流程

```
┌──────┐    ┌──────┐    ┌──────┐    ┌──────┐    ┌──────┐
│ 创建  │───>│ 编辑  │───>│ 提交  │───>│ 审核  │───>│ 发布  │
│ 草稿  │    │ 内容  │    │ 审核  │    │ 处理  │    │ 上线  │
└──────┘    └──┬───┘    └──────┘    └──┬───┘    └──────┘
               │                       │
               │  [保存草稿,可反复编辑]   │
               │<──────────────────────│ [驳回,附原因]
               │                       │
                                       │───> ┌──────┐
                                              │ 驳回  │
                                              │ 修改  │
                                              └──────┘
```

**流程说明：**

1. 作者创建草稿，选择分类、编辑富文本内容、上传封面和附件
2. 草稿可多次保存，系统自动保存版本历史
3. 提交审核后状态变为"待审核"，通知审核人员
4. 审核通过后自动发布；驳回则退回作者修改，附驳回原因
5. 已发布文章可由作者更新后重新提审，或由管理员直接下架

#### 9.4.2 素材上传与审核流程

```
上传者                      系统                        审核人
  │                          │                           │
  │  1.选择分类+上传文件  ────>│                           │
  │                          │  2.校验文件(类型/大小/       │
  │                          │    重复MD5检测)             │
  │                          │  3.上传至OSS                │
  │                          │  4.写入DB(status=待审核)     │
  │                          │  5.生成缩略图/提取元信息      │
  │                          │  6.通知审核人          ─────>│
  │                          │                           │  7.查看素材
  │                          │                           │  8.审核操作
  │                          │  9.更新状态           <─────│
  │  10.通知审核结果     <─────│                           │
  │                          │ [通过: 素材对全员可见]       │
  │                          │ [驳回: 附原因,可重新上传]    │
  └──────────────────────────└───────────────────────────┘
```

**去重策略：** 上传前计算文件MD5，若数据库已存在相同MD5且未被删除，提示"该文件已存在"并展示已有记录，避免重复上传。

#### 9.4.3 公告发布与推送流程

```
发布者                       系统                       接收者
  │                           │                           │
  │  1.编辑公告内容       ─────>│                           │
  │  (标题/内容/类型/优先级/    │                           │
  │   目标范围/是否弹窗)        │                           │
  │                           │  2.保存草稿/直接发布        │
  │                           │  3.计算目标用户列表          │
  │                           │  4.写入公告表                │
  │                           │  5.异步推送:                 │
  │                           │    - WebSocket实时通知 ─────>│ 6.收到新公告提醒
  │                           │    - APP推送(紧急公告)  ─────>│
  │                           │    - 站内消息              │
  │                           │                           │  7.查看公告
  │                           │  8.记录已读          <──────│
  │  9.查看阅读统计       <─────│                           │
  │  (已读/未读人员列表)        │                           │
  └───────────────────────────└───────────────────────────┘
```

**推送规则：**

- 普通公告：仅站内消息通知
- 重要公告：站内消息 + WebSocket实时推送
- 紧急公告：站内消息 + WebSocket + APP推送 + 登录弹窗

---

### 9.5 页面设计

#### 9.5.1 知识库首页

```
┌──────────────────────────────────────────────────────────────────────┐
│  [面包屑] 首页 > 销售信息 > 知识库                                      │
├──────────────────────────────────────────────────────────────────────┤
│  ┌────────────────────────────────────────────────────────────────┐  │
│  │  🔍 [         搜索知识库文章...          ] [搜索]  [高级搜索]   │  │
│  └────────────────────────────────────────────────────────────────┘  │
├────────────┬─────────────────────────────────────────────────────────┤
│            │  热门推荐                                     [更多 >]  │
│ 知识分类    │  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐      │
│            │  │ [封面图]     │ │ [封面图]     │ │ [封面图]     │      │
│ ▼ 产品知识  │  │ 文章标题1    │ │ 文章标题2    │ │ 文章标题3    │      │
│   产品手册  │  │ 摘要内容...  │ │ 摘要内容...  │ │ 摘要内容...  │      │
│   功能说明  │  │ 👁256 👍32  │ │ 👁189 👍28  │ │ 👁145 👍21  │      │
│   FAQ文档   │  └─────────────┘ └─────────────┘ └─────────────┘      │
│   版本更新  │                                                        │
│            │  最新发布                          [全部] [产品] [竞品]  │
│ ▼ 竞品资料  │  ┌──────────────────────────────────────────────────┐  │
│   竞品分析  │  │ ● 文章标题AAAA        张三  2026-03-01  👁120    │  │
│   对比报告  │  │ ● 文章标题BBBB        李四  2026-02-28  👁98     │  │
│            │  │ ● 文章标题CCCC        王五  2026-02-27  👁86     │  │
│ ▼ 销售素材  │  │ ● 文章标题DDDD        赵六  2026-02-26  👁72     │  │
│   ...      │  │ ● 文章标题EEEE        孙七  2026-02-25  👁65     │  │
│            │  └──────────────────────────────────────────────────┘  │
│ ▼ 培训资料  │                                                        │
│   ...      │  ┌──────────────────────┐  ┌──────────────────────┐    │
│            │  │  我的收藏 (12)        │  │  浏览历史              │    │
│ ▼ 最佳实践  │  │  文章A / 文章B / ...  │  │  文章X / 文章Y / ...   │    │
│   ...      │  └──────────────────────┘  └──────────────────────┘    │
├────────────┴─────────────────────────────────────────────────────────┤
│  [+发布文章]                                          共 1,286 篇文章 │
└──────────────────────────────────────────────────────────────────────┘
```

#### 9.5.2 文章详情页

```
┌──────────────────────────────────────────────────────────────────────┐
│  [面包屑] 知识库 > 产品知识 > 产品手册 > 文章标题                        │
├──────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  文章标题：XXXX产品功能详解与使用指南                      [置顶] [推荐] │
│                                                                      │
│  作者: 张三  |  发布: 2026-03-01  |  阅读: 256  |  分类: 产品手册       │
│  标签: [产品A] [功能说明] [新手入门]                                    │
│  ─────────────────────────────────────────────────────────────────── │
│                                                                      │
│  [富文本文章正文内容区域]                                               │
│                                                                      │
│  ...正文内容，支持标题、段落、图片、表格、代码块...                       │
│                                                                      │
│  ─────────────────────────────────────────────────────────────────── │
│  附件列表:                                                            │
│  📎 产品手册V3.2.pdf (2.5MB)     [预览] [下载]                        │
│  📎 功能对比表.xlsx (180KB)       [预览] [下载]                        │
│  ─────────────────────────────────────────────────────────────────── │
│  [👍 点赞 32]   [⭐ 收藏 18]   [📤 分享]   [🖨 打印]                  │
│  ─────────────────────────────────────────────────────────────────── │
│  评论区 (8条评论)                                                     │
│  ┌───────────────────────────────────────────────────────────────┐  │
│  │ 李四 (2026-03-02):  内容很详细，对实际销售帮助很大！            │  │
│  │ 王五 (2026-03-01):  建议补充XX场景的使用说明                   │  │
│  └───────────────────────────────────────────────────────────────┘  │
│  [                    输入评论内容...                    ] [发表评论]  │
│  ─────────────────────────────────────────────────────────────────── │
│  相关推荐:  文章A  |  文章B  |  文章C                                  │
└──────────────────────────────────────────────────────────────────────┘
```

#### 9.5.3 素材库页面

```
┌──────────────────────────────────────────────────────────────────────┐
│  [面包屑] 首页 > 销售信息 > 素材库                                      │
├──────────────────────────────────────────────────────────────────────┤
│  [全部] [图片] [视频] [文档] [音频]    🔍[搜索素材...]                   │
│  分类: [全部分类 ▼]  排序: [最新上传 ▼]          [列表视图|网格视图]      │
├──────────────────────────────────────────────────────────────────────┤
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐            │
│  │          │  │          │  │          │  │          │            │
│  │ [缩略图]  │  │ [缩略图]  │  │ [缩略图]  │  │ [缩略图]  │            │
│  │          │  │          │  │          │  │          │            │
│  ├──────────┤  ├──────────┤  ├──────────┤  ├──────────┤            │
│  │产品宣传图 │  │方案PPT   │  │演示视频   │  │合同模板   │            │
│  │PNG 2.1MB │  │PPTX 5MB  │  │MP4 120MB │  │DOCX 85KB │            │
│  │张三 03-01│  │李四 02-28│  │王五 02-27│  │赵六 02-25│            │
│  │↓32  [...]│  │↓18  [...]│  │↓45  [...]│  │↓67  [...]│            │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘            │
│                                                                      │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐            │
│  │  ...     │  │  ...     │  │  ...     │  │  ...     │            │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘            │
├──────────────────────────────────────────────────────────────────────┤
│  [+ 上传素材]              < 1  2  3  4  5 ... 20 >   共 396 个素材   │
└──────────────────────────────────────────────────────────────────────┘
```

#### 9.5.4 公告列表页

```
┌──────────────────────────────────────────────────────────────────────┐
│  [面包屑] 首页 > 销售信息 > 公告通知                                    │
├──────────────────────────────────────────────────────────────────────┤
│  [全部] [系统公告] [业务通知] [政策公告] [紧急通知] [活动通知]             │
│  状态: [全部 ▼]    时间: [最近一月 ▼]                                   │
├──────────────────────────────────────────────────────────────────────┤
│  ┌────────────────────────────────────────────────────────────────┐  │
│  │ [紧急]  关于调整Q2销售激励政策的紧急通知             2026-03-02  │  │
│  │         发布人: 销售总监                  ● 未读    [查看详情>]  │  │
│  ├────────────────────────────────────────────────────────────────┤  │
│  │ [置顶]  2026年度销售目标与考核办法发布               2026-03-01  │  │
│  │         发布人: 运营管理部                ✓ 已读    [查看详情>]  │  │
│  ├────────────────────────────────────────────────────────────────┤  │
│  │ [重要]  CRM系统V3.2版本更新说明                     2026-02-28  │  │
│  │         发布人: 技术支持部                ✓ 已读    [查看详情>]  │  │
│  ├────────────────────────────────────────────────────────────────┤  │
│  │         三月份产品培训安排通知                       2026-02-27  │  │
│  │         发布人: 培训部                    ● 未读    [查看详情>]  │  │
│  ├────────────────────────────────────────────────────────────────┤  │
│  │         客户回访满意度调查结果公示                    2026-02-26  │  │
│  │         发布人: 客户服务部                ✓ 已读    [查看详情>]  │  │
│  └────────────────────────────────────────────────────────────────┘  │
├──────────────────────────────────────────────────────────────────────┤
│  [+ 发布公告]              < 1  2  3  4  5 >          共 86 条公告    │
└──────────────────────────────────────────────────────────────────────┘
```

---

### 9.6 接口设计

#### 9.6.1 完整API列表

| 序号 | 方法   | 接口路径                                | 说明                   |
| ---- | ------ | --------------------------------------- | ---------------------- |
| 1    | GET    | /api/v1/knowledge/categories            | 获取分类树             |
| 2    | POST   | /api/v1/knowledge/categories            | 创建分类               |
| 3    | PUT    | /api/v1/knowledge/categories/{id}       | 更新分类               |
| 4    | DELETE | /api/v1/knowledge/categories/{id}       | 删除分类               |
| 5    | GET    | /api/v1/knowledge/articles              | 文章分页列表           |
| 6    | GET    | /api/v1/knowledge/articles/{id}         | 文章详情               |
| 7    | POST   | /api/v1/knowledge/articles              | 创建文章(草稿)         |
| 8    | PUT    | /api/v1/knowledge/articles/{id}         | 更新文章               |
| 9    | DELETE | /api/v1/knowledge/articles/{id}         | 删除文章(软删除)       |
| 10   | POST   | /api/v1/knowledge/articles/{id}/submit  | 提交审核               |
| 11   | POST   | /api/v1/knowledge/articles/{id}/review  | 审核(通过/驳回)        |
| 12   | POST   | /api/v1/knowledge/articles/{id}/publish | 直接发布(管理员)       |
| 13   | POST   | /api/v1/knowledge/articles/{id}/offline | 下架文章               |
| 14   | POST   | /api/v1/knowledge/articles/{id}/like    | 点赞/取消点赞          |
| 15   | POST   | /api/v1/knowledge/articles/{id}/collect | 收藏/取消收藏          |
| 16   | GET    | /api/v1/knowledge/search                | 全文搜索               |
| 17   | GET    | /api/v1/knowledge/recommend             | 热门推荐文章           |
| 18   | POST   | /api/v1/materials/upload-token          | 获取OSS上传凭证        |
| 19   | POST   | /api/v1/materials/callback              | OSS上传回调            |
| 20   | GET    | /api/v1/materials                       | 素材分页列表           |
| 21   | GET    | /api/v1/materials/{id}                  | 素材详情               |
| 22   | DELETE | /api/v1/materials/{id}                  | 删除素材               |
| 23   | POST   | /api/v1/materials/{id}/review           | 审核素材               |
| 24   | GET    | /api/v1/materials/{id}/preview-url      | 获取预览签名URL        |
| 25   | GET    | /api/v1/materials/{id}/download-url     | 获取下载签名URL        |
| 26   | GET    | /api/v1/announcements                   | 公告分页列表           |
| 27   | GET    | /api/v1/announcements/{id}              | 公告详情(自动标记已读) |
| 28   | POST   | /api/v1/announcements                   | 创建公告               |
| 29   | PUT    | /api/v1/announcements/{id}              | 更新公告               |
| 30   | POST   | /api/v1/announcements/{id}/publish      | 发布公告               |
| 31   | POST   | /api/v1/announcements/{id}/revoke       | 撤回公告               |
| 32   | GET    | /api/v1/announcements/{id}/read-stats   | 公告阅读统计           |
| 33   | GET    | /api/v1/announcements/unread-count      | 未读公告数量           |

#### 9.6.2 关键接口详细设计

**接口一：全文搜索**

```
GET /api/v1/knowledge/search?keyword=产品方案&category_id=5&page=1&size=20
```

**响应示例：**

```json
{
  "code": 200,
  "message": "success",
  "data": {
    "total": 56,
    "pages": 3,
    "current": 1,
    "records": [
      {
        "id": 1024,
        "title": "XX<em>产品方案</em>设计与落地实践",
        "summary": "本文详细介绍了XX<em>产品方案</em>的核心设计思路...",
        "category_name": "最佳实践",
        "author_name": "张三",
        "publish_time": "2026-02-28T10:30:00",
        "view_count": 256,
        "like_count": 32,
        "tags": ["产品方案", "实践"],
        "relevance_score": 8.75
      }
    ]
  }
}
```

**接口二：获取OSS上传凭证**

```
POST /api/v1/materials/upload-token
```

**请求体：**

```json
{
  "category_id": 10,
  "file_name": "产品宣传图_v2.png",
  "file_size": 2097152,
  "file_type": "image",
  "content_type": "image/png",
  "description": "2026年Q1产品宣传主图"
}
```

**响应示例：**

```json
{
  "code": 200,
  "message": "success",
  "data": {
    "upload_id": "temp_20260301_abc123",
    "oss_endpoint": "https://oss-cn-hangzhou.aliyuncs.com",
    "bucket": "crm-sales-bucket",
    "object_key": "materials/images/2026/03/01/a1b2c3d4-e5f6-7890-abcd-ef1234567890.png",
    "access_key_id": "STS.xxxxxxxxxxxx",
    "access_key_secret": "xxxxxxxxxxxxxxxx",
    "security_token": "CAISxxxxxxxxxxxxxxxx",
    "expiration": "2026-03-01T11:30:00Z",
    "policy": "eyJleHBpcmF0aW9uIjoiMjAyNi......",
    "signature": "VsGKxxxxxxxxxxxx",
    "callback_url": "https://api.crm.example.com/api/v1/materials/callback",
    "max_size": 10485760
  }
}
```

**接口三：发布公告**

```
POST /api/v1/announcements/{id}/publish
```

**请求体：**

```json
{
  "publish_now": true,
  "schedule_time": null,
  "notify_channels": ["websocket", "app_push"],
  "is_popup": true
}
```

**响应示例：**

```json
{
  "code": 200,
  "message": "公告发布成功",
  "data": {
    "id": 86,
    "title": "关于调整Q2销售激励政策的紧急通知",
    "status": 1,
    "status_text": "已发布",
    "publish_time": "2026-03-01T14:00:00",
    "target_user_count": 358,
    "notify_result": {
      "websocket_sent": 312,
      "websocket_online": 312,
      "app_push_sent": 358,
      "app_push_delivered": 345
    }
  }
}
```

---

### 9.7 搜索设计

#### 9.7.1 全文搜索方案

采用 **MySQL ngram全文索引** 作为基础方案，支持中文分词搜索。

**索引配置：**

```sql
-- my.cnf 配置
[mysqld]
ngram_token_size = 2

-- 建立全文索引
ALTER TABLE knowledge_articles
ADD FULLTEXT INDEX ft_title_content (title, content_text) WITH PARSER ngram;

-- 搜索查询示例
SELECT id, title, summary,
       MATCH(title, content_text) AGAINST('产品方案' IN BOOLEAN MODE) AS relevance
FROM knowledge_articles
WHERE MATCH(title, content_text) AGAINST('产品方案' IN BOOLEAN MODE)
  AND status = 2 AND deleted_at IS NULL
ORDER BY relevance DESC
LIMIT 20;
```

#### 9.7.2 搜索权重策略

```
最终得分 = 文本相关度 × 1.0
         + 标题匹配加权 × 3.0
         + 置顶加权 × 5.0
         + 推荐加权 × 2.0
         + 时效性加权 × f(发布天数)
         + 热度加权 × g(浏览/点赞/收藏)
```

**权重计算SQL实现：**

```sql
SELECT a.id, a.title, a.summary, a.publish_time,
    (
        -- 基础全文相关度
        MATCH(a.title, a.content_text) AGAINST(:keyword IN BOOLEAN MODE)
        -- 标题额外加权
        + IF(a.title LIKE CONCAT('%', :keyword, '%'), 3.0, 0)
        -- 置顶加权
        + IF(a.is_top = 1, 5.0, 0)
        -- 推荐加权
        + IF(a.is_recommend = 1, 2.0, 0)
        -- 时效性衰减: 30天内权重较高
        + GREATEST(0, (30 - DATEDIFF(NOW(), a.publish_time)) / 30.0)
        -- 热度加权: 归一化
        + LOG10(1 + a.view_count * 0.1 + a.like_count * 0.5 + a.collect_count * 0.8)
    ) AS final_score
FROM knowledge_articles a
WHERE MATCH(a.title, a.content_text) AGAINST(:keyword IN BOOLEAN MODE)
    AND a.status = 2 AND a.deleted_at IS NULL
ORDER BY final_score DESC
LIMIT :offset, :size;
```

**搜索功能增强：**

| 特性       | 实现方式                                               |
| ---------- | ------------------------------------------------------ |
| 搜索建议   | 记录用户搜索词频，查询时返回热门搜索关联词             |
| 搜索历史   | Redis存储每用户最近50条搜索记录，支持清空              |
| 高亮显示   | 后端返回`<em>`标签包裹匹配词，前端CSS高亮              |
| 空结果推荐 | 搜索无结果时，返回热门文章列表作为推荐                 |
| 同义词扩展 | 维护同义词表（如"CRM"="客户管理"），搜索时自动扩展查询 |

> **演进方案：** 当数据量超过50万篇或搜索性能无法满足需求时，可引入Elasticsearch替代MySQL全文索引，实现更精准的中文分词、同义词扩展、拼音搜索等高级特性，应用层接口保持不变。

---

### 9.8 权限与安全

#### 9.8.1 内容发布权限矩阵

| 操作 \ 角色         | 超级管理员 | 内容管理员 | 部门经理 | 普通销售 | 只读用户 |
| ------------------- | :--------: | :--------: | :------: | :------: | :------: |
| 创建知识分类        |     ✓      |     ✓      |    ✗     |    ✗     |    ✗     |
| 编辑/删除分类       |     ✓      |     ✓      |    ✗     |    ✗     |    ✗     |
| 创建文章草稿        |     ✓      |     ✓      |    ✓     |    ✓     |    ✗     |
| 编辑自己的文章      |     ✓      |     ✓      |    ✓     |    ✓     |    ✗     |
| 编辑他人的文章      |     ✓      |     ✓      |    ✗     |    ✗     |    ✗     |
| 提交文章审核        |     ✓      |     ✓      |    ✓     |    ✓     |    ✗     |
| 审核文章            |     ✓      |     ✓      |   ✓\*    |    ✗     |    ✗     |
| 直接发布(免审核)    |     ✓      |     ✓      |    ✗     |    ✗     |    ✗     |
| 下架/删除已发布文章 |     ✓      |     ✓      |    ✗     |    ✗     |    ✗     |
| 上传素材            |     ✓      |     ✓      |    ✓     |    ✓     |    ✗     |
| 审核素材            |     ✓      |     ✓      |   ✓\*    |    ✗     |    ✗     |
| 删除素材            |     ✓      |     ✓      |    ✗     |    ✗     |    ✗     |
| 发布公告            |     ✓      |     ✓      |  ✓\*\*   |    ✗     |    ✗     |
| 撤回公告            |     ✓      |     ✓      |    ✗     |    ✗     |    ✗     |
| 查看阅读统计        |     ✓      |     ✓      |    ✓     |    ✗     |    ✗     |
| 浏览文章/素材       |     ✓      |     ✓      |    ✓     |    ✓     |    ✓     |
| 下载素材            |     ✓      |     ✓      |    ✓     |    ✓     |    ✗     |
| 点赞/收藏/评论      |     ✓      |     ✓      |    ✓     |    ✓     |    ✗     |

> \* 部门经理仅可审核本部门成员提交的内容
> \*\* 部门经理仅可发布面向本部门的通知

#### 9.8.2 操作审计日志

**审计日志表设计：**

```sql
CREATE TABLE info_audit_logs (
    id              BIGINT UNSIGNED  NOT NULL AUTO_INCREMENT,
    module          VARCHAR(50)      NOT NULL COMMENT '模块: article/material/announcement',
    action          VARCHAR(50)      NOT NULL COMMENT '操作: create/update/delete/publish/review/download/view',
    target_id       BIGINT UNSIGNED  NOT NULL COMMENT '目标对象ID',
    target_title    VARCHAR(200)     DEFAULT NULL COMMENT '目标标题(冗余,便于查询)',
    operator_id     BIGINT UNSIGNED  NOT NULL COMMENT '操作人ID',
    operator_name   VARCHAR(50)      NOT NULL COMMENT '操作人姓名',
    operator_ip     VARCHAR(50)      NOT NULL COMMENT '操作IP',
    user_agent      VARCHAR(500)     DEFAULT NULL COMMENT '浏览器UA',
    detail          JSON             DEFAULT NULL COMMENT '操作详情(变更前后值)',
    created_at      DATETIME         NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    KEY idx_module_target (module, target_id),
    KEY idx_operator (operator_id, created_at),
    KEY idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='信息管理操作审计日志';
```

**审计记录示例（detail字段）：**

```json
{
  "action": "review",
  "result": "approved",
  "remark": "内容准确，同意发布",
  "before": { "status": 1, "status_text": "待审核" },
  "after": { "status": 2, "status_text": "已发布" }
}
```

**审计覆盖范围：**

| 审计事件             | 记录内容                       | 保留期限 |
| -------------------- | ------------------------------ | -------- |
| 文章创建/编辑/删除   | 变更字段对比，操作人信息       | 永久     |
| 文章审核(通过/驳回)  | 审核结果、审核意见、审核人     | 永久     |
| 文章发布/下架        | 操作时间、操作人               | 永久     |
| 素材上传/删除        | 文件名、文件大小、操作人       | 永久     |
| 素材下载             | 下载人、下载时间、文件信息     | 180天    |
| 公告发布/撤回        | 公告内容摘要、目标范围、操作人 | 永久     |
| 文件预览             | 预览人、预览时间               | 90天     |
| 敏感操作(批量删除等) | 完整操作参数、影响记录数       | 永久     |

**审计日志清理策略：** 对有保留期限的日志，通过MySQL Event定时任务每日凌晨清理过期记录，清理前先归档至OSS冷存储以备合规审查。

---

以上为销售信息管理模块的完整详细设计。该模块以知识库文章为核心，配合素材文件管理和公告通知功能，通过阿里云OSS实现大文件存储与分发，MySQL存储元数据与全文索引，满足销售团队日常信息获取、知识沉淀和协同共享的业务需求。
