import { MigrationInterface, QueryRunner } from 'typeorm'

export class ExpandOpportunitiesTable1709000018000 implements MigrationInterface {
  name = 'ExpandOpportunitiesTable1709000018000'

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE opportunities ADD COLUMN opportunity_no VARCHAR(20) NULL UNIQUE COMMENT '商机编号'`,
    )
    await queryRunner.query(
      `ALTER TABLE opportunities ADD COLUMN contact_id INT NULL COMMENT '关联联系人ID'`,
    )
    await queryRunner.query(
      `ALTER TABLE opportunities ADD COLUMN team_id INT NULL COMMENT '团队ID'`,
    )
    await queryRunner.query(
      `ALTER TABLE opportunities ADD COLUMN source VARCHAR(50) NULL COMMENT '商机来源'`,
    )
    await queryRunner.query(
      `ALTER TABLE opportunities ADD COLUMN lead_id INT NULL COMMENT '线索ID'`,
    )
    await queryRunner.query(
      `ALTER TABLE opportunities ADD COLUMN weighted_amount DECIMAL(14,2) DEFAULT 0 COMMENT '加权金额'`,
    )
    await queryRunner.query(
      `ALTER TABLE opportunities ADD COLUMN currency VARCHAR(10) DEFAULT 'CNY' COMMENT '币种'`,
    )
    await queryRunner.query(
      `ALTER TABLE opportunities ADD COLUMN actual_close_date DATE NULL COMMENT '实际成交日期'`,
    )
    await queryRunner.query(
      `ALTER TABLE opportunities ADD COLUMN close_reason VARCHAR(200) NULL COMMENT '关闭原因'`,
    )
    await queryRunner.query(
      `ALTER TABLE opportunities ADD COLUMN close_remark TEXT NULL COMMENT '关闭备注'`,
    )
    await queryRunner.query(
      `ALTER TABLE opportunities ADD COLUMN competitor_ids JSON NULL COMMENT '竞品ID列表'`,
    )
    await queryRunner.query(
      `ALTER TABLE opportunities ADD COLUMN product_ids JSON NULL COMMENT '产品ID列表'`,
    )
    await queryRunner.query(
      `ALTER TABLE opportunities ADD COLUMN priority ENUM('high','medium','low') DEFAULT 'medium' COMMENT '优先级'`,
    )
    await queryRunner.query(
      `ALTER TABLE opportunities ADD COLUMN ai_win_rate DECIMAL(5,2) NULL COMMENT 'AI预测赢率'`,
    )
    await queryRunner.query(
      `ALTER TABLE opportunities ADD COLUMN ai_suggestion TEXT NULL COMMENT 'AI建议'`,
    )
    await queryRunner.query(
      `ALTER TABLE opportunities ADD COLUMN custom_fields JSON NULL COMMENT '自定义字段'`,
    )
    await queryRunner.query(
      `ALTER TABLE opportunities ADD COLUMN status ENUM('active','won','lost','shelved') DEFAULT 'active' COMMENT '商机状态'`,
    )

    await queryRunner.query(`CREATE INDEX IDX_OPPORTUNITIES_CONTACT ON opportunities (contact_id)`)
    await queryRunner.query(`CREATE INDEX IDX_OPPORTUNITIES_STATUS ON opportunities (status)`)
    await queryRunner.query(`CREATE INDEX IDX_OPPORTUNITIES_PRIORITY ON opportunities (priority)`)
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IDX_OPPORTUNITIES_PRIORITY ON opportunities`)
    await queryRunner.query(`DROP INDEX IDX_OPPORTUNITIES_STATUS ON opportunities`)
    await queryRunner.query(`DROP INDEX IDX_OPPORTUNITIES_CONTACT ON opportunities`)

    await queryRunner.query(`ALTER TABLE opportunities DROP COLUMN status`)
    await queryRunner.query(`ALTER TABLE opportunities DROP COLUMN custom_fields`)
    await queryRunner.query(`ALTER TABLE opportunities DROP COLUMN ai_suggestion`)
    await queryRunner.query(`ALTER TABLE opportunities DROP COLUMN ai_win_rate`)
    await queryRunner.query(`ALTER TABLE opportunities DROP COLUMN priority`)
    await queryRunner.query(`ALTER TABLE opportunities DROP COLUMN product_ids`)
    await queryRunner.query(`ALTER TABLE opportunities DROP COLUMN competitor_ids`)
    await queryRunner.query(`ALTER TABLE opportunities DROP COLUMN close_remark`)
    await queryRunner.query(`ALTER TABLE opportunities DROP COLUMN close_reason`)
    await queryRunner.query(`ALTER TABLE opportunities DROP COLUMN actual_close_date`)
    await queryRunner.query(`ALTER TABLE opportunities DROP COLUMN currency`)
    await queryRunner.query(`ALTER TABLE opportunities DROP COLUMN weighted_amount`)
    await queryRunner.query(`ALTER TABLE opportunities DROP COLUMN lead_id`)
    await queryRunner.query(`ALTER TABLE opportunities DROP COLUMN source`)
    await queryRunner.query(`ALTER TABLE opportunities DROP COLUMN team_id`)
    await queryRunner.query(`ALTER TABLE opportunities DROP COLUMN contact_id`)
    await queryRunner.query(`ALTER TABLE opportunities DROP COLUMN opportunity_no`)
  }
}
