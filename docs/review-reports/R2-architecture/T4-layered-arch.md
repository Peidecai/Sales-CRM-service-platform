鎴戝凡缁忓畬鎴愪簡瀵瑰叏閮?24 涓?Controller銆?3 涓?Service銆?3 涓?Entity 鍜?25 涓?Module 鐨勫叏闈㈠鏌ャ€備互涓嬫槸璇︾粏鐨勫鏌ユ姤鍛婏細

---

# 馃彈锔?CRM Sales Platform 鈥?鍥涘眰鏋舵瀯鍚堣瀹℃煡鎶ュ憡

---

## 1. 琛ㄧ幇灞傦紙Controller锛夆€?鏄惁浠呭仛璺敱涓庡弬鏁版牎楠孿n

### **FAIL** 鉂?鈥?2 涓弗閲嶈繚瑙勶紝3 涓鍛奬n

| 涓ラ噸绋嬪害 | 鏂囦欢                                    | 杩濊鎻忚堪                                                                                                                                                                                                                                                                             |
| ------------ | ----------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **FAIL**     | `ai/ai.controller.ts`                     | Controller 鐩存帴娉ㄥ叆 **6 涓?Repository** + **5 涓?Bull Queue**锛屽寘鍚?`findAndCount`銆乣createQueryBuilder().groupBy().getRawMany()` 绛夋暟鎹簱鏌ヨ锛屾墜鍔ㄦ瀯寤?`where` 鏉′欢锛屽鐞嗗垎椤甸€昏緫銆傚畬鍏ㄧ粫杩?Service 灞傗€斺€旀湰璐ㄤ笂鏄?\*鏃?Service 鐨勮儢 Controller\*\* |
| **FAIL**     | `agent/agent.controller.ts`               | Controller 鐩存帴娉ㄥ叆 `userRepository` + `statusLogRepository`锛屽寘鍚?`createQueryBuilder` 鏌ヨ銆佺敤鎴峰垪琛ㄨ繃婊ゃ€佺姸鎬佽仛鍚堛€佺粺璁¤绠楃瓑涓氬姟閫昏緫                                                                                                                     |
| **WARN**     | `customer/customer.controller.ts`         | `importCsv()` 鏂规硶鍖呭惈涓氬姟鏍￠獙锛坮ows 鏁伴噺銆乵apping 闈炵┖锛夊苟閫氳繃娉ㄥ叆鐨?`importLogRepo` 鐩存帴鍒涘缓/淇濆瓨 `CustomerImportLog` 瀹炰綋                                                                                                                                 |
| **WARN**     | `auth/auth.controller.ts`                 | `getCaptcha()` 鐩存帴鐢熸垚楠岃瘉鐮?SVG 骞跺啓鍏?Redis锛涘悓鏃舵敞鍏?`RedisService`锛堝熀纭€璁炬柦渚濊禆娉勬紡鍒拌〃鐜板眰锛?                                                                                                                                                           |
| **WARN**     | `announcement/announcement.controller.ts` | `create()` 涓仛浜?`new Date(dto.publishAt)` 鏃ユ湡杞崲鈥斺€斾笟鍔￠€昏緫娉勬紡                                                                                                                                                                                                        |

\*_鍚堣鐨?Controller锛圥ASS 鉁咃級锛?_ UserController銆丄uditLogController銆丱pportunityController銆丆allRecordController銆並nowledgeController銆丼alesTargetController銆丆ustomerPoolController銆丆ontactController銆丗ollowUpController銆丆ustomerTagController銆丆ustomFieldController銆丷outeController銆丆allController銆丆allCallbackController銆丆ampaignController銆丷ecordingController銆丮aterialController銆丠ealthController銆丆allPopupController锛堝叡 19 涓級

### 淇鏂规

1. **`AiController`**锛氭媶鍒嗕负 `AiAlertService`銆乣AiReportService`銆乣AiForecastService`銆乣AiCompetitorService`銆乣AiProfileService`銆乣AiPredictionService`锛孋ontroller 浠呭仛璺敱濮旀淳
2. **`AgentController`**锛氬皢 Repository 鏌ヨ閫昏緫鍏ㄩ儴绉诲叆 `AgentStatusService`锛孋ontroller 涓嶅簲娉ㄥ叆浠讳綍 Repository
3. **`CustomerController.importCsv`**锛氬皢 ImportLog 鍒涘缓鍜?Queue 鎻愪氦閫昏緫绉诲叆 `CustomerImportService`
4. **`AuthController.getCaptcha`**锛氬皢楠岃瘉鐮佺敓鎴愰€昏緫绉诲叆 `AuthService.generateCaptcha()`

