---
# API 瑙勮寖瀹℃煡鎶ュ憡

## 瀹℃煡鑼冨洿

鎵弿 24 涓?Controller 鏂囦欢锛岃鐩栫害 130+ 涓矾鐢辩鐐广€?
---

## 1. URL 灏忓啓澶嶆暟鍚嶈瘝 `/api/v1/resources`

### 鍚堣鎯呭喌: 18/24 Controller (75%)

| 鐘舵€? | Controller                 | 瀹為檯璺緞                           | 闂                                                                               |
| ------ | -------------------------- | ------------------------------------- | ---------------------------------------------------------------------------------- |
| 鉁?    | CustomerController         | `customers`                           | 鍚堣                                                                              |
| 鉁?    | OpportunityController      | `opportunities`                       | 鍚堣                                                                              |
| 鉁?    | CallRecordController       | `call-records`                        | 鍚堣                                                                              |
| 鉁?    | KnowledgeController        | `knowledge`                           | 鍚堣锛堝祵濂楄祫婧?articles/categories锛?                                         |
| 鉁?    | AuthController             | `auth`                                | 鍚堣锛堥潪璧勬簮锛屽姛鑳藉瀷锛?                                                   |
| 鉁?    | UserController             | `users`                               | 鍚堣                                                                              |
| 鉁?    | AuditLogController         | `audit-logs`                          | 鍚堣                                                                              |
| 鉁?    | HealthController           | `health`                              | 鍚堣                                                                              |
| 鉁?    | FollowUpController         | `follow-ups`                          | 鍚堣                                                                              |
| 鉁?    | SalesTargetController      | `sales-targets`                       | 鍚堣                                                                              |
| 鉁?    | CampaignController         | `campaigns`                           | 鍚堣                                                                              |
| 鉁?    | AnnouncementController     | `announcements`                       | 鍚堣                                                                              |
| 鉁?    | MaterialController         | `materials`                           | 鍚堣                                                                              |
| 鉁?    | RecordingController        | `recordings`                          | 鍚堣                                                                              |
| 鉁?    | AgentController            | `agents`                              | 鍚堣                                                                              |
| 鉁?    | AiController               | `ai`                                  | 鍚堣锛堝姛鑳藉瀷锛?                                                               |
| 鉁?    | RouteController            | `route`                               | 鍚堣锛堝崟鏁板彲鎺ュ彈鈥斺€斿姛鑳藉瀷锛?                                          |
| 鉁?    | CallController             | `call`                                | 鍚堣锛堝姛鑳藉瀷锛?                                                               |
| 鉂?    | **ContactController**      | `@Controller('api/v1')`               | **鎵嬪姩鍐欐 globalPrefix锛岃矾寰勫彉鎴?`/api/v1/api/v1/customers/:id/contacts`** |
| 鉂?    | **CustomerPoolController** | `@Controller('api/v1/customer-pool')` | **鍚屼笂锛屽弻閲嶅墠缂€闂**                                                      |
| 鉂?    | **CustomFieldController**  | `@Controller('api/v1/custom-fields')` | **鍚屼笂锛屽弻閲嶅墠缂€闂**                                                      |
| 鉂?    | **CustomerTagController**  | `@Controller('api/v1')`               | **鍚屼笂锛屽弻閲嶅墠缂€闂**                                                      |
| 鉂?    | **CallPopupController**    | `@Controller('call')`                 | 涓?CallController/CallCallbackController 鍚岃矾寰?`call`锛屾槗鍐茬獊               |
| 鉂?    | **CallCallbackController** | `@Controller('call')`                 | 鍚屼笂                                                                             |

### 涓嶅悎瑙勬竻鍗?

