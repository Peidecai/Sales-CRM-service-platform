import { MigrationInterface, QueryRunner, Table, TableIndex } from 'typeorm'

export class CreateEmployeeBadgeTable1709000099000 implements MigrationInterface {
  name = 'CreateEmployeeBadgeTable1709000099000'

  public async up(queryRunner: QueryRunner): Promise<void> {
    const exists = await queryRunner.hasTable('employee_badges')
    if (exists) return

    await queryRunner.createTable(
      new Table({
        name: 'employee_badges',
        columns: [
          { name: 'id', type: 'int', isPrimary: true, isGenerated: true, generationStrategy: 'increment' },
          { name: 'user_id', type: 'int' },
          { name: 'badge_type', type: 'varchar', length: '50' },
          { name: 'earned_at', type: 'datetime', precision: 6 },
          { name: 'month', type: 'varchar', length: '7', isNullable: true },
          { name: 'created_at', type: 'datetime', precision: 6, default: 'CURRENT_TIMESTAMP(6)' },
          { name: 'updated_at', type: 'datetime', precision: 6, default: 'CURRENT_TIMESTAMP(6)' },
          { name: 'deleted_at', type: 'datetime', precision: 6, isNullable: true },
        ],
      }),
      true,
    )

    await queryRunner.createIndex(
      'employee_badges',
      new TableIndex({ columnNames: ['user_id'] }),
    )
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('employee_badges', true)
  }
}
