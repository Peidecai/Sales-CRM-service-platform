import { MigrationInterface, QueryRunner } from 'typeorm'

export class CreateOpportunityFollowLogsTable1709000020000 implements MigrationInterface {
  name = 'CreateOpportunityFollowLogsTable1709000020000'

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE opportunity_follow_logs (
        id INT AUTO_INCREMENT PRIMARY KEY,
        opportunity_id INT NOT NULL COMMENT '商机ID',
        user_id INT NOT NULL COMMENT '操作人ID',
        type ENUM('call','visit','email','wechat','meeting','demo','other') NOT NULL COMMENT '跟进类型',
        content TEXT NOT NULL COMMENT '跟进内容',
        result VARCHAR(500) NULL COMMENT '跟进结果',
        next_step VARCHAR(500) NULL COMMENT '下一步计划',
        attachments JSON NULL COMMENT '附件列表',
        created_at DATETIME(6) DEFAULT CURRENT_TIMESTAMP(6),
        updated_at DATETIME(6) DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
        deleted TINYINT(1) DEFAULT 0,
        INDEX IDX_OPP_FOLLOW_LOG_OPPORTUNITY (opportunity_id),
        INDEX IDX_OPP_FOLLOW_LOG_USER (user_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='商机跟进日志'
    `)
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS opportunity_follow_logs`)
  }
}
