import { MigrationInterface, QueryRunner, Table, TableIndex } from 'typeorm'

export class CreateAiReportsTable1709000043000 implements MigrationInterface {
  name = 'CreateAiReportsTable1709000043000'

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'ai_reports',
        columns: [
          { name: 'id', type: 'int', isPrimary: true, isGenerated: true, generationStrategy: 'increment' },
          { name: 'report_type', type: 'enum', enum: ['weekly', 'monthly'], isNullable: false },
          { name: 'period_value', type: 'varchar', length: '20', isNullable: false, comment: '2025-W01 / 2025-01' },
          { name: 'content', type: 'json', isNullable: true },
          { name: 'file_url', type: 'varchar', length: '500', isNullable: true },
          { name: 'created_by', type: 'int', isNullable: true },
          { name: 'created_at', type: 'datetime', precision: 6, default: 'CURRENT_TIMESTAMP(6)' },
        ],
      }),
      true,
    )

    await queryRunner.createIndex('ai_reports', new TableIndex({ name: 'IDX_ai_reports_report_type', columnNames: ['report_type'] }))
    await queryRunner.createIndex('ai_reports', new TableIndex({ name: 'IDX_ai_reports_period_value', columnNames: ['period_value'] }))
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('ai_reports', true)
  }
}
