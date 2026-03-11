---

# 馃敀 CRM Sales Platform 瀹夊叏瀹¤鎶ュ憡

**瀹¤鏃ユ湡**: 2026-03-11  
**瀹¤鑼冨洿**: 17 椤瑰畨鍏ㄦ鏌? 
**浠ｇ爜璺緞**: `crm-sales-platform/`

---

## 馃搳 瀹¤鎬昏

| 绛夌骇      | 鏁伴噺 |
| ----------- | ------ |
| 鉁?PASS     | 11     |
| 鈿狅笍 WARN | 4      |
| 鉂?FAIL     | 2      |

---

## 馃搵 閫愰」瀹¤缁撴灉

| #   | 瀹¤椤?                           | 缁撴灉      | 涓ラ噸绋嬪害:浣嶇疆                                      | 璇︽儏                                                                                                                                                                                                                                                                                                                                                                                         |
| --- | --------------------------------- | ----------- | -------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | **JWT 绠楁硶 RS256**              | 鈿狅笍 WARN | **MEDIUM** 路 `auth.module.ts:22-44`                     | 鏀寔 RS256锛屼絾**鎸夋潯浠跺洖閫€鍒?HS256**銆傚綋 `JWT_PRIVATE_KEY` 涓虹┖鏃朵娇鐢?HS256 + 纭紪鐮侀粯璁ゅ瘑閽?`'dev-secret-key'`銆俙.env.example` 涓?RS256 key 榛樿涓虹┖锛岀敓浜х幆澧冭嫢蹇樿閰嶇疆灏嗕互寮卞瘑閽ヨ繍琛?                                                                                                                                                                    |
| 2   | \*_Token 鏈夋晥鏈?_               | 鉁?PASS     | 鈥?路 `auth.module.ts:30`, `.env.example:30-32`          | AT = `2h`锛孯T = `7d`锛屽潎绗﹀悎瑕佹眰銆俙docker-compose.yml` 涔熺‖缂栫爜涓?`2h / 7d`                                                                                                                                                                                                                                                                                                         |
| 3   | **Refresh Token 杞崲**           | 鉁?PASS     | 鈥?路 `auth.service.ts:119-167`                          | RT 浣跨敤鍚庣鍙戞柊 RT锛堝悓涓€ familyId锛夛紝鏃?RT 鐨?JTI 琚柊鍊艰鐩栵紝鑷姩澶辨晥                                                                                                                                                                                                                                                                                                        |
| 4   | \*_Token Family 閲嶆斁妫€娴?_     | 鉁?PASS     | 鈥?路 `auth.service.ts:138-151`                          | 妫€娴?familyId + jti 涓嶅尮閰嶆椂锛屽垹闄ゆ暣涓?family 骞惰皟鐢?`revokeAllUserSessions()` 鎾ら攢璇ョ敤鎴锋墍鏈変細璇?                                                                                                                                                                                                                                                                          |
| 5   | \*_AT Redis 榛戝悕鍗?鐧藉悕鍗?_   | 鉁?PASS     | 鈥?路 `auth.service.ts:415-420`, `jwt.strategy.ts:43-51` | 閲囩敤 \*_JTI 鐧藉悕鍗?_ 妯″紡锛堟洿瀹夊叏锛夛細绛惧彂鏃跺瓨鍏?`jti:whitelist:{jti}`锛孴TL = AT 鏈夋晥鏈燂紱`JwtStrategy.validate()` 姣忔楠岃瘉鐧藉悕鍗曘€傜櫥鍑烘椂鍒犻櫎鐧藉悕鍗曞苟鍔犲叆榛戝悕鍗曞弻淇濋櫓                                                                                                                                                                                |
| 6   | \*_瀵嗙爜鍝堝笇 bcrypt 鈮?12 杞?_ | 鉂?FAIL     | **CRITICAL** 路 `user.service.ts:26,88`                  | 浣跨敤 `bcrypt.hash(password, 10)`锛?\*salt rounds = 10\*\*锛屼綆浜庢帹鑽愮殑 12 杞€侽WASP 2024 鎺ㄨ崘 鈮?12 杞?                                                                                                                                                                                                                                                                              |
| 7   | \*_RBAC 鏉冮檺瀹堝崼 6 椤?_       | 鈿狅笍 WARN | **MEDIUM** 路 澶氫釜 controller                          | 鈶?璁よ瘉 鉁?(JwtAuthGuard)锛涒憽 瑙掕壊鍒嗛厤 鉁?(鏋氫妇 UserRole)锛涒憿 瑙掕壊鏍￠獙 鉁?(RolesGuard)锛涒懀 榛樿鎷掔粷 鉁?(鏃?@Roles 鏃舵斁琛岃璇佺敤鎴?锛涒懁 鏁版嵁绾ф潈闄?鉁?(applyDataPermission)锛涒懃 **閮ㄥ垎 controller 浠呯敤 JwtAuthGuard 鏈姞 RolesGuard**锛歚campaign`, `agent`, `announcement`, `call`, `recording`, `route`, `material` 鍏?7 涓?controller 缂哄皯 RolesGuard |
| 8   | **鏁忔劅瀛楁鑴辨晱/鍔犲瘑**      | 鈿狅笍 WARN | **HIGH** 路 `encryption.service.ts`, `user.entity.ts`    | **鑴辨晱**: DataMaskInterceptor 鍏ㄥ眬鍚敤锛岃嚜鍔ㄨ劚鏁?phone/email/idCard/bankCard 鉁呫€?*鍔犲瘑**: AES-256-GCM EncryptionService 宸插疄鐜颁笖鎻愪緵 `transformer()` 鏂规硶锛屼絾**鏈湪浠讳綍 Entity @Column 涓婂疄闄呬娇鐢?*銆俙ENCRYPTION_KEY` 榛樿鍏ㄩ浂 鈫?鍔犲瘑鍔熻兘褰㈠悓铏氳                                                                                                    |
| 9   | **鐧诲綍澶辫触閿佸畾**            | 鉁?PASS     | 鈥?路 `auth.service.ts:61-78`                            | 5 娆″け璐ラ攣瀹?30 鍒嗛挓锛? 娆″悗闇€鍥惧舰楠岃瘉鐮併€傝鏁板櫒瀛?Redis                                                                                                                                                                                                                                                                                                                        |
| 10  | \*_HTTPS + CSP + 瀹夊叏澶?_       | 鉁?PASS     | 鈥?路 `nginx.conf:113-119`                               | 鉁?X-Frame-Options: SAMEORIGIN锛涒渽 X-Content-Type-Options: nosniff锛涒渽 X-XSS-Protection: 1; mode=block锛涒渽 CSP 绛栫暐 (default-src 'self'...)锛涒渽 HSTS: max-age=31536000; includeSubDomains锛涒渽 Referrer-Policy: strict-origin-when-cross-origin锛涒渽 Permissions-Policy锛涒渽 server_tokens off                                                                                    |
| 11  | **class-validator DTO 楠岃瘉**    | 鉁?PASS     | 鈥?路 `main.ts:56-66`                                    | 鍏ㄥ眬 `ValidationPipe` 鍚敤 `whitelist: true` + `forbidNonWhitelisted: true` + `transform: true`銆傛墍鏈?DTO 浣跨敤 class-validator 瑁呴グ鍣?                                                                                                                                                                                                                                                |
| 12  | **TypeORM SQL 娉ㄥ叆闃叉姢**      | 鉁?PASS     | 鈥?路 `sql-injection.middleware.ts`, `user.service.ts`   | 鈶?TypeORM 鍙傛暟鍖栨煡璇紙`:parameter` 鍗犱綅绗︼級鉁咃紱鈶?棰濆閮ㄧ讲 `SqlInjectionMiddleware` 鍏ㄥ眬鎷︽埅 UNION/DROP/SLEEP 绛夋敾鍑绘ā寮?鉁?                                                                                                                                                                                                                                             |
| 13  | **鏂囦欢涓婁紶瀹夊叏**            | 鈿狅笍 WARN | **MEDIUM** 路 `material.controller.ts:46-51`             | 閲囩敤 OSS 鐩翠紶 + 鍥炶皟妯″紡锛屾湇鍔＄\**涓嶇洿鎺ュ鐞嗘枃浠朵笂浼?*锛岄檷浣庝簡鏀诲嚮闈€備絾 `uploadCallback` 绔偣鏍囪 `@Public()` (鏃犺璇? 涓斾粎渚濊禆 OSS 绛惧悕楠岃瘉锛堟敞閲婁腑鏍囨敞 "verify OSS signature in production"锛夈€俙client_max_body_size` 璁?50MB 鉁?                                                                                                              |
| 14  | **XSS 闃叉姢**                    | 鉂?FAIL     | **HIGH** 路 `packages/web/src/`                          | **鍚庣**: `SanitizeHtmlPipe` 鍏ㄥ眬鍚敤锛屾竻鐞?`content/remark/description/body` 绛夊瓧娈?鉁呫€?\*鍓嶇**: 瀛樺湪 3 澶?`v-html` 浣跨敤锛坄MarkdownEditor.vue:213`, `knowledge/detail.vue:49`, `announcement/detail.vue:15`锛夛紝浣?**鏈畨瑁?DOMPurify\*\*锛屾棤鍓嶇 XSS 杩囨护銆傝嫢鍚庣 sanitize 琚粫杩囨垨 Markdown 娓叉煋寮曞叆 XSS payload锛屽墠绔棤绗簩閬撻槻绾?                 |
| 15  | **npm audit 鏃?high/critical**    | 鉁?PASS     | 鈥?路 `ci.yml:88-89`                                     | CI 涓繍琛?`pnpm audit --audit-level high`锛坈ontinue-on-error 鍏佽閫氳繃浣嗘湁鎶ュ憡锛?                                                                                                                                                                                                                                                                                                      |
| 16  | **Dependabot/Snyk 閰嶇疆**        | 鉁?PASS     | 鈥?路 `ci.yml:69-101`                                    | CI Security job 鍖呭惈锛氣憼 `pnpm audit --audit-level high`锛涒憽 `license-checker` GPL 妫€娴嬶紱鈶?Snyk scan锛堥渶 SNYK_TOKEN锛夈€備絾 **缂哄皯 `.github/dependabot.yml`** 鑷姩 PR 鏇存柊                                                                                                                                                                                                   |
| 17  | **pnpm-lock.yaml 瀛樺湪**         | 鉁?PASS     | 鈥?路 鏍圭洰褰?                                          | `pnpm-lock.yaml` 瀛樺湪涓?CI 浣跨敤 `--frozen-lockfile` 纭繚涓€鑷存€?                                                                                                                                                                                                                                                                                                                         |

---

## 馃毃 闇€绔嬪嵆淇鐨勯棶棰?

### 鉂?CRITICAL 鈥?bcrypt rounds 涓嶈冻 (椤?#6)

**鏂囦欢**: `packages/server/src/modules/user/user.service.ts` (L26, L88)  
**鐜扮姸**: `bcrypt.hash(password, 10)` 鈥?10 杞?
**淇**: 鏀逛负 `bcrypt.hash(password, 12)`  
**褰卞搷**: 10 杞?鈮?姣忕鍙毚鍔涚牬瑙?~1000 娆?hash锛?2 杞檷浣庡埌 ~250 娆°€侽WASP 鎺ㄨ崘 鈮?12銆?
**娉ㄦ剰**: 淇敼鍚庝笉褰卞搷宸叉湁瀵嗙爜鏍￠獙锛坆crypt 鑷姩璇嗗埆杞暟锛夛紝浠呭奖鍝嶆柊瀵嗙爜銆?

### 鉂?HIGH 鈥?鍓嶇 v-html 鏃?DOMPurify (椤?#14)

**鏂囦欢**: 3 涓?`.vue` 鏂囦欢浣跨敤 `v-html` 娓叉煋鐢ㄦ埛鍐呭  
**鐜扮姸**: 鍚庣鏈?`SanitizeHtmlPipe` 浣嗗墠绔棤浜屾杩囨护  
**淇**:

1. `pnpm --filter @crm/web add dompurify && pnpm --filter @crm/web add -D @types/dompurify`
2. 鎵€鏈?`v-html` 缁戝畾鐨勫€奸€氳繃 `DOMPurify.sanitize()` 澶勭悊
3. 鎴栧垱寤哄叏灞€ `v-safe-html` 鎸囦护

---

## 鈿狅笍 寤鸿鏀硅繘椤?

### MEDIUM 鈥?RS256 鍥為€€ HS256 纭紪鐮佸瘑閽?(椤?#1)

- 鍦?`auth.module.ts` 涓紝褰撴棤 RS256 key 鏃堕粯璁?`'dev-secret-key'`
- **寤鸿**: 鐢熶骇鐜鍚姩鏃舵娴嬶紝鑻?`NODE_ENV=production` 涓旀棤 RS256 key 涔熸棤寮?JWT_SECRET 鍒欐嫆缁濆惎鍔?

### MEDIUM 鈥?7 涓?Controller 缂哄皯 RolesGuard (椤?#7)

- `campaign`, `agent`, `announcement`, `call`, `call-popup`, `recording`, `route`, `material` 浠呮湁 `JwtAuthGuard`
- **寤鸿**: 缁熶竴鍔犱笂 `RolesGuard`锛岄粯璁ゆ斁琛屽凡璁よ瘉鐢ㄦ埛锛屼絾涓哄悗缁坊鍔犵粏绮掑害鏉冮檺棰勭暀

### HIGH 鈥?EncryptionService 鏈疄闄呬娇鐢?(椤?#8)

- `EncryptionService.transformer()` 鏈簲鐢ㄥ埌浠讳綍 Entity 鐨?`@Column` 涓?- Customer/Contact 鐨?phone/email 瀛楁浠ユ槑鏂囧瓨鍌ㄥ湪鏁版嵁搴撲腑
- **寤鸿**: 瀵?Customer.phone銆丆ustomer.email銆丆ontact.phone 绛夋晱鎰熷瓧娈典娇鐢?`transformer`

### MEDIUM 鈥?upload/callback 鎺ュ彛鏃犺璇?(椤?#13)

- `@Public()` 鎰忓懗鐫€浠讳綍浜哄彲浠ヨ皟鐢?`POST /api/v1/materials/upload/callback`
- **寤鸿**: 瀹炵幇 OSS 鍥炶皟绛惧悕楠岃瘉锛堝弬鑰?CallbackSignatureGuard锛?

### MEDIUM 鈥?缂哄皯 dependabot.yml (椤?#16)

- 铏芥湁 CI 瀹¤锛屼絾鏃犺嚜鍔ㄤ緷璧栨洿鏂?PR
- **寤鸿**: 娣诲姞 `.github/dependabot.yml` 閰嶇疆 npm/pnpm 鐢熸€佺郴缁?

---

## 鉁?鍋氬緱濂界殑鍦版柟

1. \*_JTI 鐧藉悕鍗曟ā寮?_ 鈥?姣旈粦鍚嶅崟鏇村畨鍏紝Token 蹇呴』鍦?Redis 涓墠鏈夋晥
2. **Token Family 閲嶆斁妫€娴?\* 鈥?瀹屾暣瀹炵幇锛屽彂鐜伴噸鏀剧珛鍗虫挙閿€鎵€鏈変細璇?3. **澶氳澶囦細璇濇帶鍒?\* 鈥?鍚岀被鍨嬭澶囩櫥褰曡嚜鍔ㄨ涪鍑烘棫浼氳瘽
3. \*_瀵嗙爜淇敼鍚庢挙閿€鎵€鏈変細璇?_ 鈥?闃叉鏃?Token 缁х画浣跨敤
4. \*_鍏ㄥ眬 SQL 娉ㄥ叆涓棿浠?_ 鈥?TypeORM 鍙傛暟鍖栦箣澶栫殑棰濆闃茬嚎
5. **鍚庣 HTML 娓呮礂绠￠亾** 鈥?SanitizeHtmlPipe 鍏ㄥ眬杩囨护瀵屾枃鏈瓧娈?7. **Nginx 瀹夊叏閰嶇疆瀹屽杽** 鈥?鍒嗗眰闄愭祦銆佸畬鏁村畨鍏ㄥご銆侀潪 root 杩愯
6. **CI 瀹夊叏鎵弿娴佹按绾?\* 鈥?audit + license + Snyk 涓夊眰妫€鏌?9. **DataMaskInterceptor\*\* 鈥?鑷姩鑴辨晱 API 鍝嶅簲涓殑鎵嬫満鍙?閭/韬唤璇?
