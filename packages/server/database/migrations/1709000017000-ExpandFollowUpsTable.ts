import { MigrationInterface, QueryRunner } from 'typeorm';

export class ExpandFollowUpsTable1709000017000 implements MigrationInterface {
  name = 'ExpandFollowUpsTable1709000017000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE follow_ups ADD COLUMN contact_id INT NULL COMMENT '关联联系人ID' AFTER next_follow_up_note`,
    );
    await queryRunner.query(
      `ALTER TABLE follow_ups ADD COLUMN result VARCHAR(500) NULL COMMENT '本次跟进结果' AFTER contact_id`,
    );
    await queryRunner.query(
      `ALTER TABLE follow_ups ADD COLUMN next_plan VARCHAR(500) NULL COMMENT '下次计划' AFTER result`,
    );
    await queryRunner.query(
      `ALTER TABLE follow_ups ADD COLUMN intention_level TINYINT NULL COMMENT '意向等级(1-5)' AFTER next_plan`,
    );
    await queryRunner.query(
      `ALTER TABLE follow_ups ADD COLUMN attachments JSON NULL COMMENT '附件列表([{name, url, type}])' AFTER intention_level`,
    );
    await queryRunner.query(
      `ALTER TABLE follow_ups ADD COLUMN location VARCHAR(200) NULL COMMENT '跟进地点' AFTER attachments`,
    );
    await queryRunner.query(
      `ALTER TABLE follow_ups ADD COLUMN duration INT NULL COMMENT '时长(分钟)' AFTER location`,
    );
    await queryRunner.query(
      `ALTER TABLE follow_ups ADD COLUMN call_recording_url VARCHAR(500) NULL COMMENT '录音URL' AFTER duration`,
    );
    await queryRunner.query(
      `ALTER TABLE follow_ups ADD COLUMN related_opportunity_id INT NULL COMMENT '关联商机ID' AFTER call_recording_url`,
    );

    await queryRunner.query(`ALTER TABLE follow_ups ADD INDEX IDX_FOLLOWUP_CONTACT (contact_id)`);
    await queryRunner.query(`ALTER TABLE follow_ups ADD INDEX IDX_FOLLOWUP_OPP (related_opportunity_id)`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE follow_ups DROP INDEX IDX_FOLLOWUP_OPP`);
    await queryRunner.query(`ALTER TABLE follow_ups DROP INDEX IDX_FOLLOWUP_CONTACT`);
    await queryRunner.query(`ALTER TABLE follow_ups DROP COLUMN related_opportunity_id`);
    await queryRunner.query(`ALTER TABLE follow_ups DROP COLUMN call_recording_url`);
    await queryRunner.query(`ALTER TABLE follow_ups DROP COLUMN duration`);
    await queryRunner.query(`ALTER TABLE follow_ups DROP COLUMN location`);
    await queryRunner.query(`ALTER TABLE follow_ups DROP COLUMN attachments`);
    await queryRunner.query(`ALTER TABLE follow_ups DROP COLUMN intention_level`);
    await queryRunner.query(`ALTER TABLE follow_ups DROP COLUMN next_plan`);
    await queryRunner.query(`ALTER TABLE follow_ups DROP COLUMN result`);
    await queryRunner.query(`ALTER TABLE follow_ups DROP COLUMN contact_id`);
  }
}
