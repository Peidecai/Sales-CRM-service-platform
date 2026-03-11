---
# 鍛煎彨涓績妯″潡锛圡3锛夐€氫俊绯荤粺瀹℃煡鎶ュ憡

## 瀹℃煡鑼冨洿

娑电洊 `packages/server/src/modules/call/`銆乣agent/`銆乣recording/`銆乣notification/` 浠ュ強 `common/guards/` 涓殑瀹夊叏瀹堝崼銆?
---

## 1. 澶栧懠鍓嶆牎楠岄摼锛堝潗甯┖闂?/ 鍙风爜鍚堟硶 / 榛戝悕鍗?/ 瀹㈡埛褰掑睘锛?

**FAIL** 鈥?鏍￠獙涓ラ噸涓嶈冻

| 瀛愰」             | 缁撹                                                                                                       | 瀹氫綅                     |
| ------------------ | ----------------------------------------------------------------------------------------------------------- | -------------------------- |
| 鍧愬腑绌洪棽妫€鏌? | **FAIL** 鈥?`CallController.dial()` 鏈獙璇佸綋鍓嶇敤鎴?AgentStatus 鏄惁涓?IDLE                            | `call.controller.ts:26-37` |
| 鍙风爜鍚堟硶鎬?    | **WARN** 鈥?`DialDto.calleeNumber` 浠呴獙璇?`@MinLength(1)@MaxLength(20)`锛屾棤鎵嬫満鍙?鍥鸿瘽姝ｅ垯        | `dto/dial.dto.ts:5-9`      |
| 榛戝悕鍗曟鏌?     | **FAIL** 鈥?涓嶅瓨鍦ㄤ换浣曞鍛奸粦鍚嶅崟鏍￠獙閫昏緫                                                       | 鈥?                        |
| 瀹㈡埛褰掑睘       | **FAIL** 鈥?`customerId` 涓哄彲閫夊瓧娈典笖鏃犳墍鏈夋潈楠岃瘉锛孲ALES 瑙掕壊鍙紶鍏ヤ换鎰?customerId 澶栧懠 | `call.service.ts:42-56`    |

> **瀹夊叏椋庨櫓**: SALES 鐢ㄦ埛鍙闈炶嚜宸辩杈栧鎴峰彂璧峰鍛硷紱鏃犲彿鐮佹牸寮忔牎楠岋紝鍙兘鍙戦€佺暩褰㈠彿鐮佸埌鍘傚晢 API銆?

---

## 2. 鍛戒护 + 鐘舵€佸洖璋冩ā寮?

**WARN** 鈥?鍩虹妗嗘灦瀛樺湪锛屼絾瀹炵幇涓嶅畬鏁?
| 瀛愰」 | 缁撹 | 瀹氫綅 |
|------|------|------|
| 鍛煎彨鍛戒护鎺ュ彛 | **PASS** 鈥?瀹屾暣瀹炵幇 dial/answer/hangup/mute/unmute/hold/resume/transfer | `call.controller.ts` |
| 鍘傚晢鍥炶皟澶勭悊 | **WARN** 鈥?浠呭鐞?`call_answered` 鍜?`call_end` 涓ょ浜嬩欢锛岀己灏?`call_ringing`/`call_failed`/`transfer_success` 绛?| `call-callback.service.ts:23-41` |
| 鐘舵€佸悓姝?| **FAIL** 鈥?鍛戒护绔紙濡?`hold()`锛夌洿鎺ュ啓鍏ョ姸鎬?`ON_HOLD`锛屼絾鍥炶皟绔棤瀵瑰簲浜嬩欢澶勭悊锛屽彲鑳藉鑷寸姸鎬佷笉涓€鑷?| `call.service.ts:118-124` vs `call-callback.service.ts` |

---

## 3. 闃块噷浜戝洖璋冮獙绛?/ 闃查噸鏀?/ 鍘婚噸

**WARN** 鈥?绛惧悕鏍￠獙瀹炵幇浣嗗瓨鍦ㄧ己闄凤紱闃查噸鏀炬湭鍚敤

| 瀛愰」             | 缁撹                                                                                                                                                | 瀹氫綅                                                           |
| ------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------- |
| HMAC-SHA256 绛惧悕 | **WARN** 鈥?`CallbackSignatureGuard` 浣跨敤 `signature.toLowerCase() !== expected.toLowerCase()` \**闈炴亽绛夋椂闂存瘮杈?*锛屽瓨鍦ㄦ椂搴忔敾鍑婚闄? | `callback-signature.guard.ts:33`                                 |
| 鎭掔瓑鏃堕棿姣旇緝 | **PASS** 鈥?`HmacSignatureGuard` 姝ｇ‘浣跨敤 `timingSafeEqual`                                                                                       | `hmac-signature.guard.ts:57-58`                                  |
| 闃查噸鏀?          | **FAIL** 鈥?`CallbackSignatureGuard` 鏈紩鍏?timestamp 鎴?nonce 鏍￠獙锛沗ReplayAttackGuard` 宸插疄鐜颁絾\**鏈簲鐢?*鍒板洖璋冩帴鍙?                 | `call-callback.controller.ts:14` 浠呯敤 `CallbackSignatureGuard` |
| 鍘婚噸             | **FAIL** 鈥?鍥炶皟澶勭悊鏃犲箓绛夋€т繚璇侊紝鍚屼竴 `call_end` 浜嬩欢閲嶅鎺ㄩ€佷細鍙嶅鎵ц `update()`                                               | `call-callback.service.ts:31-40`                                 |

