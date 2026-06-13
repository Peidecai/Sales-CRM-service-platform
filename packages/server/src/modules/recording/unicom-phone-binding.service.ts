import {
  ConflictException,
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { UserRole } from '@crm/shared'
import { User } from '../user/user.entity'
import { UnicomPhoneBinding } from './entities/unicom-phone-binding.entity'
import {
  CreateUnicomPhoneBindingDto,
  UnicomPhoneBindingVo,
  UpdateUnicomPhoneBindingDto,
} from './dto/unicom-phone-binding.dto'

@Injectable()
export class UnicomPhoneBindingService {
  constructor(
    private readonly configService: ConfigService,
    @InjectRepository(UnicomPhoneBinding)
    private readonly bindingRepository: Repository<UnicomPhoneBinding>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  async findAll(origin?: string): Promise<UnicomPhoneBindingVo[]> {
    const bindings = await this.bindingRepository.find({
      relations: ['user'],
      order: { id: 'ASC' },
    })
    return bindings.map((binding) => this.toVo(binding, origin))
  }

  async create(dto: CreateUnicomPhoneBindingDto, origin?: string): Promise<UnicomPhoneBindingVo> {
    const phone = this.normalizePhone(dto.phone)
    const user = await this.findAssignableUser(dto.userId)
    const existing = await this.bindingRepository.findOne({ where: { phone } })
    if (existing) {
      throw new ConflictException(`手机号 ${phone} 已绑定销售员`)
    }

    const binding = this.bindingRepository.create({
      phone,
      userId: user.id,
      isEnabled: dto.isEnabled ?? true,
      remark: dto.remark?.trim() || null,
    })
    const saved = await this.bindingRepository.save(binding)
    saved.user = user
    return this.toVo(saved, origin)
  }

  async update(
    id: number,
    dto: UpdateUnicomPhoneBindingDto,
    origin?: string,
  ): Promise<UnicomPhoneBindingVo> {
    const binding = await this.bindingRepository.findOne({
      where: { id },
      relations: ['user'],
    })
    if (!binding) {
      throw new NotFoundException(`联通回调绑定 #${id} 不存在`)
    }

    if (dto.phone !== undefined) {
      const phone = this.normalizePhone(dto.phone)
      const duplicate = await this.bindingRepository.findOne({ where: { phone } })
      if (duplicate && duplicate.id !== id) {
        throw new ConflictException(`手机号 ${phone} 已绑定销售员`)
      }
      binding.phone = phone
    }

    if (dto.userId !== undefined) {
      const user = await this.findAssignableUser(dto.userId)
      binding.userId = user.id
      binding.user = user
    }

    if (dto.isEnabled !== undefined) {
      binding.isEnabled = dto.isEnabled
    }
    if (dto.remark !== undefined) {
      binding.remark = dto.remark?.trim() || null
    }

    const saved = await this.bindingRepository.save(binding)
    if (!saved.user || saved.user.id !== saved.userId) {
      saved.user = (await this.userRepository.findOne({ where: { id: saved.userId } })) ?? undefined
    }
    return this.toVo(saved, origin)
  }

  async remove(id: number): Promise<void> {
    const binding = await this.bindingRepository.findOne({ where: { id } })
    if (!binding) {
      throw new NotFoundException(`联通回调绑定 #${id} 不存在`)
    }
    await this.bindingRepository.remove(binding)
  }

  async findEnabledByPhone(phone: string): Promise<UnicomPhoneBinding | null> {
    const normalized = this.normalizePhone(phone)
    if (!normalized) return null
    return this.bindingRepository.findOne({
      where: { phone: normalized, isEnabled: true },
      relations: ['user'],
    })
  }

  buildRecordCallbackUrl(_phone: string, origin?: string): string {
    return `${this.callbackBaseUrl(origin)}${this.apiPrefix()}/unicom/records`
  }

  buildTranscriptionCallbackUrl(_phone: string, origin?: string): string {
    return `${this.callbackBaseUrl(origin)}${this.apiPrefix()}/unicom/transcriptions`
  }

  normalizePhone(value: string | null | undefined): string {
    const digits = String(value ?? '').replace(/\D/g, '')
    if (digits.startsWith('0086') && digits.length === 15) return digits.slice(4)
    if (digits.startsWith('86') && digits.length === 13) return digits.slice(2)
    return digits
  }

  private async findAssignableUser(userId: number): Promise<User> {
    const user = await this.userRepository.findOne({ where: { id: userId } })
    if (!user || !user.isActive) {
      throw new NotFoundException(`销售员用户 #${userId} 不存在或未启用`)
    }
    if (user.role !== UserRole.SALES && user.role !== UserRole.MANAGER) {
      throw new BadRequestException('只能绑定销售员或销售经理')
    }
    return user
  }

  private callbackBaseUrl(origin?: string): string {
    const configured = this.configService.get<string>('PUBLIC_CALLBACK_BASE_URL', '').trim()
    const base = configured || origin || ''
    return base.replace(/\/+$/, '')
  }

  private apiPrefix(): string {
    const configured = this.configService.get<string>('API_PREFIX', '/api/v1')
    const normalized = configured.trim().replace(/^\/+/, '').replace(/\/+$/, '')
    return normalized ? `/${normalized}` : ''
  }

  private toVo(binding: UnicomPhoneBinding, origin?: string): UnicomPhoneBindingVo {
    return {
      id: binding.id,
      phone: binding.phone,
      userId: binding.userId,
      userName: binding.user?.name ?? null,
      username: binding.user?.username ?? null,
      userPhone: binding.user?.phone ?? null,
      isEnabled: binding.isEnabled,
      remark: binding.remark,
      recordCallbackUrl: this.buildRecordCallbackUrl(binding.phone, origin),
      transcriptionCallbackUrl: this.buildTranscriptionCallbackUrl(binding.phone, origin),
      createdAt: binding.createdAt,
      updatedAt: binding.updatedAt,
    }
  }
}
