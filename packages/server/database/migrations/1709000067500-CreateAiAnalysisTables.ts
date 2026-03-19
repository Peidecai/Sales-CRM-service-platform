import { MigrationInterface, QueryRunner, Table, TableIndex } from 'typeorm'

export class CreateAiAnalysisTables1709000067500 implements MigrationInterface {
  name = 'CreateAiAnalysisTables1709000067500'

  public async up(queryRunner: QueryRunner): Promise<void> {
    // ── ai_analysis_configs 表 (singleton row, id=1) ──
    await queryRunner.createTable(
      new Table({
        name: 'ai_analysis_configs',
        columns: [
          {
            name: 'id',
            type: 'int',
            isPrimary: true,
            isNullable: false,
          },
          {
            name: 'call_analysis_enabled',
            type: 'tinyint',
            default: 1,
            isNullable: false,
          },
          {
            name: 'customer_classify_enabled',
            type: 'tinyint',
            default: 1,
            isNullable: false,
          },
          {
            name: 'speech_scoring_enabled',
            type: 'tinyint',
            default: 1,
            isNullable: false,
          },
          {
            name: 'knowledge_compare_enabled',
            type: 'tinyint',
            default: 1,
            isNullable: false,
          },
          {
            name: 'auto_create_opportunity',
            type: 'tinyint',
            default: 1,
            isNullable: false,
          },
          {
            name: 'chat_model',
            type: 'varchar',
            length: '100',
            default: "'qwen-plus'",
            isNullable: false,
          },
          {
            name: 'embedding_model',
            type: 'varchar',
            length: '100',
            default: "'text-embedding-v3'",
            isNullable: false,
          },
          {
            name: 'call_analysis_prompt',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'customer_classify_prompt',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'speech_scoring_prompt',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'voice_memo_prompt',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'classify_rules',
            type: 'json',
            isNullable: true,
          },
          {
            name: 'updated_by',
            type: 'int',
            isNullable: true,
          },
          {
            name: 'updated_at',
            type: 'timestamp',
            precision: 6,
            default: 'CURRENT_TIMESTAMP(6)',
            onUpdate: 'CURRENT_TIMESTAMP(6)',
            isNullable: false,
          },
        ],
      }),
      true,
    )

    // Seed singleton default config row (idempotent)
    const classifyRules = JSON.stringify([
      { label: '高意向', customerStatus: 'opportunity', createOpportunity: true, tags: ['高意向', '商机客户'] },
      { label: '有需求', customerStatus: 'intention', createOpportunity: false, tags: ['有需求'] },
      { label: '无意向', customerStatus: 'invalid', createOpportunity: false, tags: ['无意向'] },
      { label: '待跟进', customerStatus: 'potential', createOpportunity: false, tags: ['待跟进'] },
    ])
    const callAnalysisPrompt =
      '请分析以下通话记录，提取关键信息，包括客户需求、痛点、意向程度和跟进建议，以JSON格式输出结构化结果。'
    const customerClassifyPrompt =
      '请根据以下通话内容对客户进行分类，判断其购买意向等级，从高意向、有需求、无意向、待跟进中选择最合适的分类，并给出置信度（0-100）。'
    const speechScoringPrompt =
      '请对以下销售通话进行评分（0-100分），从专业度、沟通技巧、需求挖掘、产品介绍、异议处理五个维度进行综合评价，并给出具体改进建议。'

    await queryRunner.query(
      `INSERT IGNORE INTO ai_analysis_configs ` +
        `(id, call_analysis_enabled, customer_classify_enabled, speech_scoring_enabled, ` +
        `knowledge_compare_enabled, auto_create_opportunity, chat_model, embedding_model, ` +
        `call_analysis_prompt, customer_classify_prompt, speech_scoring_prompt, classify_rules) ` +
        `VALUES (1, 1, 1, 1, 1, 1, 'qwen-plus', 'text-embedding-v3', ` +
        `${queryRunner.connection.driver.escape(callAnalysisPrompt)}, ` +
        `${queryRunner.connection.driver.escape(customerClassifyPrompt)}, ` +
        `${queryRunner.connection.driver.escape(speechScoringPrompt)}, ` +
        `${queryRunner.connection.driver.escape(classifyRules)})`,
    )

    // ── call_analysis_results 表 ──
    await queryRunner.createTable(
      new Table({
        name: 'call_analysis_results',
        columns: [
          {
            name: 'id',
            type: 'int',
            isPrimary: true,
            isGenerated: true,
            generationStrategy: 'increment',
          },
          {
            name: 'call_record_id',
            type: 'int',
            isNullable: false,
          },
          {
            name: 'customer_id',
            type: 'int',
            isNullable: true,
          },
          {
            name: 'analysis_type',
            type: 'varchar',
            length: '20',
            default: "'full'",
            isNullable: false,
          },
          {
            name: 'input_source',
            type: 'varchar',
            length: '20',
            default: "'both'",
            isNullable: false,
          },
          {
            name: 'customer_classify',
            type: 'varchar',
            length: '100',
            isNullable: true,
          },
          {
            name: 'classify_confidence',
            type: 'decimal',
            precision: 5,
            scale: 4,
            isNullable: true,
          },
          {
            name: 'suggested_status',
            type: 'varchar',
            length: '50',
            isNullable: true,
          },
          {
            name: 'suggested_tags',
            type: 'json',
            isNullable: true,
          },
          {
            name: 'speech_score',
            type: 'decimal',
            precision: 5,
            scale: 2,
            isNullable: true,
          },
          {
            name: 'speech_feedback',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'knowledge_match_rate',
            type: 'decimal',
            precision: 5,
            scale: 4,
            isNullable: true,
          },
          {
            name: 'knowledge_gaps',
            type: 'json',
            isNullable: true,
          },
          {
            name: 'summary',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'raw_ai_response',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'opportunity_created',
            type: 'tinyint',
            default: 0,
            isNullable: false,
          },
          {
            name: 'opportunity_id',
            type: 'int',
            isNullable: true,
          },
          {
            name: 'applied_at',
            type: 'datetime',
            precision: 6,
            isNullable: true,
          },
          {
            name: 'manual_note',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'status',
            type: 'varchar',
            length: '20',
            default: "'pending'",
            isNullable: false,
          },
          {
            name: 'confidence_note',
            type: 'varchar',
            length: '200',
            isNullable: true,
          },
          {
            name: 'created_at',
            type: 'timestamp',
            precision: 6,
            default: 'CURRENT_TIMESTAMP(6)',
            isNullable: false,
          },
          {
            name: 'updated_at',
            type: 'timestamp',
            precision: 6,
            default: 'CURRENT_TIMESTAMP(6)',
            onUpdate: 'CURRENT_TIMESTAMP(6)',
            isNullable: false,
          },
          {
            name: 'deleted_at',
            type: 'timestamp',
            precision: 6,
            isNullable: true,
          },
        ],
      }),
      true,
    )

    await queryRunner.createIndex(
      'call_analysis_results',
      new TableIndex({
        name: 'IDX_CALL_ANALYSIS_RESULTS_CALL_RECORD_ID',
        columnNames: ['call_record_id'],
      }),
    )

    await queryRunner.createIndex(
      'call_analysis_results',
      new TableIndex({
        name: 'IDX_CALL_ANALYSIS_RESULTS_CUSTOMER_ID',
        columnNames: ['customer_id'],
      }),
    )

    await queryRunner.createIndex(
      'call_analysis_results',
      new TableIndex({
        name: 'IDX_CALL_ANALYSIS_RESULTS_STATUS',
        columnNames: ['status'],
      }),
    )
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop in reverse creation order
    await queryRunner.dropIndex('call_analysis_results', 'IDX_CALL_ANALYSIS_RESULTS_STATUS')
    await queryRunner.dropIndex('call_analysis_results', 'IDX_CALL_ANALYSIS_RESULTS_CUSTOMER_ID')
    await queryRunner.dropIndex('call_analysis_results', 'IDX_CALL_ANALYSIS_RESULTS_CALL_RECORD_ID')
    await queryRunner.dropTable('call_analysis_results')

    await queryRunner.dropTable('ai_analysis_configs')
  }
}
