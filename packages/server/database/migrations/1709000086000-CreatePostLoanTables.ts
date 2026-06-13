import { MigrationInterface, QueryRunner, Table, TableIndex } from 'typeorm'

export class CreatePostLoanTables1709000086000 implements MigrationInterface {
  name = 'CreatePostLoanTables1709000086000'

  public async up(queryRunner: QueryRunner): Promise<void> {
    // ── post_loans table ──
    await queryRunner.createTable(
      new Table({
        name: 'post_loans',
        columns: [
          {
            name: 'id',
            type: 'int',
            isPrimary: true,
            isGenerated: true,
            generationStrategy: 'increment',
          },
          { name: 'contract_id', type: 'int', isNullable: false },
          { name: 'customer_id', type: 'int', isNullable: false },
          { name: 'loan_amount', type: 'decimal', precision: 15, scale: 2, isNullable: false },
          { name: 'disbursed_at', type: 'datetime', isNullable: false },
          {
            name: 'status',
            type: 'enum',
            enum: ['normal', 'overdue', 'settled', 'bad_debt'],
            default: "'normal'",
            isNullable: false,
          },
          { name: 'credit_rating', type: 'varchar', length: '10', isNullable: true },
          { name: 'created_by', type: 'int', isNullable: false },
          {
            name: 'created_at',
            type: 'timestamp',
            precision: 6,
            default: 'CURRENT_TIMESTAMP(6)',
            isNullable: false,
          },
          {
            name: 'updated_at',
            type: 'timestamp',
            precision: 6,
            default: 'CURRENT_TIMESTAMP(6)',
            onUpdate: 'CURRENT_TIMESTAMP(6)',
            isNullable: false,
          },
          { name: 'deleted_at', type: 'timestamp', precision: 6, isNullable: true },
        ],
      }),
      true,
    )

    await queryRunner.createIndex(
      'post_loans',
      new TableIndex({ name: 'IDX_pl_contract', columnNames: ['contract_id'] }),
    )
    await queryRunner.createIndex(
      'post_loans',
      new TableIndex({ name: 'IDX_pl_customer', columnNames: ['customer_id'] }),
    )
    await queryRunner.createIndex(
      'post_loans',
      new TableIndex({ name: 'IDX_pl_status', columnNames: ['status'] }),
    )

    // ── repayment_plans table ──
    await queryRunner.createTable(
      new Table({
        name: 'repayment_plans',
        columns: [
          {
            name: 'id',
            type: 'int',
            isPrimary: true,
            isGenerated: true,
            generationStrategy: 'increment',
          },
          { name: 'post_loan_id', type: 'int', isNullable: false },
          { name: 'period', type: 'int', isNullable: false },
          { name: 'due_date', type: 'date', isNullable: false },
          { name: 'amount', type: 'decimal', precision: 15, scale: 2, isNullable: false },
          { name: 'paid_amount', type: 'decimal', precision: 15, scale: 2, default: 0, isNullable: false },
          { name: 'paid_at', type: 'datetime', isNullable: true },
          {
            name: 'status',
            type: 'enum',
            enum: ['pending', 'paid', 'overdue', 'partial'],
            default: "'pending'",
            isNullable: false,
          },
          {
            name: 'created_at',
            type: 'timestamp',
            precision: 6,
            default: 'CURRENT_TIMESTAMP(6)',
            isNullable: false,
          },
          {
            name: 'updated_at',
            type: 'timestamp',
            precision: 6,
            default: 'CURRENT_TIMESTAMP(6)',
            onUpdate: 'CURRENT_TIMESTAMP(6)',
            isNullable: false,
          },
          { name: 'deleted_at', type: 'timestamp', precision: 6, isNullable: true },
        ],
      }),
      true,
    )

    await queryRunner.createIndex(
      'repayment_plans',
      new TableIndex({ name: 'IDX_rp_post_loan', columnNames: ['post_loan_id'] }),
    )
    await queryRunner.createIndex(
      'repayment_plans',
      new TableIndex({ name: 'IDX_rp_due_date', columnNames: ['due_date'] }),
    )
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropIndex('repayment_plans', 'IDX_rp_due_date')
    await queryRunner.dropIndex('repayment_plans', 'IDX_rp_post_loan')
    await queryRunner.dropTable('repayment_plans')

    await queryRunner.dropIndex('post_loans', 'IDX_pl_status')
    await queryRunner.dropIndex('post_loans', 'IDX_pl_customer')
    await queryRunner.dropIndex('post_loans', 'IDX_pl_contract')
    await queryRunner.dropTable('post_loans')
  }
}
