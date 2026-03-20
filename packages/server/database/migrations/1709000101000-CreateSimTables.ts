import { MigrationInterface, QueryRunner, Table, TableIndex, TableUnique } from 'typeorm'

export class CreateSimTables1709000101000 implements MigrationInterface {
  name = 'CreateSimTables1709000101000'
  public async up(queryRunner: QueryRunner): Promise<void> {
    if (!(await queryRunner.hasTable('sim_preferences'))) {
      await queryRunner.createTable(new Table({
        name: 'sim_preferences',
        columns: [
          { name: 'id', type: 'int', isPrimary: true, isGenerated: true, generationStrategy: 'increment' },
          { name: 'user_id', type: 'int' },
          { name: 'default_slot', type: 'int', default: 0 },
          { name: 'sim1_number', type: 'varchar', length: '20', isNullable: true },
          { name: 'sim1_carrier', type: 'varchar', length: '20', isNullable: true },
          { name: 'sim2_number', type: 'varchar', length: '20', isNullable: true },
          { name: 'sim2_carrier', type: 'varchar', length: '20', isNullable: true },
          { name: 'last_detected_at', type: 'datetime', isNullable: true },
          { name: 'created_at', type: 'datetime', precision: 6, default: 'CURRENT_TIMESTAMP(6)' },
          { name: 'updated_at', type: 'datetime', precision: 6, default: 'CURRENT_TIMESTAMP(6)', onUpdate: 'CURRENT_TIMESTAMP(6)' },
          { name: 'deleted_at', type: 'datetime', precision: 6, isNullable: true },
        ],
        uniques: [new TableUnique({ name: 'UQ_sp_user', columnNames: ['user_id'] })],
      }), true)
    }
    if (!(await queryRunner.hasTable('customer_sim_bindings'))) {
      await queryRunner.createTable(new Table({
        name: 'customer_sim_bindings',
        columns: [
          { name: 'id', type: 'int', isPrimary: true, isGenerated: true, generationStrategy: 'increment' },
          { name: 'user_id', type: 'int' },
          { name: 'customer_id', type: 'int' },
          { name: 'sim_slot', type: 'int' },
          { name: 'reason', type: 'text', isNullable: true },
          { name: 'created_at', type: 'datetime', precision: 6, default: 'CURRENT_TIMESTAMP(6)' },
          { name: 'updated_at', type: 'datetime', precision: 6, default: 'CURRENT_TIMESTAMP(6)', onUpdate: 'CURRENT_TIMESTAMP(6)' },
          { name: 'deleted_at', type: 'datetime', precision: 6, isNullable: true },
        ],
        uniques: [new TableUnique({ name: 'UQ_csb_user_customer', columnNames: ['user_id', 'customer_id'] })],
      }), true)
    }
    // Add SIM fields to call_records
    const hasSim = await queryRunner.query(`SELECT COUNT(*) as cnt FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'call_records' AND COLUMN_NAME = 'sim_slot'`)
    if (Number(hasSim[0]?.cnt) === 0) {
      await queryRunner.query(`ALTER TABLE \`call_records\` ADD COLUMN \`sim_slot\` int NULL COMMENT 'SIM 卡槽位'`)
      await queryRunner.query(`ALTER TABLE \`call_records\` ADD COLUMN \`sim_number\` varchar(20) NULL COMMENT 'SIM 卡号码'`)
      await queryRunner.query(`ALTER TABLE \`call_records\` ADD COLUMN \`sim_carrier\` varchar(20) NULL COMMENT '运营商'`)
    }
  }
  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE \`call_records\` DROP COLUMN \`sim_carrier\``)
    await queryRunner.query(`ALTER TABLE \`call_records\` DROP COLUMN \`sim_number\``)
    await queryRunner.query(`ALTER TABLE \`call_records\` DROP COLUMN \`sim_slot\``)
    await queryRunner.dropTable('customer_sim_bindings', true)
    await queryRunner.dropTable('sim_preferences', true)
  }
}
