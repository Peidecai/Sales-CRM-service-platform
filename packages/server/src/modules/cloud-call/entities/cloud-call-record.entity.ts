import { Entity, Column } from 'typeorm'
import { BaseEntity } from '../../../common/entities/base.entity'
import { CloudCallStatus } from '../interfaces/cloud-call-provider.interface'

@Entity('cloud_call_records')
export class CloudCallRecord extends BaseEntity {
  @Column({
    name: 'external_call_id',
    type: 'varchar',
    length: 128,
    comment: '云呼服务商返回的 callId',
  })
  externalCallId!: string

  @Column({ name: 'user_id', type: 'int', comment: '发起者用户ID' })
  userId!: number

  @Column({ name: 'customer_id', type: 'int', comment: '客户ID' })
  customerId!: number

  @Column({ name: 'caller_phone', type: 'varchar', length: 20, comment: '销售手机号' })
  callerPhone!: string

  @Column({ name: 'callee_phone', type: 'varchar', length: 20, comment: '客户电话' })
  calleePhone!: string

  @Column({
    type: 'enum',
    enum: CloudCallStatus,
    default: CloudCallStatus.PENDING,
    comment: '通话状态',
  })
  status!: CloudCallStatus

  @Column({ type: 'int', nullable: true, comment: '通话时长（秒）' })
  duration!: number | null

  @Column({
    name: 'recording_url',
    type: 'varchar',
    length: 500,
    nullable: true,
    comment: '录音文件 URL',
  })
  recordingUrl!: string | null

  @Column({ type: 'text', nullable: true, comment: 'ASR 转写文本' })
  transcription!: string | null

  @Column({ name: 'ai_analysis_id', type: 'int', nullable: true, comment: '关联 AI 分析结果' })
  aiAnalysisId!: number | null

  @Column({ type: 'varchar', length: 20, comment: '服务商标识（aliyun/tianrun）' })
  provider!: string

  @Column({ name: 'callback_payload', type: 'json', nullable: true, comment: '原始回调数据' })
  callbackPayload!: Record<string, unknown> | null
}
