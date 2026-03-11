import { MigrationInterface, QueryRunner, Table, TableIndex } from 'typeorm';

export class CreateCustomerTagsTables1709000014000 implements MigrationInterface {
  name = 'CreateCustomerTagsTables1709000014000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Table 1: customer_tags
    await queryRunner.createTable(
      new Table({
        name: 'customer_tags',
        columns: [
          { name: 'id', type: 'int', isPrimary: true, isGenerated: true, generationStrategy: 'increment' },
          { name: 'name', type: 'varchar', length: '50', isNullable: false, comment: '标签名称' },
          { name: 'color', type: 'varchar', length: '7', default: "'#409EFF'", comment: '标签颜色(HEX)' },
          { name: '`group`', type: 'varchar', length: '50', isNullable: true, comment: '标签分组' },
          { name: 'sort', type: 'int', default: 0, comment: '排序' },
          { name: 'created_at', type: 'datetime', precision: 6, default: 'CURRENT_TIMESTAMP(6)' },
          { name: 'updated_at', type: 'datetime', precision: 6, default: 'CURRENT_TIMESTAMP(6)', onUpdate: 'CURRENT_TIMESTAMP(6)' },
          { name: 'deleted', type: 'boolean', default: false },
        ],
      }),
      true,
    );

    await queryRunner.createIndex(
      'customer_tags',
      new TableIndex({ name: 'IDX_TAGS_NAME', columnNames: ['name'], isUnique: true }),
    );

    // Table 2: customer_tag_relations
    await queryRunner.createTable(
      new Table({
        name: 'customer_tag_relations',
        columns: [
          { name: 'id', type: 'int', isPrimary: true, isGenerated: true, generationStrategy: 'increment' },
          { name: 'customer_id', type: 'int', isNullable: false, comment: '客户ID' },
          { name: 'tag_id', type: 'int', isNullable: false, comment: '标签ID' },
          { name: 'created_at', type: 'datetime', precision: 6, default: 'CURRENT_TIMESTAMP(6)' },
        ],
      }),
      true,
    );

    await queryRunner.createIndex(
      'customer_tag_relations',
      new TableIndex({ name: 'IDX_TAG_REL_UNIQUE', columnNames: ['customer_id', 'tag_id'], isUnique: true }),
    );
    await queryRunner.createIndex(
      'customer_tag_relations',
      new TableIndex({ name: 'IDX_TAG_REL_CUSTOMER', columnNames: ['customer_id'] }),
    );
    await queryRunner.createIndex(
      'customer_tag_relations',
      new TableIndex({ name: 'IDX_TAG_REL_TAG', columnNames: ['tag_id'] }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('customer_tag_relations');
    await queryRunner.dropTable('customer_tags');
  }
}
