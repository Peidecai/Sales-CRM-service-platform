import { Injectable, NotFoundException, Logger } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository, Between } from 'typeorm'
import { CheckIn, CheckInStatus } from './entities/check-in.entity'
import { CreateCheckInDto } from './dto/create-check-in.dto'
import { QueryCheckInDto } from './dto/query-check-in.dto'
import { Customer } from '../customer/customer.entity'

@Injectable()
export class CheckInService {
  private readonly logger = new Logger(CheckInService.name)

  constructor(
    @InjectRepository(CheckIn)
    private readonly checkInRepo: Repository<CheckIn>,
    @InjectRepository(Customer)
    private readonly customerRepo: Repository<Customer>,
  ) {}

  async create(userId: number, dto: CreateCheckInDto): Promise<CheckIn> {
    const distance: number | null = null

    if (dto.customerId) {
      const customer = await this.customerRepo.findOne({
        where: { id: dto.customerId },
      })
      if (!customer) {
        throw new NotFoundException(`客户 ${dto.customerId} 不存在`)
      }

      // Calculate distance if customer has coordinates
      // For now, store null since Customer entity may not have lat/lng
      // Future: add lat/lng to Customer and calculate Haversine distance
    }

    const checkIn = this.checkInRepo.create({
      userId,
      customerId: dto.customerId ?? null,
      latitude: dto.latitude,
      longitude: dto.longitude,
      accuracy: dto.accuracy,
      address: dto.address ?? null,
      photoUrl: dto.photoUrl ?? null,
      notes: dto.notes ?? null,
      checkInTime: new Date(),
      distance,
      status: CheckInStatus.PENDING,
    })

    return this.checkInRepo.save(checkIn)
  }

  async findAll(
    query: QueryCheckInDto,
  ): Promise<{ list: CheckIn[]; total: number; page: number; pageSize: number }> {
    const page = query.page ?? 1
    const pageSize = query.pageSize ?? 20

    const qb = this.checkInRepo
      .createQueryBuilder('ci')
      .leftJoinAndSelect('ci.user', 'user')
      .leftJoinAndSelect('ci.customer', 'customer')

    if (query.userId) {
      qb.andWhere('ci.user_id = :userId', { userId: query.userId })
    }
    if (query.customerId) {
      qb.andWhere('ci.customer_id = :customerId', {
        customerId: query.customerId,
      })
    }
    if (query.status) {
      qb.andWhere('ci.status = :status', { status: query.status })
    }
    if (query.startDate && query.endDate) {
      qb.andWhere('ci.check_in_time BETWEEN :start AND :end', {
        start: query.startDate,
        end: query.endDate,
      })
    } else if (query.startDate) {
      qb.andWhere('ci.check_in_time >= :start', { start: query.startDate })
    } else if (query.endDate) {
      qb.andWhere('ci.check_in_time <= :end', { end: query.endDate })
    }

    qb.orderBy('ci.check_in_time', 'DESC')
      .skip((page - 1) * pageSize)
      .take(pageSize)

    const [list, total] = await qb.getManyAndCount()
    return { list, total, page, pageSize }
  }

  async findOne(id: number): Promise<CheckIn> {
    const checkIn = await this.checkInRepo.findOne({
      where: { id },
      relations: ['user', 'customer'],
    })
    if (!checkIn) {
      throw new NotFoundException(`签到记录 ${id} 不存在`)
    }
    return checkIn
  }

  async approve(id: number): Promise<CheckIn> {
    const checkIn = await this.findOne(id)
    checkIn.status = CheckInStatus.APPROVED
    return this.checkInRepo.save(checkIn)
  }

  async reject(id: number): Promise<CheckIn> {
    const checkIn = await this.findOne(id)
    checkIn.status = CheckInStatus.REJECTED
    return this.checkInRepo.save(checkIn)
  }

  async getStats(
    userId: number,
  ): Promise<{ totalCount: number; monthCount: number; approvedCount: number }> {
    const now = new Date()
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)

    const [totalCount, monthCount, approvedCount] = await Promise.all([
      this.checkInRepo.count({ where: { userId } }),
      this.checkInRepo.count({
        where: {
          userId,
          checkInTime: Between(monthStart, now),
        },
      }),
      this.checkInRepo.count({
        where: {
          userId,
          status: CheckInStatus.APPROVED,
          checkInTime: Between(monthStart, now),
        },
      }),
    ])

    return { totalCount, monthCount, approvedCount }
  }

  /**
   * Haversine formula — 计算两个 GPS 坐标之间的距离（米）
   */
  static haversineDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
    const R = 6371000 // Earth radius in meters
    const toRad = (deg: number) => (deg * Math.PI) / 180
    const dLat = toRad(lat2 - lat1)
    const dLng = toRad(lng2 - lng1)
    const a =
      Math.sin(dLat / 2) ** 2 +
      Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
    return Math.round(R * c)
  }
}
