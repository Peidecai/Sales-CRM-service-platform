import { MigrationInterface, QueryRunner } from 'typeorm'

export class ExpandCallRecordsTable1709000031000 implements MigrationInterface {
  name = 'ExpandCallRecordsTable1709000031000'

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE call_records MODIFY COLUMN customer_id INT NULL COMMENT '关联客户ID'`,
    )
    await queryRunner.query(
      `ALTER TABLE call_records ADD COLUMN direction ENUM('inbound','outbound') NOT NULL DEFAULT 'outbound' COMMENT '呼叫方向'`,
    )
    await queryRunner.query(
      `ALTER TABLE call_records ADD COLUMN call_type ENUM('normal','follow_up','campaign') DEFAULT 'normal' COMMENT '呼叫类型'`,
    )
    await queryRunner.query(
      `ALTER TABLE call_records ADD COLUMN agent_id INT NULL COMMENT '坐席ID'`,
    )
    await queryRunner.query(
      `ALTER TABLE call_records ADD COLUMN status ENUM('RINGING','CONNECTED','ON_HOLD','ENDED') DEFAULT 'ENDED' COMMENT '通话状态'`,
    )
    await queryRunner.query(
      `ALTER TABLE call_records ADD COLUMN answered_at DATETIME(6) NULL COMMENT '接听时间'`,
    )
    await queryRunner.query(
      `ALTER TABLE call_records ADD COLUMN end_reason VARCHAR(50) NULL COMMENT '挂断原因'`,
    )
    await queryRunner.query(
      `ALTER TABLE call_records ADD COLUMN provider_call_id VARCHAR(100) NULL COMMENT '厂商通话ID'`,
    )

    await queryRunner.query(`CREATE INDEX IDX_call_records_agent_id ON call_records (agent_id)`)
    await queryRunner.query(`CREATE INDEX IDX_call_records_provider_call_id ON call_records (provider_call_id)`)
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IDX_call_records_provider_call_id ON call_records`)
    await queryRunner.query(`DROP INDEX IDX_call_records_agent_id ON call_records`)

    await queryRunner.query(`ALTER TABLE call_records DROP COLUMN provider_call_id`)
    await queryRunner.query(`ALTER TABLE call_records DROP COLUMN end_reason`)
    await queryRunner.query(`ALTER TABLE call_records DROP COLUMN answered_at`)
    await queryRunner.query(`ALTER TABLE call_records DROP COLUMN status`)
    await queryRunner.query(`ALTER TABLE call_records DROP COLUMN agent_id`)
    await queryRunner.query(`ALTER TABLE call_records DROP COLUMN call_type`)
    await queryRunner.query(`ALTER TABLE call_records DROP COLUMN direction`)

    await queryRunner.query(
      `ALTER TABLE call_records MODIFY COLUMN customer_id INT NOT NULL`,
    )
  }
}