---

## 2. 搴旂敤灞傦紙Service锛夆€?鏄惁浣滀负浜嬪姟杈圭晫 / 浠呭仛鐢ㄤ緥缂栨帓

### **WARN** 鈿狅笍 鈥?鑱岃矗杩囬噸锛屾棤 Application/Domain Service 鍒嗗眰

| 闂                           | 娑夊強鏂囦欢                                                      | 鎻忚堪                                                                                                                                         |
| ------------------------------ | ----------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| **浜嬪姟绠＄悊** 鉁?           | `ContactService`銆乣CustomerMergeService`銆乣CustomerPoolService` | 姝ｇ‘浣跨敤 `QueryRunner` 绠＄悊浜嬪姟杈圭晫                                                                                                   |
| **Service 杩囧害鑶ㄨ儉**       | `customer.service.ts` (468琛?                                     | 鍗曚竴 Service 娣峰悎锛欳RUD + Excel 瀵煎嚭 + CSV 瀵煎嚭 + 瀵煎叆 + 瀹㈡埛缂栧彿鐢熸垚(Redis) + 鐘舵€佹満楠岃瘉 + 淇濇姢鏈熺鐞?+ Redis 缂撳瓨 |
| **Service 杩囧害鑶ㄨ儉**       | `auth.service.ts` (505琛?                                         | 娣峰悎锛氱櫥褰曢€昏緫 + JWT鐢熸垚 + Token鍒锋柊 + Token榛戝悕鍗?+ 楠岃瘉鐮侀獙璇?+ 寰俊鐧诲綍 + 鎵嬫満鍙风粦瀹?+ 澶氳澶囦細璇濈鐞?          |
| **Service 杩囧害鑶ㄨ儉**       | `opportunity.service.ts` (304琛?                                  | 娣峰悎锛欳RUD + CSV 瀵煎嚭 + Redis 缂撳瓨绠＄悊 + 闃舵鏃ュ織                                                                                  |
| **缂哄け Application Service** | 鍏ㄥ眬                                                            | 娌℃湁鐙珛鐨?Application Service 灞傚仛鐢ㄤ緥缂栨帓锛岀幇鏈?Service 鍚屾椂鎵挎媴涓氬姟閫昏緫鍜屽熀纭€璁炬柦浜や簰                              |

### 淇鏂规

1. **鎷嗗垎 CustomerService** 鈫?`CustomerService`(CRUD) + `CustomerExportService`(Excel/CSV) + `CustomerImportService`(瀵煎叆) + `CustomerNumberGenerator`(缂栧彿鐢熸垚)
2. **鎷嗗垎 AuthService** 鈫?`AuthService`(鐧诲綍/鐧诲嚭) + `TokenService`(JWT鐢熸垚/鍒锋柊/榛戝悕鍗? + `WxAuthService`(寰俊璁よ瘉) + `CaptchaService`(楠岃瘉鐮?
3. 闀挎湡鑰冭檻寮曞叆 Application Service 灞傚仛璺?Service 缂栨帓

---

## 3. 棰嗗煙灞傦紙Entity/Domain锛夆€?鏄惁闆舵鏋朵緷璧朶n

### **FAIL** 鉂?鈥?鏃犵函棰嗗煙妯″瀷锛孍ntity 寮虹粦瀹?TypeORM

| 闂                      | 鎻忚堪                                                                                                                            |
| ------------------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| **鍏ㄩ噺 TypeORM 渚濊禆** | 43 涓?Entity 鍏ㄩ儴浣跨敤 `@Entity`銆乣@Column`銆乣@Index`銆乣@ManyToOne`銆乣@OneToMany`銆乣@JoinColumn` 绛?TypeORM 瑁呴グ鍣?     |
| **缁ф壙 ORM BaseEntity**  | 鎵€鏈変笟鍔?Entity 缁ф壙 `common/entities/base.entity.ts`锛堝惈 TypeORM 鐨?`@PrimaryGeneratedColumn`銆乣@CreateDateColumn` 绛夛級 |
| \*_鏃犻鍩熻涓?_         | Entity 浠呬负鏁版嵁瀹瑰櫒锛圓nemic Domain Model锛夛紝鏃犱笟鍔℃柟娉曪紝涓氬姟瑙勫垯鍏ㄩ儴鍦?Service 涓?                            |
| \*_璺ㄦā鍧楀疄浣撳紩鐢?_  | `Customer` 寮曠敤 `Opportunity`/`CallRecord`/`Contact` 绫诲瀷锛沗Opportunity`鐩存帴 import`Customer` 瀹炰綋                       |

> **澶囨敞**锛氬湪 NestJS + TypeORM 鐢熸€佷腑锛孫RM Entity 鍗抽鍩?Entity 鏄?**甯歌瀹炶返**銆傚浜庝笟鍔?CRUD 绯荤粺锛岃繖绉嶅姟瀹為€夋嫨鍙互鎺ュ彈銆備絾濡傛灉鏈潵鍚?DDD 婕旇繘锛岄渶瑕佸紩鍏ョ嫭绔嬬殑 Domain Model 灞傘€俓n

### 淇鏂规锛堟笎杩涘紡锛塡n1. 鐭湡锛氱淮鎸佺幇鐘讹紝浣嗛伩鍏嶅湪 Entity 涓紩鍏ヤ笟鍔℃柟娉昞n2. 涓湡锛氫负鏍稿績鑱氬悎锛圕ustomer銆丱pportunity锛夋彁鍙栫函 TypeScript 棰嗗煙瀵硅薄锛孫RM Entity 浣滀负鎸佷箙鍖栨槧灏刓n3. 浣跨敤 `type import` 鏇夸唬鐩存帴 import 璺ㄦā鍧楀疄浣擄紙`Customer.entity.ts` 宸查儴鍒嗛噰鐢?鉁咃級

---

## 4. 鍩虹璁炬柦灞?鈥?渚濊禆鍊掔疆 / Repository 鎺ュ彛

### **WARN** 鈿狅笍 鈥?鏃犺嚜瀹氫箟 Repository 鎺ュ彛锛岄儴鍒嗘ā鍧楁湁濂藉疄璺礬n

| 妫€鏌ラ」                 | 缁撴灉      | 璇存槑                                                                                                               |
| ------------------------- | ----------- | -------------------------------------------------------------------------------------------------------------------- |
| TypeORM Repository 娉ㄥ叆 | 鈿狅笍 WARN | 鎵€鏈?Service 鐩存帴渚濊禆 `Repository<Entity>`锛圱ypeORM 鍏蜂綋绫诲瀷锛夛紝鏃犺嚜瀹氫箟 Repository 鎺ュ彛           |
| RedisService 娉ㄥ叆       | 鈿狅笍 WARN | 浣滀负鍏蜂綋绫绘敞鍏ワ紝鏃犳娊璞℃帴鍙?                                                                               |
| AI 鏈嶅姟                 | 鉂?FAIL     | `AiService` 鐩存帴瀹炰緥鍖?`new OpenAI()` 纭紪鐮佸鎴风                                                            |
| 璇煶閫傞厤鍣?            | 鉁?PASS     | `call.module.ts` 浣跨敤 `{ provide: 'VOICE_PROVIDER', useClass: AliyunVoiceAdapter }` 鈥?\*_姝ｇ‘鐨勪緷璧栧€掔疆锛?_ |
| 鑷畾涔?Repository 绫?    | 鉂?FAIL     | 椤圭洰涓棤浠讳綍鑷畾涔?Repository 绫?鎺ュ彛锛? 涓枃浠跺尮閰?`*repository*.ts`                                     |

### 淇鏂规

1. 涓烘牳蹇冩ā鍧楀畾涔?Repository 鎺ュ彛锛歚ICustomerRepository`銆乣IOpportunityRepository` 绛塡n2. 灏?`AiService` 鏀逛负渚濊禆 `IAiProvider` 鎺ュ彛锛岄€氳繃 DI 娉ㄥ叆鍏蜂綋瀹炵幇
2. 鍙傝€?`VOICE_PROVIDER` 妯″紡锛屽皢 `RedisService` 鎶借薄涓?`ICacheService` 鎺ュ彛

---

## 5. 璺ㄥ眰璋冪敤妫€鏌n

### **FAIL** 鉂?鈥?Controller 鐩存帴瀵煎叆璺ㄦā鍧?Service

| 杩濊鏂囦欢                             | 璺ㄦā鍧楀鍏?                                                                | 鏂瑰悜                        |
| --------------------------------------- | ---------------------------------------------------------------------------- | ----------------------------- |
| `customer/customer.controller.ts`       | `import { NotificationService } from '../notification/notification.service'` | Controller 鈫?璺ㄦā鍧?Service |
| `opportunity/opportunity.controller.ts` | `import { NotificationService } from '../notification/notification.service'` | Controller 鈫?璺ㄦā鍧?Service |
| `call-record/call-record.controller.ts` | `import { NotificationService } from '../notification/notification.service'` | Controller 鈫?璺ㄦā鍧?Service |
| `agent/agent.controller.ts`             | `import { User } from '../user/user.entity'`                                 | Controller 鈫?璺ㄦā鍧?Entity  |
| `knowledge/knowledge.controller.ts`     | `import { AskQuestionDto } from '../ai/dto/ask-question.dto'`                | Controller 鈫?璺ㄦā鍧?DTO     |
| `auth/auth.controller.ts`               | `import { RedisService } from '../../common/redis'`                          | Controller 鈫?鍩虹璁炬柦灞?  |

### 淇鏂规

1. **NotificationService** 璋冪敤绉诲叆鍚勮嚜鐨?Service 灞傦紙鍦?`CustomerService.create()` 涓彂閫氱煡锛岃€岄潪鍦?Controller锛塡n2. **AgentController** 鐨?User 瀹炰綋寮曠敤搴旀敼涓洪€氳繃 `AgentService` 灏佽
2. `AskQuestionDto` 搴旂Щ鑷?`@crm/shared` 鎴?`knowledge` 妯″潡鑷湁 DTO

---

## 6. Controller 鏄惁鐩存帴杩斿洖棰嗗煙瀹炰綋

### **FAIL** 鉂?鈥?鍑犱箮鎵€鏈?Controller 鐩存帴杩斿洖 TypeORM Entity

| 涓ラ噸绋嬪害   | 璇存槑                                                                                        |
| -------------- | --------------------------------------------------------------------------------------------- |
| **鍏ㄥ眬闂** | 24 涓?Controller 涓?*娌℃湁浠讳綍涓€涓?*浣跨敤 Response DTO 杞崲                              |
| 鍏稿瀷杩濊    | `CustomerController.create()` 鈫?鐩存帴杩斿洖 `Customer` 瀹炰綋锛堝惈鍏ㄩ儴鏁版嵁搴撳瓧娈碉級 |
| 鍏稿瀷杩濊    | `AiController.acknowledgeAlert()` 鈫?鐩存帴杩斿洖 `AiAlert` 瀹炰綋                            |
| 鍏稿瀷杩濊    | `KnowledgeController.getUserFavorites()` 鈫?杩斿洖 `KnowledgeArticle[]` 瀹炰綋鏁扮粍          |
| 鍑忚交鍥犵礌   | `UserService.findOne()` 鍐呴儴鎺掗櫎浜?`password` 瀛楁 鉁?                                   |
| 鍑忚交鍥犵礌   | `ResponseInterceptor` 缁熶竴鍖呰涓?`{code, message, data}` 鏍煎紡 鉁?                        |

### 淇鏂规

1. 涓烘瘡涓ā鍧楀垱寤?Response DTO锛堝 `CustomerResponseDto`銆乣OpportunityResponseDto`锛塡n2. 鍦?Service 鎴?Controller 涓娇鐢?`class-transformer` 鐨?`plainToInstance`+`@Exclude()` 杞崲
2. 鑷冲皯涓哄寘鍚晱鎰熷瓧娈电殑瀹炰綋锛圲ser銆丄uditLog锛夋坊鍔犳樉寮?Response DTO

---

## 7. 妯″潡鐙珛鎬n

### **PASS** 鉁?鈥?25 涓?Module 鍧囦负鐙珛 NestJS Module

| 妫€鏌ラ」            | 缁撴灉      | 璇存槑                                                                                                                       |
| -------------------- | ----------- | ---------------------------------------------------------------------------------------------------------------------------- |
| 妯″潡鏁伴噺          | 25 涓?      | 姣忎釜涓氬姟棰嗗煙鐙珛 Module 鉁?                                                                                           |
| `@Global()` 浣跨敤   | 鉁?         | 浠?`AuditLogModule` 浣跨敤 `@Global()`锛岀鍚堣璁?                                                                          |
| Module exports       | 鉁?         | 鍚勬ā鍧楁纭?export Service 渚涘叾浠栨ā鍧椾娇鐢?                                                                             |
| 璺ㄦā鍧楀疄浣撳紩鐢? | 鈿狅笍 WARN | `CustomerModule` 鐨?`TypeOrmModule.forFeature()` 娉ㄥ唽浜?`User`銆乣Contact`銆乣FollowUp`銆乣Opportunity` 鍏?4 涓閮ㄥ疄浣? |
| `AiModule`           | 鈿狅笍 WARN | 娉ㄥ唽浜?`CallRecord`銆乣KnowledgeArticle` 澶栭儴瀹炰綋                                                                      |
| `CallModule`         | 鈿狅笍 WARN | 娉ㄥ唽浜?`CallRecord`銆乣Customer`銆乣Contact`銆乣FollowUp` 鍏?4 涓閮ㄥ疄浣?                                               |

---

## 8. 寰幆渚濊禆

### **PASS** 鉁?鈥?鏈彂鐜板惊鐜緷璧朶n

妯″潡渚濊禆鍏崇郴褰㈡垚 **鏈夊悜鏃犵幆鍥?(DAG)**锛歕n```
AuthModule 鈫?UserModule
CallRecordModule 鈫?AiModule
KnowledgeModule 鈫?AiModule
CustomerModule 鈫?CustomFieldModule
AiModule 鈫?VectorModule

```
鏃犲惊鐜紩鐢ㄣ€侲ntity 涔嬮棿鐨?`type import` 涓嶆瀯鎴愯繍琛屾椂寰幆渚濊禆銆俓n
---

## 9. SOLID 鍘熷垯

### 鍗曚竴鑱岃矗 (SRP)

| 缁撴灉 | 鏂囦欢 | 璇存槑 |
|------|------|------|
| **FAIL** | `ai/ai.controller.ts` | 涓€涓?Controller 绠＄悊 6 绉嶄笉鍚岃祫婧愶紙Alerts/Reports/Forecasts/Profiles/Predictions/Cost锛?|
| **FAIL** | `agent/agent.controller.ts` | 娣峰悎浜嗗垪琛ㄦ煡璇€佺姸鎬佺鐞嗐€佺粺璁°€佸懠鍙垎閰?4 绉嶈亴璐?|
| **WARN** | `customer/customer.service.ts` | 娣峰悎 CRUD + 瀵煎嚭 + 瀵煎叆 + 缂栧彿鐢熸垚 + 鐘舵€佹満 + 淇濇姢鏈?6 绉嶈亴璐?|
| **WARN** | `auth/auth.service.ts` | 娣峰悎鐧诲綍 + JWT + 寰俊 + 楠岃瘉鐮?+ 澶氳澶囦細璇?5 绉嶈亴璐?|

### 寮€闂師鍒?(OCP)

| 缁撴灉 | 璇存槑 |
|------|------|
| **WARN** | `OpportunityService.STAGE_PROBABILITY` 涓虹‖缂栫爜甯搁噺锛屼笉鍙厤缃?|
| 鉁?PASS | `call.module.ts` 鐨?`VOICE_PROVIDER` 娉ㄥ叆灞曠ず浜嗘纭殑绛栫暐妯″紡 |
| **WARN** | `CustomerService.validateStatusTransition()` 鐘舵€佹満瑙勫垯纭紪鐮佷负 private 鏂规硶 |

### 鎺ュ彛闅旂 (ISP) & 渚濊禆鍊掔疆 (DIP)

| 缁撴灉 | 璇存槑 |
|------|------|
| **FAIL** | 椤圭洰涓棤浠讳綍鑷畾涔夋帴鍙ｏ紙0 涓?`interface I*Repository`銆乣interface I*Service`锛?|
| **FAIL** | 鎵€鏈?Service 渚濊禆鍏蜂綋绫伙紙`Repository<T>`銆乣RedisService`銆乣OpenAI`锛?|
| 鉁?PASS | `VOICE_PROVIDER` 鏄敮涓€鐨勪緷璧栧€掔疆濂戒緥瀛?|

---

## 馃搳 缁煎悎璇勫垎

| 瀹℃煡椤?| 璇勫垎 | 鍏抽敭闂 |
|--------|------|---------|
| 1. Controller 鑱岃矗 | **FAIL** | `AiController`銆乣AgentController` 鍖呭惈澶ч噺涓氬姟閫昏緫鍜?Repository 鐩存帴璁块棶 |
| 2. Service 浜嬪姟/缂栨帓 | **WARN** | 鏃?Application Service 鍒嗗眰锛孲ervice 鑱岃矗杩囬噸 |
| 3. Domain 闆舵鏋朵緷璧?| **FAIL** | Entity 鍏ㄩ儴缁戝畾 TypeORM锛圢estJS 鐢熸€佸父瑙侊級 |
| 4. 鍩虹璁炬柦渚濊禆鍊掔疆 | **WARN** | 鏃犺嚜瀹氫箟 Repository 鎺ュ彛锛宍VOICE_PROVIDER` 鏄寒鐐?|
| 5. 璺ㄥ眰璋冪敤 | **FAIL** | 3 涓?Controller 鐩存帴瀵煎叆璺ㄦā鍧?NotificationService |
| 6. 瀹炰綋娉勬紡 | **FAIL** | 鍏ㄩ」鐩棤 Response DTO |
| 7. 妯″潡鐙珛鎬?| **PASS** | 25 涓?Module 鐙珛锛屾棤寰幆渚濊禆 |
| 8. 寰幆渚濊禆 | **PASS** | DAG 缁撴瀯锛屾棤寰幆 |
| 9. SOLID | **WARN** | SRP 杩濊绐佸嚭锛孖SP/DIP 缂哄け |

---

## 馃敡 浼樺厛淇寤鸿锛堟寜浼樺厛绾ф帓搴忥級

### P0 鈥?绔嬪嵆淇
1. **鎷嗗垎 `AiController`**锛氭彁鍙?`AiAlertService`銆乣AiReportService` 绛?6 涓?Service锛孋ontroller 涓嶅簲鎸佹湁浠讳綍 Repository
2. **閲嶆瀯 `AgentController`**锛氬皢鎵€鏈?Repository 鎿嶄綔绉诲叆 `AgentService`

### P1 鈥?鐭湡淇
3. **寮曞叆 Response DTO**锛氳嚦灏戜负 `User`銆乣Customer`銆乣Opportunity` 鍒涘缓鍝嶅簲 DTO锛岄伩鍏嶅疄浣撴硠婕廫n4. **NotificationService 璋冪敤涓嬫矇**锛氫粠 Controller 绉昏嚦鍚勮嚜鐨?Service 灞俓n5. **`CustomerController.importCsv`**锛氬皢 ImportLog 鍒涘缓閫昏緫绉诲叆 Service

### P2 鈥?涓湡浼樺寲
6. **鎷嗗垎鑳?Service**锛歚CustomerService` 鈫?CRUD + Export + Import 涓変釜 Service
7. **鎷嗗垎 AuthService**锛歀ogin + Token + WeChat 涓変釜 Service
8. **鎻愬彇缂撳瓨灞?*锛歊edis 缂撳瓨閫昏緫鍙€氳繃瑁呴グ鍣ㄦ垨鐙珛 CacheService 缁熶竴绠＄悊

### P3 鈥?闀挎湡鏋舵瀯婕旇繘
9. **寮曞叆鑷畾涔?Repository 鎺ュ彛**锛氫负鏍稿績妯″潡鎻愪緵 `ICustomerRepository` 绛塡n10. **鍙傝€?`VOICE_PROVIDER` 妯″紡**鎺ㄥ箍鍒?AI銆丆ache 绛夊熀纭€璁炬柦
11. **鑰冭檻 Application Service 灞?*锛氱敤渚嬬紪鎺掍笌棰嗗煙閫昏緫鍒嗙
```