> **瀹夊叏椋庨櫓**: 鍥炶皟绛惧悕鏍￠獙鍙鏃跺簭鏀诲嚮鐮磋В锛涙棤闃查噸鏀炬剰鍛崇潃鏀诲嚮鑰呮埅鑾峰悎娉曞洖璋冨彲鏃犻檺閲嶆斁銆?

---

## 4. 鏉ョ數鍙风爜鍖归厤浼樺厛绾?

**PASS** 鈥?璁捐鍚堢悊

| 瀛愰」          | 缁撹                                                                                                                | 瀹氫綅                                                                   |
| --------------- | -------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------ |
| 鍙风爜褰掍竴鍖? | **PASS** 鈥?`normalizePhone()` 鍘婚櫎绌烘牸/妯嚎銆佸幓闄?+86 鍓嶇紑銆佹敮鎸佹墜鏈哄彿鍜屽浐璇濇牸寮?                | `customer-matcher.service.ts:16-21`                                      |
| 鍖归厤浼樺厛绾? | **PASS** 鈥?鍏堟煡 `customers.phone` 鈫?鍐嶆煡 `contacts.mobile/landline` 鈫?杩斿洖 null                             | `customer-matcher.service.ts:32-58`                                      |
| 鍏宠仈瀹屾暣鎬? | **WARN** 鈥?鏈煡璇?`call_records` 鍘嗗彶鏉ュ尮閰嶅彿鐮侊紙`source: 'history'` 鍦?MatchResult 涓畾涔変絾鏈疄鐜帮級 | `customer-matcher.service.ts:10` 瀹氫箟浜?`'history'` 浣嗕唬鐮佹湭浣跨敤 |

---

## 5. 寮瑰睆鏁版嵁瀹屾暣鎬?

**WARN** 鈥?鍩虹鏁版嵁瀹屾暣锛屼絾閮ㄥ垎瀛楁缂哄け

| 瀛愰」            | 缁撹                                                                                   | 瀹氫綅                                                                   |
| ----------------- | --------------------------------------------------------------------------------------- | ------------------------------------------------------------------------ |
| 瀹㈡埛鍩烘湰淇℃伅 | **PASS** 鈥?杩斿洖瀹屾暣 Customer 瀹炰綋                                                | `popup-aggregate.service.ts:31-36`                                       |
| 鑱旂郴浜轰俊鎭?   | **PASS** 鈥?褰?contactId 鍛戒腑鏃惰繑鍥?id/name/mobile/landline                         | `popup-aggregate.service.ts:49-65`                                       |
| 鏈€杩戣窡杩?      | **PASS** 鈥?杩斿洖鏈€杩?3 鏉?FollowUp 璁板綍                                            | `popup-aggregate.service.ts:39-43`                                       |
| 涓婃閫氳瘽鎽樿  | **PASS** 鈥?杩斿洖鏈€鏂?`aiSummary`                                                     | `popup-aggregate.service.ts:44-48`                                       |
| 寰呭姙浜嬮」      | **FAIL** 鈥?`todos` 瀛楁纭紪鐮佽繑鍥炵┖鏁扮粍 `[]`                                    | `popup-aggregate.service.ts:72`                                          |
| 鍟嗘満淇℃伅       | **FAIL** 鈥?寮瑰睆鏁版嵁鏈寘鍚瀹㈡埛鍏宠仈鐨勫晢鏈哄垪琛?                            | `popup-aggregate.service.ts:9-15` PopupData 鎺ュ彛鏃?opportunities 瀛楁 |
| 瀹㈡埛鏍囩       | **WARN** 鈥?鏈繑鍥炲鎴锋爣绛?鍒嗙被锛岄攢鍞汉鍛樺脊灞忔椂鏃犳硶蹇€熻瘑鍒鎴风敾鍍? | 鈥?                                                                      |

