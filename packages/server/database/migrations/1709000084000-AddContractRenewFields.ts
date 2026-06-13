import { MigrationInterface, QueryRunner } from 'typeorm'

export class AddContractRenewFields1709000084000 implements MigrationInterface {
  name = 'AddContractRenewFields1709000084000'

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Check if original_contract_id column exists
    const hasOriginalContractId = await queryRunner.query(`
      SELECT COUNT(*) as cnt FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = 'contracts'
        AND COLUMN_NAME = 'original_contract_id'
    `)
    if (parseInt(hasOriginalContractId[0].cnt) === 0) {
      await queryRunner.query(`ALTER TABLE contracts ADD COLUMN original_contract_id INT NULL`)
    }

    // Check if renewed_at column exists
    const hasRenewedAt = await queryRunner.query(`
      SELECT COUNT(*) as cnt FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = 'contracts'
        AND COLUMN_NAME = 'renewed_at'
    `)
    if (parseInt(hasRenewedAt[0].cnt) === 0) {
      await queryRunner.query(`ALTER TABLE contracts ADD COLUMN renewed_at DATETIME NULL`)
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE contracts DROP COLUMN IF EXISTS renewed_at`)
    await queryRunner.query(`ALTER TABLE contracts DROP COLUMN IF EXISTS original_contract_id`)
  }
}
