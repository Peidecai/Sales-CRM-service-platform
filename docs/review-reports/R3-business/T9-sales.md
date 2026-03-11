I now have all the information needed. Here is the complete audit report:

---

# M2 閿€鍞祦绋嬫ā鍧楀鏌ユ姤鍛?

## 涓€銆佸晢鏈?(Opportunity)

### 1. 闃舵鎺ㄨ繘鍑嗗叆鏉′欢鏍￠獙

**FAIL** | `opportunity.service.ts:137-181`

`updateStage()` 鐩存帴鎺ュ彈浠绘剰闃舵鍊硷紝鏃犱换浣曞噯鍏ユ牎楠岋細

- 鏃?蹇呴』濉啓鑱旂郴浜烘墠鑳芥帹杩涘埌 QUALIFIED"涔嬬被鐨?gate check
- LEAD 鍙洿鎺ヨ烦鍒?CLOSED_WON锛屾棤闇€缁忚繃涓棿闃舵
- `UpdateStageDto` 浠呮湁涓€涓?`stage` 瀛楁锛屾棤 gate 鏉′欢瀛楁

```typescript
// opportunity.service.ts:147-149 鈥?鐩存帴璧嬪€硷紝闆舵牎楠?opportunity.stage = dto.stage
opportunity.probability = toProbability;
const saved = await this.opportunityRepository.save(opportunity);
```

### 2. 璧㈠崟瑕佹眰宸茶缃悎鍚?**FAIL** | 妯″潡涓嶅瓨鍦?

- 鏁翠釜浠ｇ爜搴撴棤 `contract` 妯″潡锛坄packages/server/src/modules/contract/` 涓嶅瓨鍦級
- `updateStage()` 鎺ㄨ繘鍒?`CLOSED_WON` 鏃舵棤浠讳綍鍚堝悓鏍￠獙
- Opportunity 瀹炰綋鏃犲悎鍚屽叧鑱斿瓧娈?

### 3. 涓㈠崟寮哄埗濉啓鍘熷洜

**FAIL** | `dto/update-stage.dto.ts:1-10`

`UpdateStageDto` 浠呮帴鍙?`stage` 瀛楁銆傛帹杩涘埌 `CLOSED_LOST` 鏃讹細

- 鏃?`lossReason`/`closeReason` 蹇呭～鏍￠獙
- 瀹炰綋铏芥湁 `closeReason` 鍜?`closeRemark` 瀛楁锛坄opportunity.entity.ts:78-82`锛夛紝浣?stage 鏇存柊閫昏緫瀹屽叏鏈啓鍏ヨ繖浜涘瓧娈?

### 4. 闃舵鍥為€€浠呭厑璁稿墠涓€闃舵

**FAIL** | `opportunity.service.ts:137-181`

鏃犱换浣曢樁娈垫柟鍚戞€ф牎楠屻€傚綋鍓嶅彲浠ワ細

- NEGOTIATION 鈫?LEAD锛堣法闃舵鍥為€€锛?- CLOSED_WON 鈫?LEAD锛堝凡鎴愪氦閲嶆柊鎵撳紑锛?- 浠绘剰璺宠穬锛屾棤闄愬埗

### 5. weighted_amount 鑷姩璁＄畻

**FAIL** | `opportunity.entity.ts:62-70`, `opportunity.service.ts:54-67,137-181`

瀹炰綋瀹氫箟浜?`weightedAmount` 瀛楁锛坄decimal(14,2)`锛夛紝浣?*浠庢湭琚绠?*锛?- `create()`: 鏈缃?`weightedAmount = amount \* probability / 100`

- `updateStage()`: 鏇存柊 probability 鍚庢湭閲嶇畻 weightedAmount
- `update()`: 淇敼 amount/probability 鍚庢湭閲嶇畻 weightedAmount
- 瀛楁姘歌繙涓洪粯璁ゅ€?`0`

---

## 浜屻€佹姤浠?(Quotation)

### 6. 琛岄」閲戦璁＄畻鍏紡姝ｇ‘

**FAIL** | 妯″潡涓嶅瓨鍦?
鏃?`quote`/`quotation` 妯″潡銆俙packages/server/src/modules/` 涓嬩笉瀛樺湪鎶ヤ环鐩稿叧鐩綍銆?

### 7. 鎬婚噾棰濊绠楀叕寮忔纭?**FAIL** | 妯″潡涓嶅瓨鍦?

鍚屼笂銆?

### 8. 鎶樻墸瓒?0%瑙﹀彂瀹℃壒

**FAIL** | 妯″潡涓嶅瓨鍦?
鏃犳姤浠锋ā鍧楋紝鏃犳姌鎵ｅ瓧娈碉紝鏃犲鎵硅Е鍙戦€昏緫銆?

