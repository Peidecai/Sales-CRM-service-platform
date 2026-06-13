import { MigrationInterface, QueryRunner, Table } from 'typeorm';

export class CreateCustomerImportLogsTable1709000016000 implements MigrationInterface {
  name = 'CreateCustomerImportLogsTable1709000016000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'customer_import_logs',
        columns: [
          { name: 'id', type: 'int', isPrimary: true, isGenerated: true, generationStrategy: 'increment' },
          { name: 'user_id', type: 'int', isNullable: false, comment: '操作用户ID' },
          { name: 'file_name', type: 'varchar', length: '200', isNullable: false, comment: '文件名' },
          { name: 'total_count', type: 'int', default: 0, comment: '总行数' },
          { name: 'success_count', type: 'int', default: 0, comment: '成功数' },
          { name: 'fail_count', type: 'int', default: 0, comment: '失败数' },
          { name: 'fail_details', type: 'json', isNullable: true, comment: '失败详情([{row, reason}])' },
          { name: 'status', type: 'enum', enum: ['pending', 'processing', 'completed', 'failed'], default: "'pending'", comment: '状态' },
          { name: 'created_at', type: 'datetime', precision: 6, default: 'CURRENT_TIMESTAMP(6)' },
          { name: 'updated_at', type: 'datetime', precision: 6, default: 'CURRENT_TIMESTAMP(6)', onUpdate: 'CURRENT_TIMESTAMP(6)' },
          { name: 'deleted', type: 'boolean', default: false },
        ],
      }),
      true,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('customer_import_logs');
  }
}
