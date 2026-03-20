import { MigrationInterface, QueryRunner } from 'typeorm'

export class CreateDataMaskingRule1709000085000 implements MigrationInterface {
  name = 'CreateDataMaskingRule1709000085000'

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS \`data_masking_rules\` (
        \`id\` int NOT NULL AUTO_INCREMENT,
        \`name\` varchar(100) NOT NULL,
        \`entity_name\` varchar(50) NOT NULL,
        \`field_name\` varchar(50) NOT NULL,
        \`mask_type\` enum('partial','full','hash') NOT NULL DEFAULT 'partial',
        \`pattern\` varchar(100) NULL,
        \`exempt_roles\` json NULL,
        \`exempt_permission\` varchar(100) NULL,
        \`is_active\` tinyint NOT NULL DEFAULT 1,
        \`created_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        \`updated_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
        \`deleted_at\` datetime(6) NULL,
        PRIMARY KEY (\`id\`),
        UNIQUE KEY \`UQ_data_masking_entity_field\` (\`entity_name\`, \`field_name\`),
        KEY \`IDX_data_masking_is_active\` (\`is_active\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `)

    // Seed default rules
    await queryRunner.query(`
      INSERT IGNORE INTO \`data_masking_rules\` (\`name\`, \`entity_name\`, \`field_name\`, \`mask_type\`, \`pattern\`, \`exempt_roles\`)
      VALUES
        ('客户手机号脱敏', 'customer', 'phone', 'partial', '3,4,4', '["admin"]'),
        ('联系人手机号脱敏', 'contact', 'phone', 'partial', '3,4,4', '["admin"]'),
        ('联系人邮箱脱敏', 'contact', 'email', 'partial', '2,*,0', '["admin"]'),
        ('客户身份证脱敏', 'customer', 'idNumber', 'partial', '4,10,4', '["admin"]')
    `)
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP TABLE IF EXISTS `data_masking_rules`')
  }
}