---

## 6. 褰曢煶瀛樺偍璺緞瑙勮寖

**WARN** 鈥?鏈夎璁′絾涓哄崰浣嶅疄鐜?
| 瀛愰」 | 缁撹 | 瀹氫綅 |
|------|------|------|
| OSS Key 鏍煎紡 | **PASS** 鈥?娉ㄩ噴瑙勮寖涓?`recordings/{yyyyMMdd}/{callRecordId}_{uuid}.wav` | `oss-recording.service.ts:16` |
| 瀹為檯瀹炵幇 | **FAIL** 鈥?`uploadFromUrl()` 涓?TODO 鍗犱綅锛岀洿鎺?`return key` 鏃犲疄闄?OSS 涓婁紶 | `oss-recording.service.ts:20` |
| 褰曢煶鏂囦欢鍏冩暟鎹?| **PASS** 鈥?`RecordingFile` 瀹炰綋鍖呭惈 `ossKey`/`ossBucket`/`fileSize`/`durationSeconds`/`mimeType` | `recording-file.entity.ts` |

---

## 7. STS 涓存椂鍑瘉 / 鐭椂绛惧悕 URL

**FAIL** 鈥?鏈疄鐜?STS锛屼娇鐢ㄥ崰浣嶇鍚?URL

| 瀛愰」              | 缁撹                                                                                      | 瀹氫綅                        |
| ------------------- | ------------------------------------------------------------------------------------------ | ----------------------------- |
| STS 涓存椂鍑瘉     | **FAIL** 鈥?鏃?STS锛圫ecurity Token Service锛夎鑹叉壆婕斿疄鐜帮紝鏈娇鐢ㄤ复鏃?AK/SK      | 鈥?                           |
| 绛惧悕 URL 鐢熸垚   | **FAIL** 鈥?`getSignedUrl()` 杩斿洖纭紪鐮佸亣 URL `https://example.com/recordings/...`    | `oss-recording.service.ts:30` |
| URL 鏈夋晥鏈熸帶鍒? | **WARN** 鈥?榛樿 3600s锛?h锛夛紝ASR 鐢?7200s锛?h锛夛紱鍙傛暟璁捐鍚堢悊浣嗘棤瀹為檯绛惧悕 | `recording.service.ts:91`     |

> **瀹夊叏椋庨櫓**: 褰曢煶鏂囦欢鍖呭惈鏁忔劅瀹㈡埛瀵硅瘽鍐呭锛屽繀椤讳娇鐢?STS 涓存椂鍑瘉 + 鐭椂绛惧悕 URL 璁块棶銆?

---

## 8. 閫氳瘽 <8s 璺宠繃 ASR

**FAIL** 鈥?鏈疄鐜扮煭閫氳瘽璺宠繃閫昏緫

| 瀛愰」          | 缁撹                                                                                 | 瀹氫綅                       |
| --------------- | ------------------------------------------------------------------------------------- | ---------------------------- |
| 鏃堕暱鍒ゆ柇    | **FAIL** 鈥?`triggerAsr()` 鍜?`runAsrForTask()` 鏃犱换浣?duration 妫€鏌?              | `recording.service.ts:76-96` |
| ASR 璧勬簮娴垂 | **WARN** 鈥?0 绉?鏃犳帴閫氶€氳瘽鐨勫綍闊充篃浼氳鎻愪氦鍒拌椋?ASR锛屾氮璐?API 棰濆害 | 鈥?                          |

> 寤鸿: 鍦?`triggerAsr()` 鍏ュ彛鍒ゆ柇 `recording.durationSeconds < 8` 鏃剁洿鎺ヨ繑鍥烇紝涓嶅垱寤?ASR 浠诲姟銆?

---

## 9. ASR 澶辫触閲嶈瘯 + 浜哄伐琛ュ綍

