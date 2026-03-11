import { Injectable } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { MaterialService } from './material.service'

@Injectable()
export class PreviewService {
  constructor(
    private readonly configService: ConfigService,
    private readonly materialService: MaterialService,
  ) {}

  async getPreviewUrl(
    id: number,
    mode: 'inline' | 'download' = 'inline',
  ): Promise<{ url: string; mimeType: string | null; strategy: string }> {
    const file = await this.materialService.findOne(id)
    const baseUrl = this.configService.get<string>('OSS_PUBLIC_URL', '')
    const url = baseUrl
      ? `${baseUrl}/${file.ossKey}${mode === 'download' ? '?attachment=1' : ''}`
      : `/api/v1/materials/${id}/url`
    let strategy = 'download'
    if (file.mimeType) {
      if (file.mimeType.startsWith('image/')) strategy = 'image'
      else if (file.mimeType === 'application/pdf') strategy = 'pdf'
      else if (
        file.mimeType.includes('word') ||
        file.mimeType.includes('excel') ||
        file.mimeType.includes('powerpoint')
      )
        strategy = 'office'
      else if (file.mimeType.startsWith('video/') || file.mimeType.startsWith('audio/'))
        strategy = 'media'
    }
    return { url, mimeType: file.mimeType, strategy }
  }
}
