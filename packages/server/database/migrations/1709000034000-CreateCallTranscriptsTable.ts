import { MigrationInterface, QueryRunner, Table, TableIndex } from 'typeorm'

export class CreateCallTranscriptsTable1709000034000 implements MigrationInterface {
  name = 'CreateCallTranscriptsTable1709000034000'

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'call_transcripts',
        columns: [
          {
            name: 'id',
            type: 'int',
            isPrimary: true,
            isGenerated: true,
            generationStrategy: 'increment',
          },
          {
            name: 'asr_task_id',
            type: 'int',
            isNullable: false,
            comment: 'ASR任务ID',
          },
          {
            name: 'segment_index',
            type: 'int',
            isNullable: true,
          },
          {
            name: 'start_time_ms',
            type: 'int',
            isNullable: true,
          },
          {
            name: 'end_time_ms',
            type: 'int',
            isNullable: true,
          },
          {
            name: 'speaker',
            type: 'enum',
            enum: ['agent', 'customer', 'unknown'],
            default: "'unknown'",
          },
          {
            name: 'text',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'created_at',
            type: 'datetime',
            precision: 6,
            default: 'CURRENT_TIMESTAMP(6)',
          },
        ],
      }),
      true,
    )

    await queryRunner.createIndex(
      'call_transcripts',
      new TableIndex({ name: 'IDX_call_transcripts_asr_task_id', columnNames: ['asr_task_id'] }),
    )
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropIndex('call_transcripts', 'IDX_call_transcripts_asr_task_id')
    await queryRunner.dropTable('call_transcripts')
  }
}
