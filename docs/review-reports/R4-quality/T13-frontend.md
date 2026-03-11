Now I have all the data needed. Here is the complete audit report:

---

# Vue 3 鍓嶇鏋舵瀯瀹℃煡鎶ュ憡

## 缁撴瀯涓庤矾鐢?

### 1. 鐩綍缁撴瀯鍚堣鎬?**PASS** 鈥?`packages/web/src/` 鐩綍缁撴瀯娓呮櫚瑙勮寖

```
api/ composables/ directives/ layout/ router/ stores/ utils/ views/ components/
```

瀹屽叏绗﹀悎鏍囧噯 Vue 3 椤圭洰鍒嗗眰銆俙assets/` 鍜?`main.ts` 绛夎緟鍔╂枃浠朵綅缃纭€?

### 2. 缁勪欢涓夊眰鍒嗙被

**PASS** 鈥?涓夊眰鍒嗙被鏄庣‘

- \*_Layout 灞?_: `src/layout/DefaultLayout.vue`
- \*_Page 灞?_: `src/views/` 涓?36 涓〉闈㈢粍浠讹紝鎸夋ā鍧楀瓙鐩綍缁勭粐
- \*_Reusable 灞?_: `src/components/` 涓?3 涓叡浜粍浠讹紙`ErrorBoundary.vue`, `MarkdownEditor.vue`, `DynamicFields.vue`锛?

### 3. 璺敱瀹堝崼瀹屾暣閾捐矾

**PASS** 鈥?`packages/web/src/router/index.ts:189-215`

瀹堝崼閾捐矾瀹屾暣锛?1. `requiresAuth` 妫€鏌?鈫?鏈櫥褰曢噸瀹氬悜 `/login?redirect=...` (L193-195) 2. 宸茬櫥褰曠敤鎴疯闂?`/login` 鈫?閲嶅畾鍚?`/` (L198-201) 3. Role-based 鏉冮檺妫€鏌?鈫?`to.meta.roles` vs `userStore.userRole` (L204-211) 4. `afterEach` 鏇存柊 `document.title` (L218-221) 5. 404 catch-all: `/:pathMatch(.*)*` (L176-180)

### 4. 鍔ㄦ€佽矾鐢辨潈闄愯繃婊?**WARN** 鈥?鏃犲姩鎬佽矾鐢辩敓鎴愶紝浣跨敤闈欐€佽矾鐢?+ 璺敱瀹堝崼妯″紡

褰撳墠鎵€鏈夎矾鐢卞湪 `router/index.ts:5-181` 闈欐€佸０鏄庯紝鏉冮檺鎺у埗渚濊禆 `meta.roles` + `beforeEach` 瀹堝崼銆傝繖瀵逛簬褰撳墠 3 瑙掕壊锛圓dmin/Manager/Sales锛夊満鏅鐢紝浣嗗鏋滆鑹?鏉冮檺绮掑害澧炲姞锛屽缓璁縼绉诲埌 `addRoute()` 鍔ㄦ€佹敞鍐屾ā寮忋€?

### 5. 鎳掑姞杞?**PASS** 鈥?鎵€鏈夐〉闈㈢粍浠跺潎浣跨敤 `() => import(...)` 鎳掑姞杞?

## `router/index.ts` 涓叏閮?20+ 璺敱鏉＄洰鍧囦娇鐢ㄥ姩鎬佸鍏ワ紝鍖呮嫭 `Login`銆乣DefaultLayout`銆乣404` 椤甸潰銆?

## 鐘舵€佺鐞?

### 6. Setup Store 椋庢牸

**PASS** 鈥?`packages/web/src/stores/user.ts:13-87`

浣跨敤 Pinia Composition API (Setup Store) 椋庢牸锛歚defineStore('user', () => { ... })`锛屽唴閮ㄤ娇鐢?`ref()`/`computed()`/`async function`锛岀鍚堟渶浣冲疄璺点€?

### 7. Token 鎸佷箙鍖栭殧绂?**PASS** 鈥?`packages/web/src/stores/user.ts:81-85`

```ts
persist: {
  key: 'crm-user',
  storage: localStorage,
  paths: ['token', 'refreshToken', 'userInfo'],  // 浠呮寔涔呭寲璁よ瘉鐩稿叧瀛楁
}
```

浣跨敤 `pinia-plugin-persistedstate`锛岀嫭绔?key `crm-user`锛屼粎鎸佷箙鍖?token 鐩稿叧瀛楁銆?

