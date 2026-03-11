---
# NestJS 鍚庣閫愬眰瀹℃煡鎶ュ憡

瀹℃煡浜?24 涓?Controller銆?3 涓?Service銆?4 涓?Entity銆?9 涓?common/ 鍩虹璁炬柦鏂囦欢锛屼互鍙?9 涓?Bull Processor銆?
---

## 涓€銆丆ontroller 灞?

### 1. DTO + ValidationPipe 鏍￠獙

| 椤?                                                                                                              | 缁撹                                                                                                               | 瀹氫綅                                                                        |
| ---------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------- |
| **鍏ㄥ眬 ValidationPipe**                                                                                        | **PASS**                                                                                                            | `main.ts:56-66` 鈥?`whitelist + transform + forbidNonWhitelisted` 閰嶇疆瀹屽 |
| CustomerController.importCsv                                                                                     | **WARN** 鈥?`body` 鍙傛暟涓鸿８ `{ rows, mapping, fileName? }`锛屾湭瀹氫箟 DTO class锛宑lass-validator 鏃犳硶鏍￠獙 | `customer.controller.ts:102-103`                                              |
| CustomerController.previewMerge / executeMerge                                                                   | **WARN** 鈥?鍚屼笂锛岃８ `{ primaryId, secondaryId }` 鏃?DTO                                                        | `customer.controller.ts:145,152`                                              |
| CustomerTagController.addTags                                                                                    | **WARN** 鈥?`body: { tagIds: number[] }` 鏃?DTO 楠岃瘉                                                              | `customer-tag.controller.ts:59`                                               |
| AgentController.setStatus                                                                                        | **WARN** 鈥?`body: { status: string }` 鏃?DTO锛屼笖鐢?`throw new Error()` 鑰岄潪 NestJS 寮傚父                      | `agent.controller.ts:100`                                                     |
| CampaignController.create                                                                                        | **WARN** 鈥?`body: { name, customerIds? }` 鏃?DTO                                                                   | `campaign.controller.ts:45`                                                   |
| CallController.hangup/transfer                                                                                   | **WARN** 鈥?瑁?body 鏃?DTO                                                                                          | `call.controller.ts:53,98`                                                    |
| CallPopupController.updatePopupConfig                                                                            | **WARN** 鈥?瑁?body 鏃?DTO                                                                                          | `call-popup.controller.ts:76`                                                 |
| **鍏朵綑鏍稿績 Controller** (customer, opportunity, knowledge, call-record, follow-up, user, auth, sales-target) | **PASS** 鈥?鍧囦娇鐢ㄤ簡涓撶敤 DTO 绫?                                                                              | 鈥?                                                                           |

### 2. Controller 浠呭仛璇锋眰鍒嗗彂锛堟棤涓氬姟閫昏緫锛?