**WARN** 鈥?閲嶈瘯鏈哄埗瀛樺湪锛屼汉宸ヨˉ褰曠己澶?
| 瀛愰」 | 缁撹 | 瀹氫綅 |
|------|------|------|
| 鑷姩閲嶈瘯 | **PASS** 鈥?Bull 闃熷垪閰嶇疆 `attempts: 3, backoff: { type: 'exponential', delay: 5000 }` | `recording.service.ts:93-94` |
| 澶辫触鐘舵€佽褰?| **PASS** 鈥?catch 鍧楀皢鐘舵€佽涓?`FAILED` 骞朵繚瀛?`errorMessage` | `recording.service.ts:147-151` |
| 浜哄伐琛ュ綍/缂栬緫 | **FAIL** 鈥?鏃犳墜鍔ㄧ紪杈戣浆鍐欑粨鏋滅殑 API 绔偣 | `recording.controller.ts` 鏃?POST/PUT transcript 鎺ュ彛 |
| 澶辫触閫氱煡 | **FAIL** 鈥?ASR 澶辫触鏈€氱煡鐩稿叧鐢ㄦ埛锛堟棤 NotificationService 璋冪敤锛?| `recording.service.ts:147-153` |

---

## 10. 褰曢煶鐢熷懡鍛ㄦ湡绠＄悊

**FAIL** 鈥?鏃犵敓鍛藉懆鏈熺鐞?
| 瀛愰」 | 缁撹 | 瀹氫綅 |
|------|------|------|
| 杩囨湡鑷姩褰掓。 | **FAIL** 鈥?鏃犲畾鏃朵换鍔℃竻鐞嗘垨杩佺Щ杩囨湡褰曢煶 | 鈥?|
| 淇濈暀绛栫暐閰嶇疆 | **FAIL** 鈥?鏃犲綍闊充繚鐣欏ぉ鏁伴厤缃紙濡傛硶寰嬭姹?6 涓湀淇濈暀锛?| 鈥?|
| 鍒犻櫎鑱斿姩 | **FAIL** 鈥?`CallRecord` 杞垹闄ゆ椂鏈鐞嗗叧鑱?`RecordingFile` | 鈥?|
| 瀛樺偍缁熻 | **FAIL** 鈥?鏃犲綍闊冲瓨鍌ㄧ敤閲忕粺璁?棰勮鏈哄埗 | 鈥?|

---

## 11. WSS JWT 閴存潈

**PASS** 鈥?瀹炵幇瀹屾暣涓斿畨鍏?
| 瀛愰」 | 缁撹 | 瀹氫綅 |
|------|------|------|
| Token 鎻愬彇 | **PASS** 鈥?浼樺厛 `handshake.auth.token`锛宖allback 鍒?`handshake.query.token` | `notification.gateway.ts:147-160` |
| JWT 楠岃瘉 | **PASS** 鈥?浣跨敤 `jwtService.verify()` 楠岃瘉绛惧悕鍜屾湁鏁堟湡 | `notification.gateway.ts:164` |
| Token 榛戝悕鍗?| **PASS** 鈥?璋冪敤 `authService.isTokenBlacklisted(token)` 妫€鏌ュ凡娉ㄩ攢 Token | `notification.gateway.ts:171` |
| 鏃?Token 鎷掔粷 | **PASS** 鈥?缂哄け/鏃犳晥 Token 绔嬪嵆 `client.disconnect(true)` | `notification.gateway.ts:73-82` |
| 鐢ㄦ埛鏄犲皠 | **PASS** 鈥?`userSockets` / `socketUsers` 鍙屽悜鏄犲皠绠＄悊杩炴帴 | `notification.gateway.ts:55-58` |

---

## 12. 蹇冭烦 PING/PONG 30s

**WARN** 鈥?渚濊禆 Socket.IO 榛樿閰嶇疆锛屾湭鏄惧紡閰嶇疆

| 瀛愰」             | 缁撹                                                                                  | 瀹氫綅                          |
| ------------------ | -------------------------------------------------------------------------------------- | ------------------------------- |
| 蹇冭烦閰嶇疆       | **WARN** 鈥?`@WebSocketGateway()` 鏈厤缃?`pingInterval`/`pingTimeout`                 | `notification.gateway.ts:39-45` |
| Socket.IO 榛樿鍊? | Socket.IO 榛樿 `pingInterval: 25000, pingTimeout: 20000`锛?5s+20s鈮?5s 鏂紑妫€娴嬶級 | 妗嗘灦榛樿                     |
| 鏄惧紡 30s 閰嶇疆  | **FAIL** 鈥?鏈寜闇€姹傞厤缃?30s 闂撮殧锛涘綋鍓嶄负 25s锛堜粎宸?5s锛岄闄╀綆锛?        | 鈥?                             |

