# API 瀹夊叏瀹℃煡鎶ュ憡

## 鍏辨壂鎻?**24 涓?Controller 鏂囦欢**锛屾秹鍙?~150 涓鐐广€?

## 1. 鏈繚鎶ょ鐐规竻鍗曪紙缂哄皯 JWT 璁よ瘉锛?

| 椋庨櫓  | 绔偣                                    | 鏂囦欢浣嶇疆                     | 璇存槑                                                                                                                                         |
| ------- | ---------------------------------------- | -------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| \*_浣?_ | `GET /api/v1/health`                     | `health.controller.ts:21`        | 鍋ュ悍妫€鏌ワ紝璁捐濡傛锛?_鍙帴鍙?_                                                                                                         |
| \*_浣?_ | `GET /api/v1/health/ready`               | `health.controller.ts:28`        | Readiness 鎺㈤拡锛?_鍙帴鍙?_                                                                                                                  |
| \*_浣?_ | `POST /api/v1/auth/login`                | `auth.controller.ts:36`          | 鐧诲綍绔偣锛岃璁″姝?                                                                                                                        |
| \*_浣?_ | `GET /api/v1/auth/captcha`               | `auth.controller.ts:47`          | 楠岃瘉鐮佽幏鍙栵紝璁捐濡傛                                                                                                                   |
| \*_浣?_ | `POST /api/v1/auth/refresh`              | `auth.controller.ts:68`          | Token 鍒锋柊锛岃璁″姝?                                                                                                                       |
| \*_浣?_ | `POST /api/v1/auth/wx-login`             | `auth.controller.ts:129`         | 寰俊鐧诲綍锛岃璁″姝?                                                                                                                        |
| \*_涓?_ | `POST /api/v1/materials/upload/callback` | `material.controller.ts:46`      | 浣跨敤 `@Public()` 璺宠繃 JWT銆傚綋鍓嶄粎鏈?`CallbackSignatureGuard` 娉ㄩ噴鑰?*鏈疄闄呭簲鐢ㄥ畧鍗?*锛岀敓浜х幆澧冨繀椤婚獙璇?OSS 鍥炶皟绛惧悕 |
| \*_涓?_ | `POST /api/v1/call/callback`             | `call-callback.controller.ts:13` | 鏁翠釜 Controller 鏃?JwtAuthGuard锛屼娇鐢?`CallbackSignatureGuard`銆傞渶纭绛惧悕鏍￠獙閫昏緫瀹屾暣                                           |

### 瀹堝崼瑕嗙洊姹囨€?

