import { MigrationInterface, QueryRunner } from 'typeorm'

export class CreateCloudCallSettings1709000109000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    const hasTable = await queryRunner.query(
      `SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES
       WHERE TABLE_SCHEMA = DATABASE()
         AND TABLE_NAME = 'cloud_call_settings'`,
    )
    if (hasTable.length === 0) {
      await queryRunner.query(`
        CREATE TABLE \`cloud_call_settings\` (
          \`id\` int NOT NULL AUTO_INCREMENT,
          \`provider\` varchar(20) NOT NULL DEFAULT 'aliyun' COMMENT 'Provider: aliyun / tianrun / ronglian',
          \`app_key\` varchar(128) NOT NULL DEFAULT '' COMMENT 'Access Key ID / AppKey',
          \`app_secret\` varchar(512) NOT NULL DEFAULT '' COMMENT 'Access Key Secret (AES-256-GCM encrypted)',
          \`instance_id\` varchar(128) NOT NULL DEFAULT '' COMMENT 'CCC instance ID',
          \`webhook_url\` varchar(500) NOT NULL DEFAULT '' COMMENT 'Webhook callback URL',
          \`webhook_secret\` varchar(512) NOT NULL DEFAULT '' COMMENT 'Webhook HMAC secret (encrypted)',
          \`phone_numbers\` varchar(500) NOT NULL DEFAULT '' COMMENT 'Outbound phone numbers (comma-separated)',
          \`concurrent_lines\` int NOT NULL DEFAULT 10 COMMENT 'Max concurrent call lines',
          \`is_active\` tinyint NOT NULL DEFAULT 0 COMMENT '1 = verified and active',
          \`created_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
          \`updated_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
          PRIMARY KEY (\`id\`)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
      `)
    }

    // Insert default singleton row if not exists
    await queryRunner.query(
      `INSERT IGNORE INTO \`cloud_call_settings\` (\`id\`, \`provider\`) VALUES (1, 'aliyun')`,
    )
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS \`cloud_call_settings\``)
  }
}
