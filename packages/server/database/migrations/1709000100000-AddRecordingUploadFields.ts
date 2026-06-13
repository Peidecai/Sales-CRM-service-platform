import { MigrationInterface, QueryRunner } from 'typeorm'

export class AddRecordingUploadFields1709000100000 implements MigrationInterface {
  name = 'AddRecordingUploadFields1709000100000'

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Add source column with new enum value to recording_files
    const hasSource = await queryRunner.query(
      `SELECT COUNT(*) as cnt FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'recording_files' AND COLUMN_NAME = 'source_type'`,
    )
    if (Number(hasSource[0]?.cnt) > 0) {
      // Alter existing enum to add manual_upload
      await queryRunner.query(
        `ALTER TABLE \`recording_files\` MODIFY COLUMN \`source_type\` enum('platform','voice_memo','manual_upload') NOT NULL DEFAULT 'platform'`,
      )
    }

    // Add counterpart_phone
    const hasCounterpart = await queryRunner.query(
      `SELECT COUNT(*) as cnt FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'recording_files' AND COLUMN_NAME = 'counterpart_phone'`,
    )
    if (Number(hasCounterpart[0]?.cnt) === 0) {
      await queryRunner.query(
        `ALTER TABLE \`recording_files\` ADD COLUMN \`counterpart_phone\` varchar(20) NULL COMMENT '对方电话号码'`,
      )
    }

    // Add actual_call_time
    const hasActualTime = await queryRunner.query(
      `SELECT COUNT(*) as cnt FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'recording_files' AND COLUMN_NAME = 'actual_call_time'`,
    )
    if (Number(hasActualTime[0]?.cnt) === 0) {
      await queryRunner.query(
        `ALTER TABLE \`recording_files\` ADD COLUMN \`actual_call_time\` datetime NULL COMMENT '实际通话时间'`,
      )
    }

    // Add uploaded_by_id
    const hasUploadedBy = await queryRunner.query(
      `SELECT COUNT(*) as cnt FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'recording_files' AND COLUMN_NAME = 'uploaded_by_id'`,
    )
    if (Number(hasUploadedBy[0]?.cnt) === 0) {
      await queryRunner.query(
        `ALTER TABLE \`recording_files\` ADD COLUMN \`uploaded_by_id\` int NULL COMMENT '上传人ID'`,
      )
    }

    // Add notes
    const hasNotes = await queryRunner.query(
      `SELECT COUNT(*) as cnt FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'recording_files' AND COLUMN_NAME = 'notes'`,
    )
    if (Number(hasNotes[0]?.cnt) === 0) {
      await queryRunner.query(
        `ALTER TABLE \`recording_files\` ADD COLUMN \`notes\` text NULL COMMENT '备注'`,
      )
    }

    // Add index on source_type
    const hasSourceIdx = await queryRunner.query(
      `SELECT COUNT(*) as cnt FROM INFORMATION_SCHEMA.STATISTICS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'recording_files' AND INDEX_NAME = 'IDX_rf_source_type'`,
    )
    if (Number(hasSourceIdx[0]?.cnt) === 0) {
      await queryRunner.query(
        `CREATE INDEX \`IDX_rf_source_type\` ON \`recording_files\` (\`source_type\`)`,
      )
    }

    // Add is_manual_upload to call_records
    const hasManualUpload = await queryRunner.query(
      `SELECT COUNT(*) as cnt FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'call_records' AND COLUMN_NAME = 'is_manual_upload'`,
    )
    if (Number(hasManualUpload[0]?.cnt) === 0) {
      await queryRunner.query(
        `ALTER TABLE \`call_records\` ADD COLUMN \`is_manual_upload\` tinyint(1) NOT NULL DEFAULT 0 COMMENT '是否手动上传录音'`,
      )
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE \`call_records\` DROP COLUMN \`is_manual_upload\``)
    await queryRunner.query(`DROP INDEX \`IDX_rf_source_type\` ON \`recording_files\``)
    await queryRunner.query(`ALTER TABLE \`recording_files\` DROP COLUMN \`notes\``)
    await queryRunner.query(`ALTER TABLE \`recording_files\` DROP COLUMN \`uploaded_by_id\``)
    await queryRunner.query(`ALTER TABLE \`recording_files\` DROP COLUMN \`actual_call_time\``)
    await queryRunner.query(`ALTER TABLE \`recording_files\` DROP COLUMN \`counterpart_phone\``)
    await queryRunner.query(
      `ALTER TABLE \`recording_files\` MODIFY COLUMN \`source_type\` enum('platform','voice_memo') NOT NULL DEFAULT 'platform'`,
    )
  }
}
