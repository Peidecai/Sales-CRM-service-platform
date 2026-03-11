Now I have all the code needed for a comprehensive audit. Here are the results:

---

# 寰俊灏忕▼搴忔ā鍧楀鏌ユ姤鍛?

## 1. 寰俊鐧诲綍鏈嶅姟绔?code 浜ゆ崲锛屽墠绔笉鏆撮湶 session_key

**PASS** 鈥?code 浜ゆ崲鍦ㄦ湇鍔＄瀹屾垚

鍓嶇 `stores/user.ts:29` 璋冪敤 `uni.login()` 鑾峰彇涓存椂 code锛岄€氳繃 `authApi.wxLogin({ code })` 鍙戦€佸埌鍚庣銆傛湇鍔＄ `auth.service.ts:270-335` 璋冪敤寰俊 `jscode2session` API锛宻ession_key 浠呭湪鍚庣澶勭悊銆侫PI 浠呰繑鍥?JWT tokens + user info锛屽墠绔?\*鏃犳硶鎺ヨЕ** session_key銆?
**WARN\*\* 鈥?session_key 鏄庢枃瀛樺偍

`miniapp-user.entity.ts:18` 瀛楁娉ㄩ噴鍐欎簡"鍔犲瘑瀛樺偍"锛屼絾 `auth.service.ts:303` 瀹為檯浠ｇ爜鏄細

```typescript
sessionKey: session_key || '',  // 鏄庢枃鐩村啓
```

鏈仛浠讳綍鍔犲瘑銆俿ession_key 鍙В瀵嗙敤鎴锋晱鎰熸暟鎹紙濡傛墜鏈哄彿锛夛紝娉勯湶鏁版嵁搴撳嵆娉勯湶鎵€鏈夌敤鎴风殑 session_key銆?
**寤鸿**: 浣跨敤 AES-256 鍔犲瘑鍚庡瓨鍌紝瑙ｅ瘑鏃剁敤閰嶇疆鐨勫瘑閽ャ€?

---

## 2. API Token 鍒锋柊鏈哄埗澶嶇敤

**PASS** 鈥?鍚庣鏈哄埗瀹屾暣澶嶇敤

- `auth.service.ts:397-469`: `generateTokens()` 鏀寔 `deviceType='miniapp'`锛屼笌 Web 鍏辩敤 Token Family銆丣TI 鐧藉悕鍗曘€佸璁惧韪㈠嚭
- `stores/user.ts:106-120`: 瀹氫箟浜?`refreshAccessToken()` 鏂规硶
- `auth.controller.ts:68-77`: `POST /auth/refresh` 绔偣閫氱敤

**FAIL** 鈥?401 鎷︽埅鍣ㄦ湭鑷姩鍒锋柊 Token

`api/request.ts:70-79`:

```typescript
if (statusCode === 401) {
  uni.removeStorageSync(TOKEN_KEY); // 鐩存帴娓?token
  uni.removeStorageSync(REFRESH_TOKEN_KEY); // 鐩存帴娓?refresh token
  uni.reLaunch({ url: "/pages/login/index" }); // 璺崇櫥褰曢〉
  reject(new Error("Unauthorized"));
}
```

## 閬囧埌 401 鐩存帴鐧诲嚭锛?\*浠庢湭璋冪敤\*\* `refreshAccessToken()`銆傜敤鎴峰湪 Access Token 杩囨湡鍚庝細琚己鍒惰烦杞櫥褰曢〉锛孯efresh Token 褰㈠悓铏氳銆俉eb 绔?axios 鎷︽埅鍣ㄩ€氬父浼氬厛灏濊瘯鍒锋柊鍐嶅け璐ワ紝灏忕▼搴忕缂哄け姝ら€昏緫銆?

## 3. 绂荤嚎闃熷垪瀹炵幇

**PASS** 鈥?闃熷垪鏍稿績瀹炵幇鍙潬

`utils/offline-queue.ts`:

