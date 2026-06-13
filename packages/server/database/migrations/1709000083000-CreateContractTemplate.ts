import { MigrationInterface, QueryRunner, Table, TableIndex } from 'typeorm'

export class CreateContractTemplate1709000083000 implements MigrationInterface {
  name = 'CreateContractTemplate1709000083000'

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'contract_templates',
        columns: [
          {
            name: 'id',
            type: 'int',
            isPrimary: true,
            isGenerated: true,
            generationStrategy: 'increment',
          },
          { name: 'name', type: 'varchar', length: '200', isNullable: false },
          { name: 'content', type: 'longtext', isNullable: false },
          { name: 'category', type: 'varchar', length: '50', isNullable: true },
          { name: 'variables', type: 'text', isNullable: true, comment: 'simple-json: TemplateVariable[]' },
          { name: 'is_default', type: 'tinyint', default: 0, isNullable: false },
          { name: 'created_by', type: 'int', isNullable: false },
          {
            name: 'created_at',
            type: 'timestamp',
            precision: 6,
            default: 'CURRENT_TIMESTAMP(6)',
            isNullable: false,
          },
          {
            name: 'updated_at',
            type: 'timestamp',
            precision: 6,
            default: 'CURRENT_TIMESTAMP(6)',
            onUpdate: 'CURRENT_TIMESTAMP(6)',
            isNullable: false,
          },
          { name: 'deleted_at', type: 'timestamp', precision: 6, isNullable: true },
        ],
      }),
      true,
    )

    await queryRunner.createIndex(
      'contract_templates',
      new TableIndex({ name: 'IDX_ct_category', columnNames: ['category'] }),
    )
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropIndex('contract_templates', 'IDX_ct_category')
    await queryRunner.dropTable('contract_templates')
  }
}
