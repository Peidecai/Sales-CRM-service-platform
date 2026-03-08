## 12. 安全设计

### 12.1 认证体系设计

#### 12.1.1 JWT 双 Token 机制详细设计

系统采用 Access Token + Refresh Token 双令牌机制，兼顾安全性与用户体验。

#### 整体架构

```
┌──────────┐     ①登录请求        ┌──────────────┐    ③查询用户     ┌─────────┐
│          │ ──────────────────▶  │              │ ──────────────▶ │         │
│  客户端   │     ②返回双Token     │  Auth Server │    ④验证密码     │  MySQL  │
│          │ ◀──────────────────  │  (NestJS)    │ ◀────────────── │         │
└──────────┘                      └──────────────┘                 └─────────┘
     │                                   │
     │  ⑤携带AccessToken请求资源          │ ⑥Token黑名单/白名单校验
     │                                   ▼
     │                            ┌─────────────┐
     │                            │    Redis     │
     │                            │             │
     │  ⑦AccessToken过期           │  - 黑名单    │
     │  ─▶ 用RefreshToken刷新      │  - 白名单    │
     │  ◀─ 返回新的双Token          │  - 登录态    │
     │                            │  - 权限缓存  │
     │                            └─────────────┘
```

#### Token 规格定义

| 属性             | Access Token                    | Refresh Token              |
| ---------------- | ------------------------------- | -------------------------- |
| 用途             | API 请求认证                    | 刷新 Access Token          |
| 有效期           | 2 小时                          | 7 天                       |
| 存储位置（前端） | 内存（推荐）/ localStorage      | httpOnly Cookie / 安全存储 |
| 存储位置（后端） | Redis 白名单                    | Redis 白名单               |
| Payload 内容     | userId, role, deptId, tokenType | userId, tokenType, jti     |
| 签名算法         | RS256                           | RS256                      |
| 是否可吊销       | 是（黑名单机制）                | 是（黑名单机制）           |

#### Token Payload 结构

```typescript
// Access Token Payload
interface AccessTokenPayload {
  sub: string; // 用户ID
  role: string; // 角色标识: super_admin | admin | manager | sales
  deptId: string; // 部门ID
  tokenType: "access"; // Token类型
  iat: number; // 签发时间
  exp: number; // 过期时间 (iat + 7200)
  jti: string; // Token唯一标识 (UUID v4)
}

// Refresh Token Payload
interface RefreshTokenPayload {
  sub: string; // 用户ID
  tokenType: "refresh"; // Token类型
  familyId: string; // Token族ID，用于检测重放攻击
  iat: number; // 签发时间
  exp: number; // 过期时间 (iat + 604800)
  jti: string; // Token唯一标识 (UUID v4)
}
```

#### 完整认证流程

```
┌────────┐                    ┌────────────┐                ┌───────┐      ┌───────┐
│ Client │                    │ AuthServer │                │ Redis │      │ MySQL │
└───┬────┘                    └─────┬──────┘                └──┬────┘      └──┬────┘
    │                               │                          │              │
    │  1. POST /auth/login          │                          │              │
    │  {username, password}         │                          │              │
    │──────────────────────────────▶│                          │              │
    │                               │  2. 检查登录失败次数      │              │
    │                               │─────────────────────────▶│              │
    │                               │  3. 返回失败计数          │              │
    │                               │◀─────────────────────────│              │
    │                               │                          │              │
    │                               │  4. 查询用户信息          │              │
    │                               │─────────────────────────────────────────▶
    │                               │  5. 返回用户记录          │              │
    │                               │◀─────────────────────────────────────────
    │                               │                          │              │
    │                               │  6. bcrypt.compare()     │              │
    │                               │  验证密码                 │              │
    │                               │                          │              │
    │                               │  7. 生成AccessToken+     │              │
    │                               │     RefreshToken         │              │
    │                               │                          │              │
    │                               │  8. 存储Token白名单       │              │
    │                               │─────────────────────────▶│              │
    │                               │                          │              │
    │  9. 返回双Token + 用户信息     │                          │              │
    │◀──────────────────────────────│                          │              │
    │                               │                          │              │
    │  10. GET /api/resource        │                          │              │
    │  Authorization: Bearer {AT}   │                          │              │
    │──────────────────────────────▶│                          │              │
    │                               │  11. 验证Token签名        │              │
    │                               │  12. 检查黑名单           │              │
    │                               │─────────────────────────▶│              │
    │                               │  13. 不在黑名单中         │              │
    │                               │◀─────────────────────────│              │
    │  14. 返回资源数据              │                          │              │
    │◀──────────────────────────────│                          │              │
    │                               │                          │              │
    │  === AccessToken 过期后 ===    │                          │              │
    │                               │                          │              │
    │  15. POST /auth/refresh       │                          │              │
    │  {refreshToken}               │                          │              │
    │──────────────────────────────▶│                          │              │
    │                               │  16. 验证RT签名+白名单    │              │
    │                               │─────────────────────────▶│              │
    │                               │◀─────────────────────────│              │
    │                               │                          │              │
    │                               │  17. 旧RT加入黑名单       │              │
    │                               │  18. 生成新的AT+RT        │              │
    │                               │  19. 新Token存入白名单     │              │
    │                               │─────────────────────────▶│              │
    │                               │                          │              │
    │  20. 返回新的双Token           │                          │              │
    │◀──────────────────────────────│                          │              │
```

#### Token 存储方案：Redis 白名单 + 黑名单混合策略

```
Redis Key 设计：

# 白名单 —— 记录当前有效的Token（用于多端登录控制）
auth:whitelist:access:{userId}:{deviceType}   = {jti}      TTL: 7200s
auth:whitelist:refresh:{userId}:{deviceType}  = {jti}      TTL: 604800s

# 黑名单 —— 记录主动吊销的Token（用于登出、踢人）
auth:blacklist:{jti}                          = 1          TTL: 与原Token剩余有效期相同

# Token族 —— 检测Refresh Token重放攻击
auth:family:{familyId}                        = {latest_jti}  TTL: 604800s

# 登录失败计数
auth:login_fail:{username}                    = {count}    TTL: 1800s (30分钟)

# 登录锁定
auth:locked:{username}                        = 1          TTL: 1800s (30分钟)
```

#### 核心代码实现

```typescript
// ============================================================
// src/modules/auth/auth.module.ts
// ============================================================
import { Module } from "@nestjs/common";
import { JwtModule } from "@nestjs/jwt";
import { PassportModule } from "@nestjs/passport";
import { AuthService } from "./auth.service";
import { AuthController } from "./auth.controller";
import { JwtStrategy } from "./strategies/jwt.strategy";
import { JwtRefreshStrategy } from "./strategies/jwt-refresh.strategy";
import { TokenService } from "./services/token.service";
import { RedisModule } from "../redis/redis.module";
import { UserModule } from "../user/user.module";

@Module({
  imports: [
    PassportModule.register({ defaultStrategy: "jwt" }),
    JwtModule.registerAsync({
      useFactory: () => ({
        // 使用RS256非对称加密算法
        privateKey: fs.readFileSync("keys/private.pem", "utf8"),
        publicKey: fs.readFileSync("keys/public.pem", "utf8"),
        signOptions: {
          algorithm: "RS256",
          issuer: "crm-sales-platform",
        },
      }),
    }),
    RedisModule,
    UserModule,
  ],
  controllers: [AuthController],
  providers: [AuthService, TokenService, JwtStrategy, JwtRefreshStrategy],
  exports: [AuthService, TokenService],
})
export class AuthModule {}

// ============================================================
// src/modules/auth/services/token.service.ts
// ============================================================
import { Injectable, UnauthorizedException } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { RedisService } from "../../redis/redis.service";
import { v4 as uuidv4 } from "uuid";
import {
  AccessTokenPayload,
  RefreshTokenPayload,
  TokenPair,
} from "../interfaces/token.interface";

@Injectable()
export class TokenService {
  // Token 有效期常量
  private readonly ACCESS_TOKEN_TTL = 2 * 60 * 60; // 2小时（秒）
  private readonly REFRESH_TOKEN_TTL = 7 * 24 * 60 * 60; // 7天（秒）

  constructor(
    private readonly jwtService: JwtService,
    private readonly redisService: RedisService,
  ) {}

  /**
   * 生成 Access Token + Refresh Token 对
   */
  async generateTokenPair(
    user: { id: string; role: string; deptId: string },
    deviceType: string = "web",
  ): Promise<TokenPair> {
    const accessJti = uuidv4();
    const refreshJti = uuidv4();
    const familyId = uuidv4();

    // 构造 Access Token Payload
    const accessPayload: AccessTokenPayload = {
      sub: user.id,
      role: user.role,
      deptId: user.deptId,
      tokenType: "access",
      jti: accessJti,
    };

    // 构造 Refresh Token Payload
    const refreshPayload: RefreshTokenPayload = {
      sub: user.id,
      tokenType: "refresh",
      familyId,
      jti: refreshJti,
    };

    // 签发 Token
    const accessToken = this.jwtService.sign(accessPayload, {
      expiresIn: this.ACCESS_TOKEN_TTL,
    });

    const refreshToken = this.jwtService.sign(refreshPayload, {
      expiresIn: this.REFRESH_TOKEN_TTL,
    });

    // 存入 Redis 白名单
    const pipeline = this.redisService.pipeline();

    // Access Token 白名单
    pipeline.set(
      `auth:whitelist:access:${user.id}:${deviceType}`,
      accessJti,
      "EX",
      this.ACCESS_TOKEN_TTL,
    );

    // Refresh Token 白名单
    pipeline.set(
      `auth:whitelist:refresh:${user.id}:${deviceType}`,
      refreshJti,
      "EX",
      this.REFRESH_TOKEN_TTL,
    );

    // Token 族记录（用于检测 Refresh Token 重放）
    pipeline.set(
      `auth:family:${familyId}`,
      refreshJti,
      "EX",
      this.REFRESH_TOKEN_TTL,
    );

    await pipeline.exec();

    return {
      accessToken,
      refreshToken,
      expiresIn: this.ACCESS_TOKEN_TTL,
      refreshExpiresIn: this.REFRESH_TOKEN_TTL,
    };
  }

  /**
   * 验证 Access Token 是否有效（未被吊销）
   */
  async validateAccessToken(jti: string): Promise<boolean> {
    // 检查黑名单
    const isBlacklisted = await this.redisService.exists(
      `auth:blacklist:${jti}`,
    );
    return !isBlacklisted;
  }

  /**
   * 刷新 Token 对
   * 实现 Refresh Token Rotation + 重放检测
   */
  async refreshTokenPair(
    refreshPayload: RefreshTokenPayload,
    deviceType: string = "web",
  ): Promise<TokenPair> {
    const { sub: userId, familyId, jti: currentJti } = refreshPayload;

    // 1. 检查该 Refresh Token 是否在黑名单中
    const isBlacklisted = await this.redisService.exists(
      `auth:blacklist:${currentJti}`,
    );
    if (isBlacklisted) {
      throw new UnauthorizedException("Token已被吊销");
    }

    // 2. 检查 Token 族：验证是否为该族最新的 Refresh Token
    const latestJti = await this.redisService.get(`auth:family:${familyId}`);

    if (latestJti !== currentJti) {
      // 检测到重放攻击！ 当前使用的不是最新的 Refresh Token
      // 安全措施：吊销该族所有 Token，强制用户重新登录
      await this.revokeTokenFamily(familyId, userId);
      throw new UnauthorizedException("检测到异常刷新行为，请重新登录");
    }

    // 3. 将旧的 Refresh Token 加入黑名单
    const oldTokenTTL = await this.getTokenRemainingTTL(refreshPayload);
    if (oldTokenTTL > 0) {
      await this.redisService.set(
        `auth:blacklist:${currentJti}`,
        "1",
        "EX",
        oldTokenTTL,
      );
    }

    // 4. 获取用户最新信息（角色可能变更）
    const user = await this.getUserForToken(userId);

    // 5. 生成新的 Token 对，沿用同一个 familyId
    const newAccessJti = uuidv4();
    const newRefreshJti = uuidv4();

    const accessPayload: AccessTokenPayload = {
      sub: user.id,
      role: user.role,
      deptId: user.deptId,
      tokenType: "access",
      jti: newAccessJti,
    };

    const newRefreshPayload: RefreshTokenPayload = {
      sub: userId,
      tokenType: "refresh",
      familyId, // 沿用相同的 familyId
      jti: newRefreshJti,
    };

    const accessToken = this.jwtService.sign(accessPayload, {
      expiresIn: this.ACCESS_TOKEN_TTL,
    });

    const refreshToken = this.jwtService.sign(newRefreshPayload, {
      expiresIn: this.REFRESH_TOKEN_TTL,
    });

    // 6. 更新 Redis
    const pipeline = this.redisService.pipeline();

    pipeline.set(
      `auth:whitelist:access:${userId}:${deviceType}`,
      newAccessJti,
      "EX",
      this.ACCESS_TOKEN_TTL,
    );

    pipeline.set(
      `auth:whitelist:refresh:${userId}:${deviceType}`,
      newRefreshJti,
      "EX",
      this.REFRESH_TOKEN_TTL,
    );

    // 更新 Token 族中的最新 jti
    pipeline.set(
      `auth:family:${familyId}`,
      newRefreshJti,
      "EX",
      this.REFRESH_TOKEN_TTL,
    );

    await pipeline.exec();

    return {
      accessToken,
      refreshToken,
      expiresIn: this.ACCESS_TOKEN_TTL,
      refreshExpiresIn: this.REFRESH_TOKEN_TTL,
    };
  }

  /**
   * 吊销整个 Token 族（重放攻击检测时触发）
   */
  private async revokeTokenFamily(
    familyId: string,
    userId: string,
  ): Promise<void> {
    const pipeline = this.redisService.pipeline();

    // 删除 Token 族
    pipeline.del(`auth:family:${familyId}`);

    // 清除该用户所有设备的白名单
    const deviceTypes = ["web", "mobile", "desktop"];
    for (const device of deviceTypes) {
      pipeline.del(`auth:whitelist:access:${userId}:${device}`);
      pipeline.del(`auth:whitelist:refresh:${userId}:${device}`);
    }

    await pipeline.exec();
  }

  /**
   * 登出：吊销指定用户在指定设备上的 Token
   */
  async revokeToken(
    userId: string,
    accessJti: string,
    deviceType: string = "web",
    remainingTTL: number = this.ACCESS_TOKEN_TTL,
  ): Promise<void> {
    const pipeline = this.redisService.pipeline();

    // Access Token 加入黑名单
    pipeline.set(`auth:blacklist:${accessJti}`, "1", "EX", remainingTTL);

    // 清除白名单
    pipeline.del(`auth:whitelist:access:${userId}:${deviceType}`);
    pipeline.del(`auth:whitelist:refresh:${userId}:${deviceType}`);

    await pipeline.exec();
  }

  /**
   * 强制登出所有设备（管理员踢人 / 修改密码后）
   */
  async revokeAllTokens(userId: string): Promise<void> {
    const deviceTypes = ["web", "mobile", "desktop"];
    const pipeline = this.redisService.pipeline();

    for (const device of deviceTypes) {
      // 获取当前有效的 jti 并加入黑名单
      const accessJti = await this.redisService.get(
        `auth:whitelist:access:${userId}:${device}`,
      );
      const refreshJti = await this.redisService.get(
        `auth:whitelist:refresh:${userId}:${device}`,
      );

      if (accessJti) {
        pipeline.set(
          `auth:blacklist:${accessJti}`,
          "1",
          "EX",
          this.ACCESS_TOKEN_TTL,
        );
      }
      if (refreshJti) {
        pipeline.set(
          `auth:blacklist:${refreshJti}`,
          "1",
          "EX",
          this.REFRESH_TOKEN_TTL,
        );
      }

      pipeline.del(`auth:whitelist:access:${userId}:${device}`);
      pipeline.del(`auth:whitelist:refresh:${userId}:${device}`);
    }

    await pipeline.exec();
  }

  private getTokenRemainingTTL(payload: { exp?: number }): number {
    if (!payload.exp) return 0;
    return Math.max(0, payload.exp - Math.floor(Date.now() / 1000));
  }

  private async getUserForToken(
    userId: string,
  ): Promise<{ id: string; role: string; deptId: string }> {
    // 实际实现中从 UserService 获取
    // 此处为接口示意
    return { id: userId, role: "", deptId: "" };
  }
}
```