- 鏈€澶?50 鏉?(`MAX_ITEMS = 50`)
- FIFO 涓茶澶勭悊锛宍isFlushing` 閿侀槻骞跺彂
- `uni.onNetworkStatusChange` 鑷姩 flush
- 鏈€澶氶噸璇?3 娆?- `uni.setStorageSync` 鎸佷箙鍖?
  **WARN** 鈥?闆嗘垚鑼冨洿涓嶈冻

浠?`follow-up/create.vue:188-191` 鍦?catch 涓墜鍔ㄥ叆闃熴€俙check-in/index.vue:230`鎵撳崱澶辫触浠?showToast锛?*鏈叆闃?*銆俽equest 灞傛湭鑷姩鍒ゆ柇缃戠粶閿欒鍏ラ槦銆?
**WARN** 鈥?閿欒绫诲瀷鏈尯鍒?`follow-up/create.vue:188`: catch 鎹曡幏**鎵€鏈?\*閿欒锛堝寘鎷湇鍔＄ 400 楠岃瘉閿欒锛夛紝浼氭妸"鍙傛暟鏍￠獙澶辫触"绛変笉搴旈噸璇曠殑璇锋眰涔熷姞鍏ラ槦鍒椼€?
**WARN\*\* 鈥?闃熷垪椤规棤杩囨湡鏈哄埗

## `QueueItem` 鏈?`createdAt` 浣?flush 鏃舵湭妫€鏌ユ椂鏁堛€傚嚑澶╁墠鐨勭绾胯姹備粛浼氳鍙戦€侊紙濡傚垱寤轰簡杩囨湡鐨勮窡杩涜褰曪級銆?

## 4. GPS+鎷嶇収+鏃堕棿鎴充笁閲嶇鍒伴獙璇?

**FAIL** 鈥?涓夐噸楠岃瘉涓嶅畬鏁?
| 缁村害 | 鐘舵€?| 璇︽儏 |
|------|------|------|
| GPS | **WARN** | `check-in/index.vue:158`: 鑾峰彇浜嗗潗鏍囦絾璺濈楠岃瘉鏄崰浣嶄唬鐮?|
| 鎷嶇収 | **WARN** | `sourceType: ['camera']` 闄愬畾鎷嶇収锛堝ソ锛夛紝浣?*鐓х墖鍙€?*銆佷粎浼犳湰鍦拌矾寰勬湭涓婁紶 |
| 鏃堕棿鎴?| **FAIL** | 鍓嶇鏈彂閫佹椂闂存埑锛屽悗绔槸 stub |

鍏蜂綋闂锛? \*_璺濈楠岃瘉涓虹┖澹?_ 鈥?`check-in/index.vue:139-148`:

```typescript
const distanceInfo = computed(() => {
  // ...
  return formatDistance(0); // 鍐欐 0
});
const isWithinRange = computed(() => {
  return true; // 鍐欐 true
});
```

`haversineDistance()` 宸ュ叿鍑芥暟鍦?`geo.ts` 涓凡瀹炵幇浣?*浠庢湭琚皟鐢?*銆? \*_鐓х墖鏈疄闄呬笂浼?_ 鈥?`check-in/index.vue:215-219`:

```typescript
photoUrl: photoPath.value || undefined; // 鍙戦€佺殑鏄湰鍦?tempFilePaths
```

`photoPath` 鏄?`uni.chooseImage` 杩斿洖鐨勪复鏃舵湰鍦拌矾寰勶紙濡?`wxfile://tmp_xxx`锛夛紝涓嶆槸鏈嶅姟绔彲璁块棶鐨?URL銆傜己灏?`uni.uploadFile` 涓婁紶姝ラ銆?
**鐓х墖闈炲繀濉?\* 鈥?`canSubmit` 璁＄畻灞炴€э紙琛?150锛夋湭瑕佹眰 `photoPath`銆?
**鏃犻槻浼畾浣嶆帾鏂?_ 鈥?鏈鏌?`uni.getLocation` 杩斿洖鐨?`accuracy` 瀛楁锛屾棤娉曡瘑鍒ā鎷熷畾浣?APP銆?
\*\*鍚庣鏈疄鐜?_ 鈥?`check-in.ts:43`: 娉ㄩ噴鏍囨敞 `stub API 鈥?backend TODO`銆?