| #       | 鏂囦欢                                                                                    | 闂                                                                                                                  | 浼樺厛绾? |
| ------- | ----------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------- | --------- |
| **U-1** | `contact.controller.ts:26`                                                                | `@Controller('api/v1')` 鎵嬪姩鍐欐鍓嶇紑锛屼笌 `main.ts` 鐨?`setGlobalPrefix('api/v1')` **鍐茬獊瀵艰嚧鍙岄噸鍓嶇紑** | 馃敶 P0   |
| **U-2** | `customer-pool.controller.ts:30`                                                          | `@Controller('api/v1/customer-pool')` 鍚屼笂鍙岄噸鍓嶇紑                                                              | 馃敶 P0   |
| **U-3** | `custom-field.controller.ts:23`                                                           | `@Controller('api/v1/custom-fields')` 鍚屼笂鍙岄噸鍓嶇紑                                                              | 馃敶 P0   |
| **U-4** | `customer-tag.controller.ts:24`                                                           | `@Controller('api/v1')` 鍚屼笂鍙岄噸鍓嶇紑                                                                            | 馃敶 P0   |
| **U-5** | `call-popup.controller.ts:22` + `call-callback.controller.ts:9` + `call.controller.ts:21` | 涓変釜 Controller 閮界敤 `@Controller('call')`锛岃矾鐢卞墠缂€鍐茬獊                                                   | 馃煛 P1   |

---

## 2. HTTP 鏂规硶璇箟姝ｇ‘鎬?

### 鍚堣鎯呭喌: ~120/130 绔偣 (92%)

| #        | 鏂囦欢:琛?                     | 绔偣                                          | 闂                                                                            | 浼樺厛绾? |
| -------- | ------------------------------ | ---------------------------------------------- | ------------------------------------------------------------------------------- | --------- |
| **M-1**  | `ai.controller.ts:77-86`       | `PUT alerts/:id/acknowledge`                   | 鐘舵€佸彉鏇存搷浣滃簲鐢?`POST`锛堥潪骞傜瓑璇箟锛?                              | 馃煛 P2   |
| **M-2**  | `ai.controller.ts:89-97`       | `PUT alerts/:id/resolve`                       | 鍚屼笂                                                                          | 馃煛 P2   |
| **M-3**  | `call.controller.ts:44`        | `POST :callId/answer` 鈫?杩斿洖 `{ ok: true }` | 闈炴爣鍑嗗搷搴旀牸寮忥紙搴旇蛋 ResponseInterceptor锛?                           | 馃煛 P2   |
| **M-4**  | `call.controller.ts:50`        | `POST :callId/hangup` 鈫?`{ ok: true }`        | 鍚屼笂                                                                          | 馃煛 P2   |
| **M-5**  | `call.controller.ts:60-66`     | `POST :callId/mute/unmute/hold/resume`         | 鍚屼笂锛? 涓鐐硅繑鍥?`{ ok: true }`                                           | 馃煛 P2   |
| **M-6**  | `campaign.controller.ts:71-72` | `DELETE :id` 鈫?`{ ok: true }`                 | 闈炴爣鍑嗭紝鍏朵粬 Controller 杩斿洖 `null`                                     | 馃煛 P2   |
| **M-7**  | `agent.controller.ts:90`       | `throw new Error('Agent not found')`           | 搴旂敤 `NotFoundException`锛宍Error` 涓嶄細琚?`HttpExceptionFilter` 姝ｇ‘澶勭悊 | 馃敶 P1   |
| **M-8**  | `agent.controller.ts:104-108`  | `throw new Error(...)` 脳 2                    | 鍚屼笂                                                                          | 馃敶 P1   |
| **M-9**  | `campaign.controller.ts:37`    | `throw new Error('Unauthorized')`              | 鍚屼笂锛屽簲鐢?`UnauthorizedException`                                          | 馃敶 P1   |
| **M-10** | `recording.controller.ts:35`   | `throw new Error('Unauthorized')`              | 鍚屼笂                                                                          | 馃敶 P1   |

---

## 3. 鍝嶅簲鏍煎紡缁熶竴鎬?`{ code, message, data, timestamp }`

### 瀹℃煡缁撴灉

**鍏ㄥ眬鍩虹璁炬柦**锛?- 鉁?`ResponseInterceptor`锛氭垚鍔熸椂鍖呰涓?`{ code: 0, message: 'success', data }` 鈥?**缂哄皯 `timestamp`**

- 鉁?`HttpExceptionFilter`锛氶敊璇椂杩斿洖 `{ code, message, data: null, timestamp }` 鈥?**鏈?`timestamp`**

### 涓嶅悎瑙勬竻鍗?

| #       | 鏂囦欢:琛?                                 | 闂                                                                                                                                                                                                              | 浼樺厛绾? |
| ------- | ------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------- |
| **R-1** | `response.interceptor.ts:32-36`            | 鎴愬姛鍝嶅簲**缂哄皯 `timestamp`** 瀛楁                                                                                                                                                                          | 馃敶 P1   |
| **R-2** | `ai.controller.ts` 鍏ㄩ儴绔偣             | 鎵嬪姩杩斿洖 `{ code: 0, message, data }` 缁曡繃 ResponseInterceptor锛堣鎷︽埅鍣ㄨ瘑鍒负"宸插寘瑁?鑰岃烦杩囷級锛?\*缂哄皯 `timestamp`**锛涢敊璇篃鎵嬪姩杩斿洖 `{ code: 40401, ... }` **鑰岄潪 throw 寮傚父\*\* | 馃敶 P1   |
| **R-3** | `call.controller.ts:44,57,65,73,81,89,101` | 杩斿洖 `{ ok: true }` 涓嶈蛋鏍囧噯鏍煎紡                                                                                                                                                                          | 馃煛 P2   |
| **R-4** | `campaign.controller.ts:72,82,90,99,108`   | 杩斿洖 `{ ok: true }` 涓嶈蛋鏍囧噯鏍煎紡                                                                                                                                                                          | 馃煛 P2   |
| **R-5** | `agent.controller.ts:111`                  | 杩斿洖 `{ ok: true, status }` 涓嶈蛋鏍囧噯鏍煎紡                                                                                                                                                                  | 馃煛 P2   |
| **R-6** | `customer-tag.controller.ts:81`            | 杩斿洖 `{ message: '鎵归噺鎵撴爣瀹屾垚' }` 闈炴爣鍑?                                                                                                                                                              | 馃煛 P2   |
| **R-7** | `call-callback.controller.ts:20`           | `res.status(200).send('OK')` 缁曡繃鎷︽埅鍣紙鍥炶皟绔偣锛屽彲鎺ュ彈锛屼絾闇€璁板綍锛?                                                                                                                           | 鈿?P3     |

---

## 4. 鍒嗛〉鍙傛暟涓庡搷搴?

### 瀹℃煡鏍囧噯

- 鍙傛暟锛歚page`+`pageSize`锛宍pageSize` 鏈€澶?100
- 鍝嶅簲锛歚{ list, total, page, pageSize }`