#### 12.1.2 登录安全

#### 密码加密存储（bcrypt）

```typescript
// ============================================================
// src/modules/auth/auth.service.ts
// ============================================================
import {
  Injectable,
  UnauthorizedException,
  ForbiddenException,
} from "@nestjs/common";
import * as bcrypt from "bcrypt";
import { TokenService } from "./services/token.service";
import { RedisService } from "../redis/redis.service";
import { UserService } from "../user/user.service";
import { LoginDto } from "./dto/login.dto";
import { AuditLogService } from "../audit/audit-log.service";

@Injectable()
export class AuthService {
  private readonly SALT_ROUNDS = 12;
  private readonly MAX_LOGIN_ATTEMPTS = 5; // 最大登录失败次数
  private readonly LOGIN_LOCK_DURATION = 30 * 60; // 锁定时长30分钟（秒）
  private readonly CAPTCHA_THRESHOLD = 3; // 超过3次失败需要验证码

  constructor(
    private readonly tokenService: TokenService,
    private readonly redisService: RedisService,
    private readonly userService: UserService,
    private readonly auditLogService: AuditLogService,
  ) {}

  /**
   * 用户注册/创建时的密码加密
   */
  async hashPassword(plainPassword: string): Promise<string> {
    return bcrypt.hash(plainPassword, this.SALT_ROUNDS);
  }

  /**
   * 登录认证主流程
   */
  async login(
    loginDto: LoginDto,
    clientInfo: { ip: string; userAgent: string; deviceType: string },
  ) {
    const { username, password, captchaCode, captchaKey } = loginDto;

    // 1. 检查账户是否被锁定
    const isLocked = await this.redisService.exists(`auth:locked:${username}`);
    if (isLocked) {
      const ttl = await this.redisService.ttl(`auth:locked:${username}`);
      throw new ForbiddenException(
        `账户已被锁定，请在${Math.ceil(ttl / 60)}分钟后重试`,
      );
    }

    // 2. 检查是否需要验证码
    const failCount = await this.getLoginFailCount(username);
    if (failCount >= this.CAPTCHA_THRESHOLD) {
      if (!captchaCode || !captchaKey) {
        throw new UnauthorizedException({
          code: "CAPTCHA_REQUIRED",
          message: "登录失败次数过多，请输入验证码",
          needCaptcha: true,
        });
      }
      // 验证图形验证码
      const isValidCaptcha = await this.verifyCaptcha(captchaKey, captchaCode);
      if (!isValidCaptcha) {
        throw new UnauthorizedException("验证码错误");
      }
    }

    // 3. 查询用户
    const user = await this.userService.findByUsername(username);
    if (!user) {
      await this.handleLoginFailure(username, clientInfo);
      throw new UnauthorizedException("用户名或密码错误");
    }

    // 4. 检查用户状态
    if (user.status === "disabled") {
      throw new ForbiddenException("账户已被禁用，请联系管理员");
    }

    // 5. 验证密码
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      await this.handleLoginFailure(username, clientInfo);
      throw new UnauthorizedException("用户名或密码错误");
    }

    // 6. 登录成功：清除失败计数
    await this.redisService.del(`auth:login_fail:${username}`);

    // 7. 多端登录控制
    await this.handleMultiDeviceLogin(user.id, clientInfo.deviceType);

    // 8. 生成 Token 对
    const tokenPair = await this.tokenService.generateTokenPair(
      { id: user.id, role: user.role, deptId: user.deptId },
      clientInfo.deviceType,
    );

    // 9. 记录登录日志
    await this.auditLogService.log({
      userId: user.id,
      action: "LOGIN",
      resource: "auth",
      ip: clientInfo.ip,
      userAgent: clientInfo.userAgent,
      status: "success",
      detail: { deviceType: clientInfo.deviceType },
    });

    // 10. 更新最后登录信息
    await this.userService.updateLoginInfo(user.id, {
      lastLoginAt: new Date(),
      lastLoginIp: clientInfo.ip,
    });

    return {
      ...tokenPair,
      user: {
        id: user.id,
        username: user.username,
        realName: user.realName,
        role: user.role,
        avatar: user.avatar,
      },
    };
  }

  /**
   * 处理登录失败
   */
  private async handleLoginFailure(
    username: string,
    clientInfo: { ip: string; userAgent: string },
  ): Promise<void> {
    const key = `auth:login_fail:${username}`;
    const failCount = await this.redisService.incr(key);

    // 首次失败时设置过期时间
    if (failCount === 1) {
      await this.redisService.expire(key, this.LOGIN_LOCK_DURATION);
    }

    // 达到上限则锁定账户
    if (failCount >= this.MAX_LOGIN_ATTEMPTS) {
      await this.redisService.set(
        `auth:locked:${username}`,
        "1",
        "EX",
        this.LOGIN_LOCK_DURATION,
      );

      // 记录安全审计日志
      await this.auditLogService.log({
        action: "ACCOUNT_LOCKED",
        resource: "auth",
        ip: clientInfo.ip,
        userAgent: clientInfo.userAgent,
        status: "warning",
        detail: {
          username,
          reason: `连续登录失败${failCount}次`,
        },
      });
    }
  }

  /**
   * 获取登录失败次数
   */
  private async getLoginFailCount(username: string): Promise<number> {
    const count = await this.redisService.get(`auth:login_fail:${username}`);
    return count ? parseInt(count, 10) : 0;
  }

  /**
   * 验证图形验证码
   */
  private async verifyCaptcha(key: string, code: string): Promise<boolean> {
    const storedCode = await this.redisService.get(`captcha:${key}`);
    if (!storedCode) return false;

    // 验证后立即删除（一次性使用）
    await this.redisService.del(`captcha:${key}`);

    return storedCode.toLowerCase() === code.toLowerCase();
  }

  /**
   * 登出
   */
  async logout(
    userId: string,
    accessJti: string,
    deviceType: string,
  ): Promise<void> {
    await this.tokenService.revokeToken(userId, accessJti, deviceType);

    await this.auditLogService.log({
      userId,
      action: "LOGOUT",
      resource: "auth",
      status: "success",
    });
  }
}
```

#### 登录请求 DTO（参数校验）

```typescript
// ============================================================
// src/modules/auth/dto/login.dto.ts
// ============================================================
import {
  IsString,
  IsNotEmpty,
  Length,
  IsOptional,
  Matches,
} from "class-validator";

export class LoginDto {
  @IsString()
  @IsNotEmpty({ message: "用户名不能为空" })
  @Length(3, 50, { message: "用户名长度为3-50个字符" })
  username: string;

  @IsString()
  @IsNotEmpty({ message: "密码不能为空" })
  @Length(8, 128, { message: "密码长度为8-128个字符" })
  password: string;

  @IsOptional()
  @IsString()
  captchaCode?: string;

  @IsOptional()
  @IsString()
  captchaKey?: string;
}
```

#### 12.1.3 多端登录控制策略

```typescript
/**
 * 多端登录控制策略
 *
 * 策略说明：
 * - 同一设备类型：后登录挤掉先登录（单端单点）
 * - 不同设备类型：允许同时在线（多端并行）
 * - 设备类型：web / mobile / desktop
 *
 * 示例：
 *   用户A 在 web 登录  → 正常
 *   用户A 在 mobile 登录 → 正常（web 不受影响）
 *   用户A 在另一个 web 登录 → 之前的 web 登录被踢出
 */
private async handleMultiDeviceLogin(
  userId: string,
  deviceType: string,
): Promise<void> {
  // 检查同设备类型是否已有登录态
  const existingAccessJti = await this.redisService.get(
    `auth:whitelist:access:${userId}:${deviceType}`,
  );

  if (existingAccessJti) {
    // 将旧的 Access Token 加入黑名单
    await this.redisService.set(
      `auth:blacklist:${existingAccessJti}`,
      '1',
      'EX',
      2 * 60 * 60, // 与 AccessToken 过期时间一致
    );

    // 同时吊销旧的 Refresh Token
    const existingRefreshJti = await this.redisService.get(
      `auth:whitelist:refresh:${userId}:${deviceType}`,
    );
    if (existingRefreshJti) {
      await this.redisService.set(
        `auth:blacklist:${existingRefreshJti}`,
        '1',
        'EX',
        7 * 24 * 60 * 60,
      );
    }
  }
}
```

#### JWT 策略（Passport.js）

```typescript
// ============================================================
// src/modules/auth/strategies/jwt.strategy.ts
// ============================================================
import { Injectable, UnauthorizedException } from "@nestjs/common";
import { PassportStrategy } from "@nestjs/passport";
import { ExtractJwt, Strategy } from "passport-jwt";
import { TokenService } from "../services/token.service";
import { AccessTokenPayload } from "../interfaces/token.interface";
import * as fs from "fs";

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, "jwt") {
  constructor(private readonly tokenService: TokenService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: fs.readFileSync("keys/public.pem", "utf8"),
      algorithms: ["RS256"],
      issuer: "crm-sales-platform",
    });
  }

  async validate(payload: AccessTokenPayload) {
    // 验证 Token 类型
    if (payload.tokenType !== "access") {
      throw new UnauthorizedException("无效的Token类型");
    }

    // 验证是否被吊销
    const isValid = await this.tokenService.validateAccessToken(payload.jti);
    if (!isValid) {
      throw new UnauthorizedException("Token已被吊销");
    }

    // 返回用户上下文，注入 request.user
    return {
      id: payload.sub,
      role: payload.role,
      deptId: payload.deptId,
      jti: payload.jti,
    };
  }
}

// ============================================================
// src/modules/auth/strategies/jwt-refresh.strategy.ts
// ============================================================
@Injectable()
export class JwtRefreshStrategy extends PassportStrategy(
  Strategy,
  "jwt-refresh",
) {
  constructor() {
    super({
      jwtFromRequest: ExtractJwt.fromBodyField("refreshToken"),
      ignoreExpiration: false,
      secretOrKey: fs.readFileSync("keys/public.pem", "utf8"),
      algorithms: ["RS256"],
      issuer: "crm-sales-platform",
    });
  }

  async validate(payload: RefreshTokenPayload) {
    if (payload.tokenType !== "refresh") {
      throw new UnauthorizedException("无效的Token类型");
    }
    return payload;
  }
}
```

---

### 12.2 授权体系设计

#### 12.2.1 RBAC 权限模型详细设计

#### 角色定义与层级关系

```
┌──────────────────────────────────────────────────────────┐
│                    角色层级体系                            │
│                                                          │
│    ┌─────────────────────┐                               │
│    │    super_admin       │  超级管理员                    │
│    │  全部权限·不可删除    │  系统初始化时自动创建          │
│    └────────┬────────────┘                               │
│             │                                            │
│    ┌────────▼────────────┐                               │
│    │      admin          │  管理员                        │
│    │  系统管理·用户管理   │  管理后台运维人员               │
│    └────────┬────────────┘                               │
│             │                                            │
│    ┌────────▼────────────┐                               │
│    │     manager         │  主管                          │
│    │  部门数据·团队管理   │  销售团队负责人                 │
│    └────────┬────────────┘                               │
│             │                                            │
│    ┌────────▼────────────┐                               │
│    │      sales          │  销售                          │
│    │  个人数据·基础操作   │  一线销售人员                   │
│    └─────────────────────┘                               │
│                                                          │
│  规则：高级角色自动继承低级角色的所有权限                    │
└──────────────────────────────────────────────────────────┘
```

#### 各角色权限矩阵

| 功能模块     | 操作          | 超级管理员 | 管理员 |  主管  |  销售  |
| ------------ | ------------- | :--------: | :----: | :----: | :----: |
| **客户管理** | 查看全部客户  |     Y      |   Y    |   -    |   -    |
|              | 查看部门客户  |     Y      |   Y    |   Y    |   -    |
|              | 查看个人客户  |     Y      |   Y    |   Y    |   Y    |
|              | 创建客户      |     Y      |   Y    |   Y    |   Y    |
|              | 编辑客户      |     Y      |   Y    | 部门内 | 仅自己 |
|              | 删除客户      |     Y      |   Y    |   -    |   -    |
|              | 批量导入      |     Y      |   Y    |   Y    |   -    |
|              | 批量导出      |     Y      |   Y    |   Y    |   -    |
| **商机管理** | 查看全部商机  |     Y      |   Y    |   -    |   -    |
|              | 查看部门商机  |     Y      |   Y    |   Y    |   -    |
|              | 查看个人商机  |     Y      |   Y    |   Y    |   Y    |
|              | 创建/编辑商机 |     Y      |   Y    |   Y    |   Y    |
|              | 删除商机      |     Y      |   Y    |   -    |   -    |
| **合同管理** | 审批合同      |     Y      |   Y    |   Y    |   -    |
|              | 创建合同      |     Y      |   Y    |   Y    |   Y    |
|              | 删除合同      |     Y      |   Y    |   -    |   -    |
| **数据统计** | 全公司报表    |     Y      |   Y    |   -    |   -    |
|              | 部门报表      |     Y      |   Y    |   Y    |   -    |
|              | 个人报表      |     Y      |   Y    |   Y    |   Y    |
| **系统管理** | 用户管理      |     Y      |   Y    |   -    |   -    |
|              | 角色管理      |     Y      |   -    |   -    |   -    |
|              | 系统配置      |     Y      |   -    |   -    |   -    |
|              | 审计日志      |     Y      |   Y    |   -    |   -    |

#### 权限粒度说明

