import { Injectable, Logger, OnModuleInit } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
} from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'

/**
 * OSS 录音存储服务 — S3 兼容协议实现。
 *
 * 兼容: AWS S3 / Alibaba Cloud OSS (S3兼容) / MinIO / 其他 S3 兼容存储。
 *
 * 环境变量:
 *   OSS_ENDPOINT        — S3 endpoint (e.g. https://oss-cn-hangzhou.aliyuncs.com)
 *   OSS_REGION           — Region (default: us-east-1)
 *   OSS_BUCKET           — Bucket name (default: crm-call-recordings)
 *   OSS_ACCESS_KEY_ID    — Access key
 *   OSS_ACCESS_KEY_SECRET — Secret key
 *   OSS_FORCE_PATH_STYLE — Set to 'true' for MinIO (default: false)
 */
@Injectable()
export class OssRecordingService implements OnModuleInit {
  private readonly logger = new Logger(OssRecordingService.name)
  private client!: S3Client
  private bucket!: string

  constructor(private readonly configService: ConfigService) {}

  onModuleInit() {
    const endpoint = this.configService.get<string>('OSS_ENDPOINT')
    const region = this.configService.get<string>('OSS_REGION') ?? 'us-east-1'
    const accessKeyId = this.configService.get<string>('OSS_ACCESS_KEY_ID') ?? ''
    const secretAccessKey = this.configService.get<string>('OSS_ACCESS_KEY_SECRET') ?? ''
    const forcePathStyle = this.configService.get<string>('OSS_FORCE_PATH_STYLE') === 'true'

    this.bucket = this.configService.get<string>('OSS_BUCKET') ?? 'crm-call-recordings'

    this.client = new S3Client({
      region,
      ...(endpoint ? { endpoint } : {}),
      forcePathStyle,
      credentials: {
        accessKeyId,
        secretAccessKey,
      },
    })

    this.logger.log(
      `OSS initialized: endpoint=${endpoint ?? 'default'}, bucket=${this.bucket}, pathStyle=${forcePathStyle}`,
    )
  }

  /**
   * 将录音 URL 拉取后上传到 OSS，返回 oss_key。
   */
  async uploadFromUrl(url: string, key: string): Promise<string> {
    const response = await fetch(url)
    if (!response.ok) {
      throw new Error(`Failed to fetch recording from ${url}: ${response.status}`)
    }
    const buffer = Buffer.from(await response.arrayBuffer())
    const contentType = response.headers.get('content-type') ?? 'audio/mpeg'
    return this.uploadBuffer(buffer, key, contentType)
  }

  /**
   * 将文件 Buffer 直接上传到 OSS，返回 oss_key。
   */
  async uploadBuffer(buffer: Buffer, key: string, mimeType?: string): Promise<string> {
    await this.client.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        Body: buffer,
        ContentType: mimeType ?? 'audio/mpeg',
      }),
    )
    this.logger.debug(`Uploaded ${key} (${buffer.length} bytes) to ${this.bucket}`)
    return key
  }

  /**
   * 获取 OSS Bucket 名称。
   */
  getBucket(): string {
    return this.bucket
  }

  /**
   * 生成临时签名 URL 供前端播放。
   */
  async getSignedUrl(ossKey: string, expiresSeconds = 3600): Promise<string> {
    const command = new GetObjectCommand({
      Bucket: this.bucket,
      Key: ossKey,
    })
    return getSignedUrl(this.client, command, { expiresIn: expiresSeconds })
  }

  /**
   * 删除 OSS 文件。
   */
  async deleteFile(ossKey: string): Promise<void> {
    await this.client.send(
      new DeleteObjectCommand({
        Bucket: this.bucket,
        Key: ossKey,
      }),
    )
    this.logger.debug(`Deleted ${ossKey} from ${this.bucket}`)
  }
}
