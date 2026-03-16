import { MigrationInterface, QueryRunner } from 'typeorm'

export class AddVoiceMemoPromptAndConfidenceNote1709000067000 implements MigrationInterface {
  name = 'AddVoiceMemoPromptAndConfidenceNote1709000067000'

  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1. ai_analysis_configs: 新增 voice_memo_prompt 列
    await queryRunner.query(
      `ALTER TABLE ai_analysis_configs ADD COLUMN voice_memo_prompt TEXT NULL COMMENT '语音速记专用分析提示词（方案B）'`,
    )

    // 2. call_analysis_results: 新增 confidence_note 列
    await queryRunner.query(
      `ALTER TABLE call_analysis_results ADD COLUMN confidence_note VARCHAR(200) NULL COMMENT '置信度说明'`,
    )

    // 3. call_analysis_results: 扩展 input_source 允许 voice_memo 值
    // MySQL ENUM 不支持 ALTER，使用 VARCHAR 已无需变更（当前为 varchar(20)）
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE call_analysis_results DROP COLUMN confidence_note`,
    )

    await queryRunner.query(
      `ALTER TABLE ai_analysis_configs DROP COLUMN voice_memo_prompt`,
    )
  }
}