```
权限粒度分为三个维度：

┌─────────────────────────────────────────────────────────────┐
│                                                             │
│  1. 菜单权限（Menu Permission）                              │
│     控制左侧导航栏可见菜单项                                  │
│     示例: system:user:menu  →  是否可见"用户管理"菜单         │
│                                                             │
│  2. 操作权限（Button/Action Permission）                     │
│     控制页面内按钮和操作的可见性与可用性                        │
│     示例: customer:create  →  是否可见"新建客户"按钮          │
│           customer:delete  →  是否可见"删除"按钮              │
│           customer:export  →  是否可见"导出"按钮              │
│                                                             │
│  3. 数据权限（Data Scope）                                   │
│     控制可访问的数据范围                                      │
│     ┌──────────────────────────────────────────────┐        │
│     │  DATA_SCOPE_ALL       →  全部数据             │        │
│     │  DATA_SCOPE_DEPT      →  本部门数据           │        │
│     │  DATA_SCOPE_DEPT_TREE →  本部门及下属部门数据  │        │
│     │  DATA_SCOPE_SELF      →  仅本人数据           │        │
│     │  DATA_SCOPE_CUSTOM    →  自定义部门数据        │        │
│     └──────────────────────────────────────────────┘        │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

#### 12.2.2 权限表结构设计

```sql
-- ============================================================
-- 角色表
-- ============================================================
CREATE TABLE `sys_role` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT '角色ID',
  `role_code` VARCHAR(50) NOT NULL COMMENT '角色编码: super_admin/admin/manager/sales',
  `role_name` VARCHAR(100) NOT NULL COMMENT '角色名称',
  `role_level` TINYINT UNSIGNED NOT NULL DEFAULT 0 COMMENT '角色层级: 0最高',
  `data_scope` ENUM(
    'DATA_SCOPE_ALL',
    'DATA_SCOPE_DEPT',
    'DATA_SCOPE_DEPT_TREE',
    'DATA_SCOPE_SELF',
    'DATA_SCOPE_CUSTOM'
  ) NOT NULL DEFAULT 'DATA_SCOPE_SELF' COMMENT '数据权限范围',
  `description` VARCHAR(500) DEFAULT NULL COMMENT '角色描述',
  `status` TINYINT UNSIGNED NOT NULL DEFAULT 1 COMMENT '状态: 1启用 0禁用',
  `is_system` TINYINT UNSIGNED NOT NULL DEFAULT 0 COMMENT '是否系统内置角色: 1是 0否',
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_role_code` (`role_code`),
  KEY `idx_role_level` (`role_level`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='系统角色表';

-- 初始角色数据
INSERT INTO `sys_role` (`role_code`, `role_name`, `role_level`, `data_scope`, `is_system`) VALUES
('super_admin', '超级管理员', 0, 'DATA_SCOPE_ALL', 1),
('admin',       '管理员',     1, 'DATA_SCOPE_ALL', 1),
('manager',     '主管',       2, 'DATA_SCOPE_DEPT_TREE', 1),
('sales',       '销售',       3, 'DATA_SCOPE_SELF', 1);

-- ============================================================
-- 权限表（菜单权限 + 操作权限 统一管理）
-- ============================================================
CREATE TABLE `sys_permission` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT '权限ID',
  `parent_id` BIGINT UNSIGNED DEFAULT 0 COMMENT '父权限ID',
  `perm_code` VARCHAR(100) NOT NULL COMMENT '权限编码，如 customer:create',
  `perm_name` VARCHAR(100) NOT NULL COMMENT '权限名称',
  `perm_type` ENUM('menu', 'button', 'api') NOT NULL COMMENT '权限类型',
  `path` VARCHAR(200) DEFAULT NULL COMMENT '前端路由路径（menu类型）',
  `icon` VARCHAR(100) DEFAULT NULL COMMENT '菜单图标（menu类型）',
  `api_path` VARCHAR(200) DEFAULT NULL COMMENT 'API路径（api类型）',
  `api_method` VARCHAR(10) DEFAULT NULL COMMENT 'HTTP方法（api类型）',
  `sort_order` INT NOT NULL DEFAULT 0 COMMENT '排序号',
  `status` TINYINT UNSIGNED NOT NULL DEFAULT 1 COMMENT '状态: 1启用 0禁用',
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_perm_code` (`perm_code`),
  KEY `idx_parent_id` (`parent_id`),
  KEY `idx_perm_type` (`perm_type`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='系统权限表';

-- ============================================================
-- 角色-权限关联表
-- ============================================================
CREATE TABLE `sys_role_permission` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `role_id` BIGINT UNSIGNED NOT NULL COMMENT '角色ID',
  `permission_id` BIGINT UNSIGNED NOT NULL COMMENT '权限ID',
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_role_perm` (`role_id`, `permission_id`),
  KEY `idx_permission_id` (`permission_id`),
  CONSTRAINT `fk_rp_role` FOREIGN KEY (`role_id`)
    REFERENCES `sys_role` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_rp_perm` FOREIGN KEY (`permission_id`)
    REFERENCES `sys_permission` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='角色权限关联表';

-- ============================================================
-- 用户-角色关联表
-- ============================================================
CREATE TABLE `sys_user_role` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `user_id` BIGINT UNSIGNED NOT NULL COMMENT '用户ID',
  `role_id` BIGINT UNSIGNED NOT NULL COMMENT '角色ID',
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_user_role` (`user_id`, `role_id`),
  KEY `idx_role_id` (`role_id`),
  CONSTRAINT `fk_ur_user` FOREIGN KEY (`user_id`)
    REFERENCES `sys_user` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_ur_role` FOREIGN KEY (`role_id`)
    REFERENCES `sys_role` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='用户角色关联表';

-- ============================================================
-- 角色-自定义数据权限部门关联表
-- （仅 data_scope = DATA_SCOPE_CUSTOM 时使用）
-- ============================================================
CREATE TABLE `sys_role_dept` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `role_id` BIGINT UNSIGNED NOT NULL COMMENT '角色ID',
  `dept_id` BIGINT UNSIGNED NOT NULL COMMENT '部门ID',
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_role_dept` (`role_id`, `dept_id`),
  CONSTRAINT `fk_rd_role` FOREIGN KEY (`role_id`)
    REFERENCES `sys_role` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_rd_dept` FOREIGN KEY (`dept_id`)
    REFERENCES `sys_department` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='角色自定义数据权限部门关联表';
```

#### 12.2.3 NestJS Guard 实现

#### 操作权限 Guard

```typescript
// ============================================================
// src/common/decorators/permissions.decorator.ts
// ============================================================
import { SetMetadata } from "@nestjs/common";

export const PERMISSIONS_KEY = "permissions";

/**
 * 权限装饰器
 * 用法: @Permissions('customer:create', 'customer:edit')
 */
export const Permissions = (...permissions: string[]) =>
  SetMetadata(PERMISSIONS_KEY, permissions);

// ============================================================
// src/common/decorators/roles.decorator.ts
// ============================================================
export const ROLES_KEY = "roles";

/**
 * 角色装饰器
 * 用法: @Roles('super_admin', 'admin')
 */
export const Roles = (...roles: string[]) => SetMetadata(ROLES_KEY, roles);

// ============================================================
// src/common/decorators/data-scope.decorator.ts
// ============================================================
export const DATA_SCOPE_KEY = "dataScope";

/**
 * 数据权限装饰器
 * 用法: @DataScope('customer') 指定要过滤的数据实体
 */
export const DataScope = (entity: string) =>
  SetMetadata(DATA_SCOPE_KEY, entity);

// ============================================================
// src/common/guards/permissions.guard.ts
// ============================================================
import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { PERMISSIONS_KEY } from "../decorators/permissions.decorator";
import { ROLES_KEY } from "../decorators/roles.decorator";
import { PermissionCacheService } from "../../modules/auth/services/permission-cache.service";

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly permissionCacheService: PermissionCacheService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    // 获取路由上标注的所需权限
    const requiredPermissions = this.reflector.getAllAndOverride<string[]>(
      PERMISSIONS_KEY,
      [context.getHandler(), context.getClass()],
    );

    const requiredRoles = this.reflector.getAllAndOverride<string[]>(
      ROLES_KEY,
      [context.getHandler(), context.getClass()],
    );

    // 如果没有标注权限或角色要求，则默认放行
    if (!requiredPermissions?.length && !requiredRoles?.length) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user) {
      throw new ForbiddenException("用户未认证");
    }

    // 超级管理员拥有所有权限
    if (user.role === "super_admin") {
      return true;
    }

    // 角色校验
    if (requiredRoles?.length) {
      const hasRole = requiredRoles.includes(user.role);
      if (!hasRole) {
        throw new ForbiddenException("角色权限不足");
      }
    }

    // 权限校验
    if (requiredPermissions?.length) {
      // 从 Redis 缓存获取用户权限列表
      const userPermissions =
        await this.permissionCacheService.getUserPermissions(user.id);

      const hasPermission = requiredPermissions.some((perm) =>
        userPermissions.includes(perm),
      );

      if (!hasPermission) {
        throw new ForbiddenException("操作权限不足");
      }
    }

    return true;
  }
}

// ============================================================
// src/common/guards/data-scope.guard.ts
// 数据权限拦截器 —— 自动注入数据过滤条件
// ============================================================
import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { Observable } from "rxjs";
import { DATA_SCOPE_KEY } from "../decorators/data-scope.decorator";
import { PermissionCacheService } from "../../modules/auth/services/permission-cache.service";

@Injectable()
export class DataScopeInterceptor implements NestInterceptor {
  constructor(
    private readonly reflector: Reflector,
    private readonly permissionCacheService: PermissionCacheService,
  ) {}

  async intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Promise<Observable<any>> {
    const entity = this.reflector.get<string>(
      DATA_SCOPE_KEY,
      context.getHandler(),
    );

    if (!entity) {
      return next.handle();
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user;

    // 获取用户的数据权限范围
    const dataScope = await this.permissionCacheService.getUserDataScope(
      user.id,
    );

    // 根据数据权限范围构建过滤条件
    switch (dataScope.scope) {
      case "DATA_SCOPE_ALL":
        // 不添加过滤条件
        request.dataFilter = {};
        break;

      case "DATA_SCOPE_DEPT_TREE":
        // 本部门及下属部门
        const deptIds = await this.permissionCacheService.getDeptTreeIds(
          user.deptId,
        );
        request.dataFilter = {
          deptId: deptIds, // IN (deptId, childDeptIds...)
        };
        break;

      case "DATA_SCOPE_DEPT":
        // 仅本部门
        request.dataFilter = {
          deptId: [user.deptId],
        };
        break;

      case "DATA_SCOPE_SELF":
        // 仅本人
        request.dataFilter = {
          createdBy: user.id,
        };
        break;

      case "DATA_SCOPE_CUSTOM":
        // 自定义部门
        request.dataFilter = {
          deptId: dataScope.customDeptIds,
        };
        break;
    }

    return next.handle();
  }
}
```

#### Controller 使用示例

```typescript
// ============================================================
// src/modules/customer/customer.controller.ts
// ============================================================
import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Param,
  Body,
  Query,
  UseGuards,
  UseInterceptors,
  Req,
} from "@nestjs/common";
import { AuthGuard } from "@nestjs/passport";
import { PermissionsGuard } from "../../common/guards/permissions.guard";
import { DataScopeInterceptor } from "../../common/guards/data-scope.guard";
import { Permissions } from "../../common/decorators/permissions.decorator";
import { Roles } from "../../common/decorators/roles.decorator";
import { DataScope } from "../../common/decorators/data-scope.decorator";
import { CustomerService } from "./customer.service";

@Controller("customers")
@UseGuards(AuthGuard("jwt"), PermissionsGuard)
export class CustomerController {
  constructor(private readonly customerService: CustomerService) {}

  @Get()
  @Permissions("customer:list")
  @DataScope("customer")
  @UseInterceptors(DataScopeInterceptor)
  async findAll(@Query() query, @Req() req) {
    // req.dataFilter 由 DataScopeInterceptor 自动注入
    return this.customerService.findAll(query, req.dataFilter);
  }

  @Post()
  @Permissions("customer:create")
  async create(@Body() dto, @Req() req) {
    return this.customerService.create(dto, req.user);
  }

  @Put(":id")
  @Permissions("customer:edit")
  async update(@Param("id") id: string, @Body() dto, @Req() req) {
    return this.customerService.update(id, dto, req.user);
  }

  @Delete(":id")
  @Roles("super_admin", "admin")
  @Permissions("customer:delete")
  async delete(@Param("id") id: string) {
    return this.customerService.softDelete(id);
  }

  @Post("export")
  @Roles("super_admin", "admin", "manager")
  @Permissions("customer:export")
  @DataScope("customer")
  @UseInterceptors(DataScopeInterceptor)
  async export(@Body() query, @Req() req) {
    return this.customerService.export(query, req.dataFilter);
  }
}
```

#### 12.2.4 权限缓存方案（Redis）

```typescript
// ============================================================
// src/modules/auth/services/permission-cache.service.ts
// ============================================================
import { Injectable } from "@nestjs/common";
import { RedisService } from "../../redis/redis.service";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { SysUserRole } from "../entities/sys-user-role.entity";
import { SysRolePermission } from "../entities/sys-role-permission.entity";
import { SysDepartment } from "../../department/entities/sys-department.entity";

@Injectable()
export class PermissionCacheService {
  // 权限缓存 TTL: 30分钟
  private readonly PERM_CACHE_TTL = 30 * 60;

  constructor(
    private readonly redisService: RedisService,
    @InjectRepository(SysUserRole)
    private readonly userRoleRepo: Repository<SysUserRole>,
    @InjectRepository(SysRolePermission)
    private readonly rolePermRepo: Repository<SysRolePermission>,
    @InjectRepository(SysDepartment)
    private readonly deptRepo: Repository<SysDepartment>,
  ) {}

  /**
   * 获取用户权限列表（优先从 Redis 缓存读取）
   */
  async getUserPermissions(userId: string): Promise<string[]> {
    const cacheKey = `perm:user:${userId}`;

    // 1. 尝试从缓存读取
    const cached = await this.redisService.get(cacheKey);
    if (cached) {
      return JSON.parse(cached);
    }

    // 2. 缓存未命中，从数据库查询
    const permissions = await this.loadUserPermissionsFromDB(userId);

    // 3. 写入缓存
    await this.redisService.set(
      cacheKey,
      JSON.stringify(permissions),
      "EX",
      this.PERM_CACHE_TTL,
    );

    return permissions;
  }

  /**
   * 从数据库加载用户权限
   */
  private async loadUserPermissionsFromDB(userId: string): Promise<string[]> {
    const result = await this.userRoleRepo
      .createQueryBuilder("ur")
      .innerJoin("sys_role_permission", "rp", "rp.role_id = ur.role_id")
      .innerJoin("sys_permission", "p", "p.id = rp.permission_id")
      .where("ur.user_id = :userId", { userId })
      .andWhere("p.status = 1")
      .select("DISTINCT p.perm_code", "permCode")
      .getRawMany();

    return result.map((r) => r.permCode);
  }

  /**
   * 获取用户数据权限范围
   */
  async getUserDataScope(
    userId: string,
  ): Promise<{ scope: string; customDeptIds?: string[] }> {
    const cacheKey = `perm:scope:${userId}`;

    const cached = await this.redisService.get(cacheKey);
    if (cached) {
      return JSON.parse(cached);
    }

    // 查询用户角色的数据权限（取最大范围）
    const roles = await this.userRoleRepo
      .createQueryBuilder("ur")
      .innerJoin("sys_role", "r", "r.id = ur.role_id")
      .where("ur.user_id = :userId", { userId })
      .select(["r.data_scope AS dataScope", "r.id AS roleId"])
      .orderBy("r.role_level", "ASC") // level越小权限越大
      .getRawMany();

    if (!roles.length) {
      return { scope: "DATA_SCOPE_SELF" };
    }

    const primaryRole = roles[0];
    const result: { scope: string; customDeptIds?: string[] } = {
      scope: primaryRole.dataScope,
    };

    // 如果是自定义数据权限，查询关联的部门
    if (primaryRole.dataScope === "DATA_SCOPE_CUSTOM") {
      const depts = await this.rolePermRepo.query(
        "SELECT dept_id FROM sys_role_dept WHERE role_id = ?",
        [primaryRole.roleId],
      );
      result.customDeptIds = depts.map((d: any) => d.dept_id);
    }

    await this.redisService.set(
      cacheKey,
      JSON.stringify(result),
      "EX",
      this.PERM_CACHE_TTL,
    );

    return result;
  }

  /**
   * 获取部门及其所有下属部门ID（递归）
   */
  async getDeptTreeIds(deptId: string): Promise<string[]> {
    const cacheKey = `perm:dept_tree:${deptId}`;

    const cached = await this.redisService.get(cacheKey);
    if (cached) {
      return JSON.parse(cached);
    }

    // 使用递归 CTE 查询部门树
    const result = await this.deptRepo.query(
      `
      WITH RECURSIVE dept_tree AS (
        SELECT id FROM sys_department WHERE id = ?
        UNION ALL
        SELECT d.id FROM sys_department d
        INNER JOIN dept_tree dt ON d.parent_id = dt.id
      )
      SELECT id FROM dept_tree
      `,
      [deptId],
    );

    const deptIds = result.map((r: any) => r.id.toString());

    await this.redisService.set(
      cacheKey,
      JSON.stringify(deptIds),
      "EX",
      this.PERM_CACHE_TTL,
    );

    return deptIds;
  }

  /**
   * 清除用户权限缓存（角色变更时调用）
   */
  async clearUserPermissionCache(userId: string): Promise<void> {
    const pipeline = this.redisService.pipeline();
    pipeline.del(`perm:user:${userId}`);
    pipeline.del(`perm:scope:${userId}`);
    await pipeline.exec();
  }

