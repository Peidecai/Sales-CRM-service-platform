import { MigrationInterface, QueryRunner } from 'typeorm'

export class CreateUnicomCallCallbacks1709000113000 implements MigrationInterface {
  name = 'CreateUnicomCallCallbacks1709000113000'

  public async up(queryRunner: QueryRunner): Promise<void> {
    const hasTable = await queryRunner.query(
      `SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES
       WHERE TABLE_SCHEMA = DATABASE()
         AND TABLE_NAME = 'unicom_call_callbacks'`,
    )
    if (hasTable.length > 0) return

    await queryRunner.query(`
      CREATE TABLE \`unicom_call_callbacks\` (
        \`id\` int NOT NULL AUTO_INCREMENT,
        \`route_phone\` varchar(20) NOT NULL,
        \`call_sid\` varchar(100) NOT NULL,
        \`related_call_sid\` varchar(100) NULL,
        \`account_id\` varchar(100) NULL,
        \`account_name\` varchar(100) NULL,
        \`app_id\` varchar(100) NULL,
        \`app_name\` varchar(100) NULL,
        \`caller_no\` varchar(50) NOT NULL,
        \`called_no\` varchar(50) NOT NULL,
        \`display_number\` varchar(50) NULL,
        \`call_type_text\` varchar(20) NOT NULL,
        \`start_time\` datetime(6) NOT NULL,
        \`end_time\` datetime(6) NOT NULL,
        \`call_start_time\` datetime(6) NULL,
        \`duration\` int NOT NULL,
        \`types\` int NOT NULL,
        \`is_success\` tinyint NULL,
        \`is_dual\` tinyint NULL,
        \`record_url\` varchar(1000) NULL,
        \`caller_record_url\` varchar(1000) NULL,
        \`called_record_url\` varchar(1000) NULL,
        \`ring_cause\` varchar(50) NULL,
        \`ring_cause_desc\` varchar(255) NULL,
        \`ring_duration\` int NULL,
        \`sip_cause\` int NULL,
        \`sip_cause_desc\` varchar(255) NULL,
        \`order_id\` varchar(100) NULL,
        \`recv183\` varchar(50) NULL,
        \`raw_payload\` json NOT NULL,
        \`matched_call_record_id\` int NULL,
        \`callback_kind\` varchar(20) NOT NULL DEFAULT 'call',
        \`match_status\` varchar(20) NOT NULL DEFAULT 'pending',
        \`match_reason\` text NULL,
        \`created_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        \`updated_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
        \`deleted_at\` datetime(6) NULL,
        PRIMARY KEY (\`id\`),
        UNIQUE INDEX \`IDX_unicom_call_callbacks_route_sid_type\` (\`route_phone\`, \`call_sid\`, \`types\`),
        INDEX \`IDX_unicom_call_callbacks_route_phone\` (\`route_phone\`),
        INDEX \`IDX_unicom_call_callbacks_call_sid\` (\`call_sid\`),
        INDEX \`IDX_unicom_call_callbacks_related_call_sid\` (\`related_call_sid\`),
        INDEX \`IDX_unicom_call_callbacks_caller_no\` (\`caller_no\`),
        INDEX \`IDX_unicom_call_callbacks_called_no\` (\`called_no\`),
        INDEX \`IDX_unicom_call_callbacks_start_time\` (\`start_time\`),
        INDEX \`IDX_unicom_call_callbacks_types\` (\`types\`),
        INDEX \`IDX_unicom_call_callbacks_matched_call_record_id\` (\`matched_call_record_id\`),
        INDEX \`IDX_unicom_call_callbacks_match_status\` (\`match_status\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `)
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS \`unicom_call_callbacks\``)
  }
}
