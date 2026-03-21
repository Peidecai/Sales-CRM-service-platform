import { Injectable, NotFoundException } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository, In } from 'typeorm'
import { AppVersion, AppPlatform } from './entities/app-version.entity'
import { CreateVersionDto } from './dto/create-version.dto'

export interface VersionCheckResult {
  hasUpdate: boolean
  version?: string
  buildNumber?: number
  downloadUrl?: string
  description?: string
  forceUpdate?: boolean
}

@Injectable()
export class AppVersionService {
  constructor(
    @InjectRepository(AppVersion)
    private readonly versionRepo: Repository<AppVersion>,
  ) {}

  /** Compare two semver strings. Returns >0 if a>b, <0 if a<b, 0 if equal */
  compareSemver(a: string, b: string): number {
    const pa = a.split('.').map(Number)
    const pb = b.split('.').map(Number)
    for (let i = 0; i < 3; i++) {
      const diff = (pa[i] || 0) - (pb[i] || 0)
      if (diff !== 0) return diff
    }
    return 0
  }

  async checkVersion(platform: string, currentVersion: string): Promise<VersionCheckResult> {
    const platforms = [platform as AppPlatform, AppPlatform.ALL]

    const latestVersion = await this.versionRepo.findOne({
      where: { platform: In(platforms), isActive: true },
      order: { buildNumber: 'DESC' },
    })

    if (!latestVersion || this.compareSemver(latestVersion.version, currentVersion) <= 0) {
      return { hasUpdate: false }
    }

    return {
      hasUpdate: true,
      version: latestVersion.version,
      buildNumber: latestVersion.buildNumber,
      downloadUrl: latestVersion.downloadUrl,
      description: latestVersion.description,
      forceUpdate: latestVersion.forceUpdate,
    }
  }

  async create(dto: CreateVersionDto): Promise<AppVersion> {
    const version = this.versionRepo.create(dto)
    return this.versionRepo.save(version)
  }

  async findAll(): Promise<AppVersion[]> {
    return this.versionRepo.find({ order: { buildNumber: 'DESC' } })
  }

  async update(id: number, dto: Partial<CreateVersionDto>): Promise<AppVersion> {
    const version = await this.versionRepo.findOne({ where: { id } })
    if (!version) {
      throw new NotFoundException(`Version #${id} not found`)
    }
    Object.assign(version, dto)
    return this.versionRepo.save(version)
  }
}