  /**
   * 清除所有权限缓存（权限配置变更时调用）
   */
  async clearAllPermissionCache(): Promise<void> {
    const keys = await this.redisService.keys("perm:*");
    if (keys.length > 0) {
      await this.redisService.del(...keys);
    }
  }
}
```

---

### 12.3 数据安全

#### 12.3.1 数据加密方案

#### 传输加密（TLS 1.2+）

```
┌─────────────────────────────────────────────────────────────┐
│                    传输层加密架构                             │
│                                                             │
│   Client ──── HTTPS/TLS 1.2+ ────▶ Nginx (SSL Termination) │
│                                        │                    │
│                                   HTTP (内网)               │
│                                        │                    │
│                                        ▼                    │
│                                   NestJS App               │
│                                        │                    │
│                                  TLS (内网加密)             │
│                                        │                    │
│                                   ┌────┴────┐              │
│                                   │         │              │
│                                   ▼         ▼              │
│                                MySQL     Redis             │
│                              (SSL连接)  (TLS连接)           │
└─────────────────────────────────────────────────────────────┘
```

**Nginx TLS 配置：**

```nginx
# /etc/nginx/conf.d/ssl.conf

ssl_protocols TLSv1.2 TLSv1.3;
ssl_ciphers ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256:ECDHE-ECDSA-AES256-GCM-SHA384:ECDHE-RSA-AES256-GCM-SHA384;
ssl_prefer_server_ciphers on;
ssl_session_cache shared:SSL:10m;
ssl_session_timeout 10m;
ssl_session_tickets off;

# HSTS (HTTP Strict Transport Security)
add_header Strict-Transport-Security "max-age=63072000; includeSubDomains; preload" always;

# OCSP Stapling
ssl_stapling on;
ssl_stapling_verify on;
resolver 223.5.5.5 223.6.6.6 valid=300s;
resolver_timeout 5s;
```

#### 存储加密（AES-256-GCM 敏感字段加密）

```typescript
// ============================================================
// src/common/crypto/field-encryption.service.ts
// ============================================================
import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import * as crypto from "crypto";

@Injectable()
export class FieldEncryptionService {
  private readonly algorithm = "aes-256-gcm";
  private readonly keyLength = 32; // 256 bits
  private readonly ivLength = 16; // 128 bits
  private readonly tagLength = 16; // 128 bits
  private readonly masterKey: Buffer;

  constructor(private readonly configService: ConfigService) {
    // 主密钥从环境变量获取（生产环境建议使用 KMS）
    const keyHex = this.configService.get<string>("ENCRYPTION_MASTER_KEY");
    if (!keyHex || keyHex.length !== 64) {
      throw new Error(
        "ENCRYPTION_MASTER_KEY 必须为64位十六进制字符串（256 bit）",
      );
    }
    this.masterKey = Buffer.from(keyHex, "hex");
  }

  /**
   * 加密敏感字段
   * 输出格式: base64(iv + tag + ciphertext)
   */
  encrypt(plaintext: string): string {
    if (!plaintext) return plaintext;

    const iv = crypto.randomBytes(this.ivLength);
    const cipher = crypto.createCipheriv(this.algorithm, this.masterKey, iv);

    let encrypted = cipher.update(plaintext, "utf8");
    encrypted = Buffer.concat([encrypted, cipher.final()]);

    const tag = cipher.getAuthTag();

    // 拼接: iv(16) + tag(16) + ciphertext
    const result = Buffer.concat([iv, tag, encrypted]);
    return result.toString("base64");
  }

  /**
   * 解密敏感字段
   */
  decrypt(encryptedBase64: string): string {
    if (!encryptedBase64) return encryptedBase64;

    try {
      const buffer = Buffer.from(encryptedBase64, "base64");

      const iv = buffer.subarray(0, this.ivLength);
      const tag = buffer.subarray(
        this.ivLength,
        this.ivLength + this.tagLength,
      );
      const ciphertext = buffer.subarray(this.ivLength + this.tagLength);

      const decipher = crypto.createDecipheriv(
        this.algorithm,
        this.masterKey,
        iv,
      );
      decipher.setAuthTag(tag);

      let decrypted = decipher.update(ciphertext);
      decrypted = Buffer.concat([decrypted, decipher.final()]);

      return decrypted.toString("utf8");
    } catch (error) {
      throw new Error("数据解密失败，密文可能已被篡改");
    }
  }

  /**
   * 生成用于模糊查询的确定性哈希索引
   * 注意：仅用于精确匹配查询，不支持模糊查询
   */
  generateSearchHash(plaintext: string): string {
    const hmac = crypto.createHmac("sha256", this.masterKey);
    hmac.update(plaintext);
    return hmac.digest("hex");
  }
}

// ============================================================
// src/common/decorators/encrypted-column.decorator.ts
// TypeORM 列装饰器：自动加解密
// ============================================================
import { Column, ColumnOptions, ValueTransformer } from "typeorm";

/**
 * 加密字段值转换器
 */
export class EncryptedTransformer implements ValueTransformer {
  constructor(private readonly encryptionService: FieldEncryptionService) {}

  // 写入数据库时加密
  to(value: string): string {
    return value ? this.encryptionService.encrypt(value) : value;
  }

  // 从数据库读取时解密
  from(value: string): string {
    return value ? this.encryptionService.decrypt(value) : value;
  }
}

// ============================================================
// 在 Entity 中使用
// ============================================================
@Entity("crm_customer")
export class Customer {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column({ comment: "客户姓名" })
  name: string;

  @Column({
    comment: "手机号（加密存储）",
    length: 500,
    transformer: new EncryptedTransformer(fieldEncryptionService),
  })
  phone: string;

  @Column({
    comment: "手机号搜索哈希（用于精确查询）",
    length: 64,
  })
  phoneHash: string;

  @Column({
    comment: "身份证号（加密存储）",
    length: 500,
    nullable: true,
    transformer: new EncryptedTransformer(fieldEncryptionService),
  })
  idCard: string;

  @Column({
    comment: "邮箱（加密存储）",
    length: 500,
    nullable: true,
    transformer: new EncryptedTransformer(fieldEncryptionService),
  })
  email: string;
}
```

**需要加密存储的敏感字段清单：**

| 数据实体 | 字段            | 加密方式               | 说明             |
| -------- | --------------- | ---------------------- | ---------------- |
| 客户     | phone           | AES-256-GCM            | 手机号           |
| 客户     | id_card         | AES-256-GCM            | 身份证号         |
| 客户     | email           | AES-256-GCM            | 邮箱地址         |
| 客户     | bank_account    | AES-256-GCM            | 银行账号         |
| 用户     | password        | bcrypt (saltRounds=12) | 密码（单向哈希） |
| 合同     | contract_amount | AES-256-GCM            | 合同金额         |

#### 密码存储（bcrypt）

```typescript
// 密码安全策略

// 1. 密码复杂度校验
@Matches(
  /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,128}$/,
  {
    message: '密码必须包含大写字母、小写字母、数字和特殊字符，长度8-128位',
  },
)
password: string;

// 2. bcrypt 加密参数
const SALT_ROUNDS = 12;  // 2^12 = 4096次迭代，约250ms/次

// 3. 加密存储
const hashedPassword = await bcrypt.hash(plainPassword, SALT_ROUNDS);
// 结果示例: $2b$12$LJ3m4ys3Lg7EPT3Jh3bwi.sT1FVFsYVS5Y5u0xRpKLz6F5HmP7gGq

// 4. 验证密码
const isMatch = await bcrypt.compare(inputPassword, hashedPassword);
```

#### 12.3.2 数据脱敏规则

```typescript
// ============================================================
// src/common/utils/data-masking.util.ts
// ============================================================

/**
 * 数据脱敏工具类
 * 用于 API 响应中的敏感数据展示脱敏
 */
export class DataMaskingUtil {
  /**
   * 手机号脱敏：保留前3后4位
   * 13812345678 → 138****5678
   */
  static maskPhone(phone: string): string {
    if (!phone || phone.length < 7) return phone;
    return phone.replace(/(\d{3})\d{4}(\d{4})/, "$1****$2");
  }

  /**
   * 邮箱脱敏：用户名保留首尾字符
   * zhangsan@example.com → z******n@example.com
   */
  static maskEmail(email: string): string {
    if (!email || !email.includes("@")) return email;
    const [user, domain] = email.split("@");
    if (user.length <= 2) {
      return `${user[0]}*@${domain}`;
    }
    const maskedUser = `${user[0]}${"*".repeat(user.length - 2)}${user[user.length - 1]}`;
    return `${maskedUser}@${domain}`;
  }

  /**
   * 姓名脱敏：保留姓氏
   * 张三 → 张*
   * 欧阳明月 → 欧阳**
   */
  static maskName(name: string): string {
    if (!name) return name;
    // 处理复姓
    const doubleSurnames = ["欧阳", "司马", "上官", "诸葛", "公孙", "令狐"];
    for (const surname of doubleSurnames) {
      if (name.startsWith(surname)) {
        return surname + "*".repeat(name.length - surname.length);
      }
    }
    // 单姓
    return name[0] + "*".repeat(name.length - 1);
  }

  /**
   * 身份证脱敏：保留前6后4位
   * 110105199001011234 → 110105********1234
   */
  static maskIdCard(idCard: string): string {
    if (!idCard || idCard.length < 10) return idCard;
    return idCard.replace(/(\d{6})\d{8}(\d{4})/, "$1********$2");
  }

  /**
   * 银行卡号脱敏：保留前4后4位
   * 6222021234567890 → 6222********7890
   */
  static maskBankCard(cardNo: string): string {
    if (!cardNo || cardNo.length < 8) return cardNo;
    return cardNo.replace(/(\d{4})\d+(\d{4})/, "$1********$2");
  }

  /**
   * 地址脱敏：保留省市区，详细地址脱敏
   * 北京市海淀区中关村大街1号 → 北京市海淀区***
   */
  static maskAddress(address: string): string {
    if (!address || address.length <= 6) return address;
    // 保留前6个字符（通常包含省市区）
    return address.substring(0, 6) + "***";
  }
}

// ============================================================
// src/common/interceptors/data-masking.interceptor.ts
// 响应数据自动脱敏拦截器
// ============================================================
import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from "@nestjs/common";
import { Observable } from "rxjs";
import { map } from "rxjs/operators";
import { DataMaskingUtil } from "../utils/data-masking.util";

// 脱敏规则配置
const MASKING_RULES: Record<string, (value: string) => string> = {
  phone: DataMaskingUtil.maskPhone,
  mobile: DataMaskingUtil.maskPhone,
  email: DataMaskingUtil.maskEmail,
  idCard: DataMaskingUtil.maskIdCard,
  idNumber: DataMaskingUtil.maskIdCard,
  bankAccount: DataMaskingUtil.maskBankCard,
  // contactName 不做全局脱敏，由业务层决定
};

@Injectable()
export class DataMaskingInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    return next.handle().pipe(map((data) => this.maskSensitiveData(data)));
  }

  private maskSensitiveData(data: any): any {
    if (!data) return data;

    if (Array.isArray(data)) {
      return data.map((item) => this.maskSensitiveData(item));
    }

    if (typeof data === "object") {
      const masked = { ...data };
      for (const key of Object.keys(masked)) {
        if (MASKING_RULES[key] && typeof masked[key] === "string") {
          masked[key] = MASKING_RULES[key](masked[key]);
        } else if (typeof masked[key] === "object") {
          masked[key] = this.maskSensitiveData(masked[key]);
        }
      }
      return masked;
    }

    return data;
  }
}
```

#### 12.3.3 SQL 注入防护

```typescript
// ============================================================
// TypeORM 参数化查询 —— 防止 SQL 注入
// ============================================================

// 正确做法：使用参数化查询
const customers = await this.customerRepo
  .createQueryBuilder("c")
  .where("c.name LIKE :name", { name: `%${keyword}%` })
  .andWhere("c.status = :status", { status: 1 })
  .andWhere("c.dept_id IN (:...deptIds)", { deptIds: ["1", "2", "3"] })
  .getMany();

// 错误做法（禁止！）：字符串拼接
// const customers = await this.customerRepo.query(
//   `SELECT * FROM crm_customer WHERE name LIKE '%${keyword}%'`  // SQL注入风险
// );

// ============================================================
// 全局 SQL 注入检测中间件
// ============================================================
import {
  Injectable,
  NestMiddleware,
  BadRequestException,
} from "@nestjs/common";
import { Request, Response, NextFunction } from "express";

@Injectable()
export class SqlInjectionMiddleware implements NestMiddleware {
  // SQL 注入特征模式
  private readonly SQL_PATTERNS = [
    /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|UNION|ALTER|CREATE|EXEC)\b)/i,
    /(\b(OR|AND)\b\s+\d+\s*=\s*\d+)/i,
    /(--|#|\/\*)/,
    /(\bSLEEP\b\s*\()/i,
    /(\bBENCHMARK\b\s*\()/i,
    /(\bLOAD_FILE\b\s*\()/i,
  ];

  use(req: Request, _res: Response, next: NextFunction) {
    const params = {
      ...req.query,
      ...req.params,
    };

    for (const [key, value] of Object.entries(params)) {
      if (typeof value === "string" && this.isSuspicious(value)) {
        throw new BadRequestException(`参数 ${key} 包含非法字符`);
      }
    }

    next();
  }

  private isSuspicious(value: string): boolean {
    return this.SQL_PATTERNS.some((pattern) => pattern.test(value));
  }
}
```

#### 12.3.4 XSS 防护

```typescript
// ============================================================
// src/common/pipes/xss-sanitize.pipe.ts
// ============================================================
import { PipeTransform, Injectable, ArgumentMetadata } from "@nestjs/common";
import * as sanitizeHtml from "sanitize-html";

@Injectable()
export class XssSanitizePipe implements PipeTransform {
  transform(value: any, metadata: ArgumentMetadata) {
    if (metadata.type === "body" && typeof value === "object") {
      return this.sanitizeObject(value);
    }
    if (typeof value === "string") {
      return this.sanitizeString(value);
    }
    return value;
  }

  private sanitizeObject(obj: any): any {
    const sanitized: any = {};
    for (const [key, value] of Object.entries(obj)) {
      if (typeof value === "string") {
        sanitized[key] = this.sanitizeString(value);
      } else if (typeof value === "object" && value !== null) {
        sanitized[key] = Array.isArray(value)
          ? value.map((v) =>
              typeof v === "string" ? this.sanitizeString(v) : v,
            )
          : this.sanitizeObject(value);
      } else {
        sanitized[key] = value;
      }
    }
    return sanitized;
  }

  private sanitizeString(str: string): string {
    return sanitizeHtml(str, {
      allowedTags: [], // 不允许任何 HTML 标签
      allowedAttributes: {}, // 不允许任何属性
    });
  }
}

// 在 main.ts 中全局注册
app.useGlobalPipes(new XssSanitizePipe());

// Helmet 安全头
import helmet from "helmet";
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: ["'self'", "data:", "https:"],
        connectSrc: ["'self'"],
        fontSrc: ["'self'"],
        objectSrc: ["'none'"],
        frameSrc: ["'none'"],
      },
    },
    xContentTypeOptions: true, // X-Content-Type-Options: nosniff
    xFrameOptions: { action: "deny" }, // X-Frame-Options: DENY
    referrerPolicy: { policy: "strict-origin-when-cross-origin" },
  }),
);
```

#### 12.3.5 CSRF 防护

```typescript
// ============================================================
// CSRF 防护策略
// ============================================================

// 策略1：采用 SameSite Cookie + CSRF Token 双重防护

// main.ts 配置
import * as csurf from "csurf";
import * as cookieParser from "cookie-parser";

app.use(cookieParser());

