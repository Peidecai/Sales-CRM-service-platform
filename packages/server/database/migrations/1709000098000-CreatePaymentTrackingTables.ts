import { MigrationInterface, QueryRunner, Table, TableIndex } from 'typeorm'

export class CreatePaymentPlans1709000098000 implements MigrationInterface {
  name = 'CreatePaymentPlans1709000098000'
  public async up(queryRunner: QueryRunner): Promise<void> {
    if (!(await queryRunner.hasTable('payment_plans'))) {
      await queryRunner.createTable(new Table({
        name: 'payment_plans',
        columns: [
          { name: 'id', type: 'int', isPrimary: true, isGenerated: true, generationStrategy: 'increment' },
          { name: 'contract_id', type: 'int' },
          { name: 'plan_name', type: 'varchar', length: '100' },
          { name: 'total_installments', type: 'int', default: 1 },
          { name: 'total_amount', type: 'decimal', precision: 12, scale: 2 },
          { name: 'split_method', type: 'varchar', length: '30', default: "'equal'" },
          { name: 'sales_user_id', type: 'int' },
          { name: 'created_at', type: 'datetime', precision: 6, default: 'CURRENT_TIMESTAMP(6)' },
          { name: 'updated_at', type: 'datetime', precision: 6, default: 'CURRENT_TIMESTAMP(6)', onUpdate: 'CURRENT_TIMESTAMP(6)' },
          { name: 'deleted_at', type: 'datetime', precision: 6, isNullable: true },
        ],
      }), true)
      await queryRunner.createIndices('payment_plans', [
        new TableIndex({ name: 'IDX_pp_contract', columnNames: ['contract_id'] }),
        new TableIndex({ name: 'IDX_pp_sales_user', columnNames: ['sales_user_id'] }),
      ])
    }
    if (!(await queryRunner.hasTable('payment_plan_items'))) {
      await queryRunner.createTable(new Table({
        name: 'payment_plan_items',
        columns: [
          { name: 'id', type: 'int', isPrimary: true, isGenerated: true, generationStrategy: 'increment' },
          { name: 'plan_id', type: 'int' },
          { name: 'installment_no', type: 'int' },
          { name: 'amount', type: 'decimal', precision: 12, scale: 2 },
          { name: 'due_date', type: 'date' },
          { name: 'paid_amount', type: 'decimal', precision: 12, scale: 2, default: 0 },
          { name: 'paid_at', type: 'datetime', isNullable: true },
          { name: 'status', type: 'varchar', length: '30', default: "'pending'" },
          { name: 'remark', type: 'varchar', length: '500', isNullable: true },
          { name: 'created_at', type: 'datetime', precision: 6, default: 'CURRENT_TIMESTAMP(6)' },
          { name: 'updated_at', type: 'datetime', precision: 6, default: 'CURRENT_TIMESTAMP(6)', onUpdate: 'CURRENT_TIMESTAMP(6)' },
          { name: 'deleted_at', type: 'datetime', precision: 6, isNullable: true },
        ],
      }), true)
      await queryRunner.createIndices('payment_plan_items', [
        new TableIndex({ name: 'IDX_ppi_plan', columnNames: ['plan_id'] }),
        new TableIndex({ name: 'IDX_ppi_due_date', columnNames: ['due_date'] }),
        new TableIndex({ name: 'IDX_ppi_status', columnNames: ['status'] }),
      ])
    }
    if (!(await queryRunner.hasTable('bank_statements'))) {
      await queryRunner.createTable(new Table({
        name: 'bank_statements',
        columns: [
          { name: 'id', type: 'int', isPrimary: true, isGenerated: true, generationStrategy: 'increment' },
          { name: 'transaction_date', type: 'date' },
          { name: 'amount', type: 'decimal', precision: 12, scale: 2 },
          { name: 'payer_name', type: 'varchar', length: '200' },
          { name: 'payer_account', type: 'varchar', length: '100', isNullable: true },
          { name: 'reference', type: 'varchar', length: '500', isNullable: true },
          { name: 'matched_plan_item_id', type: 'int', isNullable: true },
          { name: 'match_status', type: 'varchar', length: '30', default: "'unmatched'" },
          { name: 'imported_by_id', type: 'int' },
          { name: 'created_at', type: 'datetime', precision: 6, default: 'CURRENT_TIMESTAMP(6)' },
          { name: 'updated_at', type: 'datetime', precision: 6, default: 'CURRENT_TIMESTAMP(6)', onUpdate: 'CURRENT_TIMESTAMP(6)' },
          { name: 'deleted_at', type: 'datetime', precision: 6, isNullable: true },
        ],
      }), true)
      await queryRunner.createIndices('bank_statements', [
        new TableIndex({ name: 'IDX_bs_transaction_date', columnNames: ['transaction_date'] }),
        new TableIndex({ name: 'IDX_bs_match_status', columnNames: ['match_status'] }),
      ])
    }
  }
  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('bank_statements', true)
    await queryRunner.dropTable('payment_plan_items', true)
    await queryRunner.dropTable('payment_plans', true)
  }
}
