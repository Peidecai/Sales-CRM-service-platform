import { MigrationInterface, QueryRunner } from 'typeorm'

export class CreateNotificationSettingsAndProspectHistory1709000104000 implements MigrationInterface {
  name = 'CreateNotificationSettingsAndProspectHistory1709000104000'

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS \`notification_settings\` (
        \`id\` int NOT NULL AUTO_INCREMENT,
        \`user_id\` int NOT NULL,
        \`email_enabled\` tinyint(1) NOT NULL DEFAULT 1,
        \`ws_enabled\` tinyint(1) NOT NULL DEFAULT 1,
        \`sms_enabled\` tinyint(1) NOT NULL DEFAULT 0,
        \`muted_types\` json NULL,
        \`quiet_hours_start\` varchar(5) NULL,
        \`quiet_hours_end\` varchar(5) NULL,
        \`created_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        \`updated_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
        PRIMARY KEY (\`id\`),
        UNIQUE INDEX \`IDX_notification_settings_user\` (\`user_id\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `)

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS \`prospect_query_histories\` (
        \`id\` int NOT NULL AUTO_INCREMENT,
        \`user_id\` int NOT NULL,
        \`query_params\` json NOT NULL,
        \`result_count\` int NOT NULL DEFAULT 0,
        \`created_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        PRIMARY KEY (\`id\`),
        INDEX \`IDX_prospect_query_histories_user\` (\`user_id\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `)

    try {
      await queryRunner.query(`ALTER TABLE \`announcements\` ADD COLUMN \`force_read\` tinyint(1) NOT NULL DEFAULT 0`)
    } catch {
      // column may already exist
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    try {
      await queryRunner.query(`ALTER TABLE \`announcements\` DROP COLUMN \`force_read\``)
    } catch {
      // column may already have been dropped
    }
    await queryRunner.query(`DROP TABLE IF EXISTS \`prospect_query_histories\``)
    await queryRunner.query(`DROP TABLE IF EXISTS \`notification_settings\``)
  }
}