| 椤?                                 | 缁撹                                                                                                                                                                    | 瀹氫綅                            |
| ----------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | --------------------------------- |
| FollowUpController.findAll          | **WARN** 鈥?`if (!query.customerId)` 鏍￠獙灞炰簬鍙傛暟楠岃瘉閫昏緫锛屽簲绉诲叆 DTO 鎴?Service                                                                           | `follow-up.controller.ts:46-48`   |
| CustomerController.importCsv        | **WARN** 鈥?琛屾暟鏍￠獙銆乵apping 鏍￠獙銆両mportLog 鍒涘缓鍜?Bull 鍏ラ槦鍏ㄥ湪 Controller 閲岋紙~25 琛屼笟鍔￠€昏緫锛?                                                 | `customer.controller.ts:106-133`  |
| AiController锛堝叏閮ㄦ柟娉曪級      | **FAIL** 鈥?鐩存帴娉ㄥ叆 6 涓?Repository + 5 涓?Bull Queue锛屽湪 Controller 鍐呮墽琛?DB 鏌ヨ銆乣createQueryBuilder`銆佹墜鍔ㄦ瀯閫犲搷搴旀牸寮?`{ code, message, data }` | `ai.controller.ts:30-276`         |
| AgentController.list/getOne         | **WARN** 鈥?鐩存帴鍦?Controller 鐢?`createQueryBuilder` 鍜?`Promise.all` 鍋氫笟鍔¤仛鍚?                                                                                  | `agent.controller.ts:47-64,86-93` |
| KnowledgeController.findAllArticles | **WARN** 鈥?Controller 鍐呮湁鍒嗛〉鍖呰鍜屾悳绱㈠巻鍙叉帹閫佺殑鏃佽矾閫昏緫                                                                                             | `knowledge.controller.ts:57-67`   |
| KnowledgeController.getComments     | **WARN** 鈥?鎵嬪姩 parseInt 鍒嗛〉鍙傛暟锛屽簲閫氳繃 DTO + transform 澶勭悊                                                                                              | `knowledge.controller.ts:299-302` |
| **鍏朵綑 Controller**               | **PASS** 鈥?绾补鍋?Service 濮旀墭                                                                                                                                       | 鈥?                               |

### 3. UseGuards(JwtAuthGuard, RolesGuard) 姝ｇ‘搴旂敤

| 椤?                                                                                                                  | 缁撹                                                                                   | 瀹氫綅                                |
| -------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------- | ------------------------------------- |
| 鏍稿績涓氬姟 Controller锛坈ustomer, opportunity, call-record, follow-up, knowledge, user, audit-log, sales-target锛? | **PASS** 鈥?绫荤骇鍒?`@UseGuards(JwtAuthGuard, RolesGuard)`                             | 鈥?                                   |
| ContactController                                                                                                    | **PASS** 鈥?绫荤骇鍒簲鐢?                                                              | `contact.controller.ts:27`            |
| CustomerPoolController                                                                                               | **PASS**                                                                                | `customer-pool.controller.ts:31`      |
| CustomerTagController                                                                                                | **PASS**                                                                                | `customer-tag.controller.ts:25`       |
| CustomFieldController                                                                                                | **PASS**                                                                                | `custom-field.controller.ts:24`       |
| RouteController                                                                                                      | **WARN** 鈥?浠?`@UseGuards(JwtAuthGuard)`锛岀己灏?`RolesGuard`                          | `route.controller.ts:9`               |
| RecordingController                                                                                                  | **WARN** 鈥?浠?`@UseGuards(JwtAuthGuard)`锛岀己灏?`RolesGuard`                          | `recording.controller.ts:19`          |
| AgentController                                                                                                      | **WARN** 鈥?绫荤骇鍒粎 `JwtAuthGuard`锛宍RolesGuard`浠呭湪`assignCall` 鏂规硶灞€閮ㄥ姞 | `agent.controller.ts:26,132`          |
| AnnouncementController                                                                                               | **WARN** 鈥?绫荤骇鍒粎 `JwtAuthGuard`锛宍RolesGuard` 灞€閮ㄥ姞鍦ㄥ啓鎿嶄綔鏂规硶       | `announcement.controller.ts:25,51-52` |
| CampaignController                                                                                                   | **WARN** 鈥?鍚屼笂妯″紡                                                                 | `campaign.controller.ts:24,43`        |
| CallController                                                                                                       | **WARN** 鈥?浠?`JwtAuthGuard`锛屾棤 `RolesGuard`                                        | `call.controller.ts:20`               |
| CallPopupController                                                                                                  | **WARN** 鈥?浠?`JwtAuthGuard`                                                           | `call-popup.controller.ts:20`         |
| MaterialController                                                                                                   | **WARN** 鈥?浠?`JwtAuthGuard`锛屾棤瑙掕壊鏉冮檺淇濇姢鍐欐搷浣?                          | `material.controller.ts:24`           |
| HealthController                                                                                                     | **PASS** 鈥?鍏紑绔偣锛屾棤闇€閴存潈                                                   | 鈥?                                   |
| AuthController                                                                                                       | **PASS** 鈥?鐧诲綍绛夊叕寮€绔偣涓嶉渶瑕侊紝profile/logout 鏂规硶绾?JwtAuthGuard        | 鈥?                                   |

### 4. Swagger 瑁呴グ鍣ㄥ畬鏁存€?

| 椤?                                                                                | 缁撹                                                                                     | 瀹氫綅                        |
| ---------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------- | ----------------------------- |
| customer, opportunity, call-record, knowledge, auth, user, audit-log, sales-target | **PASS** 鈥?`@ApiTags + @ApiBearerAuth + @ApiOperation + @ApiResponse + @ApiParam` 榻愬叏 | 鈥?                           |
| ContactController                                                                  | **FAIL** 鈥?瀹屽叏缂哄皯 `@ApiTags`, `@ApiBearerAuth`, `@ApiOperation`, `@ApiResponse`    | `contact.controller.ts`       |
| CustomerPoolController                                                             | **FAIL** 鈥?瀹屽叏缂哄皯 Swagger 瑁呴グ鍣?                                                | `customer-pool.controller.ts` |
| CustomerTagController                                                              | **FAIL** 鈥?瀹屽叏缂哄皯 Swagger 瑁呴グ鍣?                                                | `customer-tag.controller.ts`  |
| CustomFieldController                                                              | **FAIL** 鈥?瀹屽叏缂哄皯 Swagger 瑁呴グ鍣?                                                | `custom-field.controller.ts`  |
| MaterialController                                                                 | **WARN** 鈥?缂哄皯 `@ApiResponse`                                                         | `material.controller.ts`      |
| AgentController                                                                    | **WARN** 鈥?鏈?`@ApiTags/@ApiOperation` 浣嗙己灏?`@ApiResponse`                           | `agent.controller.ts`         |
| CampaignController                                                                 | **WARN** 鈥?鏈?`@ApiTags/@ApiOperation` 浣嗗ぇ閮ㄥ垎缂?`@ApiResponse`                     | `campaign.controller.ts`      |

### 5. ResponseInterceptor 缁熶竴鏍煎紡鍖?

| 椤?                        | 缁撹                                                                                                                                               | 瀹氫綅                             |
| -------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------- |
| 鍏ㄥ眬 ResponseInterceptor | **PASS** 鈥?`main.ts:76` 鍏ㄥ眬娉ㄥ唽锛岃嚜鍔ㄥ寘瑁?`{ code: 0, message: 'success', data }`                                                         | 鈥?                                |
| AiController               | **FAIL** 鈥?鎵嬪姩鏋勯€?`{ code, message, data }` 鏍煎紡锛屽鑷磋 ResponseInterceptor **浜屾鍖呰**鎴?`{ code: 0, data: { code: 0, data: ... } }` | `ai.controller.ts:74,85,96,120...` |

---

## 浜屻€丼ervice 灞?

### 6. 浜嬪姟杈圭晫鍦?Service 灞?

| 椤?                                  | 缁撹                                                                                                                | 瀹氫綅                               |
| ------------------------------------ | -------------------------------------------------------------------------------------------------------------------- | ------------------------------------ |
| OpportunityService.updateStage       | **WARN** 鈥?鍖呭惈闃舵鏇存柊 + stageLog 鍒涘缓涓ゆ鍐欐搷浣滐紝浣?*鏃犱簨鍔″寘瑁?*锛屼腑闂村け璐ヤ細鏁版嵁涓嶄竴鑷? | `opportunity.service.ts:137-181`     |
| CustomerService.importFromCsvRows    | **WARN** 鈥?鎵归噺 save 鏃犱簨鍔?                                                                                    | `customer.service.ts:392-396`        |
| CustomerImportProcessor.handleImport | **WARN** 鈥?閫愯 create 鏃犳壒閲忎簨鍔?                                                                             | `customer-import.processor.ts:41-52` |
| **鍏朵綑 Service**                   | **PASS** 鈥?鍗曡〃鎿嶄綔鏃犻渶浜嬪姟                                                                                 | 鈥?                                  |

### 7. 璧勬簮绾ф巿鏉冨湪 Service 瀹炵幇

| 椤?                  | 缁撹                                                                                                       | 瀹氫綅                           |
| -------------------- | ----------------------------------------------------------------------------------------------------------- | -------------------------------- |
| CustomerService      | **PASS** 鈥?`applyDataPermission()` + `checkOwnership()`                                                    | `customer.service.ts:449-460`    |
| OpportunityService   | **PASS** 鈥?鍚屼笂妯″紡                                                                                     | `opportunity.service.ts:270-281` |
| CallRecordService    | **PASS**锛堟寜鍐呭瓨娉ㄩ噴锛屽悓妯″紡锛?                                                                    | 鈥?                              |
| FollowUpService      | **PASS** 鈥?鏈?user 鍙傛暟涓嬫斁                                                                            | 鈥?                              |
| KnowledgeService     | **PASS** 鈥?鍏叡鐭ヨ瘑搴撴棤闇€鎵€鏈夋潈闄愬埗                                                             | 鈥?                              |
| AiController 鏌ヨ   | **FAIL** 鈥?鐩存帴 `findAndCount({ where })` \**鏃犳暟鎹潈闄愯繃婊?*锛孲ALES 鐢ㄦ埛鍙湅鍒版墍鏈?AI 鏁版嵁 | `ai.controller.ts:55-75,100-121` |
| AgentController.list | **PASS** 鈥?SALES 鐢ㄦ埛杩囨护 `u.id = :uid`                                                                | `agent.controller.ts:51-53`      |

### 8. 璺ㄦā鍧楄皟鐢ㄩ€氳繃浜嬩欢瑙ｈ€?

| 椤?                     | 缁撹                                                                                                                                                                     | 瀹氫綅                               |
| ----------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------ |
| 閫氱煡鍙戦€?            | **WARN** 鈥?Controller 鐩存帴娉ㄥ叆 `NotificationService` 鍋氬悓姝ヨ皟鐢紙濡?`customer.controller.ts:161`锛夛紝闈炰簨浠堕┍鍔ㄤ絾浣跨敤 fire-and-forget 妯″紡锛屽彲鎺ュ彈 | 鈥?                                  |
| CustomerImportProcessor | **WARN** 鈥?鐩存帴娉ㄥ叆 `CustomerService` + `NotificationService`锛岃法妯″潡绱ц€﹀悎                                                                                     | `customer-import.processor.ts:25-26` |
| AiController            | **FAIL** 鈥?娉ㄥ叆 6 涓?Repository 璺ㄥ涓ā鍧楃洿鎺ユ搷浣滄暟鎹簱                                                                                                       | `ai.controller.ts:32-46`             |
| **鍏朵綑妯″潡**         | **PASS** 鈥?妯″潡闂撮€氳繃 Module.imports 澹版槑渚濊禆鍏崇郴                                                                                                              | 鈥?                                  |

---

## 涓夈€侀鍩熷眰

### 9. Entity 灏佽涓氬姟瑙勫垯 (Rich Domain Model)

| 椤?          | 缁撹                                                                                                                                                                                                | 瀹氫綅                                            |
| ------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------- |
| 鎵€鏈?Entity | **WARN** 鈥?鍏ㄩ儴涓?**璐妯″瀷 (Anemic Domain Model)**锛孍ntity 浠呭畾涔夊垪锛屼笟鍔¤鍒欏叏鍦?Service 灞傘€備緥濡傚鎴风姸鎬佹満鍦?`CustomerService.validateStatusTransition()` 鑰岄潪 Entity 鍐? | `customer.entity.ts`, `opportunity.entity.ts` 绛? |

> 娉細璐妯″瀷鍦?NestJS + TypeORM 鐢熸€佷腑鏄?\*涓绘祦妯″紡\*\*锛岄潪缁濆閿欒銆備絾瀹℃煡娓呭崟瑕佹眰鐨?Rich Domain Model 涓嶆弧瓒炽€?

### 10. Value Object 涓嶅彲鍙?

| 椤?     | 缁撹                                                                                                   | 瀹氫綅 |
| ------- | ------------------------------------------------------------------------------------------------------- | ------ |
| **N/A** | 椤圭洰涓棤鐙珛 Value Object 绫诲畾涔夈€傛灇涓鹃€氳繃 `@crm/shared` 瀹氫箟锛屽彲瑙嗕负 VO 鏇夸唬鍝併€? | 鈥?    |

---

## 鍥涖€佸熀纭€璁炬柦灞?

### 11. TypeORM Entity 涓?Domain Entity 鍒嗙

| 椤?             | 缁撹                                                                                                                | 瀹氫綅 |
| --------------- | -------------------------------------------------------------------------------------------------------------------- | ------ |
| \*_鎵€鏈夋ā鍧?_ | **WARN** 鈥?TypeORM Entity \**鍗?*棰嗗煙瀹炰綋锛屾棤鍒嗙灞傘€俁epository 妯″紡鐩存帴杩斿洖 ORM Entity 鑷?Controller | 鈥?    |

### 12. 澶栭儴 API 閫氳繃閫傞厤鍣ㄥ皝瑁?

| 椤?                                    | 缁撹                                                        | 瀹氫綅                                              |
| -------------------------------------- | ------------------------------------------------------------ | --------------------------------------------------- |
| AiService / ClaudeService              | **PASS** 鈥?DashScope/Claude 璋冪敤灏佽鍦ㄧ嫭绔?Service 涓? | `ai.service.ts`, `claude.service.ts`                |
| OssUploadService / OssRecordingService | **PASS** 鈥?OSS 鎿嶄綔灏佽鍦ㄩ€傞厤鍣?Service               | `oss-upload.service.ts`, `oss-recording.service.ts` |
| CallService                            | **PASS** 鈥?澶栧懠 API 閫氳繃 Service 灏佽                  | `call.service.ts`                                   |

### 13. 杩炴帴姹犻厤缃悎鐞?

| 椤?             | 缁撹                                                                                                                                     | 瀹氫綅                     |
| --------------- | ----------------------------------------------------------------------------------------------------------------------------------------- | -------------------------- |
| MySQL 杩炴帴姹? | **WARN** 鈥?`connectionLimit: 10` 鍋忓皬锛岀敓浜х幆澧冨缓璁?20-50锛涙棤 `acquireTimeout`銆乣connectTimeout`銆乣waitForConnections` 閰嶇疆 | `database.config.ts:16-18` |
| Redis 杩炴帴姹? | **WARN** 鈥?Bull + Redis 鍧囦娇鐢ㄩ粯璁よ繛鎺ワ紝鏃犺繛鎺ユ睜澶у皬閰嶇疆                                                                  | `app.module.ts:62-71`      |

---

## 浜斻€佷腑闂翠欢閾?

### 14. 寮傚父杩囨护鍣ㄩ摼灞傜骇姝ｇ‘

| 椤?                 | 缁撹                                                                                  | 瀹氫綅                        |
| ------------------- | -------------------------------------------------------------------------------------- | ----------------------------- |
| HttpExceptionFilter | **PASS** 鈥?浣跨敤 `@Catch()` 鎹曡幏鎵€鏈夊紓甯革紙鍚潪 HTTP锛夛紝姝ｇ‘鏄犲皠閿欒鐮? | `http-exception.filter.ts:42` |
| 鍏ㄥ眬娉ㄥ唽        | **PASS** 鈥?`main.ts:69` `useGlobalFilters`                                            | 鈥?                           |

### 15. 缁熶竴閿欒鍝嶅簲鏍煎紡

| 椤?                                        | 缁撹                                                                                                                                                     | 瀹氫綅                           |
| ------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------- |
| HttpExceptionFilter                        | **PASS** 鈥?杈撳嚭 `{ code, message, data: null, timestamp }` 鏍煎紡                                                                                      | `http-exception.filter.ts:88-94` |
| AgentController                            | **FAIL** 鈥?鐢?`throw new Error('...')` 鑰岄潪 NestJS 鍐呯疆寮傚父锛屽鑷?Error 琚?filter 鎹曡幏浣嗘棤娉曡繑鍥炶涔夊寲 HTTP 鐘舵€佺爜锛堝叏閮ㄥ彉 500锛? | `agent.controller.ts:90,105,139` |
| RecordingController                        | **FAIL** 鈥?鍚屼笂 `throw new Error('Unauthorized')`                                                                                                      | `recording.controller.ts:35,60`  |
| AiController.acknowledgeAlert/resolveAlert | **FAIL** 鈥?鎵嬪姩杩斿洖 `{ code: 40401, message }` 鑰岄潪鎶?`NotFoundException`锛岀粫杩囧紓甯歌繃婊ゅ櫒閾?                                               | `ai.controller.ts:80-81,91-92`   |

### 16. traceId 寮傛浼犻€?

| 椤?           | 缁撹                                                                                                                                                                                            | 瀹氫綅                                        |
| ------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------- |
| \*_鍏ㄩ」鐩?_ | **FAIL** 鈥?鏃?`AsyncLocalStorage` / `cls-hooked` / 璇锋眰绾?correlationId 瀹炵幇銆侺oggingInterceptor 浠呰褰?`method + url + elapsed`锛屾棤 traceId銆俉inston 鏃ュ織鏃?requestId/traceId 瀛楁 | `logging.interceptor.ts`, `winston.config.ts` |

### 17. 鏁忔劅瀛楁鏃ュ織鑴辨晱

| 椤?                     | 缁撹                                                                                                                                                    | 瀹氫綅                          |
| ----------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------- |
| DataMaskInterceptor     | **PASS** 鈥?鍝嶅簲鏁版嵁涓?`phone/email/idCard/bankCard` 绛夊瓧娈佃嚜鍔ㄨ劚鏁?                                                                           | `data-mask.interceptor.ts:8-25` |
| 鏃ュ織灞傝劚鏁?         | **WARN** 鈥?LoggingInterceptor 涓嶈褰?body锛岄闄╄緝浣庛€備絾 Winston 鏃ュ織涓湭瀵?password 绛夊瓧娈靛仛鑴辨晱锛堝鏋?error stack 鍖呭惈鏁忔劅淇℃伅锛? | `logging.interceptor.ts:22-25`  |
| 鏁版嵁搴撳瘑鐮佺‖缂栫爜 | **WARN** 鈥?`database.config.ts:8` 榛樿瀵嗙爜 `crm_password_123` 纭紪鐮佸湪婧愮爜涓紙铏介€氳繃 env 瑕嗙洊锛屼絾榛樿鍊间笉搴斿惈瀵嗙爜锛?             | `database.config.ts:8`          |

---

## 鍏€丅ull Queue

### 18. 闃熷垪鍒掑垎鍜岄厤缃‘璁?

| 椤?            | 缁撹                                                                                                                                                                              | 瀹氫綅                                    |
| -------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------- |
| 闃熷垪鍒楄〃   | **PASS** 鈥?鍚堢悊鎸夊姛鑳藉垝鍒嗭細`customer-import`, `call-summary`, `embedding`, `customer-profile`, `intent-prediction`, `anomaly-detect`, `report-generate`, `sales-forecast` | `app.module.ts:61-71`, 鍚?processor       |
| 鍏ㄥ眬閰嶇疆   | **PASS** 鈥?BullModule.forRootAsync 浠?ConfigService 璇诲彇 Redis 閰嶇疆                                                                                                           | `app.module.ts:61-71`                     |
| 闃熷垪绾ч厤缃? | **WARN** 鈥?鍚勯槦鍒楁湭閰嶇疆 `defaultJobOptions`锛堟棤 `attempts`銆乣backoff`銆乣removeOnComplete`銆乣removeOnFail` 绛夛級                                                       | 鍚?module 鐨?`BullModule.registerQueue()` |

