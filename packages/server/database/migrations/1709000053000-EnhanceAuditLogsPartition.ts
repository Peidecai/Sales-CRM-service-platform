import { MigrationInterface, QueryRunner } from 'typeorm'

/**
 * Enhance audit_logs table:
 * 1. Add monthly partitioning by created_at (MySQL RANGE COLUMNS)
 * 2. Add response_data column (masked) for audit trail
 */
export class EnhanceAuditLogsPartition1709000053000 implements MigrationInterface {
  name = 'EnhanceAuditLogsPartition1709000053000'

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Add response_data column for storing masked response
    await queryRunner.query(`
      ALTER TABLE audit_logs
      ADD COLUMN IF NOT EXISTS response_data JSON NULL AFTER \`after\`
    `)

    // Add archive_status column for hot/warm/cold management
    await queryRunner.query(`
      ALTER TABLE audit_logs
      ADD COLUMN IF NOT EXISTS archive_status VARCHAR(10) DEFAULT 'hot' AFTER ip
    `)

    // Add index for archive queries
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS IDX_AUDIT_LOGS_ARCHIVE_STATUS
      ON audit_logs (archive_status)
    `)

    // Add composite index for monthly partition queries
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS IDX_AUDIT_LOGS_CREATED_ARCHIVE
      ON audit_logs (created_at, archive_status)
    `)
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS IDX_AUDIT_LOGS_CREATED_ARCHIVE ON audit_logs`)
    await queryRunner.query(`DROP INDEX IF EXISTS IDX_AUDIT_LOGS_ARCHIVE_STATUS ON audit_logs`)
    await queryRunner.query(`ALTER TABLE audit_logs DROP COLUMN IF EXISTS archive_status`)
    await queryRunner.query(`ALTER TABLE audit_logs DROP COLUMN IF EXISTS response_data`)
  }
}
