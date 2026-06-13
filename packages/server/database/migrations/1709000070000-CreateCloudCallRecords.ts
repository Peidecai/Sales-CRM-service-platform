import { MigrationInterface, QueryRunner, Table, TableIndex } from 'typeorm'

export class CreateCloudCallRecords1709000070000 implements MigrationInterface {
  name = 'CreateCloudCallRecords1709000070000'

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'cloud_call_records',
        columns: [
          {
            name: 'id',
            type: 'int',
            isPrimary: true,
            isGenerated: true,
            generationStrategy: 'increment',
          },
          {
            name: 'external_call_id',
            type: 'varchar',
            length: '128',
            comment: '云呼服务商返回的 callId',
          },
          {
            name: 'user_id',
            type: 'int',
            comment: '发起者用户ID',
          },
          {
            name: 'customer_id',
            type: 'int',
            comment: '客户ID',
          },
          {
            name: 'caller_phone',
            type: 'varchar',
            length: '20',
            comment: '销售手机号',
          },
          {
            name: 'callee_phone',
            type: 'varchar',
            length: '20',
            comment: '客户电话',
          },
          {
            name: 'status',
            type: 'enum',
            enum: ['pending', 'ringing', 'connected', 'completed', 'failed'],
            default: "'pending'",
            comment: '通话状态',
          },
          {
            name: 'duration',
            type: 'int',
            isNullable: true,
            comment: '通话时长（秒）',
          },
          {
            name: 'recording_url',
            type: 'varchar',
            length: '500',
            isNullable: true,
            comment: '录音文件 URL',
          },
          {
            name: 'transcription',
            type: 'text',
            isNullable: true,
            comment: 'ASR 转写文本',
          },
          {
            name: 'ai_analysis_id',
            type: 'int',
            isNullable: true,
            comment: '关联 AI 分析结果',
          },
          {
            name: 'provider',
            type: 'varchar',
            length: '20',
            comment: '服务商标识（aliyun/tianrun）',
          },
          {
            name: 'callback_payload',
            type: 'json',
            isNullable: true,
            comment: '原始回调数据',
          },
          {
            name: 'created_at',
            type: 'datetime',
            precision: 6,
            default: 'CURRENT_TIMESTAMP(6)',
          },
          {
            name: 'updated_at',
            type: 'datetime',
            precision: 6,
            default: 'CURRENT_TIMESTAMP(6)',
            onUpdate: 'CURRENT_TIMESTAMP(6)',
          },
          {
            name: 'deleted_at',
            type: 'datetime',
            precision: 6,
            isNullable: true,
          },
        ],
      }),
      true,
    )

    await queryRunner.createIndex(
      'cloud_call_records',
      new TableIndex({
        name: 'IDX_cloud_call_records_external_call_id',
        columnNames: ['external_call_id'],
        isUnique: true,
      }),
    )

    await queryRunner.createIndex(
      'cloud_call_records',
      new TableIndex({
        name: 'IDX_cloud_call_records_user_id',
        columnNames: ['user_id'],
      }),
    )

    await queryRunner.createIndex(
      'cloud_call_records',
      new TableIndex({
        name: 'IDX_cloud_call_records_customer_id',
        columnNames: ['customer_id'],
      }),
    )

    await queryRunner.createIndex(
      'cloud_call_records',
      new TableIndex({
        name: 'IDX_cloud_call_records_status',
        columnNames: ['status'],
      }),
    )
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('cloud_call_records', true)
  }
}
