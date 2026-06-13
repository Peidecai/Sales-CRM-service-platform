import { MigrationInterface, QueryRunner, Table, TableIndex } from 'typeorm'

export class CreatePerformanceRankingsTable1709000010000 implements MigrationInterface {
  name = 'CreatePerformanceRankingsTable1709000010000'

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'performance_rankings',
        columns: [
          { name: 'id', type: 'int', isPrimary: true, isGenerated: true, generationStrategy: 'increment' },
          { name: 'user_id', type: 'int', isNullable: false },
          { name: 'user_name', type: 'varchar', length: '100', isNullable: false },
          { name: 'period', type: 'enum', enum: ['year', 'quarter', 'month'], isNullable: false },
          { name: 'metric_type', type: 'enum', enum: ['revenue', 'deal_count', 'new_customer', 'call_count'], isNullable: false },
          { name: 'metric_value', type: 'decimal', precision: 14, scale: 2, default: '0', isNullable: false },
          { name: 'rank', type: 'int', isNullable: false },
          { name: 'snapshot_date', type: 'date', isNullable: false },
          { name: 'scope', type: 'enum', enum: ['company', 'team', 'individual'], default: "'company'", isNullable: false },
          { name: 'year', type: 'int', isNullable: false },
          { name: 'quarter', type: 'int', isNullable: true },
          { name: 'month', type: 'int', isNullable: true },
          { name: 'created_at', type: 'datetime', default: 'CURRENT_TIMESTAMP' },
        ],
      }),
      true,
    )

    await queryRunner.createIndex(
      'performance_rankings',
      new TableIndex({
        name: 'IDX_rankings_period_metric_date',
        columnNames: ['period', 'metric_type', 'snapshot_date'],
      }),
    )

    await queryRunner.createIndex(
      'performance_rankings',
      new TableIndex({
        name: 'IDX_rankings_user_id',
        columnNames: ['user_id'],
      }),
    )

    await queryRunner.createIndex(
      'performance_rankings',
      new TableIndex({
        name: 'IDX_rankings_year_quarter_month',
        columnNames: ['year', 'quarter', 'month'],
      }),
    )
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('performance_rankings', true)
  }
}
