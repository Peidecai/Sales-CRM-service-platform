import { MigrationInterface, QueryRunner } from 'typeorm'

export class ExtendCustomerProfileForIntent1709000097000 implements MigrationInterface {
  name = 'ExtendCustomerProfileForIntent1709000097000'

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Add new columns to customer_profiles for intent/risk/occupation data
    const table = await queryRunner.getTable('customer_profiles')
    if (!table) return

    const columnsToAdd = [
      { name: 'intent_level', def: "ADD COLUMN `intent_level` VARCHAR(50) NULL" },
      { name: 'intent_tags', def: "ADD COLUMN `intent_tags` JSON NULL" },
      { name: 'risk_level', def: "ADD COLUMN `risk_level` VARCHAR(50) NULL" },
      { name: 'risk_text', def: "ADD COLUMN `risk_text` TEXT NULL" },
      { name: 'risk_advice', def: "ADD COLUMN `risk_advice` TEXT NULL" },
      { name: 'occupation_tags', def: "ADD COLUMN `occupation_tags` JSON NULL" },
      { name: 'wechat_status', def: "ADD COLUMN `wechat_status` VARCHAR(50) NULL" },
    ]

    for (const col of columnsToAdd) {
      const exists = table.columns.find((c) => c.name === col.name)
      if (!exists) {
        await queryRunner.query(`ALTER TABLE \`customer_profiles\` ${col.def}`)
      }
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const columns = [
      'intent_level', 'intent_tags', 'risk_level',
      'risk_text', 'risk_advice', 'occupation_tags', 'wechat_status',
    ]
    for (const col of columns) {
      try {
        await queryRunner.query(`ALTER TABLE \`customer_profiles\` DROP COLUMN \`${col}\``)
      } catch {
        // Column may not exist
      }
    }
  }
}
