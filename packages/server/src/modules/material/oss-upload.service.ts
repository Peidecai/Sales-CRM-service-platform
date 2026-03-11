import { Injectable, Logger } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { MaterialService } from './material.service'

export interface StsTokenResult {
  accessKeyId: string
  accessKeySecret: string
  securityToken: string
  expiration: string
}

@Injectable()
export class OssUploadService {
  private readonly logger = new Logger(OssUploadService.name)

  constructor(
    private readonly configService: ConfigService,
    private readonly materialService: MaterialService,
  ) {}

  async getStsToken(): Promise<StsTokenResult> {
    const key = this.configService.get<string>('OSS_ACCESS_KEY_ID')
    const secret = this.configService.get<string>('OSS_ACCESS_KEY_SECRET')
    if (!key || !secret) {
      this.logger.warn('OSS credentials not configured, returning stub STS')
      const exp = new Date(Date.now() + 3600 * 1000).toISOString()
      return {
        accessKeyId: 'stub',
        accessKeySecret: 'stub',
        securityToken: 'stub',
        expiration: exp,
      }
    }
    const exp = new Date(Date.now() + 3600 * 1000).toISOString()
    return {
      accessKeyId: key,
      accessKeySecret: secret,
      securityToken: '',
      expiration: exp,
    }
  }

  async handleCallback(body: {
    filename?: string
    oss_key?: string
    oss_bucket?: string
    file_size?: number
    mime_type?: string
    md5?: string
    thumbnail_key?: string
    width?: number
    height?: number
    duration_seconds?: number
    created_by?: number
  }): Promise<{ id: number }> {
    const name = body.filename ?? body.oss_key ?? 'unknown'
    const ossKey = body.oss_key ?? ''
    const ossBucket = body.oss_bucket ?? this.configService.get<string>('OSS_BUCKET', 'default')
    const fileSize = Number(body.file_size) || 0
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
