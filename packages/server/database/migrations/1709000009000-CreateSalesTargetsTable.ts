import { MigrationInterface, QueryRunner, Table, TableIndex } from 'typeorm'

export class CreateSalesTargetsTable1709000009000 implements MigrationInterface {
  name = 'CreateSalesTargetsTable1709000009000'

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'sales_targets',
        columns: [
          { name: 'id', type: 'int', isPrimary: true, isGenerated: true, generationStrategy: 'increment' },
          { name: 'name', type: 'varchar', length: '200', isNullable: false },
          { name: 'scope', type: 'enum', enum: ['company', 'team', 'individual'], isNullable: false },
          { name: 'period', type: 'enum', enum: ['year', 'quarter', 'month'], isNullable: false },
          { name: 'metric_type', type: 'enum', enum: ['revenue', 'deal_count', 'new_customer', 'call_count'], isNullable: false },
          { name: 'target_value', type: 'decimal', precision: 14, scale: 2, default: '0', isNullable: false },
          { name: 'achieved_value', type: 'decimal', precision: 14, scale: 2, default: '0', isNullable: false },
          { name: 'year', type: 'int', isNullable: false },
          { name: 'quarter', type: 'int', isNullable: true, comment: '1-4, null when period=year' },
          { name: 'month', type: 'int', isNullable: true, comment: '1-12, null when period!=month' },
          { name: 'start_date', type: 'date', isNullable: false },
          { name: 'end_date', type: 'date', isNullable: false },
          { name: 'assigned_user_id', type: 'int', isNullable: true, comment: 'Owner for individual targets' },
          { name: 'team_id', type: 'varchar', length: '100', isNullable: true, comment: 'Team identifier for team-level targets' },
          { name: 'parent_target_id', type: 'int', isNullable: true, comment: 'Parent target for decomposed children' },
          { name: 'created_at', type: 'datetime', default: 'CURRENT_TIMESTAMP' },
          { name: 'updated_at', type: 'datetime', default: 'CURRENT_TIMESTAMP', onUpdate: 'CURRENT_TIMESTAMP' },
          { name: 'deleted', type: 'boolean', default: false },
        ],
      }),
      true,
    )

    // Composite index for fast lookups by scope + period + year
    await queryRunner.createIndex(
      'sales_targets',
      new TableIndex({
        name: 'IDX_sales_targets_scope_period_year',
        columnNames: ['scope', 'period', 'year'],
      }),
    )

    await queryRunner.createIndex(
      'sales_targets',
      new TableIndex({
        name: 'IDX_sales_targets_assigned_user_id',
        columnNames: ['assigned_user_id'],
      }),
    )

    await queryRunner.createIndex(
      'sales_targets',
      new TableIndex({
        name: 'IDX_sales_targets_parent_target_id',
        columnNames: ['parent_target_id'],
      }),
    )

    await queryRunner.createIndex(
      'sales_targets',
      new TableIndex({
        name: 'IDX_sales_targets_metric_type',
        columnNames: ['metric_type'],
      }),
    )
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('sales_targets', true)
  }
}
