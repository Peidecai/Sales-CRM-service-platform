import { MigrationInterface, QueryRunner, Table, TableIndex } from 'typeorm'

export class CreateCustomerProfilesTable1709000040000 implements MigrationInterface {
  name = 'CreateCustomerProfilesTable1709000040000'

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'customer_profiles',
        columns: [
          { name: 'id', type: 'int', isPrimary: true, isGenerated: true, generationStrategy: 'increment' },
          { name: 'customer_id', type: 'int', isNullable: false },
          { name: 'disc_type', type: 'varchar', length: '20', isNullable: true },
          { name: 'disc_scores', type: 'json', isNullable: true, comment: '{ D: number, I: number, S: number, C: number }' },
          { name: 'communication_style', type: 'text', isNullable: true },
          { name: 'pain_points', type: 'json', isNullable: true },
          { name: 'health_score', type: 'decimal', precision: 5, scale: 2, isNullable: true },
          { name: 'raw_analysis', type: 'json', isNullable: true },
          { name: 'created_at', type: 'datetime', precision: 6, default: 'CURRENT_TIMESTAMP(6)' },
          { name: 'updated_at', type: 'datetime', precision: 6, default: 'CURRENT_TIMESTAMP(6)', onUpdate: 'CURRENT_TIMESTAMP(6)' },
        ],
      }),
      true,
    )

    await queryRunner.createIndex('customer_profiles', new TableIndex({ name: 'IDX_customer_profiles_customer_id', columnNames: ['customer_id'], isUnique: true }))
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('customer_profiles', true)
  }
}
