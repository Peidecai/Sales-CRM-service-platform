Now I have all the information needed to produce the complete audit. Here is the report:

---

# M5 閿€鍞俊鎭鐞嗘ā鍧楀璁℃姤鍛?

## 1. 鐭ヨ瘑搴撴爲缁撴瀯锛坧arent_id 鑷叧鑱旓級

### **PASS** 鈥?鑷叧鑱斿叧绯诲畬鏁达紝鍚?path/level 鍚屾

**瀹炰綋瀹氫箟** 鈥?`knowledge-category.entity.ts:45-53`

```typescript
@ManyToOne('KnowledgeCategory', 'children', {
  createForeignKeyConstraints: false,
  nullable: true,
})
@JoinColumn({ name: 'parent_id' })
parent!: KnowledgeCategory | null

@OneToMany('KnowledgeCategory', 'parent')
children!: KnowledgeCategory[]
```

- `parent_id` 鍒楁纭畾涔変负 `nullable: true, default: null`锛?11-12锛?- `level` (TINYINT) 鍜?`path` (VARCHAR 200) 瀛楁鐢辫縼绉?`1709000046000` 娣诲姞锛屾敮鎸佺墿鍖栬矾寰勬煡璇? \*_鏍戞瀯寤?_ 鈥?`knowledge.service.ts:434-458`
- `findTree()` 鍦ㄥ簲鐢ㄥ眰閫掑綊鏋勫缓锛?*娣卞害闄愬埗 3 绾?*锛坄if (depth > 3) return []`锛?
**path/level 鍚屾** 鈥?`knowledge.service.ts:474-511`
- `updateCategory()` 鍦ㄤ簨鍔″唴璋冪敤 `syncChildrenPathAndLevel()`锛岄€掑綊鏇存柊瀛愯妭鐐?path/level

### **WARN** 鈥?浠ヤ笅缂洪櫡瀛樺湪

| 闂                                        | 浣嶇疆                         | 璇存槑                                                                                                         |
| ------------------------------------------- | ------------------------------ | -------------------------------------------------------------------------------------------------------------- |
| 鏃犲惊鐜紩鐢ㄦ娴?                         | `knowledge.service.ts:468-469` | `updateCategory()` 涓?`dto.parentId` 璧嬪€兼湭楠岃瘉鏂?parent 鏄惁涓鸿嚜韬垨鑷韩鍚庝唬锛屽彲閫犳垚姝诲惊鐜? |
| 鍒犻櫎鍒嗙被鏈骇鑱斿鐞嗗瓙鑺傜偣          | `knowledge.service.ts:514-526` | `removeCategory()` 浠呰蒋鍒犲綋鍓嶈妭鐐癸紝瀛愬垎绫诲拰鍏宠仈鏂囩珷鏈鐞嗭紝浜х敓瀛ゅ効鏁版嵁                 |
| `parent_id` 鏃犵储寮?                       | `1709000003000` 杩佺Щ          | 寤鸿〃鏃舵湭缁?`parent_id` 娣诲姞绱㈠紩锛屾爲鏌ヨ鎬ц兘鍙楀奖鍝?                                               |
| `createCategory` 鏈獙璇?parentId 瀛樺湪鎬? | `knowledge.service.ts:403-408` | 鐩存帴 `create(dto)` 淇濆瓨锛屾湭妫€鏌?`dto.parentId` 瀵瑰簲鐨勫垎绫绘槸鍚﹀瓨鍦?                              |

---

## 2. FULLTEXT 绱㈠紩 ngram 瑙ｆ瀽鍣?

### **PASS** 鈥?绱㈠紩涓庢煡璇㈠疄鐜板畬鏁?

**杩佺Щ** 鈥?`1709000047050-AddKnowledgeArticlesFulltextIndex.ts:8`

```sql
ALTER TABLE knowledge_articles ADD FULLTEXT INDEX ft_article_ngram (title, content) WITH PARSER ngram
```

- 姝ｇ‘浣跨敤 `WITH PARSER ngram` 鏀寔涓枃鍒嗚瘝

**鏌ヨ** 鈥?`knowledge.service.ts:143-144`

```typescript
.andWhere('MATCH(article.title, article.content) AGAINST (:keyword IN BOOLEAN MODE)', {
  keyword: safeKeyword,
})
```

- 浣跨敤 `BOOLEAN MODE` 鍏ㄦ枃鍖归厤
- 鍏抽敭璇嶆竻娲楋紙:138锛夛細`replace(/[\\'"%;]/g, ' ').trim().slice(0, 200)`

**鍔犳潈鎺掑簭** 鈥?`knowledge.service.ts:158-161`

- 缁煎悎璇勫垎鍏紡锛氭爣棰樼浉鍏冲害脳3 + 缃《脳5 + 鎺ㄨ崘脳2 + 鏃舵晥琛板噺 + 鐑害

### **WARN** 鈥?ngram_token_size 鏈厤缃?

| 闂                             | 浣嶇疆                         | 璇存槑                                                                                                                               |
| -------------------------------- | ------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------ |
| MySQL 鏈厤缃?`ngram_token_size` | `docker/mysql/conf.d/my.cnf`   | 缂哄皯 `ngram_token_size = 2`锛孧ySQL 8.0 榛樿鍊间负 2 鍙帴鍙楋紝浣嗗簲鏄惧紡澹版槑浠ラ槻鐜宸紓                                 |
| `safeKeyword` 鍙傛暟閲嶅缁戝畾  | `knowledge.service.ts:143-146` | `.andWhere()` 宸茬粦瀹?`:keyword`锛岀揣鎺ョ潃鍙?`.setParameter('keyword', safeKeyword)` 閲嶅璁剧疆锛堟棤鍔熻兘褰卞搷锛屼絾鍐椾綑锛? |

---

## 3. 鍏憡澶氭笭閬撴帹閫?

### **FAIL** 鈥?浠呮敮鎸?DB 瀛樺偍 + 宸茶鏍囪锛屾棤鎺ㄩ€侀€氶亾

**鍏憡瀹炰綋** 鈥?`announcement.entity.ts`

- 浠呮湁 `title`, `content`, `priority`, `isPinned`, `publishAt`, `endAt`, `createdBy`
- **鏃?`channels`/`pushType`/`targetUsers`/`targetRoles` 瀛楁**

**鍏憡鏈嶅姟** 鈥?`announcement.service.ts`

- CRUD + `markRead()` + `getUnreadCount()`
- **鏈敞鍏?`NotificationService`**锛屽垱寤哄叕鍛婃椂鏃犱换浣曟帹閫侀€昏緫

**閫氱煡妯″潡** 鈥?`notification.types.ts`

- `NotificationType` 鏋氫妇涓?_鏃?`ANNOUNCEMENT\__` 浜嬩欢绫诲瀷\*\*
- 鍏憡妯″潡涓庨€氱煡妯″潡瀹屽叏瑙ｈ€︼紝鏃犻泦鎴?
  **宸茶杩借釜** 鈥?`announcement-read.entity.ts` 鈥?**PASS**
- 宸叉湁 `announcement_reads` 琛紝`(announcementId, userId)` 鍞竴绱㈠紩锛宍readAt`鏃堕棿鎴?
| 缂哄け椤?| 涓ラ噸绋嬪害 | 璇存槑 |
|---------|---------|------|
| 鏃?WebSocket 鎺ㄩ€?| 楂?| 鍒涘缓鍏憡鍚庝笉涓诲姩鎺ㄩ€佺粰鍦ㄧ嚎鐢ㄦ埛锛岄渶鐢ㄦ埛鎵嬪姩鍒锋柊 |
| 鏃犲娓犻亾瀛楁 | 楂?| 缂哄皯 channels 瀛楁锛堢珯鍐呬俊/閭欢/鐭俊/浼佸井锛夛紝鏃犳硶閰嶇疆鎺ㄩ€佹笭閬?|
| 鏃犵洰鏍囧彈浼?| 涓?| 缂哄皯`targetRoles`/`targetUsers` 瀛楁锛屾棤娉曞畾鍚戞帹閫?|
  | 鏃犳帹閫侀噸璇?| 涓?| 鏃?Bull Queue 寮傛鎺ㄩ€佷换鍔°€佹棤澶辫触閲嶈瘯鏈哄埗 |

---

## 4. 鏂囦欢涓婁紶绫诲瀷/澶у皬鏍￠獙

### **FAIL** 鈥?閲囩敤 OSS 鐩翠紶妯″紡锛屾湇鍔＄鏃犳枃浠剁粡杩囷紝鏍￠獙缂哄け

**涓婁紶鏋舵瀯** 鈥?`material.controller.ts:46-51` + `oss-upload.service.ts`

- 鍓嶇鐩翠紶 OSS 鈫?OSS 鍥炶皟鏈嶅姟绔?`POST /materials/upload/callback`
- 鏈嶅姟绔粎鎺ユ敹鍏冩暟鎹紙filename, oss_key, file_size, mime_type锛夛紝\*_涓嶇粡鎵嬫枃浠舵湰韬?_

**鍥炶皟绔偣瀹夊叏** 鈥?`material.controller.ts:47`

```typescript
@Public()  // 鏃?JWT 閴存潈锛?uploadCallback(@Body() body: Record<string, unknown>) {
  return this.ossUploadService.handleCallback(body as any)
}
```

| 缂哄け椤?                 | 浣嶇疆                        | 涓ラ噸绋嬪害 | 璇存槑                                                                                               |
| ------------------------- | ----------------------------- | ------------ | ---------------------------------------------------------------------------------------------------- |
| 鍥炶皟鏃犵鍚嶉獙璇?      | `material.controller.ts:47`   | **涓ラ噸**   | `@Public()` 鏍囪璺宠繃 JWT锛屼笖鏃?OSS 鍥炶皟绛惧悕鏍￠獙锛屼换浣曚汉鍙吉閫犲洖璋冨啓鍏?DB         |
| 鏃?MIME 绫诲瀷鐧藉悕鍗?   | `oss-upload.service.ts:43-74` | 楂?          | `handleCallback()` 鐩存帴淇′换 `body.mime_type`锛屾棤鐧藉悕鍗曟牎楠?                                 |
| 鏃犳枃浠跺ぇ灏忛檺鍒?     | `oss-upload.service.ts:59`    | 楂?          | `file_size` 浠呭瓨鍌ㄤ笉鏍￠獙锛屾湭璁句笂闄?                                                        |
| 鏃犲墠绔?accept 绾︽潫    | 鈥?                           | 涓?          | 鏈鍓嶇涓婁紶缁勪欢鐨?MIME/鎵╁睍鍚嶉檺鍒?                                                          |
| 鏃?magic bytes 妫€娴?     | 鈥?                           | 涓?          | OSS 鐩翠紶妯″紡涓嬫棤娉曞仛鏈嶅姟绔?magic bytes 妫€娴嬶紝搴斿湪 OSS Bucket Policy 鎴栧洖璋冧腑琛ュ伩 |
| STS Token 杩斿洖鐪熷疄 AK | `oss-upload.service.ts:34-39` | **涓ラ噸**   | 鏈泦鎴?STS AssumeRole锛岀洿鎺ヨ繑鍥?`accessKeyId/accessKeySecret`锛屾硠闇叉案涔呭瘑閽?              |

---

## 5. 鏂囩珷鐗堟湰鎺у埗

### **WARN** 鈥?鏈夌増鏈彿瀛楁浣嗘棤鐗堟湰鍘嗗彶

**鐗堟湰瀛楁** 鈥?`knowledge-article.entity.ts:62`

```typescript
@Column({ name: 'version', type: 'int', default: 1 })
version!: number
```

- 杩佺Щ `1709000047000:27` 娣诲姞 `version INT DEFAULT 1`

\*_鐘舵€佹祦杞?_ 鈥?`knowledge.service.ts:231-297`

- 瀹屾暣鐨?DRAFT 鈫?SUBMITTED 鈫?PUBLISHED/REJECTED 鈫?OFFLINE 瀹℃牳娴?- `reviewArticle()` 璁板綍 reviewerId, reviewRemark, reviewTime

| 缂哄け椤?               | 涓ラ噸绋嬪害 | 璇存槑                                                                                   |
| ----------------------- | ------------ | ---------------------------------------------------------------------------------------- |
| 鏃犵増鏈巻鍙茶〃       | 楂?          | 鏃?`article_versions` / `article_revisions` 琛紝鏃犳硶杩芥函鍘嗗彶鍐呭                 |
| `version` 瀛楁鏈嚜澧? | 楂?          | `updateArticle()` (`:209-219`) 鏈 `version` 鍋?`+1` 鎿嶄綔锛岀増鏈彿濮嬬粓涓?1        |
| 鏃犱箰瑙傞攣            | 涓?          | 鏈娇鐢?TypeORM `@VersionColumn()` 鎴栨墜鍔?WHERE version=X 妫€鏌ワ紝骞跺彂缂栬緫鍙鐩? |
| 鏃犲唴瀹瑰揩鐓?         | 涓?          | 鏇存柊鏃剁洿鎺?`Object.assign` 瑕嗙洊 content锛屾棫鍐呭涓㈠け涓嶅彲鎭㈠                |
| 鏃?diff 瀵规瘮          | 浣?          | 鏃犳硶姣旇緝涓や釜鐗堟湰闂寸殑宸紓                                                      |

---

## 姹囨€?

| #   | 瀹¤椤?              | 缁撹             | 鍏抽敭闂                                                                 |
| --- | -------------------- | ----------------- | -------------------------------------------------------------------------- |
| 1   | 鐭ヨ瘑搴撴爲缁撴瀯   | **PASS** (4 WARN) | 缂哄惊鐜紩鐢ㄦ娴嬨€佸垹闄ゆ棤绾ц仈銆乸arent_id 鏃犵储寮?                 |
| 2   | FULLTEXT ngram       | **PASS** (2 WARN) | ngram_token_size 鏈樉寮忛厤缃€佸弬鏁扮粦瀹氬啑浣?                        |
| 3   | 鍏憡澶氭笭閬撴帹閫? | **FAIL**          | 鏃犳帹閫侀€氶亾闆嗘垚銆佹棤澶氭笭閬撳瓧娈点€佹棤鐩爣鍙椾紬                |
| 4   | 鏂囦欢涓婁紶鏍￠獙   | **FAIL**          | 鍥炶皟鏃犵鍚嶉獙璇?@Public)銆佹棤绫诲瀷/澶у皬闄愬埗銆丼TS 娉勯湶鐪熷疄 AK |
| 5   | 鏂囩珷鐗堟湰鎺у埗    | **WARN**          | 鏈?version 瀛楁浣嗘湭浣跨敤銆佹棤鍘嗗彶琛ㄣ€佹棤涔愯閿?                  |
