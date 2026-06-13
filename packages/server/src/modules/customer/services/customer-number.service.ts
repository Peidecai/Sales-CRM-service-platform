import { Injectable } from '@nestjs/common'
import { RedisService } from '../../../common/redis'

@Injectable()
export class CustomerNumberService {
  constructor(private readonly redisService: RedisService) {}

  /**
   * Generate unique customer number: CUS-YYYYMMDD-XXXX
   * Uses Redis INCR for atomic sequence generation.
   */
  async generate(): Promise<string> {
    const today = new Date()
    const dateStr = today.toISOString().slice(0, 10).replace(/-/g, '')
    const seqKey = `seq:customer_no:${dateStr}`
    const seq = await this.redisService.incr(seqKey)
    if (seq === 1) {
      // 序列保留 48 小时，覆盖跨时区/延迟任务但不会无限堆积历史日期 key。
      await this.redisService.expire(seqKey, 172800) // 48h TTL
    }
    return `CUS-${dateStr}-${String(seq).padStart(4, '0')}`
  }
}
