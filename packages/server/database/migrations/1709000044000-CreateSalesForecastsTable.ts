import { MigrationInterface, QueryRunner, Table, TableIndex } from 'typeorm'

export class CreateSalesForecastsTable1709000044000 implements MigrationInterface {
  name = 'CreateSalesForecastsTable1709000044000'

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'sales_forecasts',
        columns: [
          { name: 'id', type: 'int', isPrimary: true, isGenerated: true, generationStrategy: 'increment' },
          { name: 'period_type', type: 'enum', enum: ['1month', '3month', '6month'], isNullable: false },
          { name: 'period_value', type: 'varchar', length: '20', isNullable: false },
          { name: 'forecast_amount', type: 'decimal', precision: 14, scale: 2, isNullable: false, default: '0' },
          { name: 'confidence_low', type: 'decimal', precision: 14, scale: 2, isNullable: false, default: '0' },
          { name: 'confidence_high', type: 'decimal', precision: 14, scale: 2, isNullable: false, default: '0' },
          { name: 'assumptions', type: 'json', isNullable: true },
          { name: 'created_at', type: 'datetime', precision: 6, default: 'CURRENT_TIMESTAMP(6)' },
          { name: 'updated_at', type: 'datetime', precision: 6, default: 'CURRENT_TIMESTAMP(6)', onUpdate: 'CURRENT_TIMESTAMP(6)' },
        ],
      }),
      true,
    )

    await queryRunner.createIndex('sales_forecasts', new TableIndex({ name: 'IDX_sales_forecasts_period_type', columnNames: ['period_type'] }))
    await queryRunner.createIndex('sales_forecasts', new TableIndex({ name: 'IDX_sales_forecasts_period_value', columnNames: ['period_value'] }))
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('sales_forecasts', true)
  }
}