### 8. generateRoutes 澶辫触鍥為€€

**WARN** 鈥?鏈疄鐜板姩鎬佽矾鐢辩敓鎴愶紝鏃犲洖閫€鏈哄埗

## 褰撳墠浣跨敤闈欐€佽矾鐢憋紝涓嶅瓨鍦?`generateRoutes` 娴佺▼銆傚鏋?API 鑾峰彇鏉冮檺澶辫触涓嶄細褰卞搷璺敱鍔犺浇锛堝洜涓鸿矾鐢辨槸闈欐€佺殑锛夛紝浣嗕篃鎰忓懗鐫€鏃犳硶鍦ㄥ墠绔簿纭鍓矾鐢辫彍鍗曘€?

## HTTP 灏佽

### 9. Token 鍒锋柊閿佹満鍒?**PASS** 鈥?`packages/web/src/api/request.ts:99-141`

瀹炵幇瀹屾暣鐨勫埛鏂伴攣锛?- `isRefreshing` 鏍囧織浣嶉槻姝㈠苟鍙戝埛鏂?(L99)

- `pendingQueue` 闃熷垪鏆傚瓨绛夊緟涓殑璇锋眰 (L100)
- 401 鍝嶅簲 鈫?闃熷垪鎺掗槦鎴栧彂璧峰埛鏂?(L108-118)
- 鍒锋柊鎴愬姛 鈫?渚濇鍥炴斁闃熷垪 (L127-128)
- 鍒锋柊澶辫触 鈫?娓呯┖闃熷垪 + 璺宠浆鐧诲綍 (L134-140)

### 10. 鐙珛 axios 瀹炰緥

**PASS** 鈥?`packages/web/src/api/request.ts:18-24`

```ts
const request: AxiosInstance = axios.create({
  baseURL: BASE_URL,
  timeout: 30000,
  headers: { "Content-Type": "application/json" },
});
```

浣跨敤 `axios.create()` 鍒涘缓鐙珛瀹炰緥锛屾湭姹℃煋鍏ㄥ眬 axios銆?

### 11. 涓氬姟閿欒鐮佺粺涓€澶勭悊

**PASS** 鈥?`packages/web/src/api/request.ts:47-85`

`resolveErrorMessage()` 缁熶竴澶勭悊锛?1. 浼樺厛鍙栧悗绔?`validationErrors` 鎷兼帴灞曠ず (L54-63) 2. 鍏舵鍙栧悗绔?`message` (L67-69) 3. 鍐嶆鎸?HTTP status 鐮佸尮閰嶄腑鏂囨彁绀?(L27-39) 4. 鏈€鍚庡厹搴曠綉缁?瓒呮椂閿欒 (L77-81)

### 12. X-Request-Id 闃查噸

**FAIL** 鈥?鏈疄鐜?
璇锋眰鎷︽埅鍣紙L88-97锛変粎闄勫姞 `Authorization`锛屾湭鐢熸垚 `X-Request-Id` 璇锋眰澶淬€傜己灏戦槻閲嶆斁/骞傜瓑鎬т繚璇併€?
**寤鸿**: 鍦?request interceptor 涓坊鍔?`config.headers['X-Request-Id'] = crypto.randomUUID()` 鎴?uuid 搴撱€?

---

## 缁勪欢瑙勮寖

### 13. Props interface + withDefaults

**PASS** 鈥?鏍锋湰缁勪欢鍧囩鍚堣鑼?

- `MarkdownEditor.vue:5-9`: `interface Props { ... }` + `withDefaults(defineProps<Props>(), { ... })` (L26-30)
- `CreateCustomerDialog.vue:8-11`: `defineProps<{ visible: boolean; editData?: Record<string, unknown> }>()`

### 14. Emits 绫诲瀷瀹氫箟

**PASS** 鈥?鏍锋湰缁勪欢鍧囦娇鐢ㄧ被鍨嬪寲 defineEmits

- `MarkdownEditor.vue:32-34`: `defineEmits<{ 'update:modelValue': [value: string] }>()`
- `CreateCustomerDialog.vue:13-16`: `defineEmits<{ 'update:visible': [value: boolean]; success: [] }>()`

---

## 鏋勫缓

### 15. manualChunks 鎷嗗垎

**PASS** 鈥?`packages/web/vite.config.ts:53-105`

