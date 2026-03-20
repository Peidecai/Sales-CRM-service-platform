import { MigrationInterface, QueryRunner, Table, TableIndex } from 'typeorm'

export class CreateSigningProcesses1709000097000 implements MigrationInterface {
  name = 'CreateSigningProcesses1709000097000'

  public async up(queryRunner: QueryRunner): Promise<void> {
    const tableExists = await queryRunner.hasTable('signing_processes')
    if (!tableExists) {
      await queryRunner.createTable(
        new Table({
          name: 'signing_processes',
          columns: [
            { name: 'id', type: 'int', isPrimary: true, isGenerated: true, generationStrategy: 'increment' },
            { name: 'opportunity_id', type: 'int', isNullable: false },
            { name: 'contract_id', type: 'int', isNullable: true },
            { name: 'status', type: 'varchar', length: '50', default: "'draft'" },
            { name: 'amount', type: 'decimal', precision: 12, scale: 2, isNullable: false },
            { name: 'sent_at', type: 'datetime', isNullable: true },
            { name: 'signed_at', type: 'datetime', isNullable: true },
            { name: 'completed_at', type: 'datetime', isNullable: true },
            { name: 'external_sign_id', type: 'varchar', length: '500', isNullable: true },
            { name: 'sales_user_id', type: 'int', isNullable: false },
            { name: 'created_at', type: 'datetime', precision: 6, default: 'CURRENT_TIMESTAMP(6)' },
            { name: 'updated_at', type: 'datetime', precision: 6, default: 'CURRENT_TIMESTAMP(6)', onUpdate: 'CURRENT_TIMESTAMP(6)' },
            { name: 'deleted_at', type: 'datetime', precision: 6, isNullable: true },
          ],
        }),
        true,
      )

      await queryRunner.createIndices('signing_processes', [
        new TableIndex({ name: 'IDX_sp_opportunity', columnNames: ['opportunity_id'] }),
        new TableIndex({ name: 'IDX_sp_status', columnNames: ['status'] }),
        new TableIndex({ name: 'IDX_sp_sales_user', columnNames: ['sales_user_id'] }),
        new TableIndex({ name: 'IDX_sp_signed_at', columnNames: ['signed_at'] }),
      ])
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('signing_processes', true)
  }
}