### 鍚堣鎯呭喌

| **鏍稿績妯″潡锛堝畬鍏ㄥ悎瑙勶級**锛? | Controller             | DTO 楠岃瘉     | `@Max(100)`                          | 鍝嶅簲鏍煎紡 |
| ------------------------------------ | ---------------------- | -------------- | ------------------------------------ | ------------ |
| CustomerController                   | 鉁?QueryCustomerDto    | 鉁?            | 鉁?`{ list, total, page, pageSize }` |
| OpportunityController                | 鉁?QueryOpportunityDto | 鉁?            | 鉁咃紙Service 灞傝繑鍥烇級           |
| CallRecordController                 | 鉁?QueryCallRecordDto  | 鉁?            | 鉁咃紙Service 灞傝繑鍥烇級           |
| KnowledgeController articles         | 鉁?QueryArticleDto     | 鉁?            | 鉁?Controller 鍐呯粍瑁?              |
| FollowUpController                   | 鉁?QueryFollowUpDto    | 闇€妫€鏌?      | 鉁?Controller 鍐呯粍瑁?              |
| AuditLogController                   | 鉁?QueryAuditLogDto    | 鉂?**鏃?@Max** | 鉁咃紙Service 灞傝繑鍥烇級           |

### 涓嶅悎瑙勬竻鍗?

