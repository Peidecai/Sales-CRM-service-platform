Now I have all the data needed for a comprehensive audit. Here is the full report:

---

# Redis 缂撳瓨鏋舵瀯瀹℃煡鎶ュ憡

## 1. 閿懡鍚嶈鑼僜n

**缁撹: WARN**

| 妯″潡       | 閿墠缂€                                                                                              | 浣嶇疆                          |
| ----------- | ----------------------------------------------------------------------------------------------------- | ------------------------------- |
| Customer    | `cache:customers:list` / `cache:customers:detail`                                                     | `cache-keys.ts:7-9`             |
| Opportunity | `cache:opportunities:stats` / `cache:opportunities:detail`                                            | `cache-keys.ts:11-13`           |
| Knowledge   | `cache:knowledge:categories`                                                                          | `cache-keys.ts:15`              |
| FollowUp    | `cache:follow-ups:customer`                                                                           | `cache-keys.ts:19`              |
| SalesTarget | `cache:sales-targets:stats`                                                                           | `cache-keys.ts:21`              |
| Auth        | `jti:whitelist`, `refresh_family`, `auth:blacklist`, `login_fail`, `captcha`, `user_session`, `nonce` | `auth.service.ts:16-24`         |
| RBAC        | `user_permissions:{userId}`                                                                           | `permission-cache.service.ts:9` |
| Agent       | `agent:status:{id}`, `agent:wrap_up_at:{id}`                                                          | `agent-status.service.ts:15-16` |
| AI Fallback | `ai:cache:{feature}:{hash}`                                                                           | `ai-fallback.service.ts:131`    |
| 搴忓垪鍙?   | `seq:customer_no:{date}`                                                                              | `customer.service.ts:172`       |

**闂**:

- 缂轰箯缁熶竴鐨勫叏灞€鍓嶇紑锛堝 `crm:`锛夈€傜紦瀛橀敭鐢?`cache:`锛岃璇佺敤 `auth:` / `jti:` / `refresh_family`锛屽潗甯敤 `agent:`锛屾潈闄愮敤 `user_permissions` 鈥?5 绉嶄笉鍚岄鏍兼贩鏉俓n- `AUTH_KEYS` 瀹氫箟鍦?`auth.service.ts` 鍐呰仈锛宍PERMISSION_CACHE_TTL` 瀹氫箟鍦?`permission-cache.service.ts` 鍐呰仈锛屾湭闆嗕腑鍒?`cache-keys.ts`
- 寤鸿缁熶竴涓?`crm:{module}:{entity}:{qualifier}` 鏍煎紡锛屽苟灏嗘墍鏈夐敭瀹氫箟闆嗕腑鍦?`cache-keys.ts`

## 2. Cache-Aside 妯″紡锛堝厛鍐?DB 鍚庡垹缂撳瓨锛塡n

**缁撹: PASS**

| 妯″潡       | 鍐欐搷浣?                        | 澶辨晥绛栫暐                      | 浣嶇疆                                              |
| ----------- | -------------------------------- | --------------------------------- | --------------------------------------------------- |
| Customer    | create/update/remove/allocate    | delByPattern(list) + del(detail)  | `customer.service.ts:40-41,132-133,141-142,163-164` |
| Opportunity | create/update/updateStage/remove | delByPattern(stats) + del(detail) | `opportunity.service.ts:65,132-133,174-175,187-188` |
| FollowUp    | create                           | delByPattern(list:customerId)     | `follow-up.service.ts:112`                          |
| Knowledge   | category mutations               | del(category_tree)                | `knowledge.service.ts:633`                          |
| SalesTarget | mutations                        | delByPattern(stats)               | `sales-target.service.ts:564`                       |

鎵€鏈夋ā鍧楀潎閬靛惊銆屽厛鍐?DB 鈫?鍐嶅垹缂撳瓨銆嶇殑姝ｇ‘椤哄簭銆俓n
**娉ㄦ剰**: `delByPattern` 鍐呴儴鐨?`del` 鎿嶄綔鏈?await锛坄redis.service.ts:61` `void this.client.del(...keys)`锛夛紝`resolve(deleted)` 鍙兘鍦ㄦ墍鏈夊垹闄ゅ畬鎴愬墠瑙﹀彂銆傛瀬绔儏鍐典笅鍙兘鏈夌煭鏆傜殑鑴忚绐楀彛銆俓n

## 3. TTL 鍒嗙骇閰嶇疆

**缁撹: PASS**

| 缂撳瓨绫诲瀷      | TTL    | 鍚堢悊鎬?                     |
| ----------------- | ------ | ----------------------------- |
| 瀹㈡埛鍒楄〃      | 60s    | 楂橀鍙樺姩锛屽悎鐞?          |
| 瀹㈡埛璇︽儏      | 120s   | 鍚堢悊                        |
| 鍟嗘満璇︽儏      | 120s   | 鍚堢悊                        |
| 鍟嗘満缁熻       | 300s   | 鑱氬悎鏁版嵁锛屽悎鐞?         |
| 鍒嗙被鏍?         | 600s   | 浣庨鍙樺姩锛屽悎鐞?          |
| 璺熻繘鍒楄〃      | 60s    | 鍚堢悊                        |
| 閿€鍞洰鏍囩粺璁? | 300s   | 鍚堢悊                        |
| 鏉冮檺鐮?         | 1800s  | 鍙樻洿涓嶉绻侊紝鍚堢悊       |
| AI 缁撴灉缂撳瓨   | 86400s | LLM 杈撳嚭缂撳瓨 24h锛屽悎鐞? |