// API 接口使用无状态的双重提交 Cookie 方案
// 而非传统的 session-based CSRF token
app.use(
  csurf({
    cookie: {
      httpOnly: true,
      secure: true, // 仅HTTPS
      sameSite: "strict", // 严格的SameSite策略
      maxAge: 2 * 60 * 60, // 2小时
    },
    // 跳过 API 接口（使用 JWT + SameSite 保护）
    ignoreMethods: [],
  }),
);

// 策略2：对于纯 API 服务（前后端分离架构）
// 依赖以下组合防护：
// - JWT Bearer Token（非 Cookie 传递，天然抗 CSRF）
// - 检查 Origin / Referer 头
// - SameSite Cookie 属性（用于 Cookie 中的 Refresh Token）

// Origin 校验中间件
@Injectable()
export class OriginCheckMiddleware implements NestMiddleware {
  private readonly allowedOrigins = [
    "https://crm.example.com",
    "https://admin.example.com",
  ];

  use(req: Request, _res: Response, next: NextFunction) {
    const origin = req.headers.origin || req.headers.referer;

    if (req.method !== "GET" && origin) {
      const originUrl = new URL(origin);
      const isAllowed = this.allowedOrigins.some(
        (allowed) => new URL(allowed).origin === originUrl.origin,
      );

      if (!isAllowed) {
        throw new ForbiddenException("请求来源不合法");
      }
    }

    next();
  }
}
```

---

### 12.4 审计日志设计

#### 12.4.1 操作审计日志记录内容

审计日志遵循 **5W1R** 原则（Who / What / When / Where / Which / Result）：

```
┌──────────────────────────────────────────────────────────────┐
│                      审计日志记录要素                          │
│                                                              │
│  WHO    ─ 操作者：用户ID、用户名、角色、部门                    │
│  WHAT   ─ 操作内容：操作类型、操作描述、变更前后对比             │
│  WHEN   ─ 操作时间：精确到毫秒的时间戳                         │
│  WHERE  ─ 操作来源：客户端IP、User-Agent、设备类型              │
│  WHICH  ─ 操作对象：目标资源类型、资源ID                        │
│  RESULT ─ 操作结果：成功/失败、错误信息                         │
│                                                              │
└──────────────────────────────────────────────────────────────┘
```

#### 12.4.2 审计日志表结构

```sql
-- ============================================================
-- 操作审计日志表
-- ============================================================
CREATE TABLE `sys_audit_log` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT '日志ID',
  `trace_id` VARCHAR(36) NOT NULL COMMENT '请求追踪ID',

  -- WHO: 操作者信息
  `user_id` BIGINT UNSIGNED DEFAULT NULL COMMENT '操作者用户ID',
  `username` VARCHAR(50) DEFAULT NULL COMMENT '操作者用户名',
  `user_role` VARCHAR(50) DEFAULT NULL COMMENT '操作者角色',
  `dept_id` BIGINT UNSIGNED DEFAULT NULL COMMENT '操作者部门ID',

  -- WHAT: 操作内容
  `action` VARCHAR(50) NOT NULL COMMENT '操作类型: LOGIN/LOGOUT/CREATE/UPDATE/DELETE/EXPORT/IMPORT/APPROVE',
  `module` VARCHAR(50) NOT NULL COMMENT '功能模块: auth/customer/opportunity/contract/system',
  `description` VARCHAR(500) DEFAULT NULL COMMENT '操作描述',
  `request_method` VARCHAR(10) DEFAULT NULL COMMENT 'HTTP方法',
  `request_url` VARCHAR(500) DEFAULT NULL COMMENT '请求URL',
  `request_params` JSON DEFAULT NULL COMMENT '请求参数（脱敏后）',
  `old_value` JSON DEFAULT NULL COMMENT '变更前数据',
  `new_value` JSON DEFAULT NULL COMMENT '变更后数据',

  -- WHEN: 操作时间
  `operated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) COMMENT '操作时间（毫秒精度）',
  `duration` INT UNSIGNED DEFAULT NULL COMMENT '操作耗时（毫秒）',

  -- WHERE: 操作来源
  `client_ip` VARCHAR(45) NOT NULL COMMENT '客户端IP（支持IPv6）',
  `user_agent` VARCHAR(500) DEFAULT NULL COMMENT '客户端User-Agent',
  `device_type` VARCHAR(20) DEFAULT NULL COMMENT '设备类型: web/mobile/desktop/api',

  -- WHICH: 操作对象
  `resource_type` VARCHAR(50) DEFAULT NULL COMMENT '资源类型: customer/opportunity/contract/user',
  `resource_id` VARCHAR(36) DEFAULT NULL COMMENT '资源ID',

  -- RESULT: 操作结果
  `status` ENUM('success', 'failure', 'warning') NOT NULL DEFAULT 'success' COMMENT '操作结果',
  `error_message` VARCHAR(1000) DEFAULT NULL COMMENT '错误信息',
  `response_code` INT DEFAULT NULL COMMENT 'HTTP响应状态码',

  PRIMARY KEY (`id`),
  KEY `idx_user_id` (`user_id`),
  KEY `idx_action` (`action`),
  KEY `idx_module` (`module`),
  KEY `idx_resource` (`resource_type`, `resource_id`),
  KEY `idx_operated_at` (`operated_at`),
  KEY `idx_trace_id` (`trace_id`),
  KEY `idx_status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='操作审计日志表'
  PARTITION BY RANGE (TO_DAYS(`operated_at`)) (
    -- 按月分区，便于历史数据归档
    PARTITION p202603 VALUES LESS THAN (TO_DAYS('2026-04-01')),
    PARTITION p202604 VALUES LESS THAN (TO_DAYS('2026-05-01')),
    PARTITION p202605 VALUES LESS THAN (TO_DAYS('2026-06-01')),
    PARTITION p202606 VALUES LESS THAN (TO_DAYS('2026-07-01')),
    PARTITION p_future VALUES LESS THAN MAXVALUE
  );
```

#### 12.4.3 关键操作审计范围

| 审计级别   | 操作类型      | 记录内容                     |
| ---------- | ------------- | ---------------------------- |
| **必审计** | 登录/登出     | 成功与失败均记录，含IP、设备 |
| **必审计** | 账户锁定/解锁 | 触发原因、操作者             |
| **必审计** | 密码修改/重置 | 操作者、目标用户             |
| **必审计** | 角色/权限变更 | 变更前后对比                 |
| **必审计** | 数据删除      | 删除前完整快照               |
| **必审计** | 数据导出      | 导出条件、数据量             |
| **必审计** | 合同审批      | 审批动作、审批意见           |
| **可选**   | 数据创建      | 新增记录内容                 |
| **可选**   | 数据修改      | 字段级变更 diff              |
| **可选**   | 数据查询      | 仅记录敏感数据的查询         |

#### 12.4.4 审计日志服务实现

```typescript
// ============================================================
// src/modules/audit/audit-log.service.ts
// ============================================================
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SysAuditLog } from './entities/sys-audit-log.entity';

interface AuditLogEntry {
  userId?: string;
  action: string;
  resource: string;
  resourceId?: string;
  ip?: string;
  userAgent?: string;
  status: 'success' | 'failure' | 'warning';
  detail?: Record<string, any>;
  oldValue?: Record<string, any>;
  newValue?: Record<string, any>;
  errorMessage?: string;
}

@Injectable()
export class AuditLogService {
  constructor(
    @InjectRepository(SysAuditLog)
    private readonly auditLogRepo: Repository<SysAuditLog>,
  ) {}

  /**
   * 记录审计日志（异步写入，不阻塞业务）
   */
  async log(entry: AuditLogEntry): Promise<void> {
    try {
      // 对请求参数中的敏感信息进行脱敏
      const sanitizedDetail = this.sanitizeLogData(entry.detail);
      const sanitizedOldValue = this.sanitizeLogData(entry.oldValue);
      const sanitizedNewValue = this.sanitizeLogData(entry.newValue);

      await this.auditLogRepo.save({
        userId: entry.userId,
        action: entry.action,
        module: entry.resource,
        resourceType: entry.resource,
        resourceId: entry.resourceId,
        clientIp: entry.ip,
        userAgent: entry.userAgent,
        status: entry.status,
        requestParams: sanitizedDetail,
        oldValue: sanitizedOldValue,
        newValue: sanitizedNewValue,
        errorMessage: entry.errorMessage,
      });
    } catch (error) {
      // 审计日志写入失败不应影响业务
      // 但需要通过其他渠道告警（如写入本地文件日志）
      console.error('审计日志写入失败:', error);
    }
  }

  /**
   * 记录数据变更日志（自动 diff）
   */
  async logDataChange(
    userId: string,
    action: 'CREATE' | 'UPDATE' | 'DELETE',
    resource: string,
    resourceId: string,
    oldData: Record<string, any> | null,
    newData: Record<string, any> | null,
    metadata: { ip: string; userAgent: string },
  ): Promise<void> {
    await this.log({
      userId,
      action,
      resource,
      resourceId,
      ip: metadata.ip,
      userAgent: metadata.userAgent,
      status: 'success',
      oldValue: oldData,
      newValue: newData,
    });
  }

  /**
   * 敏感数据脱敏处理
   */
  private sanitizeLogData(
    data: Record<string, any> | undefined,
  ): Record<string, any> | undefined {
    if (!data) return data;

    const sensitiveFields = [
      'password', 'token', 'accessToken', 'refreshToken',
      'secret', 'creditCard', 'idCard',
    ];

    const sanitized = { ...data };
    for (const field of sensitiveFields) {
      if (sanitized[field]) {
        sanitized[field] = '******';
      }
    }

    return sanitized;
  }
}

// ============================================================
// src/common/interceptors/audit-log.interceptor.ts
// 全局审计日志拦截器
// ============================================================
import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Observable, tap, catchError } from 'rxjs';
import { AuditLogService } from '../../modules/audit/audit-log.service';

export const AUDIT_LOG_KEY = 'auditLog';
export const AuditLog = (action: string, module: string) =>
  SetMetadata(AUDIT_LOG_KEY, { action, module });

@Injectable()
export class AuditLogInterceptor implements NestInterceptor {
  constructor(
    private readonly reflector: Reflector,
    private readonly auditLogService: AuditLogService,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const auditConfig = this.reflector.get(
      AUDIT_LOG_KEY,
      context.getHandler(),
    );

    // 如果没有标注 @AuditLog，直接放行
    if (!auditConfig) {
      return next.handle();
    }

    const request = context.switchToHttp().getRequest();
    const startTime = Date.now();

    return next.handle().pipe(
      tap((responseData) => {
        // 成功时记录日志
        this.auditLogService.log({
          userId: request.user?.id,
          action: auditConfig.action,
          resource: auditConfig.module,
          resourceId: request.params?.id,
          ip: request.ip,
          userAgent: request.headers['user-agent'],
          status: 'success',
          detail: {
            method: request.method,
            url: request.url,
            duration: Date.now() - startTime,
          },
        });
      }),
      catchError((error) => {
        // 失败时也记录日志
        this.auditLogService.log({
          userId: request.user?.id,
          action: auditConfig.action,
          resource: auditConfig.module,
          resourceId: request.params?.id,
          ip: request.ip,
          userAgent: request.headers['user-agent'],
          status: 'failure',
          errorMessage: error.message,
          detail: {
            method: request.method,
            url: request.url,
            duration: Date.now() - startTime,
          },
        });
        throw error;
      }),
    );
  }
}

// Controller 中使用
@Delete(':id')
@AuditLog('DELETE', 'customer')
@Permissions('customer:delete')
async delete(@Param('id') id: string) {
  return this.customerService.softDelete(id);
}
```

#### 12.4.5 日志保留策略

```
┌────────────────────────────────────────────────────────────┐
│                    审计日志生命周期管理                       │
│                                                            │
│   热数据（0-3个月）                                         │
│   ├─ 存储位置：MySQL 主库（当前月分区）                       │
│   ├─ 查询方式：实时在线查询                                  │
│   └─ 用途：日常运维、安全审计、问题排查                       │
│                                                            │
│   温数据（3-12个月）                                        │
│   ├─ 存储位置：MySQL 归档表（按月归档）                       │
│   ├─ 查询方式：需要手动查询归档表                             │
│   └─ 用途：合规审查、安全事件溯源                             │
│                                                            │
│   冷数据（12个月以上）                                       │
│   ├─ 存储位置：阿里云 OSS（压缩归档存储）                     │
│   ├─ 查询方式：需要下载后离线分析                             │
│   └─ 用途：法律合规、长期存档                                │
│                                                            │
│   数据销毁（超过36个月）                                     │
│   └─ 按照数据保留政策定期清理                                │
│                                                            │
└────────────────────────────────────────────────────────────┘
```

**自动归档脚本（定时任务）：**

```sql
-- 每月1号凌晨执行：归档3个月前的审计日志
-- 通过 MySQL Event Scheduler 或外部定时任务执行

-- 1. 创建归档表（首次）
CREATE TABLE IF NOT EXISTS sys_audit_log_archive LIKE sys_audit_log;

-- 2. 将3个月前的数据迁移到归档表
INSERT INTO sys_audit_log_archive
SELECT * FROM sys_audit_log
WHERE operated_at < DATE_SUB(CURDATE(), INTERVAL 3 MONTH);

-- 3. 删除已归档的数据
DELETE FROM sys_audit_log
WHERE operated_at < DATE_SUB(CURDATE(), INTERVAL 3 MONTH);

