import { MigrationInterface, QueryRunner, Table, TableIndex } from 'typeorm'

export class CreateCompetitorReportsTable1709000045000 implements MigrationInterface {
  name = 'CreateCompetitorReportsTable1709000045000'

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'competitor_reports',
        columns: [
          { name: 'id', type: 'int', isPrimary: true, isGenerated: true, generationStrategy: 'increment' },
          { name: 'customer_id', type: 'int', isNullable: true },
          { name: 'opportunity_id', type: 'int', isNullable: true },
          { name: 'competitor_name', type: 'varchar', length: '100', isNullable: false },
          { name: 'win_lose', type: 'varchar', length: '20', isNullable: true },
          { name: 'summary', type: 'text', isNullable: true },
          { name: 'mentioned_at', type: 'datetime', precision: 6, isNullable: true },
          { name: 'created_at', type: 'datetime', precision: 6, default: 'CURRENT_TIMESTAMP(6)' },
        ],
      }),
      true,
    )

    await queryRunner.createIndex('competitor_reports', new TableIndex({ name: 'IDX_competitor_reports_customer_id', columnNames: ['customer_id'] }))
    await queryRunner.createIndex('competitor_reports', new TableIndex({ name: 'IDX_competitor_reports_opportunity_id', columnNames: ['opportunity_id'] }))
    await queryRunner.createIndex('competitor_reports', new TableIndex({ name: 'IDX_competitor_reports_competitor_name', columnNames: ['competitor_name'] }))
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('competitor_reports', true)
  }
}