| 鎷嗗垎绛栫暐瀹屽杽锛屽叡 8 涓?vendor chunk锛?              | Chunk                    | 鍐呭 |
| ---------------------------------------------------------- | ------------------------ | ----- |
| `vue-vendor`                                               | vue + vue-router + pinia |
| `axios-vendor`                                             | axios                    |
| `dayjs-vendor`                                             | dayjs                    |
| `async-validator-vendor`                                   | async-validator          |
| `ep-icons`                                                 | @element-plus/icons-vue  |
| `element-plus-core`                                        | element-plus 涓诲寘      |
| `element-plus-table`                                       | table/pagination 缁勪欢  |
| `echarts-vendor` / `zrender-vendor` / `vue-echarts-vendor` | ECharts 鍏ㄥ妗?         |

### 16. terser 绉婚櫎 console

**FAIL** 鈥?鏈厤缃?
`vite.config.ts` 鐨?`build` 閰嶇疆涓湭璁剧疆 `minify: 'terser'` 鎴?`esbuild.drop: ['console', 'debugger']`銆傜敓浜ф瀯寤轰細淇濈暀 `console.log`銆?
**寤鸿**: 娣诲姞鍒?`build` 閰嶇疆锛?```ts
build: {
esbuild: { drop: ['console', 'debugger'] },
// ...
}

````

---

## 瀹夊叏

### 17. vue/no-v-html: error + DOMPurify
**FAIL** 鈥?ESLint 鏈厤缃?`vue/no-v-html` 瑙勫垯锛屼笖 DOMPurify 鏈紩鍏?
**v-html 浣跨敤浣嶇疆锛? 澶勶級**:
| 鏂囦欢 | 琛屽彿 | 椋庨櫓绛夌骇 |
|------|------|----------|
| `components/MarkdownEditor.vue` | L213 | 浣?鈥?markdown-it `html: false` |
| `views/knowledge/detail.vue` | L49 | 浣?鈥?markdown-it `html: false` |
| `views/announcement/detail.vue` | L15 | **楂?* 鈥?鐩存帴娓叉煋鍚庣 HTML锛屾棤浠讳綍 sanitize |

`announcement/detail.vue:15` 鐩存帴 `v-html="announcement.content"` 娓叉煋鏈嶅姟绔繑鍥炵殑 HTML 鍐呭锛屾棤 DOMPurify/sanitize 澶勭悊锛屽瓨鍦?**瀛樺偍鍨?XSS** 椋庨櫓銆?
**寤鸿**:
1. ESLint 娣诲姞 `'vue/no-v-html': 'error'`
2. 瀹夎 `dompurify` + `@types/dompurify`
3. 鎵€鏈?v-html 浣嶇疆鏀逛负 `v-html="DOMPurify.sanitize(content)"`

### 18. RSA 鍏挜鍔犲瘑瀵嗙爜
**FAIL** 鈥?鏈疄鐜?
`views/login/index.vue:87` 鐩存帴鏄庢枃鍙戦€佸瘑鐮侊細
```ts
await userStore.login(form)  // form = { username, password }
````

瀵嗙爜浠ユ槑鏂囬€氳繃 HTTPS 浼犺緭銆傝櫧鐒?HTTPS 鎻愪緵浼犺緭灞傚姞瀵嗭紝浣嗘棤搴旂敤灞傚姞瀵嗭紙RSA/SM2锛夈€?
**寤鸿**: 濡傛灉瀹夊叏瀹¤瑕佹眰搴旂敤灞傚姞瀵嗭紝鍙紩鍏?`jsencrypt` 搴擄紝鍦?login 鍓嶇敤鍚庣鍏挜鍔犲瘑瀵嗙爜瀛楁銆?

### 19. CSRF Token

**FAIL** 鈥?鏈疄鐜?
Axios 璇锋眰鎷︽埅鍣ㄦ湭闄勫姞 CSRF Token銆傚綋鍓?API 浣跨敤 JWT Bearer Token 璁よ瘉锛堥潪 Cookie锛夛紝CSRF 椋庨櫓杈冧綆銆備絾濡傛灉鍚庣画寮曞叆 Cookie 璁よ瘉鎴?SSR锛岄渶琛ュ厖銆?
**椋庨櫓璇勭骇**: 浣庯紙褰撳墠 JWT + localStorage 鏂规澶╃劧闃?CSRF锛?

### 20. escapeHtml