TTL 鍒嗙骇鍚堢悊锛氶珮棰?60s 鈫?璇︽儏 120s 鈫?缁熻 300s 鈫?缁撴瀯 600s 鈫?鏉冮檺 1800s

**闂**:

- `agent:status:{id}` **鏃?TTL**锛坄agent-status.service.ts:50`锛夛紝鍧愬腑濡傛灉浠庝笉涓嬬嚎锛屾閿案涓嶈繃鏈?鈫?鍐呭瓨娉勬紡椋庨櫓
- `REDIS_KEY_LAST_ASSIGNED` (call-distribution) **鏃?TTL** 鈥?鍚岀悊

## 4. 缂撳瓨绌块€忛槻鎶わ紙绌哄€肩紦瀛?/ 甯冮殕杩囨护鍣級

**缁撹: FAIL**

\**鏈疄鐜颁换浣曠┛閫忛槻鎶ゆ満鍒?*銆俓n
褰撳墠琛屼负锛堜互 `customer.service.ts:92-112` 涓轰緥锛?

```typescript
async findOne(id: number): Promise<Customer> {
  const cached = await this.redisService.get(cacheKey)
  if (cached) return JSON.parse(cached)       // cache hit
  const customer = await this.customerRepository.findOne(...)
  if (!customer) throw new NotFoundException() // 涓嶇紦瀛?null锛乗n  await this.redisService.set(cacheKey, ...)   // 鍙紦瀛樻湁鏁堝€糪n}
```

**椋庨櫓**: 鏀诲嚮鑰呮垨绋嬪簭 bug 鍙嶅璇锋眰涓嶅瓨鍦ㄧ殑 ID锛堝 `/api/v1/customers/999999`锛夛紝姣忔閮界┛閫忓埌 DB銆俓n
**寤鸿**:

- **鏂规 A**: 缂撳瓨绌哄€?鈥?瀵?null 缁撴灉缂撳瓨 `"__NULL__"` 鏍囪锛孴TL 30-60s
- **鏂规 B**: 甯冮殕杩囨护鍣?鈥?瀵?ID 闆嗗悎缁存姢甯冮殕杩囨护鍣紝鍦?Redis 灞傛嫤鎴繀涓嶅瓨鍦ㄧ殑 key

## 5. 缂撳瓨闆穿闃叉姢锛圱TL 闅忔満鍋忕Щ锛塡n

**缁撹: FAIL**

鎵€鏈?TTL 鍧囦负鍥哄畾鍊硷紝鏃犱换浣曢殢鏈哄亸绉汇€俓n

```typescript
// cache-keys.ts 鈥?鍏ㄩ儴纭紪鐮乗nCUSTOMER_LIST: 60,
CUSTOMER_DETAIL: 120,
OPPORTUNITY_STATS: 300,
```

**椋庨櫓**: 濡傛灉澶ф壒鍚岀被缂撳瓨鍦ㄥ悓涓€绉掑垱寤猴紙濡傜郴缁熼噸鍚悗棣栨壒璇锋眰锛夛紝瀹冧滑浼氬湪鍚屼竴绉掗泦涓繃鏈燂紝瀵艰嚧 thundering herd锛堟儕缇ゆ晥搴旓級锛孌B 鐬椂鍘嬪姏鏆村銆俓n
**寤鸿**: 鍦?`RedisService.set()` 鎴栬皟鐢ㄤ晶娣诲姞 卤10% 鐨勯殢鏈烘姈鍔?

```typescript
async setWithJitter(key: string, value: string, baseTtl: number): Promise<void> {
  const jitter = Math.floor(baseTtl * 0.1 * (Math.random() * 2 - 1)) // 卤10%
  await this.set(key, value, baseTtl + jitter)
}
```

## 6. 缂撳瓨鍑荤┛闃叉姢锛堝垎甯冨紡閿?/ Singleflight锛塡n

**缁撹: FAIL**

\**鏈疄鐜颁换浣曞嚮绌块槻鎶?*銆俓n
褰撶儹鐐?key 杩囨湡鏃讹紙濡?`cache:opportunities:stats`锛夛紝鎵€鏈夊苟鍙戣姹傚悓鏃跺彂鐜?cache miss锛屽悓鏃舵煡 DB锛屽悓鏃跺洖鍐欑紦瀛樸€俓n
| 鐑偣 Key | TTL | 骞跺彂椋庨櫓 |
|----------|-----|----------|
| `cache:opportunities:stats:*` | 300s | 楂?鈥?Dashboard 棣栭〉鑱氬悎鏌ヨ |
| `cache:knowledge:categories` | 600s | 涓?鈥?鍒嗙被鏍戝叏琛ㄦ煡璇?|
| `cache:customers:list:*` | 60s | 涓?鈥?鍒楄〃杩囨湡棰戠箒 |

**寤鸿**: 瀵归珮棰戠儹鐐?key 瀹炵幇 Mutex 妯″紡:

```typescript
async getOrLoad(key: string, loader: () => Promise<string>, ttl: number): Promise<string> {
  const cached = await this.get(key)
  if (cached) return cached
  const lockKey = `lock:${key}`
  const acquired = await this.client.set(lockKey, '1', 'EX', 5, 'NX')
  if (acquired) {
    try {
      const value = await loader()
      await this.set(key, value, ttl)
      return value
    } finally {
      await this.del(lockKey)
    }
  }
  // Wait and retry
  await new Promise(r => setTimeout(r, 50))
  return this.getOrLoad(key, loader, ttl)
}
```

## 闄勫姞鍙戠幇

### WARN: KEYS 鍛戒护浣跨敤

**浣嶇疆**: `agent-status.service.ts:68`

```typescript
const keys = await this.redis.getClient().keys("agent:wrap_up_at:*");
```

`KEYS` 鍛戒护鏄?O(N) 涓斾細闃诲 Redis 涓荤嚎绋嬨€傞」鐩凡鍦?`RedisService.delByPattern()` 涓纭娇鐢?`SCAN`锛屼絾姝ゅ鐩存帴璋冪敤浜?`keys()`銆傚簲鏀逛负 `scanStream`銆俓n

### WARN: 鍒楄〃缂撳瓨瑕嗙洊涓嶄竴鑷碶n

| 妯″潡              | findAll 鏄惁缂撳瓨 |
| ------------------ | ------------------- |
| Customer           | 缂撳瓨 鉁?          |
| Opportunity        | \*_鏈紦瀛?_ 鉁?    |
| FollowUp           | 缂撳瓨 鉁?          |
| Knowledge articles | \*_鏈紦瀛?_ 鉁?    |
| SalesTarget        | 浠呯紦瀛?stats 鉁?  |

Opportunity 鐨?`findAll` 鏂规硶娌℃湁缂撳瓨锛坄opportunity.service.ts:69-101`锛夛紝姣忔鍒楄〃鏌ヨ鐩存帴鍑荤┛鍒?DB銆俙CACHE_KEYS` 涓篃缂哄皯 `OPPORTUNITY_LIST` 鐨勫畾涔夈€俓n

### WARN: delByPattern 鐨?fire-and-forget 绔炴€乗n

**浣嶇疆**: `redis.service.ts:58-62`

```typescript
stream.on("data", (keys: string[]) => {
  if (keys.length > 0) {
    deleted += keys.length;
    void this.client.del(...keys); // 鏈?await
  }
});
stream.on("end", () => resolve(deleted));
```

## `resolve` 鍦?`stream.on('end')` 瑙﹀彂鏃舵墽琛岋紝浣嗘鏃?`del` 鎿嶄綔鍙兘灏氭湭瀹屾垚銆傚缓璁敹闆嗘墍鏈?keys 鍚庣粺涓€ pipeline 鍒犻櫎锛屾垨浣跨敤 `unlink`銆俓n

## 瀹℃煡鎬荤粨

| #   | 妫€鏌ラ」                   | 缁撴灉   | 椋庨櫓绛夌骇                       |
| --- | --------------------------- | -------- | ---------------------------------- |
| 1   | 閿懡鍚嶈鑼?               | **WARN** | 浣?鈥?鍙淮鎶ゆ€ч棶棰?             |
| 2   | Cache-Aside 妯″紡           | **PASS** | 鈥?                                |
| 3   | TTL 鍒嗙骇閰嶇疆            | **PASS** | 浣?鈥?agent 閿棤 TTL              |
| 4   | 缂撳瓨绌块€忛槻鎶?          | **FAIL** | 涓?鈥?鍙鎭舵剰鍒╃敤              |
| 5   | 缂撳瓨闆穿闃叉姢           | **FAIL** | 涓?鈥?閲嶅惎鍚庢儕缇ら闄?         |
| 6   | 缂撳瓨鍑荤┛闃叉姢           | **FAIL** | 涓?鈥?鐑偣 key 杩囨湡鏃?DB 灏栧嘲 |
| 鈥? | KEYS 鍛戒护闃诲            | **WARN** | 楂?鈥?鏁版嵁閲忓ぇ鏃堕樆濉?Redis   |
| 鈥? | 鍒楄〃缂撳瓨瑕嗙洊涓嶄竴鑷? | **WARN** | 浣?鈥?Opportunity 鍒楄〃鏈紦瀛?   |
| 鈥? | delByPattern 绔炴€?         | **WARN** | 浣?鈥?鏋佺鎯呭喌鑴忚             |

**浼樺厛淇寤鸿**: #6 KEYS鈫扴CAN > #4 绌哄€肩紦瀛?> #5 TTL 鎶栧姩 > #6 鐑偣 Mutex > #1 閿悕缁熶竴
