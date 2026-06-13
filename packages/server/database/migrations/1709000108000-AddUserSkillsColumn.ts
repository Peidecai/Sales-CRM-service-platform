import { MigrationInterface, QueryRunner } from 'typeorm'

export class AddUserSkillsColumn1709000108000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    const hasColumn = await queryRunner.query(
      `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS
       WHERE TABLE_SCHEMA = DATABASE()
         AND TABLE_NAME = 'users'
         AND COLUMN_NAME = 'skills'`,
    )
    if (hasColumn.length === 0) {
      await queryRunner.query(
        `ALTER TABLE \`users\` ADD COLUMN \`skills\` json NULL COMMENT '坐席技能标签ID列表'`,
      )
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const hasColumn = await queryRunner.query(
      `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS
       WHERE TABLE_SCHEMA = DATABASE()
         AND TABLE_NAME = 'users'
         AND COLUMN_NAME = 'skills'`,
    )
    if (hasColumn.length > 0) {
      await queryRunner.query(
        `ALTER TABLE \`users\` DROP COLUMN \`skills\``,
      )
    }
  }
}
