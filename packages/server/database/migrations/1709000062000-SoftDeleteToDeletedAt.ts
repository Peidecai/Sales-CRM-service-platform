import { MigrationInterface, QueryRunner } from 'typeorm'

/**
 * Migrate soft-delete from boolean `deleted` column to `@DeleteDateColumn` `deleted_at`.
 *
 * Steps:
 * 1. Add `deleted_at` DATETIME(6) column (nullable) to every table that has `deleted`
 * 2. Copy: WHERE deleted = true → set deleted_at = updated_at
 * 3. Drop the old `deleted` column
 */
export class SoftDeleteToDeletedAt1709000062000 implements MigrationInterface {
  /** All tables that inherit from BaseEntity and have the boolean `deleted` column */
  private readonly tables = [
    'users',
    'customers',
    'opportunities',
    'call_records',
    'knowledge_articles',
    'knowledge_categories',
    'contacts',
    'follow_ups',
    'audit_logs',
    'announcements',
    'announcement_reads',
    'material_files',
    'quotations',
    'quotation_items',
    'contracts',
    'payments',
    'approval_flows',
    'approval_instances',
    'approval_records',
    'custom_field_definitions',
    'customer_tags',
    'customer_tag_relations',
    'customer_pool_logs',
    'customer_import_logs',
    'sales_targets',
    'article_likes',
    'article_favorites',
    'article_comments',
    'opportunity_follow_logs',
    'opportunity_stage_logs',
    'recording_files',
    'asr_tasks',
    'call_transcripts',
    'agent_status_logs',
    'miniapp_users',
  ]

  public async up(queryRunner: QueryRunner): Promise<void> {
    for (const table of this.tables) {
      // 1. Add deleted_at column (skip if already exists)
      await queryRunner.query(
        `ALTER TABLE \`${table}\` ADD COLUMN \`deleted_at\` DATETIME(6) NULL DEFAULT NULL`,
      ).catch(() => { /* column may already exist */ })

      // 2. Migrate existing soft-deleted records (skip if 'deleted' column doesn't exist)
      await queryRunner.query(
        `UPDATE \`${table}\` SET \`deleted_at\` = \`updated_at\` WHERE \`deleted\` = true`,
      ).catch(() => { /* 'deleted' column may not exist on this table */ })

      // 3. Drop old boolean column (skip if doesn't exist)
      await queryRunner.query(
        `ALTER TABLE \`${table}\` DROP COLUMN \`deleted\``,
      ).catch(() => { /* column may not exist */ })
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    for (const table of this.tables.slice().reverse()) {
      // 1. Re-add boolean deleted column
      await queryRunner.query(
        `ALTER TABLE \`${table}\` ADD COLUMN \`deleted\` TINYINT(1) NOT NULL DEFAULT 0`,
      ).catch(() => {})

      // 2. Migrate back: deleted_at IS NOT NULL → deleted = true
      await queryRunner.query(
        `UPDATE \`${table}\` SET \`deleted\` = 1 WHERE \`deleted_at\` IS NOT NULL`,
      ).catch(() => {})

      // 3. Drop deleted_at column
      await queryRunner.query(
        `ALTER TABLE \`${table}\` DROP COLUMN \`deleted_at\``,
      ).catch(() => {})
    }
  }
}
