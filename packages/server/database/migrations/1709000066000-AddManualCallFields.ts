import { MigrationInterface, QueryRunner } from 'typeorm'

export class AddManualCallFields1709000066000 implements MigrationInterface {
  name = 'AddManualCallFields1709000066000'

  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1. call_records: 扩展 call_type ENUM 增加 manual, callback
    await queryRunner.query(
      `ALTER TABLE call_records MODIFY COLUMN call_type ENUM('normal','follow_up','campaign','manual','callback') DEFAULT 'normal' COMMENT '呼叫类型'`,
    )

    // 2. call_records: 新增 estimated_duration (方案B用户估算通话时长)
    await queryRunner.query(
      `ALTER TABLE call_records ADD COLUMN estimated_duration INT NULL COMMENT '估算通话时长（秒），方案B专用'`,
    )

    // 3. call_records: 新增 call_result
    await queryRunner.query(
      `ALTER TABLE call_records ADD COLUMN call_result ENUM('connected','no_answer','busy','power_off') NULL COMMENT '通话结果'`,
    )

    // 4. recording_files: 新增 source_type
    await queryRunner.query(
      `ALTER TABLE recording_files ADD COLUMN source_type ENUM('platform','voice_memo') NOT NULL DEFAULT 'platform' COMMENT '录音来源: platform=平台录音, voice_memo=语音速记'`,
    )
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE recording_files DROP COLUMN source_type`,
    )

    await queryRunner.query(
      `ALTER TABLE call_records DROP COLUMN call_result`,
    )

    await queryRunner.query(
      `ALTER TABLE call_records DROP COLUMN estimated_duration`,
    )

    // 恢复原 call_type ENUM
    await queryRunner.query(
      `ALTER TABLE call_records MODIFY COLUMN call_type ENUM('normal','follow_up','campaign') DEFAULT 'normal' COMMENT '呼叫类型'`,
    )
  }
}
