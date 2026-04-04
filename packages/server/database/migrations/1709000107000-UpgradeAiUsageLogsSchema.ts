import { MigrationInterface, QueryRunner } from 'typeorm'

/**
 * Upgrade ai_usage_logs from legacy schema (migration 38000) to new schema (entity in ai-config module).
 *
 * Legacy columns: trace_id, feature, input_tokens, output_tokens, cost, status, tenant_id, user_id
 * New columns:    module, prompt_tokens, completion_tokens, total_tokens, estimated_cost, is_success, error_message, triggered_by_id
 *
 * Strategy: ADD new columns → migrate data → DROP old columns → add indexes.
 * MySQL 8.0 does not support ADD COLUMN IF NOT EXISTS, so we check column existence first.
 */
export class UpgradeAiUsageLogsSchema1709000107000 implements MigrationInterface {
  name = 'UpgradeAiUsageLogsSchema1709000107000'

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Check if migration is needed (does 'feature' column exist? if not, table is already new schema)
    const columns = await queryRunner.query(`
      SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'ai_usage_logs'
    `)
    const columnNames: string[] = columns.map((c: { COLUMN_NAME: string }) => c.COLUMN_NAME)

    const hasFeature = columnNames.includes('feature')
    const hasModule = columnNames.includes('module')

    // If already has 'module' and no 'feature', nothing to do
    if (hasModule && !hasFeature) {
      return
    }

    // Step 1: Add new columns (skip if they already exist)
    if (!hasModule) {
      await queryRunner.query(`
        ALTER TABLE ai_usage_logs
          ADD COLUMN \`module\` VARCHAR(50) NOT NULL DEFAULT '' COMMENT '模块标识'
      `)
    }
    if (!columnNames.includes('prompt_tokens')) {
      await queryRunner.query(`
        ALTER TABLE ai_usage_logs
          ADD COLUMN \`prompt_tokens\` INT NOT NULL DEFAULT 0 COMMENT '提示Token数'
      `)
    }
    if (!columnNames.includes('completion_tokens')) {
      await queryRunner.query(`
        ALTER TABLE ai_usage_logs
          ADD COLUMN \`completion_tokens\` INT NOT NULL DEFAULT 0 COMMENT '补全Token数'
      `)
    }
    if (!columnNames.includes('total_tokens')) {
      await queryRunner.query(`
        ALTER TABLE ai_usage_logs
          ADD COLUMN \`total_tokens\` INT NOT NULL DEFAULT 0 COMMENT '总Token数'
      `)
    }
    if (!columnNames.includes('estimated_cost')) {
      await queryRunner.query(`
        ALTER TABLE ai_usage_logs
          ADD COLUMN \`estimated_cost\` DECIMAL(10,6) NOT NULL DEFAULT 0 COMMENT '预估费用'
      `)
    }
    if (!columnNames.includes('is_success')) {
      await queryRunner.query(`
        ALTER TABLE ai_usage_logs
          ADD COLUMN \`is_success\` TINYINT NOT NULL DEFAULT 1 COMMENT '是否成功'
      `)
    }
    if (!columnNames.includes('error_message')) {
      await queryRunner.query(`
        ALTER TABLE ai_usage_logs
          ADD COLUMN \`error_message\` TEXT NULL COMMENT '错误信息'
      `)
    }
    if (!columnNames.includes('triggered_by_id')) {
      await queryRunner.query(`
        ALTER TABLE ai_usage_logs
          ADD COLUMN \`triggered_by_id\` INT NULL COMMENT '触发人ID'
      `)
    }

    // Step 2: Migrate data from old columns to new columns
    if (hasFeature) {
      await queryRunner.query(`
        UPDATE ai_usage_logs SET
          \`module\` = \`feature\`,
          prompt_tokens = input_tokens,
          completion_tokens = output_tokens,
          total_tokens = input_tokens + output_tokens,
          estimated_cost = cost,
          is_success = CASE WHEN status = 'success' THEN 1 ELSE 0 END,
          triggered_by_id = user_id
        WHERE \`module\` = '' OR \`module\` IS NULL
      `)
    }

