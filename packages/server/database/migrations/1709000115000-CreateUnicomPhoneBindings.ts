import { MigrationInterface, QueryRunner } from 'typeorm'

export class CreateUnicomPhoneBindings1709000115000 implements MigrationInterface {
  name = 'CreateUnicomPhoneBindings1709000115000'

  public async up(queryRunner: QueryRunner): Promise<void> {
    const hasTable = await queryRunner.query(
      `SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES
       WHERE TABLE_SCHEMA = DATABASE()
         AND TABLE_NAME = 'unicom_phone_bindings'`,
    )
    if (hasTable.length > 0) return

    await queryRunner.query(`
      CREATE TABLE \`unicom_phone_bindings\` (
        \`id\` int NOT NULL AUTO_INCREMENT,
        \`phone\` varchar(20) NOT NULL,
        \`user_id\` int NOT NULL,
        \`is_enabled\` tinyint(1) NOT NULL DEFAULT 1,
        \`remark\` varchar(255) NULL,
        \`created_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        \`updated_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
        \`deleted_at\` datetime(6) NULL,
        PRIMARY KEY (\`id\`),
        UNIQUE INDEX \`IDX_unicom_phone_bindings_phone\` (\`phone\`),
        INDEX \`IDX_unicom_phone_bindings_user_id\` (\`user_id\`),
        INDEX \`IDX_unicom_phone_bindings_enabled\` (\`is_enabled\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `)
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS \`unicom_phone_bindings\``)
  }
}
