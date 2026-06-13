import { MigrationInterface, QueryRunner, Table, TableIndex } from 'typeorm';

export class CreateOpportunitiesTable1709000001000 implements MigrationInterface {
  name = 'CreateOpportunitiesTable1709000001000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'opportunities',
        columns: [
          {
            name: 'id',
            type: 'int',
            isPrimary: true,
            isGenerated: true,
            generationStrategy: 'increment',
          },
          {
            name: 'title',
            type: 'varchar',
            length: '200',
            isNullable: false,
          },
          {
            name: 'customer_id',
            type: 'int',
            isNullable: false,
          },
          {
            name: 'stage',
            type: 'enum',
            enum: ['lead', 'qualified', 'proposal', 'negotiation', 'closed_won', 'closed_lost'],
            default: "'lead'",
          },
          {
            name: 'amount',
            type: 'decimal',
            precision: 12,
            scale: 2,
            default: 0,
          },
          {
            name: 'expected_close_date',
            type: 'date',
            isNullable: true,
          },
          {
            name: 'probability',
            type: 'int',
            default: 10,
          },
          {
            name: 'assigned_user_id',
            type: 'int',
            isNullable: false,
          },
          {
            name: 'description',
            type: 'text',
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
      'opportunities',
      new TableIndex({
        name: 'IDX_OPPORTUNITIES_CUSTOMER_ID',
        columnNames: ['customer_id'],
      }),
    );

    await queryRunner.createIndex(
      'opportunities',
      new TableIndex({
        name: 'IDX_OPPORTUNITIES_ASSIGNED_USER_ID',
        columnNames: ['assigned_user_id'],
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropIndex('opportunities', 'IDX_OPPORTUNITIES_ASSIGNED_USER_ID');
    await queryRunner.dropIndex('opportunities', 'IDX_OPPORTUNITIES_CUSTOMER_ID');
    await queryRunner.dropTable('opportunities');
  }
}
