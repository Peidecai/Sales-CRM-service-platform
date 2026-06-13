import { MigrationInterface, QueryRunner, Table, TableIndex } from 'typeorm'

export class CreateContractsTable1709000056000 implements MigrationInterface {
  name = 'CreateContractsTable1709000056000'

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'contracts',
        columns: [
          {
            name: 'id',
            type: 'int',
            isPrimary: true,
            isGenerated: true,
            generationStrategy: 'increment',
          },
          {
            name: 'contract_no',
            type: 'varchar',
            length: '32',
            isUnique: true,
            comment: '合同编号 CON-YYYYMMDD-XXXX',
          },
          {
            name: 'title',
            type: 'varchar',
            length: '200',
            comment: '合同标题',
          },
          {
            name: 'contract_type',
            type: 'enum',
            enum: ['sales', 'service', 'framework', 'supplement'],
            default: "'sales'",
            comment: '合同类型',
          },
          {
            name: 'opportunity_id',
            type: 'int',
            isNullable: true,
            comment: '关联商机ID',
          },
          {
            name: 'quotation_id',
            type: 'int',
            isNullable: true,
            comment: '关联报价单ID',
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
            name: 'our_entity',
            type: 'varchar',
            length: '100',
            comment: '我方签约主体',
          },
          {
            name: 'customer_entity',
            type: 'varchar',
            length: '100',
            comment: '客户签约主体',
          },
          {
            name: 'currency',
            type: 'varchar',
            length: '3',
            default: "'CNY'",
            comment: '币种',
          },
          {
            name: 'total_amount',
            type: 'decimal',
            precision: 15,
            scale: 2,
            comment: '合同总金额',
          },
          {
            name: 'paid_amount',
            type: 'decimal',
            precision: 15,
            scale: 2,
            default: 0,
            comment: '已付金额',
          },
          {
            name: 'start_date',
            type: 'date',
            comment: '合同开始日期',
          },
          {
            name: 'end_date',
            type: 'date',
            comment: '合同结束日期',
          },
          {
            name: 'sign_date',
            type: 'date',
            isNullable: true,
            comment: '签署日期',
          },
          {
            name: 'payment_terms',
            type: 'text',
            isNullable: true,
            comment: '付款条款',
          },
          {
            name: 'delivery_terms',
            type: 'text',
            isNullable: true,
            comment: '交付条款',
          },
          {
            name: 'status',
            type: 'enum',
            enum: [
              'draft',
              'pending_approval',
              'approved',
              'rejected',
              'pending_sign',
              'signed',
              'executing',
              'completed',
              'terminated',
              'cancelled',
            ],
            default: "'draft'",
            comment: '合同状态',
          },
          {
            name: 'sign_file_url',
            type: 'varchar',
            length: '500',
            isNullable: true,
            comment: '签署文件URL',
          },
          {
            name: 'renewal_reminder_days',
            type: 'int',
            default: 30,
            comment: '续签提醒天数',
          },
          {
            name: 'parent_contract_id',
            type: 'int',
            isNullable: true,
            comment: '父合同ID（补充协议）',
          },
          {
            name: 'attachments',
            type: 'json',
            isNullable: true,
            comment: '附件列表',
          },
          {
            name: 'custom_fields',
            type: 'json',
            isNullable: true,
            comment: '自定义字段',
          },
          {
            name: 'created_by',
            type: 'int',
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

    // Index: customer_id
    await queryRunner.createIndex(
      'contracts',
      new TableIndex({
        name: 'IDX_contracts_customer_id',
        columnNames: ['customer_id'],
      }),
    )

    // Index: opportunity_id
    await queryRunner.createIndex(
      'contracts',
      new TableIndex({
        name: 'IDX_contracts_opportunity_id',
        columnNames: ['opportunity_id'],
      }),
    )

    // Index: owner_id
    await queryRunner.createIndex(
      'contracts',
      new TableIndex({
        name: 'IDX_contracts_owner_id',
        columnNames: ['owner_id'],
      }),
    )

    // Index: status
    await queryRunner.createIndex(
      'contracts',
      new TableIndex({
        name: 'IDX_contracts_status',
        columnNames: ['status'],
      }),
    )

    // Index: end_date (for expiry queries)
    await queryRunner.createIndex(
      'contracts',
      new TableIndex({
        name: 'IDX_contracts_end_date',
        columnNames: ['end_date'],
      }),
    )
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('contracts', true, true, true)
  }
}