| #       | 鏂囦欢                                 | 闂                                                                                                                 | 浼樺厛绾? |
| ------- | -------------------------------------- | -------------------------------------------------------------------------------------------------------------------- | --------- |
| **P-1** | `audit-log/dto/query-audit-log.dto.ts` | `pageSize` **鏃?`@Max(100)` 闄愬埗**                                                                                 | 馃煛 P2   |
| **P-2** | `ai.controller.ts:58-74`               | `getAlerts()`/`getReports()`/`getCompetitorReports()` 鐢?`parseInt(pageSize)` \**鏃犳渶澶у€兼牎楠?*锛屾棤 DTO 楠岃瘉 | 馃煛 P1   |
| **P-3** | `ai.controller.ts:140-151`             | `getSalesForecasts()` 纭紪鐮?`take: 10`锛?_鏃犲垎椤靛弬鏁?_                                                         | 馃煛 P2   |
| **P-4** | `ai.controller.ts:221-237`             | `getIntentPredictions()` 鍚屼笂纭紪鐮?`take: 10`                                                                    | 馃煛 P2   |
| **P-5** | `knowledge.controller.ts:297-303`      | 璇勮鍒楄〃鐢?`parseInt(page)` 鑰岄潪 DTO锛?\*鏃?`@Max` 闄愬埗\*\*                                                   | 馃煛 P2   |
| **P-6** | `agent.controller.ts:38-65`            | `list()` 鏃犲垎椤碉紝**杩斿洖鍏ㄩ噺鏁版嵁**锛堝皬鏁版嵁閲忓彲鎺ュ彈锛屽ぇ鍥㈤槦鏈夐殣鎮ｏ級                          | 鈿?P3     |
| **P-7** | `agent.controller.ts:144-166`          | `statusLogs()` 纭紪鐮?`take: 100`锛屾棤鏍囧噯鍒嗛〉鍙傛暟                                                           | 鈿?P3     |
| **P-8** | `recording.controller.ts:29-43`        | 鐢?`ParseFloatPipe` 瑙ｆ瀽鍒嗛〉鍙傛暟锛堝簲涓?`ParseIntPipe`锛夛紝涓?_鏃犳渶澶у€兼牎楠?_                            | 馃煛 P2   |

### 澶ф暟鎹噺娓告爣鍒嗛〉

| #       | 鍦烘櫙                        | 鐜扮姸                                                               | 浼樺厛绾?                             |
| ------- | ----------------------------- | -------------------------------------------------------------------- | ------------------------------------- |
| **P-9** | `customer-pool` / `audit-log` | 楂樺闀挎暟鎹〃浠呯敤 offset 鍒嗛〉锛屾暟鎹噺澶ф椂 OFFSET 鎬ц兘宸? | 鈿?P3锛堝緟鏁版嵁閲忓闀垮悗璇勪及锛? |

---

## 5. 閿欒鐮佸垎娈?

### 瀹℃煡鏍囧噯

鎸?CLAUDE.md 绾﹀畾锛?0000/20000/30000/40000/50000/60000/90000 鎸夋ā鍧楀垎娈点€?

### 瀹為檯鎯呭喌

`HttpExceptionFilter` 浣跨敤 **HTTP 鐘舵€佺爜鏄犲皠**鑰岄潪妯″潡鍒嗘锛?

```
400 鈫?40001, 401 鈫?40101, 403 鈫?40301, 404 鈫?40401, 409 鈫?40901, 429 鈫?42901, 500 鈫?50001
```

### 涓嶅悎瑙勬竻鍗?

