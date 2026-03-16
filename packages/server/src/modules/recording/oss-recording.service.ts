import { Injectable } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'

/**
 * OSS 录音存储服务（占位实现）。
 * 使用阿里云 OSS SDK（ali-oss），从 ConfigService 读取 endpoint、bucket、accessKeyId、accessKeySecret。
 */
@Injectable()
export class OssRecordingService {
  constructor(private readonly configService: ConfigService) {}

  /**
   * 将录音 URL 拉取后上传到 OSS，返回 oss_key。
   * 建议 key: recordings/{yyyyMMdd}/{callRecordId}_{uuid}.wav
   */
  async uploadFromUrl(_url: string, key: string): Promise<string> {
    void this.configService.get<string>('OSS_ENDPOINT')
    void this.configService.get<string>('OSS_BUCKET')
    // TODO: 使用 ali-oss 拉取 url 并 put 到 OSS
    return key
  }

  /**
   * 将文件 Buffer 直接上传到 OSS，返回 oss_key。
   * 用于小程序语音速记上传场景（POST /recordings/upload）。
   */
  async uploadBuffer(_buffer: Buffer, key: string, _mimeType?: string): Promise<string> {
    void this.configService.get<string>('OSS_ENDPOINT')
    void this.configService.get<string>('OSS_BUCKET')
    // TODO: 使用 ali-oss put(key, buffer, { mime: mimeType })
    return key
  }

  /**
   * 获取 OSS Bucket 名称。
   */
  getBucket(): string {
    return this.configService.get<string>('OSS_BUCKET') ?? 'crm-call-recordings'
  }

  /**
   * 生成临时访问 URL 供前端播放。
   */
  getSignedUrl(ossKey: string, expiresSeconds = 3600): string {
    void this.configService.get<string>('OSS_ENDPOINT')
    void this.configService.get<string>('OSS_BUCKET')
    // TODO: 使用 OSS SDK 生成 signed URL
    return `https://example.com/recordings/${ossKey}?expires=${expiresSeconds}`
  }
}
