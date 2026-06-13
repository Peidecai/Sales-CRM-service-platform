import { MigrationInterface, QueryRunner, Table, TableIndex } from 'typeorm'

export class CreateAiConfigTables1709000096000 implements MigrationInterface {
  name = 'CreateAiConfigTables1709000096000'

  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1. ai_configs
    await queryRunner.createTable(
      new Table({
        name: 'ai_configs',
        columns: [
          { name: 'id', type: 'int', isPrimary: true, isGenerated: true, generationStrategy: 'increment' },
          { name: 'module', type: 'varchar', length: '50', isUnique: true, comment: 'AI模块标识' },
          { name: 'provider', type: 'varchar', length: '50', comment: 'AI提供商' },
          { name: 'model', type: 'varchar', length: '100', comment: '模型名称' },
          { name: 'temperature', type: 'decimal', precision: 3, scale: 2, default: 0.7 },
          { name: 'max_tokens', type: 'int', default: 2000 },
          { name: 'top_p', type: 'decimal', precision: 3, scale: 2, default: 1.0 },
          { name: 'frequency_penalty', type: 'decimal', precision: 3, scale: 2, default: 0 },
          { name: 'presence_penalty', type: 'decimal', precision: 3, scale: 2, default: 0 },
          { name: 'is_active', type: 'tinyint', default: 1 },
          { name: 'fallback_model', type: 'varchar', length: '50', isNullable: true },
          { name: 'fallback_threshold', type: 'int', default: 3 },
          { name: 'updated_by_id', type: 'int', isNullable: true },
          { name: 'created_at', type: 'datetime', precision: 6, default: 'CURRENT_TIMESTAMP(6)' },
          { name: 'updated_at', type: 'datetime', precision: 6, default: 'CURRENT_TIMESTAMP(6)', onUpdate: 'CURRENT_TIMESTAMP(6)' },
          { name: 'deleted_at', type: 'datetime', precision: 6, isNullable: true },
        ],
      }),
      true,
    )

    // 2. ai_prompt_templates
    await queryRunner.createTable(
      new Table({
        name: 'ai_prompt_templates',
        columns: [
          { name: 'id', type: 'int', isPrimary: true, isGenerated: true, generationStrategy: 'increment' },
          { name: 'name', type: 'varchar', length: '100' },
          { name: 'module', type: 'varchar', length: '50' },
          { name: 'scene', type: 'varchar', length: '50' },
          { name: 'system_prompt', type: 'text' },
          { name: 'user_prompt_template', type: 'text', isNullable: true },
          { name: 'version', type: 'int', default: 1 },
          { name: 'is_active', type: 'tinyint', default: 1 },
          { name: 'description', type: 'text', isNullable: true },
          { name: 'created_by_id', type: 'int' },
          { name: 'created_at', type: 'datetime', precision: 6, default: 'CURRENT_TIMESTAMP(6)' },
          { name: 'updated_at', type: 'datetime', precision: 6, default: 'CURRENT_TIMESTAMP(6)', onUpdate: 'CURRENT_TIMESTAMP(6)' },
          { name: 'deleted_at', type: 'datetime', precision: 6, isNullable: true },
        ],
      }),
      true,
    )

    await queryRunner.createIndex(
      'ai_prompt_templates',
      new TableIndex({ name: 'IDX_ai_prompt_tpl_module_scene', columnNames: ['module', 'scene'] }),
    )

    // 3. ai_prompt_histories
    await queryRunner.createTable(
      new Table({
        name: 'ai_prompt_histories',
        columns: [
          { name: 'id', type: 'int', isPrimary: true, isGenerated: true, generationStrategy: 'increment' },
          { name: 'template_id', type: 'int' },
          { name: 'version', type: 'int' },
          { name: 'system_prompt', type: 'text' },
          { name: 'user_prompt_template', type: 'text', isNullable: true },
          { name: 'change_note', type: 'text', isNullable: true },
          { name: 'changed_by_id', type: 'int' },
          { name: 'created_at', type: 'datetime', precision: 6, default: 'CURRENT_TIMESTAMP(6)' },
          { name: 'updated_at', type: 'datetime', precision: 6, default: 'CURRENT_TIMESTAMP(6)', onUpdate: 'CURRENT_TIMESTAMP(6)' },
          { name: 'deleted_at', type: 'datetime', precision: 6, isNullable: true },
        ],
      }),
      true,
    )

    await queryRunner.createIndex(
      'ai_prompt_histories',
      new TableIndex({ name: 'IDX_ai_prompt_hist_template', columnNames: ['template_id'] }),
    )

    // 4. ai_usage_logs — may already exist from migration 38000
    const hasUsageLogs = await queryRunner.hasTable('ai_usage_logs')
    if (!hasUsageLogs) {
      await queryRunner.createTable(
        new Table({
          name: 'ai_usage_logs',
          columns: [
            { name: 'id', type: 'int', isPrimary: true, isGenerated: true, generationStrategy: 'increment' },
            { name: 'module', type: 'varchar', length: '50' },
            { name: 'model', type: 'varchar', length: '100' },
            { name: 'prompt_tokens', type: 'int', default: 0 },
            { name: 'completion_tokens', type: 'int', default: 0 },
            { name: 'total_tokens', type: 'int', default: 0 },
            { name: 'estimated_cost', type: 'decimal', precision: 10, scale: 6, default: 0 },
            { name: 'latency_ms', type: 'int', default: 0 },
            { name: 'is_success', type: 'tinyint', default: 1 },
            { name: 'error_message', type: 'text', isNullable: true },
            { name: 'triggered_by_id', type: 'int', isNullable: true },
            { name: 'created_at', type: 'datetime', precision: 6, default: 'CURRENT_TIMESTAMP(6)' },
          ],
        }),
        true,
      )

      await queryRunner.createIndex(
        'ai_usage_logs',
        new TableIndex({ name: 'IDX_ai_usage_module_created', columnNames: ['module', 'created_at'] }),
      )
    }

    // Seed default config
    await queryRunner.query(`
      INSERT IGNORE INTO ai_configs (module, provider, model, temperature, max_tokens, top_p, frequency_penalty, presence_penalty, is_active, fallback_threshold)
      VALUES ('default', 'openai', 'gpt-4o-mini', 0.70, 2000, 1.00, 0.00, 0.00, 1, 3)
    `)
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('ai_usage_logs', true)
    await queryRunner.dropTable('ai_prompt_histories', true)
    await queryRunner.dropTable('ai_prompt_templates', true)
    await queryRunner.dropTable('ai_configs', true)
  }
}
