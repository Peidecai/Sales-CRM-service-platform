import { MigrationInterface, QueryRunner, Table, TableIndex } from 'typeorm'

export class CreateAiAlertsTable1709000042000 implements MigrationInterface {
  name = 'CreateAiAlertsTable1709000042000'

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'ai_alerts',
        columns: [
          { name: 'id', type: 'int', isPrimary: true, isGenerated: true, generationStrategy: 'increment' },
          { name: 'customer_id', type: 'int', isNullable: true },
          { name: 'opportunity_id', type: 'int', isNullable: true },
          { name: 'alert_type', type: 'varchar', length: '50', isNullable: false, comment: 'churn_risk/stalled_opportunity/sentiment_drop' },
          { name: 'title', type: 'varchar', length: '200', isNullable: false },
          { name: 'detail', type: 'json', isNullable: true },
          { name: 'status', type: 'enum', enum: ['pending', 'acknowledged', 'resolved'], default: "'pending'", isNullable: false },
          { name: 'created_at', type: 'datetime', precision: 6, default: 'CURRENT_TIMESTAMP(6)' },
          { name: 'acknowledged_at', type: 'datetime', isNullable: true },
          { name: 'resolved_at', type: 'datetime', isNullable: true },
        ],
      }),
      true,
    )

    await queryRunner.createIndex('ai_alerts', new TableIndex({ name: 'IDX_ai_alerts_status', columnNames: ['status'] }))
    await queryRunner.createIndex('ai_alerts', new TableIndex({ name: 'IDX_ai_alerts_alert_type', columnNames: ['alert_type'] }))
    await queryRunner.createIndex('ai_alerts', new TableIndex({ name: 'IDX_ai_alerts_customer_id', columnNames: ['customer_id'] }))
    await queryRunner.createIndex('ai_alerts', new TableIndex({ name: 'IDX_ai_alerts_created_at', columnNames: ['created_at'] }))
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('ai_alerts', true)
  }
}