-- 4. 删除超过12个月的归档数据（已导出到OSS后）
DELETE FROM sys_audit_log_archive
WHERE operated_at < DATE_SUB(CURDATE(), INTERVAL 12 MONTH);
```

---

### 12.5 API 安全

#### 12.5.1 接口限流设计（基于 Redis 的滑动窗口算法）

```
┌──────────────────────────────────────────────────────────────────┐
│                       三级限流架构                                │
│                                                                  │
│   ┌──────────────┐    ┌──────────────┐    ┌──────────────┐      │
│   │  全局限流      │    │  用户级限流    │    │  接口级限流    │      │
│   │              │    │              │    │              │      │
│   │ 1000 req/s   │───▶│ 100 req/min  │───▶│ 自定义配置    │      │
│   │ 所有请求      │    │ 每个用户      │    │ 每个端点      │      │
│   └──────────────┘    └──────────────┘    └──────────────┘      │
│         │                    │                    │              │
│         └────────────────────┼────────────────────┘              │
│                              │                                   │
│                              ▼                                   │
│                        Redis 滑动窗口                             │
│                    (Sorted Set 实现)                              │
└──────────────────────────────────────────────────────────────────┘
```

#### 限流配置

| 限流层级 | Key 格式               | 窗口大小 | 阈值 | 说明             |
| -------- | ---------------------- | -------- | ---- | ---------------- |
| 全局     | `rate:global`          | 1秒      | 1000 | 防止系统过载     |
| 用户级   | `rate:user:{userId}`   | 1分钟    | 100  | 防止单用户刷接口 |
| 登录接口 | `rate:login:{ip}`      | 1分钟    | 10   | 防止暴力破解     |
| 验证码   | `rate:captcha:{ip}`    | 1分钟    | 5    | 防止验证码滥用   |
| 数据导出 | `rate:export:{userId}` | 10分钟   | 3    | 防止大量导出     |
| 短信发送 | `rate:sms:{phone}`     | 1分钟    | 1    | 防止短信轰炸     |

#### 滑动窗口限流实现

```typescript
// ============================================================
// src/common/guards/rate-limit.guard.ts
// ============================================================
import {
  CanActivate,
  ExecutionContext,
  HttpException,
  HttpStatus,
  Injectable,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { RedisService } from "../../modules/redis/redis.service";

// 限流配置装饰器
export const RATE_LIMIT_KEY = "rateLimit";

export interface RateLimitConfig {
  /** 时间窗口（秒） */
  windowSec: number;
  /** 窗口内最大请求数 */
  maxRequests: number;
  /** 限流 key 类型: ip / user / global / custom */
  keyType: "ip" | "user" | "global" | "custom";
  /** 自定义 key 生成函数 */
  keyGenerator?: (req: any) => string;
  /** 被限流时的错误消息 */
  message?: string;
}

export const RateLimit = (config: RateLimitConfig) =>
  SetMetadata(RATE_LIMIT_KEY, config);

@Injectable()
export class RateLimitGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly redisService: RedisService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const config = this.reflector.get<RateLimitConfig>(
      RATE_LIMIT_KEY,
      context.getHandler(),
    );

    // 没有配置限流则放行
    if (!config) {
      return this.checkGlobalRateLimit(context);
    }

    const request = context.switchToHttp().getRequest();
    const key = this.buildKey(config, request);

    const isAllowed = await this.slidingWindowCheck(
      key,
      config.windowSec,
      config.maxRequests,
    );

    if (!isAllowed) {
      throw new HttpException(
        {
          statusCode: HttpStatus.TOO_MANY_REQUESTS,
          message: config.message || "请求过于频繁，请稍后再试",
          error: "Too Many Requests",
        },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    return true;
  }

  /**
   * 滑动窗口限流算法（基于 Redis Sorted Set）
   *
   * 原理：
   * - 使用 Sorted Set 存储每次请求的时间戳
   * - Score = 请求时间戳（毫秒）
   * - Member = 请求时间戳 + 随机数（确保唯一性）
   * - 每次请求时：
   *   1. 删除窗口外的旧记录
   *   2. 统计窗口内的请求数量
   *   3. 如果未超限，添加本次请求记录
   */
  private async slidingWindowCheck(
    key: string,
    windowSec: number,
    maxRequests: number,
  ): Promise<boolean> {
    const now = Date.now();
    const windowStart = now - windowSec * 1000;
    const member = `${now}:${Math.random().toString(36).slice(2, 8)}`;

    // 使用 Redis 事务保证原子性
    const result = await this.redisService.eval(
      `
      -- 1. 移除窗口外的过期记录
      redis.call('ZREMRANGEBYSCORE', KEYS[1], '-inf', ARGV[1])

      -- 2. 获取当前窗口内的请求数
      local count = redis.call('ZCARD', KEYS[1])

      -- 3. 判断是否超限
      if count < tonumber(ARGV[3]) then
        -- 未超限：添加新记录
        redis.call('ZADD', KEYS[1], ARGV[2], ARGV[4])
        -- 设置 key 过期时间（防止内存泄漏）
        redis.call('EXPIRE', KEYS[1], ARGV[5])
        return 1
      else
        -- 已超限
        return 0
      end
      `,
      1, // number of keys
      key, // KEYS[1]
      windowStart.toString(), // ARGV[1] - 窗口起始时间
      now.toString(), // ARGV[2] - 当前时间(score)
      maxRequests.toString(), // ARGV[3] - 最大请求数
      member, // ARGV[4] - 成员值
      (windowSec + 1).toString(), // ARGV[5] - key过期时间
    );

    return result === 1;
  }

  /**
   * 全局限流检查
   */
  private async checkGlobalRateLimit(
    context: ExecutionContext,
  ): Promise<boolean> {
    const isAllowed = await this.slidingWindowCheck(
      "rate:global",
      1, // 1秒窗口
      1000, // 1000 req/s
    );

    if (!isAllowed) {
      throw new HttpException(
        "系统繁忙，请稍后重试",
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    return true;
  }

  private buildKey(config: RateLimitConfig, request: any): string {
    switch (config.keyType) {
      case "ip":
        return `rate:ip:${request.ip}`;
      case "user":
        return `rate:user:${request.user?.id || request.ip}`;
      case "global":
        return "rate:global";
      case "custom":
        return config.keyGenerator
          ? `rate:custom:${config.keyGenerator(request)}`
          : `rate:path:${request.path}`;
      default:
        return `rate:default:${request.ip}`;
    }
  }
}

// ============================================================
// Controller 中使用限流装饰器
// ============================================================
@Controller("auth")
export class AuthController {
  @Post("login")
  @RateLimit({
    windowSec: 60,
    maxRequests: 10,
    keyType: "ip",
    message: "登录请求过于频繁，请1分钟后再试",
  })
  async login(@Body() dto: LoginDto) {
    // ...
  }

  @Post("send-sms")
  @RateLimit({
    windowSec: 60,
    maxRequests: 1,
    keyType: "custom",
    keyGenerator: (req) => `sms:${req.body.phone}`,
    message: "短信发送频率限制，每分钟仅可发送1次",
  })
  async sendSms(@Body() dto: SendSmsDto) {
    // ...
  }
}
```

#### 12.5.2 请求签名验证（第三方回调接口）

```typescript
// ============================================================
// src/common/guards/signature.guard.ts
// 用于第三方回调接口的签名验证（如支付回调、短信回调等）
// ============================================================
import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";
import * as crypto from "crypto";
import { ConfigService } from "@nestjs/config";

@Injectable()
export class SignatureGuard implements CanActivate {
  constructor(private readonly configService: ConfigService) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();

    const timestamp = request.headers["x-timestamp"];
    const nonce = request.headers["x-nonce"];
    const signature = request.headers["x-signature"];

    if (!timestamp || !nonce || !signature) {
      throw new UnauthorizedException("缺少签名参数");
    }

    // 1. 验证时间戳（防止重放攻击，允许5分钟偏差）
    const now = Math.floor(Date.now() / 1000);
    if (Math.abs(now - parseInt(timestamp)) > 300) {
      throw new UnauthorizedException("请求已过期");
    }

    // 2. 构造待签名字符串
    const secret = this.configService.get<string>("WEBHOOK_SECRET");
    const body = JSON.stringify(request.body);
    const signString = `${timestamp}\n${nonce}\n${body}\n`;

    // 3. 计算 HMAC-SHA256 签名
    const expectedSignature = crypto
      .createHmac("sha256", secret)
      .update(signString)
      .digest("hex");

    // 4. 使用安全的时序比较（防止时序攻击）
    const isValid = crypto.timingSafeEqual(
      Buffer.from(signature),
      Buffer.from(expectedSignature),
    );

    if (!isValid) {
      throw new UnauthorizedException("签名验证失败");
    }

    return true;
  }
}
```

#### 12.5.3 参数校验（class-validator）

```typescript
// ============================================================
// src/common/dto/pagination.dto.ts
// 通用分页参数校验示例
// ============================================================
import {
  IsOptional,
  IsInt,
  Min,
  Max,
  IsString,
  MaxLength,
  IsEnum,
} from "class-validator";
import { Type } from "class-transformer";

export class PaginationDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: "页码必须为整数" })
  @Min(1, { message: "页码最小为1" })
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: "每页条数必须为整数" })
  @Min(1, { message: "每页最少1条" })
  @Max(100, { message: "每页最多100条" })
  pageSize?: number = 20;

  @IsOptional()
  @IsString()
  @MaxLength(50, { message: "排序字段长度不能超过50" })
  sortBy?: string;

  @IsOptional()
  @IsEnum(["ASC", "DESC"], { message: "排序方向只能是 ASC 或 DESC" })
  sortOrder?: "ASC" | "DESC" = "DESC";
}

// ============================================================
// src/modules/customer/dto/create-customer.dto.ts
// 客户创建参数校验
// ============================================================
import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsEmail,
  Matches,
  MaxLength,
  IsEnum,
} from "class-validator";

export class CreateCustomerDto {
  @IsString()
  @IsNotEmpty({ message: "客户名称不能为空" })
  @MaxLength(100, { message: "客户名称不能超过100个字符" })
  name: string;

  @IsString()
  @IsNotEmpty({ message: "手机号不能为空" })
  @Matches(/^1[3-9]\d{9}$/, { message: "手机号格式不正确" })
  phone: string;

  @IsOptional()
  @IsEmail({}, { message: "邮箱格式不正确" })
  @MaxLength(100)
  email?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500, { message: "备注不能超过500个字符" })
  remark?: string;

  @IsEnum(["potential", "intention", "deal", "lost"], {
    message: "客户状态不合法",
  })
  status: string;
}

// ============================================================
// main.ts - 全局校验管道配置
// ============================================================
app.useGlobalPipes(
  new ValidationPipe({
    transform: true, // 自动类型转换
    whitelist: true, // 自动剥离未声明的属性
    forbidNonWhitelisted: true, // 存在未声明属性时抛出错误
    forbidUnknownValues: true, // 禁止未知值
    disableErrorMessages: false, // 生产环境可设为true
    exceptionFactory: (errors) => {
      const messages = errors.map((err) => {
        const constraints = Object.values(err.constraints || {});
        return {
          field: err.property,
          errors: constraints,
        };
      });
      return new BadRequestException({
        statusCode: 400,
        message: "参数校验失败",
        errors: messages,
      });
    },
  }),
);
```

#### 12.5.4 防重放攻击

```typescript
// ============================================================
// src/common/guards/replay-attack.guard.ts
// ============================================================
import {
  CanActivate,
  ExecutionContext,
  Injectable,
  BadRequestException,
} from "@nestjs/common";
import { RedisService } from "../../modules/redis/redis.service";

@Injectable()
export class ReplayAttackGuard implements CanActivate {
  // nonce 有效期（秒），与请求超时时间一致
  private readonly NONCE_TTL = 300; // 5分钟

  constructor(private readonly redisService: RedisService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();

    const nonce = request.headers["x-request-nonce"];
    const timestamp = request.headers["x-request-timestamp"];

    if (!nonce || !timestamp) {
      // 对于非关键接口可以放行
      return true;
    }

    // 1. 检查时间戳（允许5分钟偏差）
    const now = Math.floor(Date.now() / 1000);
    const requestTime = parseInt(timestamp, 10);
    if (isNaN(requestTime) || Math.abs(now - requestTime) > this.NONCE_TTL) {
      throw new BadRequestException("请求已过期");
    }

    // 2. 检查 nonce 是否已使用（防重放）
    const nonceKey = `nonce:${nonce}`;
    const exists = await this.redisService.exists(nonceKey);

    if (exists) {
      throw new BadRequestException("重复请求，请勿重复提交");
    }

    // 3. 记录 nonce（设置过期时间）
    await this.redisService.set(nonceKey, "1", "EX", this.NONCE_TTL);

    return true;
  }
}
```

---

### 12.6 基础设施安全

#### 12.6.1 阿里云安全组配置

```
┌──────────────────────────────────────────────────────────────┐
│                   阿里云网络安全架构                           │
│                                                              │
│   Internet                                                   │
│      │                                                       │
│      ▼                                                       │
│  ┌────────────┐                                              │
│  │  SLB/CDN   │  阿里云负载均衡                               │
│  │  (公网入口) │  仅开放 80/443                                │
│  └─────┬──────┘                                              │
│        │                                                     │
│  ══════╪═══════════ VPC 专有网络 (172.16.0.0/12) ═══════════ │
│        │                                                     │
│  ┌─────▼──────┐    安全组 sg-web                             │
│  │   Nginx    │    入站：80/443 ← SLB                         │
│  │  (前端层)   │    出站：3000  → App                          │
│  └─────┬──────┘                                              │
│        │                                                     │
│  ┌─────▼──────┐    安全组 sg-app                             │
│  │  NestJS    │    入站：3000 ← Nginx                         │
│  │  (应用层)   │    出站：3306 → MySQL, 6379 → Redis           │
│  └──┬─────┬───┘                                              │
│     │     │                                                  │
│  ┌──▼──┐ ┌▼────┐   安全组 sg-data                            │
│  │MySQL│ │Redis│    入站：3306/6379 ← App (仅内网IP)           │
│  │     │ │     │    出站：无                                   │
│  └─────┘ └─────┘    公网访问：全部拒绝                         │
│                                                              │
└──────────────────────────────────────────────────────────────┘
```

**安全组规则详细配置：**

```
# ========================================
# sg-web (Web层安全组)
# ========================================
方向    协议    端口     源/目标            说明
入站    TCP     443     0.0.0.0/0          HTTPS（公网访问）
入站    TCP     80      0.0.0.0/0          HTTP（重定向到HTTPS）
出站    TCP     3000    sg-app             转发请求到应用层
入站    TCP     22      办公网络IP/32      SSH管理（仅限堡垒机）

# ========================================
# sg-app (应用层安全组)
# ========================================
方向    协议    端口     源/目标            说明
入站    TCP     3000    sg-web             接收Nginx转发的请求
出站    TCP     3306    sg-data            访问MySQL
出站    TCP     6379    sg-data            访问Redis
出站    TCP     443     0.0.0.0/0          调用外部API（短信/邮件等）

# ========================================
# sg-data (数据层安全组)
# ========================================
方向    协议    端口     源/目标            说明
入站    TCP     3306    sg-app             MySQL只接受应用层连接
入站    TCP     6379    sg-app             RedisAPI Error: Claude's response exceeded the 32000 output token maximum. To configure this behavior, set the CLAUDE_CODE_MAX_OUTPUT_TOKENS environment variable.继续从 12.6.1 阿里云安全组配置的数据层安全组规则处接续。

---

```

# ========================================

# sg-data (数据层安全组) 续

# ========================================

方向 协议 端口 源/目标 说明
入站 TCP 3306 sg-app MySQL只接受应用层连接
入站 TCP 6379 sg-app Redis只接受应用层连接
入站 全部 全部 0.0.0.0/0 全部拒绝（默认规则）
出站 全部 全部 0.0.0.0/0 全部拒绝（数据层不主动外联）

````

#### 12.6.2 Nginx 安全配置

```nginx
# ============================================================
# /etc/nginx/conf.d/crm.conf
# ============================================================

# 限流配置（Nginx 层面的粗粒度限流，与应用层限流互补）
limit_req_zone $binary_remote_addr zone=api_limit:10m rate=30r/s;
limit_req_zone $binary_remote_addr zone=login_limit:10m rate=5r/m;
limit_conn_zone $binary_remote_addr zone=conn_limit:10m;