---

## 5. 澶嶇敤 Web 绔?API

**PASS** 鈥?API 绔偣姝ｇ‘澶嶇敤

- 瀹㈡埛銆佽窡杩涖€佸晢鏈虹瓑 CRUD 澶嶇敤鍚屼竴 `/api/v1/*` 璺敱
- `@crm/shared` 绫诲瀷鍦?`package.json` 涓纭紩鐢?- 鏂板绔偣锛坵x-login銆乥ind-phone銆乺oute/optimize锛夊共鍑€鍦版墿灞曚簡鐜版湁 Auth/Route 妯″潡
- 璇锋眰閫傞厤灞?`api/request.ts` 浣跨敤 `uni.request` 鏇夸唬 axios锛堟纭仛娉曪級

**WARN** 鈥?閮ㄥ垎 API 涓?stub

| API                    | 鐘舵€?                   |
| ---------------------- | ------------------------ |
| `/attendance/check-in` | stub锛堝悗绔湭瀹炵幇锛? |
| `/recordings/upload`   | stub锛堝悗绔湭瀹炵幇锛? |
| `/route/optimize`      | 宸插疄鐜?                |

---

## 6. 澶氬睆骞曢€傞厤

**PASS** 鈥?鍩虹閫傞厤鍚堟牸

- 鍏ㄥ眬浣跨敤 `rpx` 鍗曚綅锛堝井淇″皬绋嬪簭鍝嶅簲寮忓儚绱狅級
- Flexbox 寮规€у竷灞€
- `min-height: 100vh` 鍏ㄥ睆
- Modal `max-height: 70vh` 鑷€傚簲

**FAIL** 鈥?缂哄皯瀹夊叏鍖哄煙閫傞厤

鍏ㄥ眬鏈鐞?iPhone X 绯诲垪鍒樻捣/搴曢儴瀹夊叏鍖哄煙銆傚吀鍨嬮棶棰橈細

- `login/index.vue:236`: `position: fixed; bottom: 60rpx` 鈥?鍦?iPhone X 涓?footer 浼氳 Home Indicator 閬尅
- 鑷畾涔?TabBar 鏃?`padding-bottom: env(safe-area-inset-bottom)`
- 鎻愪氦鎸夐挳鍦ㄥ叏闈㈠睆搴曢儴鍙兘琚伄鎸?
  **WARN** 鈥?鏈€冭檻妯睆/骞虫澘

## 鏃?landscape 閫傞厤锛屾棤 iPad 瀹藉睆甯冨眬銆傚浜?CRM 閿€鍞満鏅紙鍙兘鍦ㄥ钩鏉夸笂浣跨敤锛夋槸娼滃湪浣撻獙闂銆?

## 姹囨€?

| 瀹℃煡椤?                   | 缁撴灉          | 鍏抽敭闂                                                              |
| -------------------------- | --------------- | ----------------------------------------------------------------------- |
| 1. 寰俊鐧诲綍 code 浜ゆ崲 | **PASS / WARN** | session_key 鏄庢枃瀛樺偍锛堝簲鍔犲瘑锛?                                 |
| 2. Token 鍒锋柊澶嶇敤      | **FAIL**        | 401 鎷︽埅鍣ㄧ洿鎺ョ櫥鍑猴紝鏈皾璇?refresh                             |
| 3. 绂荤嚎闃熷垪            | **PASS / WARN** | 浠?1 澶勪娇鐢紝鏈尯鍒嗛敊璇被鍨嬶紝鏃犺繃鏈熸竻鐞?                   |
| 4. 涓夐噸绛惧埌楠岃瘉      | **FAIL**        | 璺濈楠岃瘉鍐欐銆佺収鐗囨湭涓婁紶涓斿彲閫夈€佹棤鏃堕棿鎴炽€佸悗绔?stub |
| 5. 澶嶇敤 Web API          | **PASS**        | 2 涓悗绔?stub 寰呭疄鐜?                                                |
| 6. 澶氬睆骞曢€傞厤         | **WARN**        | 缂?safe-area-inset 閫傞厤                                               |
