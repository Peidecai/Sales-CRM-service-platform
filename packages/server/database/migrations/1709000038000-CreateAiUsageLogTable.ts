import { MigrationInterface, QueryRunner, Table, TableIndex } from 'typeorm'

export class CreateAiUsageLogTable1709000038000 implements MigrationInterface {
  name = 'CreateAiUsageLogTable1709000038000'

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'ai_usage_logs',
        columns: [
          { name: 'id', type: 'int', isPrimary: true, isGenerated: true, generationStrategy: 'increment' },
          { name: 'trace_id', type: 'varchar', length: '64', isNullable: false },
          { name: 'feature', type: 'varchar', length: '50', isNullable: false },
          { name: 'model', type: 'varchar', length: '50', isNullable: false },
          { name: 'input_tokens', type: 'int', isNullable: false, default: 0 },
          { name: 'output_tokens', type: 'int', isNullable: false, default: 0 },
          { name: 'cost', type: 'decimal', precision: 10, scale: 6, isNullable: false, default: '0' },
          { name: 'latency_ms', type: 'int', isNullable: false, default: 0 },
          { name: 'status', type: 'varchar', length: '20', isNullable: false, default: "'success'" },
          { name: 'tenant_id', type: 'int', isNullable: true },
          { name: 'user_id', type: 'int', isNullable: true },
          { name: 'created_at', type: 'datetime', precision: 6, default: 'CURRENT_TIMESTAMP(6)' },
        ],
      }),
      true,
    )

    await queryRunner.createIndex('ai_usage_logs', new TableIndex({ name: 'IDX_ai_usage_logs_trace_id', columnNames: ['trace_id'] }))
    await queryRunner.createIndex('ai_usage_logs', new TableIndex({ name: 'IDX_ai_usage_logs_feature', columnNames: ['feature'] }))
    await queryRunner.createIndex('ai_usage_logs', new TableIndex({ name: 'IDX_ai_usage_logs_created_at', columnNames: ['created_at'] }))
    await queryRunner.createIndex('ai_usage_logs', new TableIndex({ name: 'IDX_ai_usage_logs_tenant_id', columnNames: ['tenant_id'] }))
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('ai_usage_logs', true)
  }
}