    // Step 3: Drop old columns and their indexes
    if (hasFeature) {
      // Drop old indexes (ignore errors if they don't exist)
      const indexes = await queryRunner.query(`
        SHOW INDEX FROM ai_usage_logs WHERE Key_name LIKE 'IDX_ai_usage_logs_%'
      `)
      const indexNames = [...new Set(indexes.map((i: { Key_name: string }) => i.Key_name))] as string[]

      for (const indexName of indexNames) {
        await queryRunner.query(`DROP INDEX \`${indexName}\` ON ai_usage_logs`)
      }

      // Drop old columns
      await queryRunner.query(`ALTER TABLE ai_usage_logs DROP COLUMN \`trace_id\``)
      await queryRunner.query(`ALTER TABLE ai_usage_logs DROP COLUMN \`feature\``)
      await queryRunner.query(`ALTER TABLE ai_usage_logs DROP COLUMN \`input_tokens\``)
      await queryRunner.query(`ALTER TABLE ai_usage_logs DROP COLUMN \`output_tokens\``)
      await queryRunner.query(`ALTER TABLE ai_usage_logs DROP COLUMN \`cost\``)
      await queryRunner.query(`ALTER TABLE ai_usage_logs DROP COLUMN \`status\``)
      await queryRunner.query(`ALTER TABLE ai_usage_logs DROP COLUMN \`tenant_id\``)
      await queryRunner.query(`ALTER TABLE ai_usage_logs DROP COLUMN \`user_id\``)
    }

    // Step 4: Add new indexes
    const newIndexes = await queryRunner.query(`
      SHOW INDEX FROM ai_usage_logs WHERE Key_name = 'IDX_ai_usage_module_created'
    `)
    if (newIndexes.length === 0) {
      await queryRunner.query(`
        CREATE INDEX IDX_ai_usage_module_created ON ai_usage_logs (\`module\`, created_at)
      `)
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Reverse: re-add old columns, migrate data back, drop new columns
    const columns = await queryRunner.query(`
      SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'ai_usage_logs'
    `)
    const columnNames: string[] = columns.map((c: { COLUMN_NAME: string }) => c.COLUMN_NAME)

    // Add old columns back
    if (!columnNames.includes('feature')) {
      await queryRunner.query(`ALTER TABLE ai_usage_logs ADD COLUMN \`feature\` VARCHAR(50) NOT NULL DEFAULT ''`)
      await queryRunner.query(`ALTER TABLE ai_usage_logs ADD COLUMN \`trace_id\` VARCHAR(64) NOT NULL DEFAULT ''`)
      await queryRunner.query(`ALTER TABLE ai_usage_logs ADD COLUMN \`input_tokens\` INT NOT NULL DEFAULT 0`)
      await queryRunner.query(`ALTER TABLE ai_usage_logs ADD COLUMN \`output_tokens\` INT NOT NULL DEFAULT 0`)
      await queryRunner.query(`ALTER TABLE ai_usage_logs ADD COLUMN \`cost\` DECIMAL(10,6) NOT NULL DEFAULT 0`)
      await queryRunner.query(`ALTER TABLE ai_usage_logs ADD COLUMN \`status\` VARCHAR(20) NOT NULL DEFAULT 'success'`)
      await queryRunner.query(`ALTER TABLE ai_usage_logs ADD COLUMN \`tenant_id\` INT NULL`)
      await queryRunner.query(`ALTER TABLE ai_usage_logs ADD COLUMN \`user_id\` INT NULL`)
    }

    // Migrate data back
    await queryRunner.query(`
      UPDATE ai_usage_logs SET
        \`feature\` = \`module\`,
        input_tokens = prompt_tokens,
        output_tokens = completion_tokens,
        cost = estimated_cost,
        status = CASE WHEN is_success = 1 THEN 'success' ELSE 'error' END,
        user_id = triggered_by_id
    `)

    // Drop new indexes
    await queryRunner.query(`DROP INDEX IDX_ai_usage_module_created ON ai_usage_logs`).catch(() => {})

    // Drop new columns
    await queryRunner.query(`ALTER TABLE ai_usage_logs DROP COLUMN \`module\``)
    await queryRunner.query(`ALTER TABLE ai_usage_logs DROP COLUMN \`prompt_tokens\``)
    await queryRunner.query(`ALTER TABLE ai_usage_logs DROP COLUMN \`completion_tokens\``)
    await queryRunner.query(`ALTER TABLE ai_usage_logs DROP COLUMN \`total_tokens\``)
    await queryRunner.query(`ALTER TABLE ai_usage_logs DROP COLUMN \`estimated_cost\``)
    await queryRunner.query(`ALTER TABLE ai_usage_logs DROP COLUMN \`is_success\``)
    await queryRunner.query(`ALTER TABLE ai_usage_logs DROP COLUMN \`error_message\``)
    await queryRunner.query(`ALTER TABLE ai_usage_logs DROP COLUMN \`triggered_by_id\``)

    // Re-add old indexes
    await queryRunner.query(`CREATE INDEX IDX_ai_usage_logs_trace_id ON ai_usage_logs (trace_id)`)
    await queryRunner.query(`CREATE INDEX IDX_ai_usage_logs_feature ON ai_usage_logs (feature)`)
    await queryRunner.query(`CREATE INDEX IDX_ai_usage_logs_created_at ON ai_usage_logs (created_at)`)
    await queryRunner.query(`CREATE INDEX IDX_ai_usage_logs_tenant_id ON ai_usage_logs (tenant_id)`)
  }
}
