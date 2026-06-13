import { MigrationInterface, QueryRunner } from 'typeorm'

export class CreateCloudTranscriptionCallbacks1709000111000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    const hasTable = await queryRunner.query(
      `SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES
       WHERE TABLE_SCHEMA = DATABASE()
         AND TABLE_NAME = 'cloud_transcription_callbacks'`,
    )
    if (hasTable.length > 0) return

    await queryRunner.query(`
      CREATE TABLE \`cloud_transcription_callbacks\` (
        \`id\` int NOT NULL AUTO_INCREMENT,
        \`task_id\` varchar(100) NOT NULL,
        \`call_sid\` varchar(100) NOT NULL,
        \`status_code\` int NOT NULL,
        \`status_text\` varchar(100) NOT NULL,
        \`biz_duration_ms\` int NOT NULL,
        \`request_time\` datetime(6) NOT NULL,
        \`solve_time\` datetime(6) NOT NULL,
        \`raw_payload\` json NOT NULL,
        \`transcript_text\` longtext NULL,
        \`segments\` json NOT NULL,
        \`matched_call_record_id\` int NULL,
        \`match_status\` varchar(20) NOT NULL DEFAULT 'pending',
        \`match_reason\` text NULL,
        \`created_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        \`updated_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
        \`deleted_at\` datetime NULL,
        PRIMARY KEY (\`id\`),
        UNIQUE INDEX \`IDX_cloud_transcription_callbacks_task_id\` (\`task_id\`),
        INDEX \`IDX_cloud_transcription_callbacks_call_sid\` (\`call_sid\`),
        INDEX \`IDX_cloud_transcription_callbacks_request_time\` (\`request_time\`),
        INDEX \`IDX_cloud_transcription_callbacks_solve_time\` (\`solve_time\`),
        INDEX \`IDX_cloud_transcription_callbacks_matched_call_record_id\` (\`matched_call_record_id\`),
        INDEX \`IDX_cloud_transcription_callbacks_match_status\` (\`match_status\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `)
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS \`cloud_transcription_callbacks\``)
  }
}
