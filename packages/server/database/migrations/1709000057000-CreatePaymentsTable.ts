import { MigrationInterface, QueryRunner, Table, TableIndex } from 'typeorm'

export class CreatePaymentsTable1709000057000 implements MigrationInterface {
  name = 'CreatePaymentsTable1709000057000'

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'payments',
        columns: [
          {
            name: 'id',
            type: 'int',
            isPrimary: true,
            isGenerated: true,
            generationStrategy: 'increment',
          },
          {
            name: 'payment_no',
            type: 'varchar',
            length: '32',
            isNullable: false,
            isUnique: true,
            comment: '回款编号，格式 PAY-YYYYMMDD-XXXX',
          },
          {
            name: 'contract_id',
            type: 'int',
            isNullable: false,
            comment: '合同ID',
          },
          {
            name: 'opportunity_id',
            type: 'int',
            isNullable: true,
            comment: '商机ID',
          },
          {
            name: 'customer_id',
            type: 'int',
            isNullable: false,
            comment: '客户ID',
          },
          {
            name: 'owner_id',
            type: 'int',
            isNullable: false,
            comment: '负责人ID',
          },
          {
            name: 'period_no',
            type: 'int',
            isNullable: true,
            comment: '分期期号',
          },
          {
            name: 'planned_amount',
            type: 'decimal',
            precision: 15,
            scale: 2,
            isNullable: true,
            comment: '计划回款金额',
          },
          {
            name: 'actual_amount',
            type: 'decimal',
            precision: 15,
            scale: 2,
            isNullable: true,
            comment: '实际回款金额',
          },
          {
            name: 'planned_date',
            type: 'date',
            isNullable: true,
            comment: '计划回款日期',
          },
          {
            name: 'actual_date',
            type: 'date',
            isNullable: true,
            comment: '实际回款日期',
          },
          {
            name: 'payment_method',
            type: 'enum',
            enum: ['bank_transfer', 'check', 'cash', 'credit_card', 'other'],
            isNullable: true,
            comment: '回款方式',
          },
          {
            name: 'bank_transaction_no',
            type: 'varchar',
            length: '100',
            isNullable: true,
            comment: '银行流水号',
          },
          {
            name: 'invoice_no',
            type: 'varchar',
            length: '50',
            isNullable: true,
            comment: '发票号',
          },
          {
            name: 'is_overdue',
            type: 'boolean',
            default: false,
            isNullable: false,
            comment: '是否逾期',
          },
          {
            name: 'overdue_days',
            type: 'int',
            default: 0,
            isNullable: false,
            comment: '逾期天数',
          },
          {
            name: 'status',
            type: 'enum',
            enum: ['planned', 'pending_confirm', 'confirmed', 'cancelled', 'bad_debt'],
            default: "'planned'",
            isNullable: false,
            comment: '回款状态',
          },
          {
            name: 'confirm_user_id',
            type: 'int',
            isNullable: true,
            comment: '确认人ID',
          },
          {
            name: 'confirmed_at',
            type: 'datetime',
            isNullable: true,
            comment: '确认时间',
          },
          {
            name: 'remark',
            type: 'text',
            isNullable: true,
            comment: '备注',
          },
          {
            name: 'attachments',
            type: 'json',
            isNullable: true,
            comment: '附件列表',
          },
          {
            name: 'created_by',
            type: 'int',
            isNullable: false,
            comment: '创建人ID',
          },
          {
            name: 'created_at',
            type: 'datetime',
            default: 'CURRENT_TIMESTAMP',
          },
          {
            name: 'updated_at',
            type: 'datetime',
            default: 'CURRENT_TIMESTAMP',
            onUpdate: 'CURRENT_TIMESTAMP',
          },
          {
            name: 'deleted',
            type: 'boolean',
            default: false,
          },
        ],
      }),
      true,
    )

    await queryRunner.createIndex(
      'payments',
      new TableIndex({
        name: 'IDX_payments_contract_id',
        columnNames: ['contract_id'],
      }),
    )

    await queryRunner.createIndex(
      'payments',
      new TableIndex({
        name: 'IDX_payments_customer_id',
        columnNames: ['customer_id'],
      }),
    )

    await queryRunner.createIndex(
      'payments',
      new TableIndex({
        name: 'IDX_payments_owner_id',
        columnNames: ['owner_id'],
      }),
    )

    await queryRunner.createIndex(
      'payments',
      new TableIndex({
        name: 'IDX_payments_status',
        columnNames: ['status'],
      }),
    )

    await queryRunner.createIndex(
      'payments',
      new TableIndex({
        name: 'IDX_payments_planned_date',
        columnNames: ['planned_date'],
      }),
    )

    await queryRunner.createIndex(
      'payments',
      new TableIndex({
        name: 'IDX_payments_opportunity_id',
        columnNames: ['opportunity_id'],
      }),
    )
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('payments', true)
  }
}
