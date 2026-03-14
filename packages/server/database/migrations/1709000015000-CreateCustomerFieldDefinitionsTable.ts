import { MigrationInterface, QueryRunner, Table, TableIndex } from 'typeorm';

export class CreateCustomerFieldDefinitionsTable1709000015000 implements MigrationInterface {
  name = 'CreateCustomerFieldDefinitionsTable1709000015000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'customer_field_definitions',
        columns: [
          { name: 'id', type: 'int', isPrimary: true, isGenerated: true, generationStrategy: 'increment' },
          { name: 'field_key', type: 'varchar', length: '50', isNullable: false, comment: '字段标识(英文)' },
          { name: 'field_label', type: 'varchar', length: '100', isNullable: false, comment: '字段显示名(中文)' },
          { name: 'field_type', type: 'enum', enum: ['text', 'number', 'date', 'select', 'multi_select', 'radio', 'checkbox', 'textarea'], isNullable: false, comment: '字段类型' },
          { name: 'options', type: 'json', isNullable: true, comment: '选项配置(select/radio/checkbox用)' },
          { name: 'required', type: 'boolean', default: false, comment: '是否必填' },
          { name: 'default_value', type: 'varchar', length: '500', isNullable: true, comment: '默认值' },
          { name: 'sort', type: 'int', default: 0, comment: '排序' },
          { name: 'is_active', type: 'boolean', default: true, comment: '是否启用' },
          { name: 'created_at', type: 'datetime', precision: 6, default: 'CURRENT_TIMESTAMP(6)' },
          { name: 'updated_at', type: 'datetime', precision: 6, default: 'CURRENT_TIMESTAMP(6)', onUpdate: 'CURRENT_TIMESTAMP(6)' },
          { name: 'deleted', type: 'boolean', default: false },
        ],
      }),
      true,
    );

    await queryRunner.createIndex(
      'customer_field_definitions',
      new TableIndex({ name: 'IDX_FIELD_DEF_KEY', columnNames: ['field_key'], isUnique: true }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('customer_field_definitions');
  }
}
