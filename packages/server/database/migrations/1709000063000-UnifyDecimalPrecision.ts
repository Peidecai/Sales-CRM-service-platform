import { MigrationInterface, QueryRunner } from 'typeorm'

/**
 * Unify all monetary / metric DECIMAL columns to DECIMAL(15,2).
 */
export class UnifyDecimalPrecision1709000063000 implements MigrationInterface {
  private readonly alterations: { table: string; column: string; oldPrecision: number }[] = [
    { table: 'opportunities', column: 'amount', oldPrecision: 12 },
    { table: 'opportunities', column: 'weighted_amount', oldPrecision: 14 },
    { table: 'customers', column: 'registered_capital', oldPrecision: 12 },
    { table: 'customers', column: 'annual_revenue', oldPrecision: 14 },
    { table: 'sales_targets', column: 'target_value', oldPrecision: 14 },
    { table: 'sales_targets', column: 'achieved_value', oldPrecision: 14 },
    { table: 'sales_forecasts', column: 'forecast_amount', oldPrecision: 14 },
    { table: 'sales_forecasts', column: 'confidence_low', oldPrecision: 14 },
    { table: 'sales_forecasts', column: 'confidence_high', oldPrecision: 14 },
    { table: 'performance_rankings', column: 'metric_value', oldPrecision: 14 },
  ]

  public async up(queryRunner: QueryRunner): Promise<void> {
    for (const { table, column } of this.alterations) {
      await queryRunner.query(
        `ALTER TABLE \`${table}\` MODIFY COLUMN \`${column}\` DECIMAL(15,2) NOT NULL DEFAULT 0`,
      )
    }
    // These two are nullable, handle separately
    await queryRunner.query(
      `ALTER TABLE \`customers\` MODIFY COLUMN \`registered_capital\` DECIMAL(15,2) NULL DEFAULT NULL`,
    )
    await queryRunner.query(
      `ALTER TABLE \`customers\` MODIFY COLUMN \`annual_revenue\` DECIMAL(15,2) NULL DEFAULT NULL`,
    )
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    for (const { table, column, oldPrecision } of this.alterations.slice().reverse()) {
      if (table === 'customers') continue // handled below
      await queryRunner.query(
        `ALTER TABLE \`${table}\` MODIFY COLUMN \`${column}\` DECIMAL(${oldPrecision},2) NOT NULL DEFAULT 0`,
      )
    }
    await queryRunner.query(
      `ALTER TABLE \`customers\` MODIFY COLUMN \`annual_revenue\` DECIMAL(14,2) NULL DEFAULT NULL`,
    )
    await queryRunner.query(
      `ALTER TABLE \`customers\` MODIFY COLUMN \`registered_capital\` DECIMAL(12,2) NULL DEFAULT NULL`,
    )
  }
}
