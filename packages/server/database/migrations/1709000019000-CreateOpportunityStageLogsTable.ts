import { MigrationInterface, QueryRunner } from 'typeorm'

export class CreateOpportunityStageLogsTable1709000019000 implements MigrationInterface {
  name = 'CreateOpportunityStageLogsTable1709000019000'

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE opportunity_stage_logs (
        id INT AUTO_INCREMENT PRIMARY KEY,
        opportunity_id INT NOT NULL COMMENT '商机ID',
        from_stage VARCHAR(30) NOT NULL COMMENT '原阶段',
        to_stage VARCHAR(30) NOT NULL COMMENT '目标阶段',
        from_probability INT DEFAULT 0 COMMENT '原概率',
        to_probability INT DEFAULT 0 COMMENT '目标概率',
        stay_days INT DEFAULT 0 COMMENT '在原阶段停留天数',
        operator_id INT NOT NULL COMMENT '操作人ID',
        remark VARCHAR(500) NULL COMMENT '备注',
        created_at DATETIME(6) DEFAULT CURRENT_TIMESTAMP(6),
        INDEX IDX_OPP_STAGE_LOG_OPPORTUNITY (opportunity_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='商机阶段变更日志'
    `)
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS opportunity_stage_logs`)
  }
}