> 寤鸿: 鍦?`@WebSocketGateway()` 瑁呴グ鍣ㄤ腑鏄惧紡閰嶇疆 `pingInterval: 30000, pingTimeout: 15000`銆?

---

## 13. callId 浜嬩欢鎸夊簭

**FAIL** 鈥?鏃犱簨浠舵帓搴忎繚璇?
| 瀛愰」 | 缁撹 | 瀹氫綅 |
|------|------|------|
| 鍥炶皟鏃跺簭 | **FAIL** 鈥?`CallCallbackService.handleCallback()` 鏃犲簭鍒楀彿/鏃堕棿鎴虫瘮杈冿紝鍘傚晢鍥炶皟涔卞簭锛堝 `call_end` 鍏堜簬 `call_answered`锛変細瀵艰嚧鐘舵€侀敊璇?| `call-callback.service.ts:18-41` |
| 涔愯閿?| **FAIL** 鈥?浣跨敤 `Repository.update()` 鐩存帴瑕嗗啓 status锛屾棤 WHERE status 鏉′欢鎴栫増鏈彿 | `call-callback.service.ts:24-28` |
| 浜嬩欢鎺掗槦 | **FAIL** 鈥?鏈娇鐢?Bull/Redis 闃熷垪鎸?callId 涓茶澶勭悊鍥炶皟浜嬩欢 | 鈥?|

> **瀹夊叏椋庨櫓**: 鍥炶皟涔卞簭鍙鑷村凡缁撴潫閫氳瘽鐘舵€佽瑕嗗啓涓?CONNECTED锛岄€犳垚鍧愬腑鐘舵€佺磰涔便€?

---

## 14. 瀹㈡埛绔簨浠跺幓閲?

**FAIL** 鈥?鏃犲幓閲嶆満鍒?
| 瀛愰」 | 缁撹 | 瀹氫綅 |
|------|------|------|
| 閫氱煡鍘婚噸 | **FAIL** 鈥?`NotificationGateway.broadcast()` 鍜?`sendToUser()` 鏃?eventId/鍘婚噸閫昏緫 | `notification.gateway.ts:109-125` |
| 瀹㈡埛绔幓閲?| **FAIL** 鈥?鍓嶇 `useNotification.ts` 鏃犲熀浜?eventId 鎴?timestamp 鐨勫幓閲?| 鍓嶇 composable |
| 骞傜瓑鏍囪瘑 | **FAIL** 鈥?`NotificationPayload` 鎺ュ彛鏃?`id`/`eventId` 瀛楁 | `notification.types.ts:47-63` |

---

## 15. 鍧愬腑鐘舵€佹満鍚堟硶鎬?

**PASS** 鈥?涓ユ牸鐨勬湁闄愮姸鎬佹満

| 瀛愰」            | 缁撹                                                      | 瀹氫綅                          |
| ----------------- | ---------------------------------------------------------- | ------------------------------- |
| 鐘舵€佸畾涔?      | **PASS** 鈥?5 涓姸鎬? `IDLE/BUSY/ON_CALL/WRAP_UP/OFFLINE` | `agent-status.service.ts:8-13`  |
| 杞崲鐧藉悕鍗?    | **PASS** 鈥?`ALLOWED_TRANSITIONS` 鏄庣‘瀹氫箟鍚堟硶杞崲   | `agent-status.service.ts:18-24` |
| 闈炴硶杞崲鎷掔粷 | **PASS** 鈥?闈炴硶杞崲鎶涘嚭 `BadRequestException`        | `agent-status.service.ts:45-48` |
| Redis 鎸佷箙鍖?   | **PASS** 鈥?鐘舵€佸瓨 Redis锛屾敮鎸佸垎甯冨紡涓€鑷存€?     | `agent-status.service.ts:50`    |
| 鐘舵€佹棩蹇?      | **PASS** 鈥?姣忔杞崲鍐欏叆 `agent_status_logs`           | `agent-status.service.ts:56-63` |

**WARN** 鈥?鐘舵€佹満缂哄皯閮ㄥ垎杞崲璺緞:

- `BUSY 鈫?IDLE`锛堝懠鍙け璐ユ湭鎺ラ€氭椂闇€瑕佸洖閫€锛?- `ON_CALL 鈫?IDLE`锛堜笉缁忚繃 WRAP_UP 鐩存帴绌洪棽锛?- `BUSY 鈫?OFFLINE`锛堢揣鎬ョ閫€锛?- 褰撳墠 `BUSY` 鍙兘杞埌 `ON_CALL`锛屾棤娉曞鐞嗗鍛煎け璐ュ満鏅?

---

## 16. WRAP_UP 瓒呮椂鑷姩鍥為€€

**PASS** 鈥?璁捐鍚堢悊

| 瀛愰」       | 缁撹                                                                                                                                                     | 瀹氫綅                             |
| ------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------- |
| 瓒呮椂闃堝€? | **PASS** 鈥?120 绉?(2 鍒嗛挓)                                                                                                                             | `agent-status.service.ts:71`       |
| 瀹氭椂鎵弿  | **PASS** 鈥?`@Cron('0 * * * * *')` 姣忓垎閽熸鏌ヤ竴娆?                                                                                                   | `agent-wrap-up.scheduler.ts:9`     |
| 鑷姩鍥為€€  | **PASS** 鈥?瓒呮椂鍧愬腑鑷姩 `transition(agentId, IDLE, 'auto_timeout')`                                                                                 | `agent-wrap-up.scheduler.ts:13`    |
| Redis TTL    | **WARN** 鈥?`REDIS_KEY_WRAP_UP_AT` TTL 璁句负 300s锛?min锛夛紝浣嗚秴鏃堕槇鍊间负 120s锛汿TL 搴?鈮?瓒呮椂闃堝€?+ 鎵弿闂撮殧锛屽綋鍓嶅€煎悎鐞嗕絾鍋忎繚瀹? | `agent-status.service.ts:52`       |
| 閿欒闅旂   | **PASS** 鈥?姣忎釜鍧愬腑鐨?transition 閿欒琚?try/catch 闅旂                                                                                             | `agent-wrap-up.scheduler.ts:13-16` |

**WARN** 鈥?`getWrapUpOverdueAgentIds()` 浣跨敤 `KEYS` 鍛戒护鎵弿 Redis锛?

> 鍦ㄥ潗甯噺澶ф椂 `KEYS agent:wrap_up_at:*` 鍙兘闃诲 Redis锛圤(N) 鍏ㄥ簱鎵弿锛夈€傚缓璁敼鐢?Redis `SCAN` 鎴栫淮鎶や竴涓?`agent:wrap_up_set` 鐨?ZSET锛坰core=鏃堕棿鎴筹級銆?>
> 瀹氫綅: `agent-status.service.ts:69`

---

## 17. 鍛煎彨鍒嗛厤绛栫暐

**WARN** 鈥?妗嗘灦瀛樺湪浣嗗疄鐜颁笉瀹屾暣