# 强制 HTTPS 跳转
server {
    listen 80;
    server_name crm.example.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name crm.example.com;

    # SSL 证书
    ssl_certificate     /etc/nginx/ssl/crm.example.com.pem;
    ssl_certificate_key /etc/nginx/ssl/crm.example.com.key;

    # TLS 安全配置
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256:ECDHE-ECDSA-AES256-GCM-SHA384:ECDHE-RSA-AES256-GCM-SHA384;
    ssl_prefer_server_ciphers on;
    ssl_session_cache shared:SSL:10m;
    ssl_session_timeout 10m;
    ssl_session_tickets off;

    # ============ 安全响应头 ============

    # 防止点击劫持
    add_header X-Frame-Options "DENY" always;
    # 防止 MIME 类型嗅探
    add_header X-Content-Type-Options "nosniff" always;
    # XSS 保护
    add_header X-XSS-Protection "1; mode=block" always;
    # HSTS 强制 HTTPS
    add_header Strict-Transport-Security "max-age=63072000; includeSubDomains; preload" always;
    # 引用策略
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;
    # 内容安全策略
    add_header Content-Security-Policy "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; connect-src 'self'; font-src 'self'; object-src 'none'; frame-src 'none';" always;
    # 权限策略
    add_header Permissions-Policy "camera=(), microphone=(), geolocation=()" always;

    # ============ 隐藏服务器信息 ============
    server_tokens off;
    proxy_hide_header X-Powered-By;
    proxy_hide_header Server;

    # ============ 请求体大小限制 ============
    client_max_body_size 10m;
    client_body_timeout 30s;
    client_header_timeout 30s;

    # ============ 禁止访问隐藏文件 ============
    location ~ /\. {
        deny all;
        access_log off;
        log_not_found off;
    }

    # ============ API 接口代理 ============
    location /api/ {
        # 接口限流
        limit_req zone=api_limit burst=50 nodelay;
        limit_conn conn_limit 20;

        proxy_pass http://127.0.0.1:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        # 超时配置
        proxy_connect_timeout 10s;
        proxy_send_timeout 30s;
        proxy_read_timeout 30s;

        # 禁止缓存 API 响应
        add_header Cache-Control "no-store, no-cache, must-revalidate" always;
        add_header Pragma "no-cache" always;
    }

    # ============ 登录接口独立限流 ============
    location /api/auth/login {
        limit_req zone=login_limit burst=3 nodelay;
        limit_conn conn_limit 5;

        proxy_pass http://127.0.0.1:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # ============ 静态资源 ============
    location /static/ {
        alias /var/www/crm/static/;
        expires 30d;
        add_header Cache-Control "public, immutable";
        access_log off;
    }

    # ============ 禁止直接访问敏感路径 ============
    location ~* ^/(swagger|docs|graphql|debug|actuator|env) {
        deny all;
        return 404;
    }
}
````

#### 12.6.3 数据库安全

```
┌──────────────────────────────────────────────────────────────┐
│                   MySQL 安全配置清单                          │
├──────────────────────────────────────────────────────────────┤
│                                                              │
│  1. 网络隔离                                                 │
│     ├─ 部署在 VPC 内网，不分配公网 IP                         │
│     ├─ 安全组仅允许应用层 IP 访问 3306 端口                   │
│     └─ 使用阿里云 RDS 高安全模式（SSL 加密连接）               │
│                                                              │
│  2. 访问控制                                                 │
│     ├─ 禁用 root 远程登录                                    │
│     ├─ 应用账号最小权限原则（仅 CRUD，无 DDL）                 │
│     ├─ 按业务模块拆分数据库账号                                │
│     └─ 密码策略：16位以上，包含大小写字母+数字+特殊字符         │
│                                                              │
│  3. 数据保护                                                 │
│     ├─ 开启 TDE 透明数据加密（RDS 企业版）                     │
│     ├─ 开启 SSL 连接加密                                     │
│     ├─ binlog 格式设为 ROW（精确记录变更）                     │
│     └─ 开启 SQL 审计日志                                     │
│                                                              │
│  4. 定期备份                                                 │
│     ├─ 每日全量备份（凌晨 2:00）                              │
│     ├─ binlog 实时增量备份                                    │
│     └─ 备份保留 30 天                                        │
│                                                              │
└──────────────────────────────────────────────────────────────┘
```

**MySQL 安全配置项（my.cnf）：**

```ini
[mysqld]
# 绑定内网地址
bind-address = 172.16.0.10

# 禁用 LOCAL INFILE（防止文件读取攻击）
local-infile = 0

# 禁用符号链接
symbolic-links = 0

# 连接安全
max_connections = 500
max_connect_errors = 10
wait_timeout = 600
interactive_timeout = 600

# 密码策略
validate_password.policy = STRONG
validate_password.length = 16
validate_password.mixed_case_count = 1
validate_password.number_count = 1
validate_password.special_char_count = 1

# SSL 加密连接
require_secure_transport = ON
ssl-ca = /etc/mysql/ssl/ca.pem
ssl-cert = /etc/mysql/ssl/server-cert.pem
ssl-key = /etc/mysql/ssl/server-key.pem

# 审计日志（需安装审计插件）
# plugin-load-add = audit_log.so
# audit_log_policy = ALL

# binlog 配置
log-bin = mysql-bin
binlog_format = ROW
binlog_row_image = FULL
expire_logs_days = 7
```

**数据库账号权限分配：**

```sql
-- 应用程序读写账号（最小权限）
CREATE USER 'crm_app'@'172.16.0.%' IDENTIFIED BY '随机强密码';
GRANT SELECT, INSERT, UPDATE, DELETE ON crm_db.* TO 'crm_app'@'172.16.0.%';
-- 禁止 DROP/ALTER/CREATE 等 DDL 操作

-- 只读查询账号（用于报表等）
CREATE USER 'crm_readonly'@'172.16.0.%' IDENTIFIED BY '随机强密码';
GRANT SELECT ON crm_db.* TO 'crm_readonly'@'172.16.0.%';

-- 数据迁移专用账号（临时使用）
CREATE USER 'crm_migration'@'172.16.0.%' IDENTIFIED BY '随机强密码';
GRANT ALL PRIVILEGES ON crm_db.* TO 'crm_migration'@'172.16.0.%';
-- 迁移完成后立即删除: DROP USER 'crm_migration'@'172.16.0.%';

-- 刷新权限
FLUSH PRIVILEGES;
```

#### 12.6.4 Redis 安全

```
┌──────────────────────────────────────────────────────────────┐
│                     Redis 安全配置清单                        │
├──────────────────────────────────────────────────────────────┤
│                                                              │
│  1. 网络隔离                                                 │
│     ├─ 绑定内网地址，禁止公网访问                              │
│     ├─ 安全组仅允许应用服务器 IP 访问 6379                     │
│     └─ 使用阿里云 Redis 实例（自带网络隔离）                   │
│                                                              │
│  2. 认证与访问控制                                            │
│     ├─ 必须设置强密码（requirepass）                           │
│     ├─ 使用 ACL 细粒度访问控制（Redis 6.0+）                  │
│     └─ 禁用危险命令                                          │
│                                                              │
│  3. 数据安全                                                 │
│     ├─ 开启 TLS 传输加密                                     │
│     ├─ 定期 RDB 持久化 + AOF 日志                             │
│     └─ 不存储明文敏感信息（如原始密码）                        │
│                                                              │
└──────────────────────────────────────────────────────────────┘
```

**Redis 安全配置（redis.conf）：**

```ini
# 绑定内网地址
bind 172.16.0.11

# 关闭保护模式（已通过安全组控制）
protected-mode yes

# 强密码认证
requirepass Crm@Redis#2026!Secure

# 禁用危险命令
rename-command FLUSHALL ""
rename-command FLUSHDB ""
rename-command CONFIG ""
rename-command DEBUG ""
rename-command SHUTDOWN ""
rename-command KEYS "CRM_INTERNAL_KEYS_CMD"

# 最大内存限制
maxmemory 2gb
maxmemory-policy allkeys-lru

# 客户端超时
timeout 300

# 最大客户端连接数
maxclients 1000

# TLS 配置
tls-port 6379
port 0
tls-cert-file /etc/redis/tls/redis.crt
tls-key-file /etc/redis/tls/redis.key
tls-ca-cert-file /etc/redis/tls/ca.crt
```

**NestJS Redis 连接配置：**

```typescript
// ============================================================
// src/modules/redis/redis.module.ts
// ============================================================
import { Module } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import Redis from "ioredis";

@Module({
  providers: [
    {
      provide: "REDIS_CLIENT",
      useFactory: (configService: ConfigService) => {
        return new Redis({
          host: configService.get("REDIS_HOST", "172.16.0.11"),
          port: configService.get("REDIS_PORT", 6379),
          password: configService.get("REDIS_PASSWORD"),
          db: configService.get("REDIS_DB", 0),
          tls: {
            ca: fs.readFileSync("/etc/redis/tls/ca.crt"),
          },
          // 连接池配置
          maxRetriesPerRequest: 3,
          retryStrategy: (times: number) => {
            if (times > 3) return null;
            return Math.min(times * 200, 2000);
          },
          // 键前缀（多环境隔离）
          keyPrefix: configService.get("REDIS_PREFIX", "crm:"),
          // 命令超时
          commandTimeout: 5000,
          // 开启 ready check
          enableReadyCheck: true,
        });
      },
      inject: [ConfigService],
    },
  ],
  exports: ["REDIS_CLIENT"],
})
export class RedisModule {}
```

#### 12.6.5 依赖安全

```
┌──────────────────────────────────────────────────────────────┐
│                   依赖安全管理流程                             │
├──────────────────────────────────────────────────────────────┤
│                                                              │
│  1. 开发阶段                                                 │
│     ├─ 锁定依赖版本：使用 package-lock.json                   │
│     ├─ 新增依赖审查：评估库的维护状态和安全记录                 │
│     └─ 禁止使用已知漏洞版本                                   │
│                                                              │
│  2. CI/CD 阶段                                               │
│     ├─ npm audit：每次构建自动执行                             │
│     ├─ Snyk 扫描：集成到 CI 流水线                             │
│     └─ 高危漏洞阻断构建                                       │
│                                                              │
│  3. 运行阶段                                                 │
│     ├─ 定期扫描（每周自动执行 npm audit）                      │
│     ├─ 安全公告订阅（GitHub Dependabot）                      │
│     └─ 漏洞响应 SLA：高危24小时，中危1周，低危1月              │
│                                                              │
└──────────────────────────────────────────────────────────────┘
```

**CI/CD 流水线安全检查脚本：**

```yaml
# .github/workflows/security-check.yml
name: Security Check

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]
  schedule:
    # 每周一早上8点自动扫描
    - cron: "0 0 * * 1"

jobs:
  dependency-audit:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: "20"

      - name: Install dependencies
        run: npm ci

      # npm 内置审计
      - name: Run npm audit
        run: npm audit --audit-level=high
        continue-on-error: false

      # Snyk 深度扫描
      - name: Run Snyk Security Scan
        uses: snyk/actions/node@master
        env:
          SNYK_TOKEN: ${{ secrets.SNYK_TOKEN }}
        with:
          args: --severity-threshold=high

      # 许可证合规检查
      - name: License Check
        run: npx license-checker --failOn "GPL-2.0;GPL-3.0;AGPL-3.0"
```

---

### 12.7 数据备份与恢复

#### 12.7.1 数据库备份策略

```
┌──────────────────────────────────────────────────────────────┐
│                    备份策略总览                                │
│                                                              │
│   ┌────────────────────────────────────────────────┐         │
│   │              全量备份（每日）                     │         │
│   │                                                │         │
│   │  频率: 每日凌晨 02:00                           │         │
│   │  方式: mysqldump --single-transaction           │         │
│   │       (阿里云 RDS 使用自动备份功能)               │         │
│   │  保留: 30天                                     │         │
│   │  存储: 阿里云 OSS（同城冗余存储）                 │         │
│   └────────────────────────────────────────────────┘         │
│                                                              │
│   ┌────────────────────────────────────────────────┐         │
│   │              增量备份（实时）                     │         │
│   │                                                │         │
│   │  方式: MySQL binlog（ROW 格式）                  │         │
│   │  同步: 实时推送到备份存储                         │         │
│   │  保留: 7天（本地）+ 30天（OSS）                   │         │
│   │  用途: 基于时间点的精确恢复（PITR）                │         │
│   └────────────────────────────────────────────────┘         │
│                                                              │
│   ┌────────────────────────────────────────────────┐         │
│   │              Redis 备份                          │         │
│   │                                                │         │
│   │  RDB 快照: 每6小时一次                           │         │
│   │  AOF 日志: 每秒同步                              │         │
│   │  保留: 7天                                      │         │
│   └────────────────────────────────────────────────┘         │
│                                                              │
│   ┌────────────────────────────────────────────────┐         │
│   │              文件备份                             │         │
│   │                                                │         │
│   │  对象: 上传的附件、合同文件、头像等                │         │
│   │  方式: 阿里云 OSS 跨区域复制                      │         │
│   │  保留: 永久（跟随业务生命周期）                    │         │
│   └────────────────────────────────────────────────┘         │
│                                                              │
└──────────────────────────────────────────────────────────────┘
```

#### 12.7.2 备份存储方案

```
┌──────────────────────────────────────────────────────────────┐
│                    备份存储架构                                │
│                                                              │
│  生产环境 (华东1-杭州)         备份区域 (华东2-上海)           │
│  ┌───────────────┐            ┌───────────────┐             │
│  │  MySQL RDS    │ ──自动──▶  │  RDS 备份集    │             │
│  │  (主库)       │   备份     │  (30天保留)    │             │
│  └───────────────┘            └───────────────┘             │
│                                      │                      │
│                               定期归档 │                      │
│                                      ▼                      │
│                               ┌───────────────┐             │
│                               │  阿里云 OSS    │             │
│                               │  (归档存储)    │             │
│                               │               │             │
│                               │ /backup/      │             │
│                               │  ├─ mysql/    │             │
│                               │  │  ├─ full/  │ ← 全量备份  │
│                               │  │  └─ binlog/│ ← 增量备份  │
│                               │  ├─ redis/    │ ← Redis快照 │
│                               │  └─ audit/    │ ← 审计日志  │
│                               │               │             │
│                               │ 存储类型:      │             │
│                               │  近期: 标准存储 │             │
│                               │  历史: 归档存储 │             │
│                               │  加密: AES-256 │             │
│                               └───────────────┘             │
│                                                              │
└──────────────────────────────────────────────────────────────┘
```

**自动备份脚本：**

```bash
#!/bin/bash
# ============================================================
# /opt/scripts/mysql_backup.sh
# MySQL 全量备份脚本（非 RDS 环境使用）
# ============================================================

set -euo pipefail

# 配置项
BACKUP_DIR="/data/backup/mysql"
OSS_BUCKET="oss://crm-backup-prod"
DATE=$(date +%Y%m%d_%H%M%S)
DB_NAME="crm_db"
RETENTION_DAYS=30

# 日志
LOG_FILE="/var/log/backup/mysql_${DATE}.log"
exec > >(tee -a "$LOG_FILE") 2>&1
echo "[$(date)] 开始 MySQL 全量备份..."

# 1. 创建备份目录
mkdir -p "${BACKUP_DIR}/full"

# 2. 执行全量备份（InnoDB 在线备份，不锁表）
BACKUP_FILE="${BACKUP_DIR}/full/${DB_NAME}_${DATE}.sql.gz"

mysqldump \
  --host=172.16.0.10 \
  --user=crm_backup \
  --password="${MYSQL_BACKUP_PASSWORD}" \
  --single-transaction \
  --routines \
  --triggers \
  --events \
  --set-gtid-purged=OFF \
  --default-character-set=utf8mb4 \
  "${DB_NAME}" | gzip > "${BACKUP_FILE}"

# 3. 计算校验和
sha256sum "${BACKUP_FILE}" > "${BACKUP_FILE}.sha256"

# 4. 上传到 OSS（服务端加密）
ossutil cp "${BACKUP_FILE}" \
  "${OSS_BUCKET}/mysql/full/" \
  --server-side-encryption AES256

ossutil cp "${BACKUP_FILE}.sha256" \
  "${OSS_BUCKET}/mysql/full/"

echo "[$(date)] 备份文件已上传至 OSS: ${BACKUP_FILE}"

# 5. 清理本地过期备份
find "${BACKUP_DIR}/full" -name "*.sql.gz" -mtime +${RETENTION_DAYS} -delete
find "${BACKUP_DIR}/full" -name "*.sha256" -mtime +${RETENTION_DAYS} -delete

echo "[$(date)] 已清理 ${RETENTION_DAYS} 天前的本地备份"

# 6. 备份结果通知（集成钉钉/企微告警）
BACKUP_SIZE=$(du -sh "${BACKUP_FILE}" | cut -f1)
echo "[$(date)] 备份完成，文件大小: ${BACKUP_SIZE}"
```

#### 12.7.3 恢复流程与 RTO/RPO 目标

```
┌──────────────────────────────────────────────────────────────┐
│                    恢复目标定义                                │
│                                                              │
│   RPO (Recovery Point Objective) = 最多丢失5分钟数据          │
│   ├─ 全量备份: 每日                                          │
│   ├─ binlog 增量: 实时                                       │
│   └─ 可恢复到故障前任意时间点 (PITR)                          │
│                                                              │
│   RTO (Recovery Time Objective) = 2小时内恢复服务             │
│   ├─ 数据库恢复: 约1小时（取决于数据量）                      │
│   ├─ 应用重启: 约10分钟                                      │
│   ├─ 验证测试: 约30分钟                                      │
│   └─ DNS切换: 约20分钟                                       │
│                                                              │
└──────────────────────────────────────────────────────────────┘
```

**恢复操作流程：**

```
┌──────────────────────────────────────────────────────────────┐
│                                                              │
│  场景A: 误操作恢复（如误删数据）                               │
│                                                              │
│  1. 确定误操作时间点                                          │
│  2. 使用阿里云 RDS 的"克隆实例"功能                            │
│     → 指定恢复到误操作前的时间点                               │
│  3. 从克隆实例中导出误删的数据                                 │
│  4. 将数据导入生产库                                          │
│  5. 验证数据完整性                                            │
│                                                              │
│  场景B: 数据库整体恢复                                        │
│                                                              │
│  1. 从 OSS 下载最近的全量备份                                  │
│     ossutil cp oss://crm-backup-prod/mysql/full/latest.gz .  │
│  2. 验证备份文件校验和                                        │
│     sha256sum -c latest.gz.sha256                            │
│  3. 恢复全量备份                                              │
│     gunzip < latest.sql.gz | mysql -u root crm_db            │
│  4. 应用 binlog 增量恢复                                      │
│     mysqlbinlog --start-datetime="2026-03-03 02:00:00" \     │
│       --stop-datetime="2026-03-03 10:30:00" \                │
│       binlog.000123 | mysql -u root crm_db                   │
│  5. 验证数据一致性                                            │
│  6. 切换应用连接到恢复后的数据库                               │
│  7. 通知相关人员恢复完成                                      │
│                                                              │
│  场景C: 跨区域灾难恢复                                        │
│                                                              │
│  1. 在备份区域创建新的 RDS 实例                                │
│  2. 从 OSS 跨区域备份恢复数据                                  │
│  3. 部署应用服务至备份区域                                     │
│  4. DNS 切换至新区域                                          │
│  5. 验证全部服务正常                                          │
│                                                              │
└──────────────────────────────────────────────────────────────┘
```

#### 12.7.4 定期恢复演练计划

| 演练项目        | 频率   | 内容                              | 负责人   | 验收标准                 |
| --------------- | ------ | --------------------------------- | -------- | ------------------------ |
| 全量备份恢复    | 每季度 | 从 OSS 下载全量备份恢复到测试环境 | DBA      | 数据完整，应用可正常访问 |
| PITR 时间点恢复 | 每季度 | 模拟误操作，恢复到指定时间点      | DBA      | 误操作前数据完整恢复     |
| 跨区域灾备切换  | 每半年 | 模拟主区域故障，切换到备份区域    | 运维团队 | RTO 不超过 2 小时        |
| Redis 数据恢复  | 每季度 | 从 RDB 快照恢复 Redis 数据        | 运维     | 缓存数据恢复正常         |
| 备份完整性校验  | 每月   | 随机抽检备份文件校验和            | 自动化   | SHA256 校验通过          |

---

### 12.8 安全合规

#### 12.8.1 OWASP Top 10 防护清单

基于 OWASP Top 10 (2021) 标准，系统逐项进行安全防护：

| 排名 | 风险项                     | 防护措施                                                     | 实现位置         |
| :--: | -------------------------- | ------------------------------------------------------------ | ---------------- |
| A01  | **失效的访问控制**         | RBAC 权限模型 + 数据权限过滤 + API 级 Guard 校验             | 12.2 节          |
| A02  | **加密机制失效**           | TLS 1.2+ 传输加密 + AES-256-GCM 存储加密 + bcrypt 密码哈希   | 12.3.1 节        |
| A03  | **注入**                   | TypeORM 参数化查询 + XSS 输入过滤 + class-validator 参数校验 | 12.3.3~12.3.4 节 |
| A04  | **不安全的设计**           | 威胁建模 + 安全架构评审 + 最小权限原则                       | 整体设计         |
| A05  | **安全配置错误**           | Nginx 安全头 + 隐藏服务器信息 + 关闭调试接口 + Helmet        | 12.6.2 节        |
| A06  | **易受攻击和过时的组件**   | npm audit + Snyk 扫描 + 依赖自动更新 + 许可证检查            | 12.6.5 节        |
| A07  | **身份识别和认证失败**     | JWT 双 Token + 登录锁定 + 验证码 + 密码强度策略              | 12.1 节          |
| A08  | **软件和数据完整性故障**   | CI/CD 安全检查 + 备份校验和 + 依赖锁定                       | 12.6.5、12.7 节  |
| A09  | **安全日志和监控不足**     | 全链路审计日志 + 异常行为告警 + 日志归档                     | 12.4 节          |
| A10  | **服务器端请求伪造(SSRF)** | 外部 URL 白名单校验 + 内网地址访问禁止 + 请求代理限制        | 应用层校验       |

#### 12.8.2 个人信息保护合规要点

```
┌──────────────────────────────────────────────────────────────┐
│           个人信息保护合规清单（参照《个人信息保护法》）          │
├──────────────────────────────────────────────────────────────┤
│                                                              │
│  1. 数据收集原则                                              │
│     ├─ 最小必要原则：仅收集业务必需的个人信息                   │
│     ├─ 目的明确原则：明确告知信息收集目的                       │
│     ├─ 知情同意原则：获取用户明确授权同意                       │
│     └─ 合法正当原则：不得通过误导、欺骗方式收集                 │
│                                                              │
│  2. 数据存储安全                                              │
│     ├─ 敏感信息加密存储（手机号、身份证、银行卡等）              │
│     ├─ 密码不可逆存储（bcrypt 单向哈希）                       │
│     ├─ 数据库访问严格控制（最小权限原则）                       │
│     └─ 数据保留期限：业务需要期 + 法定保存期                    │
│                                                              │
│  3. 数据使用控制                                              │
│     ├─ 数据脱敏展示（前端/API 响应均脱敏）                     │
│     ├─ 数据导出审批（需要权限 + 审计日志）                     │
│     ├─ 数据共享限制（第三方数据传输需加密）                     │
│     └─ 数据访问审计（完整的操作日志记录）                       │
│                                                              │
│  4. 用户权利保障                                              │
│     ├─ 查询权：用户可查询其个人信息的处理情况                   │
│     ├─ 更正权：用户可要求更正不准确的个人信息                   │
│     ├─ 删除权：满足法定条件时用户可要求删除                     │
│     ├─ 撤回同意权：用户可随时撤回授权同意                      │
│     └─ 注销权：用户可注销账户并删除相关信息                     │
│                                                              │
│  5. 安全事件应对                                              │
│     ├─ 发生个人信息泄露时72小时内通知监管部门                   │
│     ├─ 可能造成严重后果的需通知受影响个人                       │
│     └─ 完整记录事件处置过程                                    │
│                                                              │
└──────────────────────────────────────────────────────────────┘
```

**合规相关代码实现：**

```typescript
// ============================================================
// src/modules/user/user.service.ts (部分)
// 用户注销与数据删除
// ============================================================

/**
 * 用户账号注销 —— 遵循个人信息保护法要求
 */
async deactivateAccount(userId: string): Promise<void> {
  const user = await this.userRepo.findOneOrFail({
    where: { id: userId },
  });

  // 1. 吊销所有 Token（立即登出）
  await this.tokenService.revokeAllTokens(userId);

  // 2. 匿名化个人信息（保留业务数据完整性）
  await this.userRepo.update(userId, {
    username: `deleted_${userId.slice(0, 8)}`,
    realName: '已注销用户',
    phone: null,
    email: null,
    avatar: null,
    status: 'deactivated',
    deactivatedAt: new Date(),
  });

  // 3. 清除缓存
  await this.permissionCacheService.clearUserPermissionCache(userId);

  // 4. 记录审计日志
  await this.auditLogService.log({
    userId,
    action: 'ACCOUNT_DEACTIVATE',
    resource: 'user',
    resourceId: userId,
    status: 'success',
    detail: { reason: '用户主动注销' },
  });

  // 5. 30天后彻底删除（定时任务处理）
  // 保留30天是为了应对误操作恢复需求
}
```

#### 12.8.3 安全事件响应流程

```
┌──────────────────────────────────────────────────────────────┐
│                    安全事件响应流程                            │
│                                                              │
│  ┌─────────┐   ┌─────────┐   ┌─────────┐   ┌─────────┐    │
│  │  检测    │──▶│  分析    │──▶│  遏制    │──▶│  根除    │    │
│  │ Detect  │   │ Analyze │   │ Contain │   │Eradicate│    │
│  └─────────┘   └─────────┘   └─────────┘   └─────────┘    │
│       │                                          │          │
│       │         ┌─────────┐   ┌─────────┐        │          │
│       │         │  恢复    │◀──│  复盘    │◀───────┘          │
│       │         │ Recover │   │ Review  │                   │
│       │         └─────────┘   └─────────┘                   │
│       │                                                     │
└───────┼─────────────────────────────────────────────────────┘
        │
        ▼
```

#### 安全事件分级

|   级别    | 定义                         | 示例                          | 响应时限 | 通知范围              |
| :-------: | ---------------------------- | ----------------------------- | -------- | --------------------- |
| P0 - 紧急 | 系统被入侵，数据泄露         | 数据库被拖库、管理员账号被盗  | 15分钟   | CTO + 全体技术 + 法务 |
| P1 - 严重 | 核心功能受影响的安全事件     | 大量异常登录、SQL注入攻击成功 | 30分钟   | 技术负责人 + 安全团队 |
| P2 - 一般 | 存在安全风险但未造成实际损害 | 发现高危漏洞、异常扫描行为    | 4小时    | 安全团队 + 开发负责人 |
| P3 - 低危 | 轻微安全问题                 | 低危依赖漏洞、配置不当        | 1周      | 开发团队              |

#### 各阶段详细操作

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

阶段1: 检测 (Detection)
────────────────────────────────
触发来源：
  - 审计日志异常告警（如短时间大量失败登录）
  - WAF/IDS 入侵检测告警
  - 阿里云安全中心告警
  - 用户反馈（如收到异常通知）
  - npm audit / Snyk 漏洞告警

自动检测规则示例：
  - 单IP 10分钟内登录失败 > 50次 → 触发P1告警
  - 单用户1小时内导出数据 > 10次 → 触发P2告警
  - 非工作时间超级管理员登录 → 触发P2告警
  - API 5xx 错误率 > 5% 持续5分钟 → 触发P1告警

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

阶段2: 分析 (Analysis)
────────────────────────────────
  1. 确认事件真实性（排除误报）
  2. 评估影响范围（受影响的用户数、数据量）
  3. 确定事件级别（P0~P3）
  4. 收集证据（日志快照、网络流量记录）
  5. 初步判断攻击路径

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

阶段3: 遏制 (Containment)
────────────────────────────────
短期遏制（立即执行）：
  - 封禁攻击源 IP（安全组/WAF 规则）
  - 锁定受影响账户
  - 吊销泄露的 Token/密钥
  - 必要时临时关闭受攻击的功能模块

长期遏制：
  - 应用安全补丁
  - 加强相关接口的安全控制
  - 更新 WAF 规则

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

阶段4: 根除 (Eradication)
────────────────────────────────
  - 修复被利用的漏洞
  - 清除攻击者留下的后门/恶意代码
  - 重置所有可能泄露的凭证
  - 验证修复的有效性

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

阶段5: 恢复 (Recovery)
────────────────────────────────
  - 从备份恢复被破坏的数据（如有必要）
  - 逐步恢复受影响的服务
  - 加强监控频率（事件后72小时内）
  - 通知受影响用户（数据泄露时依法必须通知）

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

阶段6: 复盘 (Post-Incident Review)
────────────────────────────────
  - 48小时内完成事件复盘会议
  - 输出《安全事件报告》：
    ├─ 事件时间线（从检测到恢复）
    ├─ 根本原因分析（Root Cause Analysis）
    ├─ 影响评估（受影响范围和程度）
    ├─ 处置过程记录
    └─ 改进措施清单（含责任人和截止日期）
  - 更新安全策略和应急预案
  - 安排相关安全培训

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

**安全告警通知实现：**

```typescript
// ============================================================
// src/modules/security/security-alert.service.ts
// ============================================================
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';

export enum AlertLevel {
  P0 = 'P0_CRITICAL',
  P1 = 'P1_HIGH',
  P2 = 'P2_MEDIUM',
  P3 = 'P3_LOW',
}

interface SecurityAlert {
  level: AlertLevel;
  title: string;
  detail: string;
  source: string;
  timestamp: Date;
  metadata?: Record<string, any>;
}

@Injectable()
export class SecurityAlertService {
  private readonly logger = new Logger(SecurityAlertService.name);

  constructor(
    private readonly configService: ConfigService,
    private readonly httpService: HttpService,
  ) {}

  /**
   * 发送安全告警
   */
  async sendAlert(alert: SecurityAlert): Promise<void> {
    this.logger.warn(
      `[SECURITY ALERT] [${alert.level}] ${alert.title}: ${alert.detail}`,
    );

    // 根据告警级别选择通知渠道
    switch (alert.level) {
      case AlertLevel.P0:
        // 紧急：电话 + 短信 + 钉钉/企微
        await Promise.all([
          this.sendPhoneAlert(alert),
          this.sendSmsAlert(alert),
          this.sendDingTalkAlert(alert),
        ]);
        break;

      case AlertLevel.P1:
        // 严重：短信 + 钉钉/企微
        await Promise.all([
          this.sendSmsAlert(alert),
          this.sendDingTalkAlert(alert),
        ]);
        break;

      case AlertLevel.P2:
        // 一般：钉钉/企微
        await this.sendDingTalkAlert(alert);
        break;

      case AlertLevel.P3:
        // 低危：仅记录日志
        break;
    }
  }

  /**
   * 发送钉钉机器人告警
   */
  private async sendDingTalkAlert(alert: SecurityAlert): Promise<void> {
    const webhookUrl = this.configService.get<string>(
      'DINGTALK_SECURITY_WEBHOOK',
    );

    try {
      await this.httpService.axiosRef.post(webhookUrl, {
        msgtype: 'markdown',
        markdown: {
          title: `安全告警 [${alert.level}]`,
          text: [
            `## 安全告警 [${alert.level}]`,
            `**标题**: ${alert.title}`,
            `**详情**: ${alert.detail}`,
            `**来源**: ${alert.source}`,
            `**时间**: ${alert.timestamp.toISOString()}`,
            alert.metadata
              ? `**附加信息**: ${JSON.stringify(alert.metadata)}`
              : '',
            '---',
            '请相关人员立即处理！',
          ].join('\n\n'),
        },
        at: {
          isAtAll: alert.level === AlertLevel.P0,
        },
      });
    } catch (error) {
      this.logger.error('钉钉告警发送失败', error);
    }
  }

  private async sendSmsAlert(alert: SecurityAlert): Promise<void> {
    // 调用阿里云短信服务发送告警短信
    // 具体实现略
  }

  private async sendPhoneAlert(alert: SecurityAlert): Promise<void> {
    // 调用阿里云语音通知服务
    // 具体实现略
  }
}

// ============================================================
// 在审计日志服务中集成安全告警
// ============================================================
// 示例：异常登录检测
async checkAbnormalLogin(
  userId: string,
  ip: string,
): Promise<void> {
  // 检查短时间内大量失败登录
  const failKey = `auth:login_fail_rate:${ip}`;
  const failCount = await this.redisService.incr(failKey);

  if (failCount === 1) {
    await this.redisService.expire(failKey, 600); // 10分钟窗口
  }

  if (failCount > 50) {
    await this.securityAlertService.sendAlert({
      level: AlertLevel.P1,
      title: '疑似暴力破解攻击',
      detail: `IP ${ip} 在10分钟内登录失败 ${failCount} 次`,
      source: 'AuthService',
      timestamp: new Date(),
      metadata: { ip, failCount },
    });
  }
}
```

---

以上为AI智能CRM销售管理系统详细设计文档第12章"安全设计"的完整内容。该章节覆盖了从认证授权、数据安全、审计日志到基础设施安全、备份恢复和安全合规的全方位安全架构设计，所有方案均基于 NestJS + JWT + Redis + MySQL 8.0 + 阿里云技术栈，并提供了可落地的代码实现示例。