---

## 涓夈€佸悎鍚?(Contract)

### 9. 瀹℃壒鎸夐噾棰濆垎绾?**FAIL** | 妯″潡涓嶅瓨鍦?

鏃?`contract` 妯″潡銆俙packages/server/src/modules/contract/` 涓嶅瓨鍦ㄣ€?

### 10. unpaid_amount 鐢熸垚鍒锋柊

**FAIL** | 妯″潡涓嶅瓨鍦?
鍚屼笂銆?

### 11. 鍒版湡缁害鎻愰啋

**FAIL** | 妯″潡涓嶅瓨鍦?
鍚屼笂銆?

---

## 鍥涖€佸洖娆?(Payment/Collection)

### 12. 瓒呬粯鏍￠獙 <= 105%

**FAIL** | 妯″潡涓嶅瓨鍦?
鏃?`payment`/`receivable`/`collection` 妯″潡銆?

### 13. 閫炬湡鑷姩鏍囪

**FAIL** | 妯″潡涓嶅瓨鍦?
鍚屼笂銆?

---

## 浜斻€佸鎵瑰紩鎿?(Approval Engine)

### 14. 鑺傜偣閰嶇疆锛堟寚瀹氫汉/瑙掕壊/浼氱/鏉′欢/瓒呮椂锛?**FAIL** | 妯″潡涓嶅瓨鍦?

鏃?`approval`/`workflow` 妯″潡銆俙packages/server/src/modules/` 涓嬩笉瀛樺湪銆?

### 15. 鎾ゅ洖鏉′欢鏍￠獙

**FAIL** | 妯″潡涓嶅瓨鍦?

### 16. 瓒呮椂姊害鎻愰啋

**FAIL** | 妯″潡涓嶅瓨鍦?

### 17. 瀹屾垚鍥炶皟

## **FAIL** | 妯″潡涓嶅瓨鍦?

## 鍏€佺洰鏍囦笌涓氱哗 (Sales Target)

### 18. 鐩爣鍒嗚В灞傜骇

**WARN** | `sales-target.service.ts:137-179`

鍩烘湰鍒嗚В閫昏緫瀛樺湪涓旀纭細

- company 鈫?team, team 鈫?individual锛坄line 149`锛?- 鍒嗚В鎬诲€间笂闄愭牎楠岋細`totalAllocated > parent.targetValue \* 1.001`锛坄line 142`锛屽惈 0.1% 娴偣瀹瑰樊锛?
  **瀛樺湪椋庨櫓**锛?- 鏃犻槻姝㈤噸澶嶅垎瑙ｆ牎楠岋紙鍚屼竴鐖剁洰鏍囧彲鍙嶅鍒嗚В锛屽瓙鐩爣鍊肩疮璁″彲鑳借繙瓒呯埗鐩爣锛?- 鏃犻槻姝?individual 绾у啀鍒嗚В鏍￠獙锛堜唬鐮佷腑 individual 鈫?浼氬彉鎴愪粈涔?scope锛燂級
- DB 灞傛棤鍞竴绾︽潫淇濇姢

### 19. 鎺掕姒滃敮涓€绾︽潫

**WARN** | `sales-target.service.ts:400-455`, `performance-ranking.entity.ts`

- 搴旂敤灞傛湁閲嶅妫€鏌ワ紙`line 408-413`锛夛紝浣嗘煡璇㈡潯浠朵负 `{ snapshotDate, year, month }` 鈥斺€?**缂哄皯 metricType 杩囨护**锛屽綋绗竴涓?metricType 鐨勫揩鐓у瓨鍦ㄦ椂锛屾墍鏈夊叾浠?metricType 鐨勫揩鐓ч兘浼氳璺宠繃
- PerformanceRanking 瀹炰綋鏃?`@Unique` 绾︽潫锛孌B 灞傛棤闃查噸淇濇姢
- 閮ㄥ垎澶辫触鍚庨噸璺戜細浜х敓閲嶅鏁版嵁

---

## 瀹℃煡姹囨€?

