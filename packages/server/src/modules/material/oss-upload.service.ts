import {
  Injectable,
  Logger,
  BadRequestException,
  InternalServerErrorException,
} from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import StsClient, { AssumeRoleRequest } from '@alicloud/sts20150401'
import { Config as OpenApiConfig } from '@alicloud/openapi-client'
import { MaterialService } from './material.service'
import type { OssCallbackDto } from './dto/oss-callback.dto'

const ALLOWED_MIME_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'video/mp4',
  'audio/mpeg',
  'audio/wav',
])

const MAX_FILE_SIZE = 50 * 1024 * 1024 // 50 MB

export interface StsTokenResult {
  accessKeyId: string
  accessKeySecret: string
  securityToken: string
  expiration: string
}

@Injectable()
export class OssUploadService {
  private readonly logger = new Logger(OssUploadService.name)
  private stsClient: StsClient | null = null

  constructor(
    private readonly configService: ConfigService,
    private readonly materialService: MaterialService,
  ) {
    this.initStsClient()
  }

  private initStsClient(): void {
    const accessKeyId = this.configService.get<string>('OSS_ACCESS_KEY_ID')
    const accessKeySecret = this.configService.get<string>('OSS_ACCESS_KEY_SECRET')
    if (!accessKeyId || !accessKeySecret) {
      this.logger.warn('OSS credentials not configured — STS client disabled')
      return
    }

    const config = new OpenApiConfig({
      accessKeyId,
      accessKeySecret,
      endpoint: 'sts.aliyuncs.com',
    })
    this.stsClient = new StsClient(config)
  }

  async getStsToken(): Promise<StsTokenResult> {
    if (!this.stsClient) {
      this.logger.warn('STS client not initialised, returning stub token')
      return {
        accessKeyId: 'stub',
        accessKeySecret: 'stub',
        securityToken: 'stub',
        expiration: new Date(Date.now() + 900 * 1000).toISOString(),
      }
    }

    const roleArn = this.configService.get<string>('STS_ROLE_ARN', '')
    const sessionName = this.configService.get<string>('STS_SESSION_NAME', 'crm-upload-session')
    const durationSeconds = this.configService.get<number>('STS_DURATION_SECONDS', 900)
    const bucket = this.configService.get<string>('OSS_BUCKET', 'crm-materials')

    if (!roleArn) {
      throw new InternalServerErrorException('STS_ROLE_ARN is not configured')
    }

    // Scoped policy: only allow PutObject to the specific bucket prefix
    const policy = JSON.stringify({
      Version: '1',
      Statement: [
        {
          Effect: 'Allow',
          Action: ['oss:PutObject'],
          Resource: [`acs:oss:*:*:${bucket}/uploads/*`],
        },
      ],
    })

    const request = new AssumeRoleRequest({
      roleArn,
      roleSessionName: sessionName,
      durationSeconds,
      policy,
    })

    try {
      const response = await this.stsClient.assumeRole(request)
      const credentials = response.body?.credentials

      if (
        !credentials?.accessKeyId ||
        !credentials?.accessKeySecret ||
        !credentials?.securityToken
      ) {
        throw new InternalServerErrorException('STS AssumeRole returned incomplete credentials')
      }

      return {
        accessKeyId: credentials.accessKeyId,
        accessKeySecret: credentials.accessKeySecret,
        securityToken: credentials.securityToken,
        expiration:
          credentials.expiration ?? new Date(Date.now() + durationSeconds * 1000).toISOString(),
      }
    } catch (err) {
      if (err instanceof InternalServerErrorException) throw err
      this.logger.error('STS AssumeRole failed', (err as Error).message)
      throw new InternalServerErrorException('获取上传凭证失败')
    }
  }

  async handleCallback(body: OssCallbackDto): Promise<{ id: number }> {
    // Validate MIME type
    if (!ALLOWED_MIME_TYPES.has(body.mime_type)) {
      throw new BadRequestException(`不支持的文件类型: ${body.mime_type}`)
    }

    // Validate file size
    const fileSize = Number(body.file_size) || 0
    if (fileSize > MAX_FILE_SIZE) {
      throw new BadRequestException(
        `文件大小超出限制: ${Math.round(fileSize / 1024 / 1024)}MB, 最大允许 50MB`,
      )
    }

    const name = body.filename ?? body.oss_key ?? 'unknown'
    const ossKey = body.oss_key ?? ''
    const ossBucket = body.oss_bucket ?? this.configService.get<string>('OSS_BUCKET', 'default')
    const file = await this.materialService.createFromCallback({
      name,
      ossKey,
      ossBucket,
      fileSize,
      mimeType: body.mime_type,
      md5: body.md5,
      thumbnailKey: body.thumbnail_key,
      width: body.width,
      height: body.height,
      durationSeconds: body.duration_seconds,
      createdBy: body.created_by,
    })
    return { id: file.id }
  }
}
