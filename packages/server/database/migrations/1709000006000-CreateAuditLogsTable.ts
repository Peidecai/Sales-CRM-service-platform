import { MigrationInterface, QueryRunner, Table, TableIndex } from 'typeorm'

export class CreateAuditLogsTable1709000006000 implements MigrationInterface {
  name = 'CreateAuditLogsTable1709000006000'

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'audit_logs',
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
            name: 'username',
            type: 'varchar',
            length: '50',
            isNullable: false,
          },
          {
            name: 'action',
            type: 'enum',
            enum: ['CREATE', 'UPDATE', 'DELETE'],
            isNullable: false,
          },
          {
            name: 'resource',
            type: 'varchar',
            length: '50',
            isNullable: false,
          },
          {
            name: 'resource_id',
            type: 'int',
            isNullable: true,
          },
          {
            name: 'before',
            type: 'json',
            isNullable: true,
          },
          {
            name: 'after',
            type: 'json',
            isNullable: true,
          },
          {
            name: 'ip',
            type: 'varchar',
            length: '50',
            isNullable: true,
          },
          {
            name: 'created_at',
            type: 'datetime',
            isNullable: false,
            default: 'CURRENT_TIMESTAMP',
          },
        ],
      }),
      true,
    )

    await queryRunner.createIndex(
      'audit_logs',
      new TableIndex({
        name: 'IDX_AUDIT_LOGS_USER_ID',
        columnNames: ['user_id'],
      }),
    )

    await queryRunner.createIndex(
      'audit_logs',
      new TableIndex({
        name: 'IDX_AUDIT_LOGS_RESOURCE',
        columnNames: ['resource'],
      }),
    )

    await queryRunner.createIndex(
      'audit_logs',
      new TableIndex({
        name: 'IDX_AUDIT_LOGS_CREATED_AT',
        columnNames: ['created_at'],
      }),
    )
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropIndex('audit_logs', 'IDX_AUDIT_LOGS_CREATED_AT')
    await queryRunner.dropIndex('audit_logs', 'IDX_AUDIT_LOGS_RESOURCE')
    await queryRunner.dropIndex('audit_logs', 'IDX_AUDIT_LOGS_USER_ID')
    await queryRunner.dropTable('audit_logs')
  }
}
