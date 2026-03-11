---

# 浠ｇ爜璐ㄩ噺涓庢祴璇曡鐩栧鏌ユ姤鍛?
## 1. 閰嶇疆瀹℃煡缁撴灉

### 1.1 ESLint + Prettier + Husky pre-commit

| 椤圭洰 | 鐘舵€?| 璇存槑 |
|------|------|------|
| ESLint (server) | **ESLint 9 flat config** | `eslint.config.mjs` 鈥?浣跨敤 `typescript-eslint` recommended + `no-explicit-any: error` |
| ESLint (web) | **ESLint 9 flat config** | `eslint.config.mjs` 鈥?鍔犺浇 `eslint-plugin-vue` flat/recommended + `component-api-style: script-setup` |
| Prettier (server) | `.prettierrc` | singleQuote, semi:false, trailingComma:all, printWidth:100 |
| Prettier (web) | `.prettierrc` | 鍚屼笂 + `vueIndentScriptAndStyle: false` |
| Husky | **v9** | `pre-commit` 鈫?`npx lint-staged`; `commit-msg` 鈫?`npx commitlint` |
| lint-staged | `.lintstagedrc` | server `eslint --fix + prettier`; web `eslint --fix + prettier`; shared `prettier` |
| commitlint | `commitlint.config.js` | `@commitlint/config-conventional`, 11 type enum, subject-max-length:100 |