| Controller             | 绫荤骇 JwtAuthGuard | 绫荤骇 RolesGuard | 璇勪及                                                     |
| ---------------------- | :-----------------: | :---------------: | ---------------------------------------------------------- |
| CustomerController     |          Y          |         Y         | OK                                                         |
| OpportunityController  |          Y          |         Y         | OK                                                         |
| CallRecordController   |          Y          |         Y         | OK                                                         |
| KnowledgeController    |          Y          |         Y         | OK                                                         |
| UserController         |          Y          |         Y         | OK                                                         |
| AuditLogController     |          Y          |         Y         | OK                                                         |
| FollowUpController     |          Y          |         Y         | OK                                                         |
| SalesTargetController  |          Y          |         Y         | OK                                                         |
| ContactController      |          Y          |         Y         | OK                                                         |
| CustomerPoolController |          Y          |         Y         | OK                                                         |
| CustomerTagController  |          Y          |         Y         | OK                                                         |
| CustomFieldController  |          Y          |         Y         | OK                                                         |
| AiController           |          Y          |         Y         | OK                                                         |
| RouteController        |          Y          |       **N**       | 浠?JwtAuthGuard                                            |
| CampaignController     |          Y          |       **N**       | 浠?JwtAuthGuard锛岄儴鍒嗘柟娉曠敤 `@UseGuards(RolesGuard)` |
| MaterialController     |          Y          |       **N**       | 浠?JwtAuthGuard锛孌elete 缂哄皯瑙掕壊闄愬埗                |
| RecordingController    |          Y          |       **N**       | 浠?JwtAuthGuard                                            |
| CallPopupController    |          Y          |       **N**       | 浠?JwtAuthGuard                                            |
| CallController         |          Y          |       **N**       | 浠?JwtAuthGuard                                            |
| AgentController        |          Y          |       **N**       | 浠?JwtAuthGuard锛岄儴鍒嗘柟娉曟墜鍔ㄥ姞 RolesGuard         |
| AnnouncementController |          Y          |       **N**       | 浠?JwtAuthGuard锛岄儴鍒嗘柟娉曟墜鍔ㄥ姞 RolesGuard         |
| AuthController         |  **N** (閫愭柟娉?   |       **N**       | 璁捐濡傛                                                 |
| HealthController       |        **N**        |       **N**       | 璁捐濡傛                                                 |
| CallCallbackController |        **N**        |       **N**       | 鐢ㄧ鍚嶆牎楠屾浛浠?                                       |

---

## 2. 缂哄皯棰戠巼闄愬埗鐨勭鐐规竻鍗?

### 鍏ㄥ眬閰嶇疆

`ThrottlerModule.forRoot` 閰嶇疆涓?**60 req/min**锛坄app.module.ts:53`锛夛紝浣?**`CustomThrottlerGuard` 鏈敞鍐屼负鍏ㄥ眬瀹堝崼**锛坄APP_GUARD` 鏈厤缃級锛屼篃鏈湪 `main.ts` 涓?`useGlobalGuards` 娉ㄥ唽銆?
**缁撹锛氬叏灞€棰戠巼闄愬埗瀹為檯涓婃湭鐢熸晥銆?\* 杩欐槸 **楂橀闄?\* 闂銆?

### 宸查厤缃鐜囬檺鍒剁殑绔偣锛堜粎闄?AuthController锛?

| 绔偣                   | 闄愬埗 |
| ----------------------- | ------ |
| `POST /auth/login`      | 5/min  |
| `GET /auth/captcha`     | 10/min |
| `POST /auth/refresh`    | 10/min |
| `POST /auth/wx-login`   | 10/min |
| `POST /auth/bind-phone` | 10/min |

### 缂哄皯棰戠巼闄愬埗鐨勯珮椋庨櫓绔偣

| 绔偣                                     | 椋庨櫓  | 鍘熷洜                                          |
| ----------------------------------------- | ------- | ----------------------------------------------- |
| `POST /knowledge/ask`                     | \*_楂?_ | AI/LLM 璋冪敤锛岄珮鎴愭湰锛屾棤闄愬埗鍙婊ョ敤 |
| `POST /ai/reports/generate`               | \*_楂?_ | AI 浠诲姟鎻愪氦锛屾棤闄愬埗                     |
| `POST /ai/sales-forecasts/generate`       | \*_楂?_ | AI 棰勬祴浠诲姟                                 |
| `POST /ai/customer-profiles/:id/generate` | \*_楂?_ | AI 鐢诲儚鐢熸垚                                 |
| `POST /ai/intent-predictions/generate`    | \*_楂?_ | AI 鎰忓悜棰勬祴                                 |
| `GET /ai/script-recommend`                | \*_楂?_ | AI 璇濇湳鎺ㄨ崘                                 |
| `POST /call-records/:id/summarize`        | \*_涓?_ | AI 鎽樿鐢熸垚                                  |
| `POST /customers/import`                  | \*_涓?_ | 鎵归噺瀵煎叆锛堣櫧鏈?1000 鏉￠檺鍒讹級          |
| `GET /customers/export`                   | \*_涓?_ | 瀵煎嚭鎿嶄綔                                    |
| `GET /opportunities/export`               | \*_涓?_ | 瀵煎嚭鎿嶄綔                                    |
| `GET /call-records/export`                | \*_涓?_ | 瀵煎嚭鎿嶄綔                                    |
| 鎵€鏈夊叾浠栦笟鍔＄鐐?                   | \*_涓?_ | 鏃犲叏灞€闄愭祦淇濇姢                           |

---

## 3. 鐤戜技 SQL 鎷兼帴鐨勪唬鐮佷綅缃?

### 鍘熷 SQL 鏌ヨ锛坄queryRunner.query()`锛?

| 鏂囦欢                         | 琛屽彿                                               | 浠ｇ爜                                     | 璇勪及 |
| ------------------------------ | ---------------------------------------------------- | ------------------------------------------ | ------ |
| `customer-merge.service.ts:69` | `UPDATE contacts SET customer_id = ? WHERE ...`      | **瀹夊叏** 鈥?浣跨敤 `?` 鍙傛暟鍖栧崰浣嶇 |
| `customer-merge.service.ts:75` | `UPDATE follow_ups SET customer_id = ? WHERE ...`    | **瀹夊叏** 鈥?鍙傛暟鍖?                    |
| `customer-merge.service.ts:81` | `UPDATE opportunities SET customer_id = ? WHERE ...` | **瀹夊叏** 鈥?鍙傛暟鍖?                    |

### QueryBuilder 鐨?LIKE 鏌ヨ

鎵€鏈?`LIKE` 鏌ヨ鍧囦娇鐢ㄥ弬鏁板寲缁戝畾锛坄:kw`/`:keyword` 鍙傛暟锛夛紝绀轰緥锛?

```typescript
qb.andWhere("customer.name LIKE :kw", { kw: `%${keyword}%` });
```

\*_璇勪及锛氬畨鍏?_ 鈥?TypeORM 鐨勫弬鏁扮粦瀹氭満鍒朵細瀵瑰€艰繘琛岃浆涔夈€俙%${keyword}%`涓殑`keyword` 閫氳繃鍙傛暟浼犻€掕€岄潪瀛楃涓叉嫾鎺ャ€?

### QueryBuilder 鐨?WHERE 鏌ヨ

鎵弿浜嗗叏閮?~50 澶?`createQueryBuilder` 璋冪敤锛屾墍鏈?`.where()` 鍜?`.andWhere()` 鍧囦娇鐢ㄥ弬鏁板寲鏌ヨ锛坄:paramName` 鏍煎紡锛夈€? \*_鏈彂鐜?SQL 娉ㄥ叆婕忔礊銆?_

### 棰濆瀹夊叏闃叉姢

- `main.ts:46` 娉ㄥ唽浜?`SqlInjectionMiddleware` 鍏ㄥ眬涓棿浠讹紝鎻愪緵棰濆鐨?SQL 娉ㄥ叆妫€娴嬪眰
- `main.ts:56` 鐨?`ValidationPipe` 璁剧疆浜?`whitelist: true` + `forbidNonWhitelisted: true`锛岃繃婊ゆ湭瀹氫箟瀛楁
- `main.ts:65` 娉ㄥ唽浜?`SanitizeHtmlPipe` 鍏ㄥ眬绠￠亾锛岄槻姝?XSS

---

## 4. 椋庨櫓璇勭骇姹囨€?

| 椋庨櫓绛夌骇 | 闂                                                                                   | 鏁伴噺 |
| ------------ | -------------------------------------------------------------------------------------- | ------ |
| **涓ラ噸**   | 鍏ㄥ眬 ThrottlerGuard 鏈敞鍐岋紙`APP_GUARD`锛夛紝闄愭祦褰㈠悓铏氳                    | 1      |
| \*_楂?_      | AI/LLM 绔偣鏃犵嫭绔嬮鐜囬檺鍒讹紝鍙婊ョ敤浜х敓楂橀璐圭敤                          | 6      |
| \*_涓?_      | `@Public()` 鐨?OSS 鍥炶皟绔偣闇€纭繚绛惧悕鏍￠獙瀹屾暣                               | 1      |
| \*_涓?_      | 澶氫釜 Controller 缂哄皯 `RolesGuard`锛圡aterialController Delete 鏃犺鑹查檺鍒剁瓑锛? | 7      |
| \*_浣?_      | 鏈彈 JWT 淇濇姢鐨勮璁＄鐐癸紙health/login/captcha锛?                                | 6      |
| \*_鏃?_      | SQL 娉ㄥ叆椋庨櫓                                                                       | 0      |

---

## 淇寤鸿锛堟寜浼樺厛绾э級

### P0 鈥?绔嬪嵆淇

1. **娉ㄥ唽鍏ㄥ眬 ThrottlerGuard**锛氬湪 `app.module.ts` 鎴栨煇涓叏灞€ module 涓坊鍔狅細

   ```typescript
   { provide: APP_GUARD, useClass: CustomThrottlerGuard }
   ```

2. **涓?AI 绔偣娣诲姞涓ユ牸闄愭祦**锛? ```typescript
   @Throttle({ default: { ttl: 60000, limit: 3 } })
   ```

   ```

### P1 鈥?鐭湡淇

3. 涓虹己灏?`RolesGuard` 鐨?Controller 缁熶竴娣诲姞绫荤骇瀹堝崼锛堝挨鍏舵槸 `MaterialController`銆乣RecordingController`锛?4. 纭 `MaterialController.uploadCallback` 鐨?`@Public()` 绔偣鏈夊畬鏁寸殑 OSS 绛惧悕鏍￠獙
4. 涓哄鍑虹鐐?(`/export`) 娣诲姞 `@Throttle({ default: { limit: 3, ttl: 60000 } })`

### P2 鈥?鎸佺画鏀硅繘

6. 缁熶竴鎵€鏈?Controller 鐨勫畧鍗ā寮忥紝閬垮厤"鏈変簺鏈?RolesGuard 鏈変簺娌℃湁"鐨勪笉涓€鑷?7. 鑰冭檻瀵?LIKE 鏌ヨ鐨?`%` 閫氶厤绗﹀瓧绗﹁繘琛岃浆涔夛紙闃叉鐢ㄦ埛杈撳叆 `%` 瀵艰嚧鍏ㄨ〃鎵弿 DoS锛?

---

exit_code: 0