### 19. 澶辫触鍛婅鏈哄埗

| 椤?                     | 缁撹                                                                                                                                                                | 瀹氫綅                            |
| ----------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------- |
| CustomerImportProcessor | **WARN** 鈥?鏃?`@OnQueueFailed` 澶勭悊鍣紙铏藉０鏄庝簡 `@OnQueueCompleted` 瀵煎叆浣嗘湭浣跨敤锛夛紝import 澶辫触浠呰 try-catch 璁板綍鍒?ImportLog锛屾棤鍛婅閫氱煡 | `customer-import.processor.ts:18` |
| 鍏朵綑 Processor        | **FAIL** 鈥?鎵€鏈?AI Processor 鍧囨棤 `@OnQueueFailed` 鐩戝惉鍣紝Bull job 澶辫触鍚庨潤榛樹涪澶?                                                                     | `anomaly-detect.processor.ts` 绛? |

---

## 缁煎悎璇勫垎姹囨€?

| 瀹℃煡椤?                            | 鐘舵€?                                                    | 涓ラ噸搴? |
| ----------------------------------- | --------------------------------------------------------- | --------- |
| 1. DTO + ValidationPipe             | **WARN** 鈥?7 澶勮８ body 缂?DTO                          | Medium    |
| 2. Controller 鏃犱笟鍔￠€昏緫       | **FAIL** 鈥?AiController 涓ラ噸杩濆弽锛? 澶?WARN          | High      |
| 3. UseGuards 姝ｇ‘搴旂敤            | **WARN** 鈥?8 涓?Controller 缂?RolesGuard                 | Medium    |
| 4. Swagger 瀹屾暣                   | **FAIL** 鈥?4 涓?Controller 瀹屽叏缂哄け                  | Medium    |
| 5. ResponseInterceptor 缁熶竴鏍煎紡 | **FAIL** 鈥?AiController 鎵嬪姩鍖呰瀵艰嚧鍙岄噸宓屽     | High      |
| 6. 浜嬪姟杈圭晫鍦?Service           | **WARN** 鈥?`updateStage` 澶氭鍐欐棤浜嬪姟               | High      |
| 7. 璧勬簮绾ф巿鏉冨湪 Service        | **FAIL** 鈥?AiController 鏃犳暟鎹潈闄愯繃婊?             | High      |
| 8. 璺ㄦā鍧椾簨浠惰В鑰?              | **WARN** 鈥?鐩存帴娉ㄥ叆涓轰富锛屽彲鎺ュ彈                | Low       |
| 9. Rich Domain Model                | **WARN** 鈥?鍏ㄨ传琛€妯″瀷锛圢estJS 涓绘祦锛?             | Low       |
| 10. Value Object 涓嶅彲鍙?          | **N/A**                                                   | 鈥?       |
| 11. ORM Entity 涓?Domain 鍒嗙      | **WARN** 鈥?鏈垎绂伙紙NestJS 涓绘祦锛?                   | Low       |
| 12. 澶栭儴 API 閫傞厤鍣ㄥ皝瑁?      | **PASS**                                                  | 鈥?       |
| 13. 杩炴帴姹犻厤缃?                 | **WARN** 鈥?MySQL 10 鍋忓皬锛孯edis 鏃犻厤缃?             | Medium    |
| 14. 寮傚父杩囨护鍣ㄩ摼              | **PASS**                                                  | 鈥?       |
| 15. 缁熶竴閿欒鍝嶅簲               | **FAIL** 鈥?`throw new Error` + 鎵嬪姩 code 缁曡繃 filter | High      |
| 16. traceId 寮傛浼犻€?             | **FAIL** 鈥?瀹屽叏缂哄け                                  | High      |
| 17. 鏁忔劅瀛楁鑴辨晱               | **WARN** 鈥?鍝嶅簲鑴辨晱 OK锛孌B 瀵嗙爜纭紪鐮?           | Medium    |
| 18. Bull 闃熷垪閰嶇疆               | **WARN** 鈥?缂?defaultJobOptions                          | Medium    |
| 19. Bull 澶辫触鍛婅                | **FAIL** 鈥?鎵€鏈夐槦鍒楁棤 @OnQueueFailed                | High      |

