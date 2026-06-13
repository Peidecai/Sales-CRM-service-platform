import { MigrationInterface, QueryRunner } from 'typeorm'

export class AddUnicomCallRecordIdempotency1709000114000 implements MigrationInterface {
  name = 'AddUnicomCallRecordIdempotency1709000114000'

  public async up(queryRunner: QueryRunner): Promise<void> {
    const duplicates = await queryRunner.query(
      `SELECT provider_call_id, sim_number, sim_carrier, COUNT(*) AS cnt
       FROM call_records
       WHERE provider_call_id IS NOT NULL
         AND sim_number IS NOT NULL
         AND sim_carrier IS NOT NULL
       GROUP BY provider_call_id, sim_number, sim_carrier
       HAVING COUNT(*) > 1
       LIMIT 1`,
    )

    if (duplicates.length > 0) {
      throw new Error(
        'Cannot create IDX_call_records_provider_sim_unique because duplicate provider_call_id/sim_number/sim_carrier rows exist',
      )
    }

    const hasIndex = await queryRunner.query(
      `SELECT COUNT(*) as cnt FROM INFORMATION_SCHEMA.STATISTICS
       WHERE TABLE_SCHEMA = DATABASE()
         AND TABLE_NAME = 'call_records'
         AND INDEX_NAME = 'IDX_call_records_provider_sim_unique'`,
    )

    if (Number(hasIndex[0]?.cnt) === 0) {
      await queryRunner.query(
        `CREATE UNIQUE INDEX \`IDX_call_records_provider_sim_unique\`
         ON \`call_records\` (\`provider_call_id\`, \`sim_number\`, \`sim_carrier\`)`,
      )
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const hasIndex = await queryRunner.query(
      `SELECT COUNT(*) as cnt FROM INFORMATION_SCHEMA.STATISTICS
       WHERE TABLE_SCHEMA = DATABASE()
         AND TABLE_NAME = 'call_records'
         AND INDEX_NAME = 'IDX_call_records_provider_sim_unique'`,
    )

    if (Number(hasIndex[0]?.cnt) > 0) {
      await queryRunner.query(
        `DROP INDEX \`IDX_call_records_provider_sim_unique\` ON \`call_records\``,
      )
    }
  }
}
