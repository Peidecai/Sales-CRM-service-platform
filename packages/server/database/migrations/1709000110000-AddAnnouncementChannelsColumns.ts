import { MigrationInterface, QueryRunner } from 'typeorm'

export class AddAnnouncementChannelsColumns1709000110000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Add channels column
    const hasChannels = await queryRunner.query(
      `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS
       WHERE TABLE_SCHEMA = DATABASE()
         AND TABLE_NAME = 'announcements'
         AND COLUMN_NAME = 'channels'`,
    )
    if (hasChannels.length === 0) {
      await queryRunner.query(
        `ALTER TABLE \`announcements\` ADD COLUMN \`channels\` text NOT NULL DEFAULT 'WEB' COMMENT 'Delivery channels (simple-array)'`,
      )
    }

    // Add target_roles column
    const hasTargetRoles = await queryRunner.query(
      `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS
       WHERE TABLE_SCHEMA = DATABASE()
         AND TABLE_NAME = 'announcements'
         AND COLUMN_NAME = 'target_roles'`,
    )
    if (hasTargetRoles.length === 0) {
      await queryRunner.query(
        `ALTER TABLE \`announcements\` ADD COLUMN \`target_roles\` text NULL COMMENT 'Target roles (simple-array, null=all)'`,
      )
    }

    // Add force_read column
    const hasForceRead = await queryRunner.query(
      `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS
       WHERE TABLE_SCHEMA = DATABASE()
         AND TABLE_NAME = 'announcements'
         AND COLUMN_NAME = 'force_read'`,
    )
    if (hasForceRead.length === 0) {
      await queryRunner.query(
        `ALTER TABLE \`announcements\` ADD COLUMN \`force_read\` tinyint NOT NULL DEFAULT 0 COMMENT 'Force read flag'`,
      )
    }

    // Add publish_at column
    const hasPublishAt = await queryRunner.query(
      `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS
       WHERE TABLE_SCHEMA = DATABASE()
         AND TABLE_NAME = 'announcements'
         AND COLUMN_NAME = 'publish_at'`,
    )
    if (hasPublishAt.length === 0) {
      await queryRunner.query(
        `ALTER TABLE \`announcements\` ADD COLUMN \`publish_at\` datetime NULL COMMENT 'Scheduled publish time'`,
      )
    }

    // Add end_at column
    const hasEndAt = await queryRunner.query(
      `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS
       WHERE TABLE_SCHEMA = DATABASE()
         AND TABLE_NAME = 'announcements'
         AND COLUMN_NAME = 'end_at'`,
    )
    if (hasEndAt.length === 0) {
      await queryRunner.query(
        `ALTER TABLE \`announcements\` ADD COLUMN \`end_at\` datetime NULL COMMENT 'Expiry time'`,
      )
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const columns = ['channels', 'target_roles', 'force_read', 'publish_at', 'end_at']
    for (const col of columns) {
      const hasCol = await queryRunner.query(
        `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS
         WHERE TABLE_SCHEMA = DATABASE()
           AND TABLE_NAME = 'announcements'
           AND COLUMN_NAME = '${col}'`,
      )
      if (hasCol.length > 0) {
        await queryRunner.query(`ALTER TABLE \`announcements\` DROP COLUMN \`${col}\``)
      }
    }
  }
}
