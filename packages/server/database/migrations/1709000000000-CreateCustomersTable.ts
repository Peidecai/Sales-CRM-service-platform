import { MigrationInterface, QueryRunner, Table, TableIndex } from 'typeorm';

export class CreateCustomersTable1709000000000 implements MigrationInterface {
  name = 'CreateCustomersTable1709000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'customers',
        columns: [
          {
            name: 'id',
            type: 'int',
            isPrimary: true,
            isGenerated: true,
            generationStrategy: 'increment',
          },
          {
            name: 'name',
            type: 'varchar',
            length: '100',
            isNullable: false,
          },
          {
            name: 'company',
            type: 'varchar',
            length: '200',
            isNullable: true,
          },
          {
            name: 'phone',
            type: 'varchar',
            length: '20',
            isNullable: true,
          },
          {
            name: 'email',
            type: 'varchar',
            length: '100',
            isNullable: true,
          },
          {
            name: 'status',
            type: 'enum',
            enum: ['potential', 'following', 'negotiating', 'signed', 'lost', 'inactive'],
            default: "'potential'",
          },
          {
            name: 'assigned_user_id',
            type: 'int',
            isNullable: false,
          },
          {
            name: 'notes',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'tags',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'industry',
            type: 'varchar',
            length: '50',
            isNullable: true,
          },
          {
            name: 'source',
            type: 'varchar',
            length: '20',
            isNullable: true,
          },
          {
            name: 'created_at',
            type: 'datetime',
            isNullable: false,
            default: 'CURRENT_TIMESTAMP',
          },
          {
            name: 'updated_at',
            type: 'datetime',
            isNullable: false,
            default: 'CURRENT_TIMESTAMP',
            onUpdate: 'CURRENT_TIMESTAMP',
          },
          {
            name: 'deleted',
            type: 'boolean',
            isNullable: false,
            default: false,
          },
        ],
      }),
      true,
    );

    await queryRunner.createIndex(
      'customers',
      new TableIndex({
        name: 'IDX_CUSTOMERS_ASSIGNED_USER_ID',
        columnNames: ['assigned_user_id'],
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropIndex('customers', 'IDX_CUSTOMERS_ASSIGNED_USER_ID');
    await queryRunner.dropTable('customers');
  }
}
