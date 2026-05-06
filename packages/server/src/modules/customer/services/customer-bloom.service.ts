import { Injectable, Logger, OnModuleInit } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { RedisService } from '../../../common/redis'
import { Customer } from '../customer.entity'
import { createHash } from 'crypto'

/**
 * Bloom filter backed by Redis bitmap for customer ID existence checks.
 *
 * - Bitmap size: 2^20 bits (1,048,576) ≈ 128 KB in Redis
 * - Hash functions: 7 (optimal for ~100K items at <1% FPR)
 * - False positive: possible (→ falls through to DB query)
 * - False negative: impossible (if ID was added, mightExist always returns true)
 *
 * On startup, loads all existing customer IDs into the bitmap.
 * On customer create, adds the new ID.
 * Before findOne DB query, checks mightExist to short-circuit guaranteed misses.
 */

const BLOOM_KEY = 'bloom:customer:ids'
const BLOOM_SIZE = 1 << 20 // 1,048,576 bits
const NUM_HASHES = 7

@Injectable()
export class CustomerBloomService implements OnModuleInit {
  private readonly logger = new Logger(CustomerBloomService.name)

  constructor(
    @InjectRepository(Customer)
    private readonly customerRepository: Repository<Customer>,
    private readonly redisService: RedisService,
  ) {}

  async onModuleInit(): Promise<void> {
    await this.rebuild()
  }

  /**
   * Rebuild the entire Bloom filter from the database.
   * Called on startup and can be called manually if the filter drifts.
   */
  async rebuild(): Promise<void> {
    // 重建时先清空 bitmap，避免已软删或已迁移数据长期残留造成误判率升高。
    await this.redisService.del(BLOOM_KEY)

    // Stream all customer IDs (only id column, no soft-deleted)
    const ids: { id: number }[] = await this.customerRepository
      .createQueryBuilder('c')
      .select('c.id', 'id')
      .getRawMany()

    for (const row of ids) {
      await this.addToFilter(row.id)
    }

    this.logger.log(`Bloom filter rebuilt with ${ids.length} customer IDs`)
  }

  /**
   * Add a customer ID to the Bloom filter.
   */
  async add(id: number): Promise<void> {
    await this.addToFilter(id)
  }

  /**
   * Check if a customer ID might exist.
   * - Returns false: ID definitely does NOT exist (skip DB query)
   * - Returns true: ID probably exists (proceed to DB query)
   */
  async mightExist(id: number): Promise<boolean> {
    // Redis 出错时由调用方决定是否回退 DB；这里不吞异常，避免把未知状态当成不存在。
    const offsets = this.getHashOffsets(id)
    for (const offset of offsets) {
      const bit = await this.redisService.getBit(BLOOM_KEY, offset)
      if (bit === 0) return false
    }
    return true
  }

  // ── internal ──────────────────────────────────────────────────

  private async addToFilter(id: number): Promise<void> {
    const offsets = this.getHashOffsets(id)
    for (const offset of offsets) {
      await this.redisService.setBit(BLOOM_KEY, offset, 1)
    }
  }

  /**
   * Compute NUM_HASHES bit offsets for a given ID using double-hashing scheme:
   *   offset_i = (h1 + i * h2) % BLOOM_SIZE
   *
   * h1 and h2 are derived from a single MD5 hash of the ID string.
   */
  private getHashOffsets(id: number): number[] {
    const hash = createHash('md5').update(String(id)).digest()
    const h1 = hash.readUInt32LE(0)
    const h2 = hash.readUInt32LE(4)

    const offsets: number[] = []
    for (let i = 0; i < NUM_HASHES; i++) {
      offsets.push(((h1 + i * h2) >>> 0) % BLOOM_SIZE)
    }
    return offsets
  }
}
