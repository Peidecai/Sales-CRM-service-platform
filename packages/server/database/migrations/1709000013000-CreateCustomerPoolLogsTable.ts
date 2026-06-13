import { MigrationInterface, QueryRunner, Table, TableIndex } from 'typeorm';

export class CreateCustomerPoolLogsTable1709000013000 implements MigrationInterface {
  name = 'CreateCustomerPoolLogsTable1709000013000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'customer_pool_logs',
        columns: [
          {
            name: 'id',
            type: 'int',
            isPrimary: true,
            isGenerated: true,
            generationStrategy: 'increment',
          },
          {
            name: 'customer_id',
            type: 'int',
            isNullable: false,
            comment: '客户ID',
          },
          {
            name: 'action',
            type: 'enum',
            enum: ['recycle', 'claim', 'assign', 'return'],
            isNullable: false,
            comment: '操作类型',
          },
          {
            name: 'from_user_id',
            type: 'int',
            isNullable: true,
            comment: '原负责人ID',
          },
          {
            name: 'to_user_id',
            type: 'int',
            isNullable: true,
            comment: '新负责人ID',
          },
          {
            name: 'reason',
            type: 'varchar',
            length: '500',
            isNullable: true,
            comment: '操作原因',
          },
          {
            name: 'created_at',
            type: 'datetime',
            precision: 6,
            default: 'CURRENT_TIMESTAMP(6)',
          },
          {
            name: 'updated_at',
            type: 'datetime',
            precision: 6,
            default: 'CURRENT_TIMESTAMP(6)',
            onUpdate: 'CURRENT_TIMESTAMP(6)',
          },
          {
            name: 'deleted',
            type: 'boolean',
            default: false,
          },
        ],
      }),
      true,
    );

    await queryRunner.createIndex(
      'customer_pool_logs',
      new TableIndex({ name: 'IDX_POOL_LOGS_CUSTOMER_ID', columnNames: ['customer_id'] }),
    );
    await queryRunner.createIndex(
      'customer_pool_logs',
      new TableIndex({ name: 'IDX_POOL_LOGS_ACTION', columnNames: ['action'] }),
    );
    await queryRunner.createIndex(
      'customer_pool_logs',
      new TableIndex({ name: 'IDX_POOL_LOGS_CREATED_AT', columnNames: ['created_at'] }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropIndex('customer_pool_logs', 'IDX_POOL_LOGS_CREATED_AT');
    await queryRunner.dropIndex('customer_pool_logs', 'IDX_POOL_LOGS_ACTION');
    await queryRunner.dropIndex('customer_pool_logs', 'IDX_POOL_LOGS_CUSTOMER_ID');
    await queryRunner.dropTable('customer_pool_logs');
  }
}