**褰撳墠 lint 閿欒**:
- **Backend**: 28 errors 鈥?涓昏鏄?`no-explicit-any`(3澶?, `no-unused-vars`(7澶?, `no-constant-binary-expression`(1澶?
- **Frontend**: 11 errors + 3 warnings 鈥?`no-explicit-any`(3澶?, `no-unused-vars`(5澶?, `no-undef`(1澶?, `vue/no-v-html`(1澶?

**缂哄け椤?*:
- `no-console` 瑙勫垯锛?*鏈厤缃?* (瀹℃煡娓呭崟绗?椤?
- `no-magic-numbers` 瑙勫垯锛?*鏈厤缃?* (瀹℃煡娓呭崟绗?椤?

### 1.2 TypeScript strict 妯″紡

| 閰嶇疆鏂囦欢 | strict | noImplicitAny | strictNullChecks | noUnusedLocals | noUnusedParameters |
|----------|--------|---------------|------------------|----------------|--------------------|
| `packages/server/tsconfig.json` | **true** | **true** | **true** | **鏈缃?* | **鏈缃?* |
| `packages/web/tsconfig.json` | **true** | 缁ф壙 | 缁ф壙 | **鏈缃?* | **鏈缃?* |
| `packages/shared/tsconfig.json` | **true** | 缁ф壙 | 缁ф壙 | **鏈缃?* | **鏈缃?* |

**鍙戠幇**:
- `strict: true` 宸插紑鍚紙闅愬惈 noImplicitAny + strictNullChecks锛?- server 棰濆鏄惧紡璁剧疆 `strictBindCallApply: false`銆乣forceConsistentCasingInFileNames: false` 鈥?杩?*闄嶄綆浜?*涓ユ牸鎬?- **`noUnusedLocals` 鍜?`noUnusedParameters` 鍧囨湭鍦ㄤ换浣?tsconfig 涓惎鐢?*锛堝鏌ユ竻鍗曠3椤癸級

---

## 2. 瑕嗙洊鐜囨姤鍛婃埅鍥?

### 2.1 鍚庣 (Jest)

```
Test Suites: 15 failed, 26 passed, 41 total
Tests:       53 failed, 263 passed, 316 total
Overall:     Stmts 25.1% | Branch 24.59% | Funcs 23.76% | Lines 25.38%
```

**鎸夋ā鍧楄鐩栫巼**:

| 妯″潡                 | Stmts%                    | 璇勪环                                                                     |
| --------------------- | ------------------------- | -------------------------------------------------------------------------- |
| common/filters        | 100%                      | 浼?                                                                        |
| common/decorators     | 70%                       | 涓?                                                                        |
| common/interceptors   | 50.87%                    | 浣?(data-mask/data-scope 0%)                                               |
| common/guards         | 14.02%                    | **涓ラ噸涓嶈冻** (callback-signature/hmac/permissions/replay-attack 鍧?0%) |
| common/redis          | 83.63%                    | 鑹?                                                                        |
| config                | 100%                      | 浼?                                                                        |
| modules/auth          | **0%**                    | **涓ラ噸** 鈥?鎵€鏈夋枃浠?0%                                               |
| modules/user          | 100% (service+controller) | 浼?                                                                        |
| modules/customer      | 44.82%                    | 浣?(controller 0%)                                                         |
| modules/opportunity   | 鈥?                       | 鏈夋祴璇曚絾 controller 缂栬瘧澶辫触                                       |
| modules/knowledge     | 鈥?                       | 鏈夋祴璇曚絾瀛樺湪缂栬瘧閿欒                                              |
| modules/contact       | 100%                      | 浼?                                                                        |
| modules/customer-pool | 69.77%                    | 涓?                                                                        |
| modules/call-record   | 67.46%                    | 涓?(controller 0%)                                                         |
| modules/follow-up     | 鈥?                       | 鏈夋祴璇?                                                                  |
| modules/ai            | 6.17%                     | **涓ラ噸涓嶈冻**                                                           |
| modules/notification  | 鈥?                       | 娴嬭瘯鍏ㄩ儴澶辫触                                                         |
| modules/agent         | 0%                        | \*_鏃犳祴璇?_                                                              |
| modules/announcement  | 0%                        | \*_鏃犳祴璇?_                                                              |
| modules/call          | 0%                        | \*_鏃犳祴璇?_                                                              |
| modules/campaign      | 0%                        | \*_鏃犳祴璇?_                                                              |
| modules/custom-field  | 9.33%                     | \*_鍑犱箮鏃犳祴璇?_                                                        |
| modules/customer-tag  | 0%                        | \*_鏃犳祴璇?_                                                              |
| modules/material      | 0%                        | \*_鏃犳祴璇?_                                                              |
| modules/rbac          | 0%                        | \*_鏃犳祴璇?_                                                              |
| modules/recording     | 0%                        | \*_鏃犳祴璇?_                                                              |
| modules/route         | 0%                        | \*_鏃犳祴璇?_                                                              |
| modules/sales-target  | 0%                        | \*_鏃犳祴璇?_                                                              |

### 2.2 鍓嶇 (Vitest)

```
Test Files: 7 passed (7)
Tests:      82 passed (82)
Stmts:      98.33% | Branch: 100% | Funcs: 90.24% | Lines: 98.13%
```

瑕嗙洊鑼冨洿闄愬畾浜?`src/utils/**`, `src/composables/**`, `src/stores/**`, `src/directives/**`銆?\*_API 灞傘€侀〉闈㈢粍浠跺眰鍧囨湭绾冲叆瑕嗙洊鑼冨洿銆?_

---

## 3. 娴嬭瘯缂哄彛鍒嗘瀽

### 3.1 鍚庣 15 涓け璐ユ祴璇曞浠?

| 澶辫触鍘熷洜                           | 娑夊強鏂囦欢                                                                                              |
| -------------------------------------- | --------------------------------------------------------------------------------------------------------- |
| **uuid ESM 瀵煎叆閿欒**               | auth.service, auth.controller, jwt.strategy, notification.\*, customer.controller, call-record.controller |
| **鏋勯€犲嚱鏁扮鍚嶄笉鍖归厤**         | jwt-auth.guard (Reflector鍙傛暟), opportunity.controller (3鍙傛暟), knowledge.controller (userId鍙傛暟)   |
| **audit-log 鏂板 responseData 瀛楁** | audit-log.service, audit-log.interceptor                                                                  |
| **knowledge API 鍙樻洿**               | knowledge.service, knowledge-like.service, knowledge.controller                                           |

**鏍瑰洜**: 婧愮爜杩唬鍚庢祴璇曟湭鍚屾鏇存柊銆傞渶瑕?

1. 涓?`uuid` 閰嶇疆 Jest `transformIgnorePatterns` 鎴?mock
2. 鏇存柊 controller 娴嬭瘯鐨勬瀯閫犲弬鏁?3. audit-log 娴嬭瘯澧炲姞 `responseData` 瀛楁鏂█
3. knowledge 娴嬭瘯閫傞厤鏂?API 绛惧悕

### 3.2 鍚庣鏃犳祴璇曟ā鍧?(0% 瑕嗙洊)

鍏?\*_11 涓ā鍧楀畬鍏ㄦ病鏈夋祴璇?_:
`agent`, `announcement`, `call`, `campaign`, `custom-field`, `customer-tag`, `material`, `rbac`, `recording`, `route`, `sales-target`

鍔犱笂 `auth` 妯″潡娴嬭瘯鍏ㄩ儴鍥?ESM 瀵煎叆澶辫触鑰屾棤鏁堬紝瀹為檯 \**12 涓牳蹇冩ā鍧楀浜庢棤鏈夋晥娴嬭瘯鐘舵€?*銆?

### 3.3 Supertest 闆嗘垚娴嬭瘯

**瀹屽叏缂哄け** 鈥?鏃犱换浣?Supertest/HTTP 闆嗘垚娴嬭瘯銆備粎鏈夌函鍗曞厓娴嬭瘯锛坢ock 渚濊禆锛夈€?

### 3.4 鍓嶇娴嬭瘯缂哄彛

- **API 灞?\* (`src/api/`): 鏃犳祴璇?- **椤甸潰缁勪欢** (`src/views/`): 鏃犲崟鍏冩祴璇曪紙浠呮湁 E2E锛?- **Router guards**: 鏃犲崟鍏冩祴璇?- **Layout 缁勪欢\*\*: 鏃犳祴璇?

### 3.5 E2E 娴嬭瘯

5 涓祴璇曟枃浠讹細`auth`, `dashboard`, `customer`, `navigation`, `modules`
瑕嗙洊鐧诲綍/浠〃鐩?瀹㈡埛CRUD/瀵艰埅/鍟嗘満+閫氳瘽+鐭ヨ瘑搴撳垪琛ㄣ€?
**缂哄彛**: 鏃犳潈闄愬垏鎹㈡祴璇曘€佹棤 CRUD 瀹屾暣娴佺▼锛堢紪杈?鍒犻櫎纭锛夈€佹棤閿欒鐘舵€佹祴璇曘€?

### 3.6 鎬ц兘娴嬭瘯

## **瀹屽叏缂哄け** 鈥?鏃犱换浣曟€ц兘/璐熻浇娴嬭瘯鏂规锛堝 k6, Artillery, autocannon锛夈€?

## 4. 鏀硅繘浼樺厛绾?

### P0 鈥?闃诲鎬ч棶棰橈紙绔嬪嵆淇锛?

| #   | 闂                                                   | 褰卞搷                                                |
| --- | ------------------------------------------------------ | ----------------------------------------------------- |
| 1   | \*_15 涓悗绔祴璇曞浠跺け璐?_                        | CI 绾㈢伅锛岃鐩栫巼鏁版嵁涓嶅彲淇?                   |
| 2   | **uuid ESM 鍏煎** 鈥?Jest 鏃犳硶 transform `uuid` v13 | 闃诲 auth/notification/customer 绛夋牳蹇冩祴璇?      |
| 3   | **28 涓?ESLint 閿欒 (server) + 11 涓?(web)**          | `lint` 鑴氭湰鎵ц澶辫触锛宲re-commit hook 褰㈠悓铏氳 |

### P1 鈥?楂樹紭鍏堢骇锛?-2 鍛ㄥ唴锛?

| #   | 闂                                                | 寤鸿                                                                       |
| --- | --------------------------------------------------- | --------------------------------------------------------------------------- |
| 4   | **鍏ㄥ眬瑕嗙洊鐜囦粎 25%**锛岃繙浣庝簬 80% 鐩爣    | 琛ラ綈 auth銆乶otification銆乲nowledge 娴嬭瘯锛涗慨澶嶇幇鏈夊け璐ユ祴璇?    |
| 5   | **tsconfig 缂?`noUnusedLocals/noUnusedParameters`** | 涓変釜 package 鍧囨坊鍔狅紝娓愯繘寮忔竻鐞?                                  |
| 6   | **Jest 缂?`coverageThreshold`**                     | 璁剧疆 `global: { lines: 80, branches: 70, functions: 75, statements: 80 }` |
| 7   | **ESLint 缂?`no-console: warn`**                    | server + web eslint config 娣诲姞瑙勫垯                                     |

### P2 鈥?涓紭鍏堢骇锛?-4 鍛ㄥ唴锛?

| #   | 闂                                             | 寤鸿                                                                                |
| --- | ------------------------------------------------ | ------------------------------------------------------------------------------------ |
| 8   | **11 涓ā鍧?0% 瑕嗙洊**                          | 閫愭ā鍧楄ˉ鍏?service + controller 娴嬭瘯                                             |
| 9   | **鏃?Supertest 闆嗘垚娴嬭瘯**                    | 涓哄叧閿?API锛坅uth/login, customer CRUD, opportunity CRUD锛夋坊鍔?HTTP 闆嗘垚娴嬭瘯 |
| 10  | **鍓嶇瑕嗙洊鑼冨洿杩囩獎**                      | 灏?`src/api/**` 鍜屽叧閿?`src/views/**` 绾冲叆 coverage include                      |
| 11  | **server tsconfig `strictBindCallApply: false`** | 鏀逛负 true锛屼慨澶嶄骇鐢熺殑绫诲瀷閿欒                                             |

### P3 鈥?浣庝紭鍏堢骇锛堥暱鏈熸敼鍠勶級

| #   | 闂                                   | 寤鸿                                                         |
| --- | -------------------------------------- | ------------------------------------------------------------- |
| 12  | **鏃?`no-magic-numbers` 瑙勫垯**       | 鍙€夊紑鍚紝鎻愬彇涓氬姟甯搁噺                               |
| 13  | **鏃犳€ц兘娴嬭瘯鏂规**                | 寮曞叆 k6 鎴?autocannon 瀵规牳蹇?API 鍋氬熀绾垮熀鍑嗘祴璇?    |
| 14  | **E2E 娴嬭瘯浠呰鐩?Chromium**         | 鑰冭檻娣诲姞 Firefox/WebKit锛堣璧勬簮鑰屽畾锛?               |
| 15  | **Prettier 閰嶇疆鏈粺涓€鍒版牴鐩綍** | 涓や釜 package 鍚勮嚜缁存姢 .prettierrc锛屽缓璁彁鍗囧埌 root |

---

**鎬荤粨**: 椤圭洰浠ｇ爜瑙勮寖宸ュ叿閾撅紙ESLint 9 + Prettier + Husky + commitlint锛夊凡鎼缓瀹屾暣锛屼絾瀛樺湪 **39 涓湭淇 lint 閿欒**瀵艰嚧 CI 绾㈢伅銆俆ypeScript strict 妯″紡宸插紑鍚絾缂哄皯 `noUnusedLocals/noUnusedParameters`銆傚悗绔祴璇曟€昏鐩栫巼 **25.1%**锛堢洰鏍?80%锛夛紝15/41 娴嬭瘯濂椾欢澶辫触锛?1 涓ā鍧楀畬鍏ㄦ棤娴嬭瘯銆傚墠绔祴璇曡鐩栫巼 **98%** 浣嗚鐩栭潰浠呴檺 utils/composables/stores銆傛棤 Supertest 闆嗘垚娴嬭瘯鍜屾€ц兘娴嬭瘯鏂规銆?_寤鸿浼樺厛淇娴嬭瘯澶辫触 + lint 閿欒锛岀劧鍚庨€愭琛ラ綈娴嬭瘯瑕嗙洊銆?_
