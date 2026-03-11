import { MigrationInterface, QueryRunner, Table, TableIndex } from 'typeorm'

export class CreatePromptTemplatesTable1709000039000 implements MigrationInterface {
  name = 'CreatePromptTemplatesTable1709000039000'

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'prompt_templates',
        columns: [
          { name: 'id', type: 'int', isPrimary: true, isGenerated: true, generationStrategy: 'increment' },
          { name: 'feature_key', type: 'varchar', length: '80', isNullable: false },
          { name: 'version', type: 'varchar', length: '20', default: "'v1'", isNullable: false },
          { name: 'content', type: 'text', isNullable: false },
          { name: 'is_active', type: 'boolean', default: true, isNullable: false },
          { name: 'is_ab_test', type: 'boolean', default: false, isNullable: false },
          { name: 'ab_ratio', type: 'decimal', precision: 3, scale: 2, default: '0.5', isNullable: false },
          { name: 'tenant_id', type: 'int', isNullable: true },
          { name: 'created_at', type: 'datetime', precision: 6, default: 'CURRENT_TIMESTAMP(6)' },
          { name: 'updated_at', type: 'datetime', precision: 6, default: 'CURRENT_TIMESTAMP(6)', onUpdate: 'CURRENT_TIMESTAMP(6)' },
        ],
      }),
      true,
    )

    await queryRunner.createIndex('prompt_templates', new TableIndex({ name: 'IDX_prompt_templates_feature_key', columnNames: ['feature_key'] }))
    await queryRunner.createIndex('prompt_templates', new TableIndex({ name: 'IDX_prompt_templates_is_active', columnNames: ['is_active'] }))

    // Seed default prompt templates
    await queryRunner.query(`
      INSERT INTO prompt_templates (feature_key, version, content, is_active) VALUES
      ('call_summary', 'v1', '你是一个专业的销售通话分析助手。请分析以下通话记录，生成结构化摘要，包括：通话摘要、客户需求、关键信息、跟进要点、下一步行动。输出JSON格式。', true),
      ('customer_profile', 'v1', '你是一个专业的客户画像分析师。请根据以下客户信息和历史互动数据，分析客户的DISC性格类型、沟通偏好、痛点和健康度评分(0-100)。输出JSON格式。', true),
      ('intent_prediction', 'v1', '你是一个销售预测专家。请根据以下客户和商机数据，预测购买概率(0-100)、预计成交日期、正向信号和负向信号。输出JSON格式。', true),
      ('anomaly_detect', 'v1', '你是一个销售异常检测专家。请分析以下数据，检测是否存在流失风险、停滞商机、情感下降等异常情况。输出JSON格式。', true),
      ('report_generate', 'v1', '你是一个销售数据分析师。请根据以下销售数据，生成周期性销售报告，包括关键指标、趋势分析、改进建议。输出JSON格式。', true),
      ('sales_forecast', 'v1', '你是一个销售预测分析师。请根据以下商机管道和历史数据，预测未来收入及置信区间。输出JSON格式。', true),
      ('competitor_analysis', 'v1', '你是一个竞品分析专家。请从以下通话记录和跟进记录中提取竞品信息，分析竞争格局。输出JSON格式。', true),
      ('script_recommend', 'v1', '你是一个销售话术顾问。请根据客户画像（DISC性格、沟通偏好、痛点）和当前商机阶段，推荐3-5条话术要点，包括开场、异议处理、促单。输出JSON格式。', true)
    `)
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('prompt_templates', true)
  }
}