| #       | 闂                                                                                                                                                          | 浣嶇疆                                | 浼樺厛绾? |
| ------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------- | --------- |
| **E-1** | 閿欒鐮?**鏈寜妯″潡鍒嗘**锛坈ustomer=20000, opportunity=30000...锛夛紝鍏ㄩ儴澶嶇敤鍚屼竴缁勭姸鎬佺爜鏄犲皠                                                  | `http-exception.filter.ts:23-33`      | 馃煛 P2   |
| **E-2** | `AiController` 鎵嬪姩杩斿洖 `{ code: 40001/40401 }` **鍦?Controller 灞傜洿鎺ユ嫾閿欒鍝嶅簲**鑰岄潪 throw 寮傚父锛岀粫杩?HttpExceptionFilter                  | `ai.controller.ts:80,131,156,246,261` | 馃敶 P1   |
| **E-3** | `throw new Error(...)` 鍦?Agent/Campaign/Recording Controller 涓娇鐢ㄥ師鐢?Error 鑰岄潪 HttpException锛屽鑷?Filter 杩斿洖 500 閿欒鐮佽€岄潪姝ｇ‘鐨?401/404 | 瑙?M-7~M-10                           | 馃敶 P1   |

---

## 6. 寮傚父鍒嗙被澶勭悊锛堜笟鍔?绯荤粺/绗笁鏂癸級

### 鐜扮姸

- **涓氬姟寮傚父**锛氫娇鐢?NestJS 鍐呯疆 `BadRequestException`/`NotFoundException`/`ForbiddenException`/`ConflictException` 鈥?鉁?澶ч儴鍒嗘纭?- **绯荤粺寮傚父**锛歚HttpExceptionFilter`鐨?catch-all`@Catch()` 澶勭悊 鈥?鉁?鍚堣
- **绗笁鏂瑰紓甯?\*锛?
  | # | 鏂囦欢 | 闂 | 浼樺厛绾?|
  |---|---|---|---|
  | **X-1** | `auth.service.ts:272-376` | 寰俊 API 璋冪敤澶辫触鐩存帴 `throw new BadRequestException`锛?\*鏃犵涓夋柟閿欒灏佽/閲嶈瘯** | 馃煛 P2 |
  | **X-2** | `ai-fallback.service.ts` | AI 闄嶇骇鏈嶅姟瀛樺湪浣?AI Controller 鏈粺涓€寮傚父澶勭悊 | 鈿?P3 |
  | **X-3** | 鍏ㄥ眬 | \*_缂哄皯缁熶竴鐨勪笟鍔″紓甯稿熀绫?_ `BusinessException(code, message)` 鏉ユ浛浠?NestJS 閫氱敤寮傚父 | 馃煛 P2 |

---

## 7. 鍏朵粬鍙戠幇

| #       | 鏂囦欢                                                                                                                | 闂                                                                                                                    | 浼樺厛绾? |
| ------- | --------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------- | --------- |
| **O-1** | `user.controller.ts:83`                                                                                               | `remove()` 鏂规硶 **鏈姞 `@HttpCode(HttpStatus.OK)`**锛圖ELETE 榛樿杩斿洖 200 浣嗕笉瑙勮寖锛?                         | 鈿?P3     |
| **O-2** | `announcement.controller.ts:79-86`                                                                                    | DELETE 鏂规硶 **鏈姞 `@HttpCode(HttpStatus.OK)`**                                                                      | 鈿?P3     |
| **O-3** | `campaign.controller.ts:24-25`                                                                                        | `@UseGuards(JwtAuthGuard)` 绫荤骇鍒彧鏈?JWT 鏃?RolesGuard锛岄儴鍒嗘柟娉曞崟鐙姞 `@UseGuards(RolesGuard)` 鈥?涓嶄竴鑷? | 馃煛 P2   |
| **O-4** | `announcement.controller.ts:25`                                                                                       | 鍚屼笂锛岀被绾у埆鏃?RolesGuard                                                                                          | 馃煛 P2   |
| **O-5** | `material.controller.ts`                                                                                              | 鏃?RolesGuard 绫荤骇鍒粦瀹氾紝DELETE 鏃犳潈闄愰檺鍒?                                                                   | 馃煛 P2   |
| **O-6** | `ai.controller.ts`                                                                                                    | 鏃?`@ApiTags`/`@ApiBearerAuth` Swagger 瑁呴グ鍣?                                                                        | 鈿?P3     |
| **O-7** | `customer-pool.controller.ts` + `contact.controller.ts` + `custom-field.controller.ts` + `customer-tag.controller.ts` | 鏃?Swagger `@ApiTags`/`@ApiBearerAuth` 瑁呴グ鍣?                                                                        | 鈿?P3     |

---

## 鍚堣鐜囩粺璁?

| 瀹℃煡椤?              | 鍚堣鐜?                 | 涓嶅悎瑙勬暟 |
| --------------------- | ------------------------ | ------------ |
| 1. URL 瑙勮寖         | 75% (18/24)              | 6            |
| 2. HTTP 鏂规硶璇箟   | 92% (~120/130)           | 10           |
| 3. 鍝嶅簲鏍煎紡缁熶竴 | 73% (~19/26 妯″潡)       | 7            |
| 4. 鍒嗛〉鍙傛暟缁熶竴 | 67% (8/12 鍒嗛〉绔偣缁? | 9            |
| 5. 閿欒鐮佸垎娈?     | 0%                       | 3            |
| 6. 寮傚父鍒嗙被       | 80%                      | 3            |
| \*_缁煎悎鍚堣鐜?_    | **~72%**                 | \*_38 椤?_   |

---

## 淇浼樺厛绾ф帓搴?

### 馃敶 P0 鈥?鍔熻兘鎬?Bug锛堢珛鍗充慨澶嶏級

| #       | 鎻忚堪                                                                                          |
| ------- | ----------------------------------------------------------------------------------------------- |
| U-1~U-4 | 4 涓?Controller 鎵嬪姩鍐欐 `api/v1` 鍓嶇紑瀵艰嚧**鍙岄噸鍓嶇紑 bug**锛坄/api/v1/api/v1/...`锛? |

