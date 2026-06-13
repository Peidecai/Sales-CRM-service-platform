import { MigrationInterface, QueryRunner } from 'typeorm'

export class AlterPermissionAndRoleTables1709000081000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Add columns to sys_permissions
    const permCols = await queryRunner.query(
      `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'sys_permissions'`,
    )
    const permColNames = (permCols as { COLUMN_NAME: string }[]).map((c) => c.COLUMN_NAME)

    if (!permColNames.includes('module')) {
      await queryRunner.query(
        `ALTER TABLE sys_permissions ADD COLUMN module VARCHAR(50) NULL`,
      )
    }
    if (!permColNames.includes('description')) {
      await queryRunner.query(
        `ALTER TABLE sys_permissions ADD COLUMN description VARCHAR(500) NULL`,
      )
    }
    if (!permColNames.includes('sort')) {
      await queryRunner.query(
        `ALTER TABLE sys_permissions ADD COLUMN sort INT NOT NULL DEFAULT 0`,
      )
    }

    // Add columns to sys_roles
    const roleCols = await queryRunner.query(
      `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'sys_roles'`,
    )
    const roleColNames = (roleCols as { COLUMN_NAME: string }[]).map((c) => c.COLUMN_NAME)

    if (!roleColNames.includes('label')) {
      await queryRunner.query(
        `ALTER TABLE sys_roles ADD COLUMN label VARCHAR(100) NULL`,
      )
    }
    if (!roleColNames.includes('is_builtin')) {
      await queryRunner.query(
        `ALTER TABLE sys_roles ADD COLUMN is_builtin TINYINT NOT NULL DEFAULT 0`,
      )
    }
    if (!roleColNames.includes('status')) {
      await queryRunner.query(
        `ALTER TABLE sys_roles ADD COLUMN status ENUM('active','disabled') NOT NULL DEFAULT 'active'`,
      )
    }
    if (!roleColNames.includes('deleted_at')) {
      await queryRunner.query(
        `ALTER TABLE sys_roles ADD COLUMN deleted_at DATETIME(6) NULL`,
      )
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE sys_roles DROP COLUMN deleted_at`)
    await queryRunner.query(`ALTER TABLE sys_roles DROP COLUMN status`)
    await queryRunner.query(`ALTER TABLE sys_roles DROP COLUMN is_builtin`)
    await queryRunner.query(`ALTER TABLE sys_roles DROP COLUMN label`)
    await queryRunner.query(`ALTER TABLE sys_permissions DROP COLUMN sort`)
    await queryRunner.query(`ALTER TABLE sys_permissions DROP COLUMN description`)
    await queryRunner.query(`ALTER TABLE sys_permissions DROP COLUMN module`)
  }
}