---

## 浼樺厛淇寤鸿锛堟寜涓ラ噸搴︽帓搴忥級

1. **AiController 閲嶆瀯** 鈥?鎶藉彇 Service 灞傦紝绉婚櫎 Controller 鍐?Repository 娉ㄥ叆鍜?DB 鏌ヨ锛涘仠姝㈡墜鍔ㄦ瀯閫?`{ code, message, data }`
2. **traceId 瀹炵幇** 鈥?寮曞叆 `cls-hooked` 鎴?NestJS `AsyncLocalStorage`锛屽湪 LoggingInterceptor 鐢熸垚骞舵敞鍏?requestId
3. **Bull 澶辫触澶勭悊** 鈥?鎵€鏈?Processor 娣诲姞 `@OnQueueFailed` + 鍛婅閫氱煡
4. **浜嬪姟鍖呰９** 鈥?`OpportunityService.updateStage` 浣跨敤 `QueryRunner` 浜嬪姟
5. **缁熶竴寮傚父** 鈥?灏?`throw new Error()` 鏇挎崲涓?`NotFoundException`/`ForbiddenException`/`BadRequestException`
6. **琛ュ厖 DTO** 鈥?涓?7 澶勮８ body 鍙傛暟鍒涘缓 DTO class
7. **琛ュ厖 Swagger** 鈥?ContactController銆丆ustomerPoolController銆丆ustomerTagController銆丆ustomFieldController
8. **RolesGuard 缁熶竴** 鈥?8 涓?Controller 琛ュ厖绫荤骇鍒?`@UseGuards(RolesGuard)`
9. **杩炴帴姹犺皟浼?\* 鈥?MySQL `connectionLimit` 鎻愯嚦 20-50锛屽鍔犺秴鏃堕厤缃?10. **绉婚櫎纭紪鐮佸瘑鐮?\* 鈥?`database.config.ts` 榛樿瀵嗙爜鏀逛负绌哄瓧绗︿覆
