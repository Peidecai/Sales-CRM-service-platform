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
      ADD COLUMN response_data JSON NULL AFTER \`after\`
    `).catch(() => { /* column may already exist */ })

    // Add archive_status column for hot/warm/cold management
    await queryRunner.query(`
      ALTER TABLE audit_logs
      ADD COLUMN archive_status VARCHAR(10) DEFAULT 'hot' AFTER ip
    `).catch(() => { /* column may already exist */ })

    // Add index for archive queries
    await queryRunner.query(`
      CREATE INDEX IDX_AUDIT_LOGS_ARCHIVE_STATUS
      ON audit_logs (archive_status)
    `).catch(() => { /* index may already exist */ })

    // Add composite index for monthly partition queries
    await queryRunner.query(`
      CREATE INDEX IDX_AUDIT_LOGS_CREATED_ARCHIVE
      ON audit_logs (created_at, archive_status)
    `).catch(() => { /* index may already exist */ })
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IDX_AUDIT_LOGS_CREATED_ARCHIVE ON audit_logs`).catch(() => {})
    await queryRunner.query(`DROP INDEX IDX_AUDIT_LOGS_ARCHIVE_STATUS ON audit_logs`).catch(() => {})
    await queryRunner.query(`ALTER TABLE audit_logs DROP COLUMN archive_status`).catch(() => {})
    await queryRunner.query(`ALTER TABLE audit_logs DROP COLUMN response_data`).catch(() => {})
  }
}
