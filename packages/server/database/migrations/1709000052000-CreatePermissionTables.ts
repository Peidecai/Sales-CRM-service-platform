import { MigrationInterface, QueryRunner, Table, TableIndex, TableForeignKey } from 'typeorm'

export class CreatePermissionTables1709000052000 implements MigrationInterface {
  name = 'CreatePermissionTables1709000052000'

  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1. sys_roles
    await queryRunner.createTable(
      new Table({
        name: 'sys_roles',
        columns: [
          { name: 'id', type: 'int', isPrimary: true, isGenerated: true, generationStrategy: 'increment' },
          { name: 'name', type: 'varchar', length: '100', isNullable: false },
          { name: 'code', type: 'varchar', length: '50', isNullable: false, isUnique: true },
          { name: 'description', type: 'varchar', length: '255', isNullable: true },
          { name: 'created_at', type: 'datetime', default: 'CURRENT_TIMESTAMP' },
          { name: 'updated_at', type: 'datetime', default: 'CURRENT_TIMESTAMP', onUpdate: 'CURRENT_TIMESTAMP' },
        ],
      }),
      true,
    )

    // 2. sys_permissions
    await queryRunner.createTable(
      new Table({
        name: 'sys_permissions',
        columns: [
          { name: 'id', type: 'int', isPrimary: true, isGenerated: true, generationStrategy: 'increment' },
          { name: 'name', type: 'varchar', length: '100', isNullable: false },
          { name: 'code', type: 'varchar', length: '100', isNullable: false, isUnique: true },
          { name: 'resource', type: 'varchar', length: '50', isNullable: false },
          { name: 'action', type: 'varchar', length: '50', isNullable: false },
          { name: 'created_at', type: 'datetime', default: 'CURRENT_TIMESTAMP' },
        ],
      }),
      true,
    )

    // 3. sys_role_permissions
    await queryRunner.createTable(
      new Table({
        name: 'sys_role_permissions',
        columns: [
          { name: 'id', type: 'int', isPrimary: true, isGenerated: true, generationStrategy: 'increment' },
          { name: 'role_id', type: 'int', isNullable: false },
          { name: 'permission_id', type: 'int', isNullable: false },
        ],
        uniques: [{ columnNames: ['role_id', 'permission_id'] }],
      }),
      true,
    )

    await queryRunner.createForeignKey(
      'sys_role_permissions',
      new TableForeignKey({
        columnNames: ['role_id'],
        referencedTableName: 'sys_roles',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
      }),
    )

    await queryRunner.createForeignKey(
      'sys_role_permissions',
      new TableForeignKey({
        columnNames: ['permission_id'],
        referencedTableName: 'sys_permissions',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
      }),
    )

    // 4. sys_user_roles
    await queryRunner.createTable(
      new Table({
        name: 'sys_user_roles',
        columns: [
          { name: 'id', type: 'int', isPrimary: true, isGenerated: true, generationStrategy: 'increment' },
          { name: 'user_id', type: 'int', isNullable: false },
          { name: 'role_id', type: 'int', isNullable: false },
        ],
        uniques: [{ columnNames: ['user_id', 'role_id'] }],
      }),
      true,
    )

    await queryRunner.createForeignKey(
      'sys_user_roles',
      new TableForeignKey({
        columnNames: ['role_id'],
        referencedTableName: 'sys_roles',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
      }),
    )

    // 5. sys_role_departments
    await queryRunner.createTable(
      new Table({
        name: 'sys_role_departments',
        columns: [
          { name: 'id', type: 'int', isPrimary: true, isGenerated: true, generationStrategy: 'increment' },
          { name: 'role_id', type: 'int', isNullable: false },
          { name: 'department_id', type: 'int', isNullable: false },
        ],
        uniques: [{ columnNames: ['role_id', 'department_id'] }],
      }),
      true,
    )

    await queryRunner.createForeignKey(
      'sys_role_departments',
      new TableForeignKey({
        columnNames: ['role_id'],
        referencedTableName: 'sys_roles',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
      }),
    )

    // Indexes
    await queryRunner.createIndex('sys_role_permissions', new TableIndex({ columnNames: ['role_id'] }))
    await queryRunner.createIndex('sys_role_permissions', new TableIndex({ columnNames: ['permission_id'] }))
    await queryRunner.createIndex('sys_user_roles', new TableIndex({ columnNames: ['user_id'] }))
    await queryRunner.createIndex('sys_user_roles', new TableIndex({ columnNames: ['role_id'] }))
    await queryRunner.createIndex('sys_role_departments', new TableIndex({ columnNames: ['role_id'] }))
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('sys_role_departments', true, true, true)
    await queryRunner.dropTable('sys_user_roles', true, true, true)
    await queryRunner.dropTable('sys_role_permissions', true, true, true)
    await queryRunner.dropTable('sys_permissions', true, true, true)
    await queryRunner.dropTable('sys_roles', true, true, true)
  }
}