| 瀛愰」             | 缁撹                                                                                                              | 瀹氫綅                               |
| ------------------ | ------------------------------------------------------------------------------------------------------------------ | ------------------------------------ |
| 绛栫暐鎺ュ彛       | **PASS** 鈥?鏀寔 `round_robin/least_calls/skill_based` 涓夌绛栫暐                                                | `call-distribution.service.ts:22-37` |
| Round Robin        | **WARN** 鈥?浣跨敤 Redis 瀛樺偍 `last_assigned_index`锛屼絾绔炴€佹潯浠朵笅鍙兘閲嶅鍒嗛厤锛堢己灏戝師瀛愭搷浣滐級 | `call-distribution.service.ts:28-31` |
| Least Calls        | **FAIL** 鈥?鐩存帴杩斿洖 `idleAgentIds[0]`锛屾棤瀹為檯鏈€灏戦€氳瘽鏁版煡璇?                                        | `call-distribution.service.ts:34`    |
| Skill Based        | **FAIL** 鈥?鏈疄鐜帮紝鐩存帴杩斿洖 `idleAgentIds[0]`锛沗\_options?.skillIds` 鏈娇鐢?                             | `call-distribution.service.ts:36`    |
| 鍧愬腑鍒楄〃鏋勫缓 | **WARN** 鈥?`AgentController.available()` 浣跨敤 N+1 鏌ヨ閫愪竴妫€鏌ュ潗甯姸鎬?                                  | `agent.controller.ts:68-79`          |

---

## 姹囨€昏〃

| #   | 瀹℃煡椤?                | 缁撹    | 瀹夊叏椋庨櫓                                         |
| --- | ----------------------- | -------- | ---------------------------------------------------- |
| 1   | 澶栧懠鍓嶆牎楠岄摼      | **FAIL** | **HIGH** 鈥?鏃犲潗甯姸鎬佹鏌?榛戝悕鍗?褰掑睘楠岃瘉 |
| 2   | 鍛戒护 + 鐘舵€佸洖璋?   | **WARN** | MEDIUM 鈥?鍥炶皟浜嬩欢瑕嗙洊涓嶅叏                   |
| 3   | 闃块噷浜戝洖璋冮獙绛?   | **WARN** | **HIGH** 鈥?鏃跺簭鏀诲嚮 + 鏃犻槻閲嶆斁              |
| 4   | 鏉ョ數鍙风爜鍖归厤      | **PASS** | LOW                                                  |
| 5   | 寮瑰睆鏁版嵁瀹屾暣鎬?   | **WARN** | LOW 鈥?缂哄皯鍟嗘満/寰呭姙                           |
| 6   | 褰曢煶瀛樺偍璺緞       | **WARN** | MEDIUM 鈥?浠呭崰浣嶅疄鐜?                            |
| 7   | STS 涓存椂鍑瘉         | **FAIL** | **HIGH** 鈥?鏃犲疄闄呯鍚?URL                        |
| 8   | 閫氳瘽 <8s 璺?ASR       | **FAIL** | LOW 鈥?璧勬簮娴垂                                   |
| 9   | ASR 閲嶈瘯+浜哄伐琛ュ綍 | **WARN** | LOW 鈥?閲嶈瘯鏈夈€佷汉宸ョ己                         |
| 10  | 褰曢煶鐢熷懡鍛ㄦ湡      | **FAIL** | MEDIUM 鈥?鏃犳竻鐞嗙瓥鐣?                            |
| 11  | WSS JWT 閴存潈          | **PASS** | 鈥?                                                  |
| 12  | 蹇冭烦 PING/PONG        | **WARN** | LOW                                                  |
| 13  | callId 浜嬩欢鎸夊簭     | **FAIL** | **HIGH** 鈥?涔卞簭鑷寸姸鎬侀敊璇?                    |
| 14  | 瀹㈡埛绔簨浠跺幓閲?    | **FAIL** | MEDIUM 鈥?鏃?eventId                                 |
| 15  | 鍧愬腑鐘舵€佹満         | **PASS** | LOW 鈥?缂哄皯鍥為€€璺緞                             |
| 16  | WRAP_UP 瓒呮椂          | **PASS** | LOW 鈥?KEYS 鍛戒护鎬ц兘                              |
| 17  | 鍛煎彨鍒嗛厤绛栫暐      | **WARN** | MEDIUM 鈥?2/3 绛栫暐鏈疄鐜?                         |

### 缁熻

- **PASS**: 5 椤?(4, 11, 15, 16, 閮ㄥ垎 3)
- **WARN**: 6 椤?(2, 5, 6, 9, 12, 17)
- **FAIL**: 6 椤?(1, 7, 8, 10, 13, 14)
- **HIGH 瀹夊叏椋庨櫓**: 4 椤?(#1 澶栧懠鏍￠獙, #3 鍥炶皟楠岀, #7 STS 鍑瘉, #13 浜嬩欢鎸夊簭)

### 浼樺厛淇寤鸿 (P0)

1. **#3 鍥炶皟绛惧悕** 鈥?`CallbackSignatureGuard` 鏀圭敤 `timingSafeEqual`锛屽彔鍔?`ReplayAttackGuard`
2. **#1 澶栧懠鏍￠獙** 鈥?`dial()` 澧炲姞鍧愬腑 IDLE 妫€鏌?+ `calleeNumber` 姝ｅ垯 + 瀹㈡埛褰掑睘楠岃瘉
3. **#13 浜嬩欢鎺掑簭** 鈥?鍥炶皟澶勭悊澧炲姞 `WHERE status != 'ENDED'` 鏉′欢鎴栧紩鍏ョ増鏈彿涔愯閿?4. **#7 STS/绛惧悕 URL** 鈥?瀵规帴闃块噷浜?STS AssumeRole + OSS SDK `signatureUrl()`
