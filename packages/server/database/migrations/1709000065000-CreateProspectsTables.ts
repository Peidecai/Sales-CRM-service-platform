import { MigrationInterface, QueryRunner, Table, TableIndex } from 'typeorm'

export class CreateProspectsTables1709000065000 implements MigrationInterface {
  name = 'CreateProspectsTables1709000065000'

  public async up(queryRunner: QueryRunner): Promise<void> {
    // ── prospects 表 ──
    await queryRunner.createTable(
      new Table({
        name: 'prospects',
        columns: [
          {
            name: 'id',
            type: 'int',
            isPrimary: true,
            isGenerated: true,
            generationStrategy: 'increment',
          },
          {
            name: 'company_name',
            type: 'varchar',
            length: '200',
            isNullable: false,
          },
          {
            name: 'legal_person',
            type: 'varchar',
            length: '100',
            isNullable: true,
          },
          {
            name: 'registered_capital',
            type: 'varchar',
            length: '50',
            isNullable: true,
          },
          {
            name: 'establish_date',
            type: 'varchar',
            length: '20',
            isNullable: true,
          },
          {
            name: 'industry',
            type: 'varchar',
            length: '100',
            isNullable: true,
          },
          {
            name: 'province',
            type: 'varchar',
            length: '50',
            isNullable: true,
          },
          {
            name: 'city',
            type: 'varchar',
            length: '50',
            isNullable: true,
          },
          {
            name: 'address',
            type: 'varchar',
            length: '500',
            isNullable: true,
          },
          {
            name: 'unified_credit_code',
            type: 'varchar',
            length: '50',
            isNullable: true,
          },
          {
            name: 'phone',
            type: 'varchar',
            length: '255',
            isNullable: true,
          },
          {
            name: 'email',
            type: 'varchar',
            length: '255',
            isNullable: true,
          },
          {
            name: 'website',
            type: 'varchar',
            length: '200',
            isNullable: true,
          },
          {
            name: 'employee_count',
            type: 'int',
            isNullable: true,
          },
          {
            name: 'business_scope',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'channel',
            type: 'enum',
            enum: ['tianyancha', 'qichacha', 'manual', 'mock'],
            isNullable: false,
          },
          {
            name: 'status',
            type: 'enum',
            enum: ['new', 'contacted', 'qualified', 'converted', 'rejected'],
            default: "'new'",
            isNullable: false,
          },
          {
            name: 'remark',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'assigned_user_id',
            type: 'int',
            isNullable: true,
          },
          {
            name: 'converted_customer_id',
            type: 'int',
            isNullable: true,
          },
          {
            name: 'converted_at',
            type: 'datetime',
            isNullable: true,
          },
          {
            name: 'search_batch_id',
            type: 'varchar',
            length: '50',
            isNullable: true,
          },
          {
            name: 'created_at',
            type: 'datetime',
            precision: 6,
            default: 'CURRENT_TIMESTAMP(6)',
            isNullable: false,
          },
          {
            name: 'updated_at',
            type: 'datetime',
            precision: 6,
            default: 'CURRENT_TIMESTAMP(6)',
            onUpdate: 'CURRENT_TIMESTAMP(6)',
            isNullable: false,
          },
          {
            name: 'deleted_at',
            type: 'datetime',
            precision: 6,
            isNullable: true,
          },
        ],
      }),
      true,
    )

    // 索引
    await queryRunner.createIndex(
      'prospects',
      new TableIndex({ name: 'IDX_PROSPECTS_COMPANY_NAME', columnNames: ['company_name'] }),
    )
    await queryRunner.createIndex(
      'prospects',
      new TableIndex({ name: 'IDX_PROSPECTS_INDUSTRY', columnNames: ['industry'] }),
    )
    await queryRunner.createIndex(
      'prospects',
      new TableIndex({ name: 'IDX_PROSPECTS_PROVINCE', columnNames: ['province'] }),
    )
    await queryRunner.createIndex(
      'prospects',
      new TableIndex({ name: 'IDX_PROSPECTS_CHANNEL', columnNames: ['channel'] }),
    )
    await queryRunner.createIndex(
      'prospects',
      new TableIndex({ name: 'IDX_PROSPECTS_STATUS', columnNames: ['status'] }),
    )
    await queryRunner.createIndex(
      'prospects',
      new TableIndex({ name: 'IDX_PROSPECTS_ASSIGNED_USER_ID', columnNames: ['assigned_user_id'] }),
    )
    await queryRunner.createIndex(
      'prospects',
      new TableIndex({ name: 'IDX_PROSPECTS_UNIFIED_CREDIT_CODE', columnNames: ['unified_credit_code'] }),
    )
    await queryRunner.createIndex(
      'prospects',
      new TableIndex({ name: 'IDX_PROSPECTS_SEARCH_BATCH_ID', columnNames: ['search_batch_id'] }),
    )
    // 联合唯一索引：同数据源 + 统一社会信用代码 防重复
    await queryRunner.createIndex(
      'prospects',
      new TableIndex({
        name: 'UQ_PROSPECTS_CREDIT_CODE_CHANNEL',
        columnNames: ['unified_credit_code', 'channel'],
        isUnique: true,
      }),
    )

    // ── prospect_search_logs 表 ──
    await queryRunner.createTable(
      new Table({
        name: 'prospect_search_logs',
        columns: [
          {
            name: 'id',
            type: 'int',
            isPrimary: true,
            isGenerated: true,
            generationStrategy: 'increment',
          },
          {
            name: 'user_id',
            type: 'int',
            isNullable: false,
          },
          {
            name: 'channel',
            type: 'enum',
            enum: ['tianyancha', 'qichacha', 'manual', 'mock'],
            isNullable: false,
          },
          {
            name: 'query',
            type: 'json',
            isNullable: false,
          },
          {
            name: 'result_count',
            type: 'int',
            default: 0,
            isNullable: false,
          },
          {
            name: 'imported_count',
            type: 'int',
            default: 0,
            isNullable: false,
          },
          {
            name: 'cost',
            type: 'decimal',
            precision: 10,
            scale: 4,
            default: 0,
            isNullable: false,
          },
          {
            name: 'status',
            type: 'varchar',
            length: '20',
            default: "'completed'",
            isNullable: false,
          },
          {
            name: 'created_at',
            type: 'datetime',
            precision: 6,
            default: 'CURRENT_TIMESTAMP(6)',
            isNullable: false,
          },
          {
            name: 'updated_at',
            type: 'datetime',
            precision: 6,
            default: 'CURRENT_TIMESTAMP(6)',
            onUpdate: 'CURRENT_TIMESTAMP(6)',
            isNullable: false,
          },
          {
            name: 'deleted_at',
            type: 'datetime',
            precision: 6,
            isNullable: true,
          },
        ],
      }),
      true,
    )

    await queryRunner.createIndex(
      'prospect_search_logs',
      new TableIndex({ name: 'IDX_PROSPECT_SEARCH_LOGS_USER_ID', columnNames: ['user_id'] }),
    )
    await queryRunner.createIndex(
      'prospect_search_logs',
      new TableIndex({ name: 'IDX_PROSPECT_SEARCH_LOGS_CREATED_AT', columnNames: ['created_at'] }),
    )
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop search logs table
    await queryRunner.dropIndex('prospect_search_logs', 'IDX_PROSPECT_SEARCH_LOGS_CREATED_AT')
    await queryRunner.dropIndex('prospect_search_logs', 'IDX_PROSPECT_SEARCH_LOGS_USER_ID')
    await queryRunner.dropTable('prospect_search_logs')

    // Drop prospects table
    await queryRunner.dropIndex('prospects', 'UQ_PROSPECTS_CREDIT_CODE_CHANNEL')
    await queryRunner.dropIndex('prospects', 'IDX_PROSPECTS_SEARCH_BATCH_ID')
    await queryRunner.dropIndex('prospects', 'IDX_PROSPECTS_UNIFIED_CREDIT_CODE')
    await queryRunner.dropIndex('prospects', 'IDX_PROSPECTS_ASSIGNED_USER_ID')
    await queryRunner.dropIndex('prospects', 'IDX_PROSPECTS_STATUS')
    await queryRunner.dropIndex('prospects', 'IDX_PROSPECTS_CHANNEL')
    await queryRunner.dropIndex('prospects', 'IDX_PROSPECTS_PROVINCE')
    await queryRunner.dropIndex('prospects', 'IDX_PROSPECTS_INDUSTRY')
    await queryRunner.dropIndex('prospects', 'IDX_PROSPECTS_COMPANY_NAME')
    await queryRunner.dropTable('prospects')
  }
}
