import { MigrationInterface, QueryRunner } from 'typeorm'

export class AddCallRecordClientCallId1709000112000 implements MigrationInterface {
  name = 'AddCallRecordClientCallId1709000112000'

  public async up(queryRunner: QueryRunner): Promise<void> {
    const hasColumn = await queryRunner.query(
      `SELECT COUNT(*) as cnt FROM INFORMATION_SCHEMA.COLUMNS
       WHERE TABLE_SCHEMA = DATABASE()
         AND TABLE_NAME = 'call_records'
         AND COLUMN_NAME = 'client_call_id'`,
    )

    if (Number(hasColumn[0]?.cnt) === 0) {
      await queryRunner.query(
        `ALTER TABLE \`call_records\`
         ADD COLUMN \`client_call_id\` varchar(100) NULL COMMENT '客户端生成的通话幂等ID'`,
      )
    }

    const hasIndex = await queryRunner.query(
      `SELECT COUNT(*) as cnt FROM INFORMATION_SCHEMA.STATISTICS
       WHERE TABLE_SCHEMA = DATABASE()
         AND TABLE_NAME = 'call_records'
         AND INDEX_NAME = 'IDX_call_records_client_call_id'`,
    )

    if (Number(hasIndex[0]?.cnt) === 0) {
      await queryRunner.query(
        `CREATE UNIQUE INDEX \`IDX_call_records_client_call_id\`
         ON \`call_records\` (\`client_call_id\`)`,
      )
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const hasIndex = await queryRunner.query(
      `SELECT COUNT(*) as cnt FROM INFORMATION_SCHEMA.STATISTICS
       WHERE TABLE_SCHEMA = DATABASE()
         AND TABLE_NAME = 'call_records'
         AND INDEX_NAME = 'IDX_call_records_client_call_id'`,
    )

    if (Number(hasIndex[0]?.cnt) > 0) {
      await queryRunner.query(`DROP INDEX \`IDX_call_records_client_call_id\` ON \`call_records\``)
    }

    const hasColumn = await queryRunner.query(
      `SELECT COUNT(*) as cnt FROM INFORMATION_SCHEMA.COLUMNS
       WHERE TABLE_SCHEMA = DATABASE()
         AND TABLE_NAME = 'call_records'
         AND COLUMN_NAME = 'client_call_id'`,
    )

    if (Number(hasColumn[0]?.cnt) > 0) {
      await queryRunner.query(`ALTER TABLE \`call_records\` DROP COLUMN \`client_call_id\``)
    }
  }
}