**WARN** 鈥?鏃犻€氱敤 escapeHtml 宸ュ叿鍑芥暟

## 椤圭洰涓湭鍙戠幇 `escapeHtml` / `sanitize` 宸ュ叿鍑芥暟銆備絾妯℃澘涓敤鎴锋暟鎹ぇ澶氶€氳繃 `{{ }}` 鎻掑€硷紙Vue 鑷姩杞箟锛夛紝椋庨櫓鍙帶銆傚敮涓€渚嬪鏄笂杩?v-html 浣嶇疆銆?

## 瀹℃煡姹囨€?

| #   | 瀹℃煡椤?                       | 缁撴灉   | 鏂囦欢瀹氫綅                                        |
| --- | ------------------------------ | -------- | --------------------------------------------------- |
| 1   | 鐩綍缁撴瀯鍚堣               | **PASS** | `packages/web/src/`                                 |
| 2   | 缁勪欢涓夊眰鍒嗙被             | **PASS** | `layout/` `views/` `components/`                    |
| 3   | 璺敱瀹堝崼瀹屾暣閾捐矾        | **PASS** | `router/index.ts:189-215`                           |
| 4   | 鍔ㄦ€佽矾鐢辨潈闄愯繃婊?       | **WARN** | `router/index.ts` 鈥?闈欐€佽矾鐢憋紝鏃?addRoute     |
| 5   | 鎳掑姞杞?                      | **PASS** | `router/index.ts` 鈥?鍏ㄩ儴 `() => import()`        |
| 6   | Setup Store 椋庢牸             | **PASS** | `stores/user.ts:13`                                 |
| 7   | Token 鎸佷箙鍖栭殧绂?          | **PASS** | `stores/user.ts:81-85`                              |
| 8   | generateRoutes 澶辫触鍥為€€    | **WARN** | 鏃犲姩鎬佽矾鐢辩敓鎴愭満鍒?                         |
| 9   | Token 鍒锋柊閿佹満鍒?          | **PASS** | `api/request.ts:99-141`                             |
| 10  | 鐙珛 axios 瀹炰緥             | **PASS** | `api/request.ts:18`                                 |
| 11  | 涓氬姟閿欒鐮佺粺涓€澶勭悊     | **PASS** | `api/request.ts:47-85`                              |
| 12  | X-Request-Id 闃查噸            | **FAIL** | `api/request.ts` 鈥?缂哄け                          |
| 13  | Props interface + withDefaults | **PASS** | `MarkdownEditor.vue:5-30`                           |
| 14  | Emits 绫诲瀷瀹氫箟             | **PASS** | `MarkdownEditor.vue:32-34`                          |
| 15  | manualChunks 鎷嗗垎            | **PASS** | `vite.config.ts:53-105`                             |
| 16  | terser 绉婚櫎 console          | **FAIL** | `vite.config.ts` 鈥?缂哄け                          |
| 17  | v-html + DOMPurify             | **FAIL** | `announcement/detail.vue:15` 鈥?瀛樺偍鍨?XSS 椋庨櫓 |
| 18  | RSA 鍏挜鍔犲瘑瀵嗙爜          | **FAIL** | `login/index.vue:87` 鈥?鏄庢枃瀵嗙爜                |
| 19  | CSRF Token                     | **FAIL** | `api/request.ts` 鈥?缂哄け锛堥闄╀綆锛?             |
| 20  | escapeHtml                     | **WARN** | 鏃犻€氱敤宸ュ叿鍑芥暟                               |

### 缁熻

- **PASS**: 11/20 (55%)
- **WARN**: 3/20 (15%)
- **FAIL**: 6/20 (30%)

### 浼樺厛淇寤鸿锛堟寜椋庨櫓鎺掑簭锛?1. **P0** `announcement/detail.vue:15` 鈥?v-html 鏈?sanitize锛屽瓨鍌ㄥ瀷 XSS

2. **P1** `vite.config.ts` 鈥?鐢熶骇绉婚櫎 console
3. **P1** `eslint.config.mjs` 鈥?娣诲姞 `vue/no-v-html: error`
4. **P2** `api/request.ts` 鈥?娣诲姞 X-Request-Id
5. **P3** 瀵嗙爜 RSA 鍔犲瘑锛堣瀹夊叏鍚堣瑕佹眰锛?6. **P3** CSRF Token锛堝綋鍓?JWT 鏂规椋庨櫓浣庯級
