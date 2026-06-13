import { MigrationInterface, QueryRunner } from 'typeorm'

export class SeedAiConfigModules1709000106000 implements MigrationInterface {
  name = 'SeedAiConfigModules1709000106000'

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Seed per-module AI configs with sensible defaults.
    // Uses INSERT IGNORE so re-running is safe (idempotent).
    await queryRunner.query(`
      INSERT IGNORE INTO ai_configs
        (module, provider, model, temperature, max_tokens, top_p, frequency_penalty, presence_penalty, is_active, fallback_threshold)
      VALUES
        ('call_analysis',       'dashscope', 'qwen-plus',  0.30, 4096,  1.00, 0.00, 0.00, 1, 3),
        ('customer_profile',    'dashscope', 'qwen-plus',  0.50, 2000,  1.00, 0.00, 0.00, 1, 3),
        ('intent_prediction',   'dashscope', 'qwen-plus',  0.20, 1000,  1.00, 0.00, 0.00, 1, 3),
        ('employee_portrait',   'dashscope', 'qwen-plus',  0.50, 2000,  1.00, 0.00, 0.00, 1, 3),
        ('knowledge_qa',        'dashscope', 'qwen-plus',  0.70, 2000,  1.00, 0.00, 0.00, 1, 3),
        ('deal_analysis',       'dashscope', 'qwen-plus',  0.40, 2000,  1.00, 0.00, 0.00, 1, 3),
        ('communication_brief', 'dashscope', 'qwen-plus',  0.30, 3000,  1.00, 0.00, 0.00, 1, 3),
        ('risk_assessment',     'dashscope', 'qwen-plus',  0.20, 2000,  1.00, 0.00, 0.00, 1, 3)
    `)
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DELETE FROM ai_configs
      WHERE module IN (
        'call_analysis', 'customer_profile', 'intent_prediction',
        'employee_portrait', 'knowledge_qa', 'deal_analysis',
        'communication_brief', 'risk_assessment'
      )
    `)
  }
}
