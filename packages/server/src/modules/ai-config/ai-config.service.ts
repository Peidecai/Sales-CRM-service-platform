import { Injectable, Logger, NotFoundException } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { RedisService } from '../../common/redis'
import { AiConfig } from './ai-config.entity'
import { UpdateAiConfigDto } from './dto/update-ai-config.dto'

const CACHE_PREFIX = 'ai:config:'
const CACHE_TTL = 300 // 5 minutes

@Injectable()
export class AiConfigService {
  private readonly logger = new Logger(AiConfigService.name)

  constructor(
    @InjectRepository(AiConfig)
    private readonly configRepo: Repository<AiConfig>,
    private readonly redis: RedisService,
  ) {}

  async getAllConfigs(): Promise<AiConfig[]> {
    return this.configRepo.find({ order: { module: 'ASC' } })
  }

  async getConfig(module: string): Promise<AiConfig> {
    // Check cache
    const cached = await this.redis.safeGet(`${CACHE_PREFIX}${module}`)
    if (cached) {
      return JSON.parse(cached) as AiConfig
    }

    // DB lookup
    let config = await this.configRepo.findOne({ where: { module } })
    if (!config) {
      // Fallback to 'default'
      config = await this.configRepo.findOne({ where: { module: 'default' } })
    }
    if (!config) {
      throw new NotFoundException(`AI config for module '${module}' not found`)
    }

    await this.redis.set(`${CACHE_PREFIX}${module}`, JSON.stringify(config), CACHE_TTL)
    return config
  }

  async updateConfig(module: string, dto: UpdateAiConfigDto, userId: number): Promise<AiConfig> {
    let config = await this.configRepo.findOne({ where: { module } })
    if (!config) {
      throw new NotFoundException(`AI config for module '${module}' not found`)
    }

    Object.assign(config, dto, { updatedById: userId })
    config = await this.configRepo.save(config)

    // Clear cache
    await this.redis.del(`${CACHE_PREFIX}${module}`)
    this.logger.log(`AI config '${module}' updated by user ${userId}`)
    return config
  }
}