| #   | 瀹℃煡椤?                    | 缁撴灉   | 瀹氫綅                                              |
| --- | --------------------------- | -------- | --------------------------------------------------- |
| 1   | 闃舵鎺ㄨ繘鍑嗗叆鏉′欢      | **FAIL** | `opportunity.service.ts:137-181`                    |
| 2   | 璧㈠崟瑕佹眰宸茶缃悎鍚?   | **FAIL** | contract 妯″潡涓嶅瓨鍦?                             |
| 3   | 涓㈠崟寮哄埗濉啓鍘熷洜     | **FAIL** | `update-stage.dto.ts` 缂?lossReason                 |
| 4   | 闃舵鍥為€€浠呭墠涓€闃舵   | **FAIL** | `opportunity.service.ts:147` 鏃犳柟鍚戞牎楠?        |
| 5   | weighted_amount 鑷姩璁＄畻 | **FAIL** | create/update/updateStage 鍧囨湭璁＄畻              |
| 6   | 琛岄」閲戦璁＄畻           | **FAIL** | quotation 妯″潡涓嶅瓨鍦?                            |
| 7   | 鎬婚噾棰濊绠?              | **FAIL** | quotation 妯″潡涓嶅瓨鍦?                            |
| 8   | 鎶樻墸>60%瑙﹀彂瀹℃壒       | **FAIL** | quotation 妯″潡涓嶅瓨鍦?                            |
| 9   | 瀹℃壒鎸夐噾棰濆垎绾?        | **FAIL** | contract 妯″潡涓嶅瓨鍦?                             |
| 10  | unpaid_amount 鍒锋柊        | **FAIL** | contract 妯″潡涓嶅瓨鍦?                             |
| 11  | 鍒版湡缁害鎻愰啋           | **FAIL** | contract 妯″潡涓嶅瓨鍦?                             |
| 12  | 瓒呬粯鏍￠獙<=105%          | **FAIL** | payment 妯″潡涓嶅瓨鍦?                              |
| 13  | 閫炬湡鑷姩鏍囪            | **FAIL** | payment 妯″潡涓嶅瓨鍦?                              |
| 14  | 瀹℃壒鑺傜偣閰嶇疆           | **FAIL** | approval 妯″潡涓嶅瓨鍦?                             |
| 15  | 鎾ゅ洖鏉′欢鏍￠獙           | **FAIL** | approval 妯″潡涓嶅瓨鍦?                             |
| 16  | 瓒呮椂姊害鎻愰啋           | **FAIL** | approval 妯″潡涓嶅瓨鍦?                             |
| 17  | 瀹屾垚鍥炶皟                | **FAIL** | approval 妯″潡涓嶅瓨鍦?                             |
| 18  | 鐩爣鍒嗚В灞傜骇            | **WARN** | `sales-target.service.ts:137` 缂洪槻閲?灞傜骇鏍￠獙 |
| 19  | 鎺掕姒滃敮涓€绾︽潫        | **WARN** | `sales-target.service.ts:408` metricType 婕忚繃婊?  |

**缁熻**: 17 FAIL / 2 WARN / 0 PASS

---

## 閲戦璁＄畻楠岃瘉

| 瀛楁             | 鍏紡                           | 瀹為檯瀹炵幇          | 缁撴灉   |
| ----------------- | ------------------------------- | --------------------- | -------- |
| `weightedAmount`  | `amount * probability / 100`    | 鏈疄鐜帮紝姘歌繙涓?0 | **FAIL** |
| 鎶ヤ环琛岄」閲戦 | `unitPrice * quantity`          | 妯″潡涓嶅瓨鍦?        | **N/A**  |
| 鎶ヤ环鎬婚噾棰?   | `危(琛岄」閲戦) - 鎶樻墸`      | 妯″潡涓嶅瓨鍦?        | **N/A**  |
| `unpaid_amount`   | `contractAmount - 危(payments)` | 妯″潡涓嶅瓨鍦?        | **N/A**  |

---

## 浼樺厛淇寤鸿

**P0 鈥?宸叉湁浠ｇ爜鐨勫叧閿己闄凤紙鍙珛鍗充慨澶嶏級**:

1. **weighted_amount 鑷姩璁＄畻** 鈥?鍦?`create()`, `update()`, `updateStage()` 涓姞鍏?`weightedAmount = amount * probability / 100`
2. **闃舵鎺ㄨ繘鏍￠獙** 鈥?瀹氫箟鍚堟硶杞崲鐭╅樀锛屾牎楠?from鈫抰o 鍏崇郴
3. **涓㈠崟鍘熷洜寮哄埗** 鈥?`UpdateStageDto` 澧炲姞 `closeReason` 瀛楁锛屽綋 `stage === CLOSED_LOST` 鏃跺繀濉?4. **闃舵鍥為€€闄愬埗** 鈥?浠呭厑璁稿洖閫€鍒板墠涓€闃舵
4. **鎺掕姒滃敮涓€绾︽潫** 鈥?蹇収鏌ヨ澧炲姞 metricType 鏉′欢 + DB 鍔犲鍚堝敮涓€绱㈠紩

**P1 鈥?缂哄け妯″潡锛堥渶瑙勫垝寮€鍙戯級**:
鎶ヤ环 鈫?鍚堝悓 鈫?鍥炴 鈫?瀹℃壒寮曟搸锛堟寜涓氬姟渚濊禆椤哄簭锛?
