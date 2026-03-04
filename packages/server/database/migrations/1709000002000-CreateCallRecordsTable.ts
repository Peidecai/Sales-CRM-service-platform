import { MigrationInterface, QueryRunner, Table, TableIndex } from 'typeorm';

export class CreateCallRecordsTable1709000002000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'call_records',
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
          },
          {
            name: 'opportunity_id',
            type: 'int',
            isNullable: true,
          },
          {
            name: 'user_id',
            type: 'int',
            isNullable: false,
            comment: 'Caller user ID',
          },
          {
            name: 'call_at',
            type: 'datetime',
            isNullable: false,
          },
          {
            name: 'duration',
            type: 'int',
            default: 0,
            comment: 'Duration in seconds',
          },
          {
            name: 'notes',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'ai_summary',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'recording_url',
            type: 'varchar',
            length: '500',
            isNullable: true,
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
    );

    await queryRunner.createIndex(
      'call_records',
      new TableIndex({
        name: 'IDX_call_records_customer_id',
        columnNames: ['customer_id'],
      }),
    );

    await queryRunner.createIndex(
      'call_records',
      new TableIndex({
        name: 'IDX_call_records_user_id',
        columnNames: ['user_id'],
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropIndex('call_records', 'IDX_call_records_user_id');
    await queryRunner.dropIndex('call_records', 'IDX_call_records_customer_id');
    await queryRunner.dropTable('call_records');
  }
}