### 馃敶 P1 鈥?涓ラ噸瑙勮寖杩濊

| #        | 鎻忚堪                                                                 |
| -------- | ---------------------------------------------------------------------- |
| R-1      | ResponseInterceptor 鎴愬姛鍝嶅簲缂哄皯 `timestamp`                     |
| R-2      | AiController 鎵嬪姩鎷煎搷搴旂粫杩囨嫤鎴櫒                             |
| E-2      | AiController 鎵嬪姩杩斿洖閿欒鐮佽€岄潪 throw 寮傚父                   |
| M-7~M-10 | Agent/Campaign/Recording 浣跨敤 `throw new Error` 鑰岄潪 HttpException |
| P-2      | AiController 鍒嗛〉鏃?DTO 楠岃瘉鏃?max 闄愬埗                          |
| U-5      | 涓変釜 call Controller 璺緞鍐茬獊                                     |

### 馃煛 P2 鈥?瑙勮寖涓嶄竴鑷?| # | 鎻忚堪 |

|---|---|
| M-1~M-2 | AI alerts acknowledge/resolve 搴旂敤 POST 鑰岄潪 PUT |
| M-3~M-6, R-3~R-6 | `{ ok: true }` / 闈炴爣鍑嗗搷搴旀牸寮?|
| P-1, P-5, P-8 | 鍒嗛〉缂哄皯 `@Max(100)` 鎴栫敤閿?Pipe |
| P-3, P-4 | 纭紪鐮?take 鏃犳爣鍑嗗垎椤?|
| E-1 | 閿欒鐮佹湭鎸夋ā鍧楀垎娈?|
| X-1, X-3 | 绗笁鏂瑰紓甯告棤灏佽锛岀己灏?BusinessException 鍩虹被 |
| O-3~O-5 | Guards 浣跨敤涓嶄竴鑷?|

### 鈿?P3 鈥?浣庝紭鍏堢骇鏀瑰杽

| #                | 鎻忚堪                                          |
| ---------------- | ----------------------------------------------- |
| O-1~O-2, O-6~O-7 | 缂哄皯瑁呴グ鍣?Swagger 鏍囨敞                   |
| P-6~P-7, P-9     | 灏忔暟鎹噺鍏ㄩ噺杩斿洖锛屾父鏍囧垎椤靛緟璇勪及 |
| R-7, X-2         | 鍥炶皟绔偣/AI 闄嶇骇                           |
