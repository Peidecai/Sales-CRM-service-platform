import { MigrationInterface, QueryRunner, Table, TableIndex } from 'typeorm'

export class CreateProductTables1709000080000 implements MigrationInterface {
  name = 'CreateProductTables1709000080000'

  public async up(queryRunner: QueryRunner): Promise<void> {
    // ── product_categories 表 ──
    await queryRunner.createTable(
      new Table({
        name: 'product_categories',
        columns: [
          {
            name: 'id',
            type: 'int',
            isPrimary: true,
            isGenerated: true,
            generationStrategy: 'increment',
          },
          { name: 'name', type: 'varchar', length: '100', isNullable: false },
          { name: 'parent_id', type: 'int', isNullable: true },
          { name: 'sort', type: 'int', default: 0, isNullable: false },
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

    // ── products 表 ──
    await queryRunner.createTable(
      new Table({
        name: 'products',
        columns: [
          {
            name: 'id',
            type: 'int',
            isPrimary: true,
            isGenerated: true,
            generationStrategy: 'increment',
          },
          { name: 'name', type: 'varchar', length: '200', isNullable: false },
          { name: 'code', type: 'varchar', length: '50', isNullable: false },
          { name: 'category_id', type: 'int', isNullable: true },
          { name: 'price', type: 'decimal', precision: 12, scale: 2, isNullable: false },
          { name: 'unit', type: 'varchar', length: '20', isNullable: false },
          {
            name: 'status',
            type: 'enum',
            enum: ['active', 'inactive', 'discontinued'],
            default: "'active'",
            isNullable: false,
          },
          { name: 'description', type: 'text', isNullable: true },
          { name: 'specs', type: 'json', isNullable: true },
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
      'products',
      new TableIndex({ name: 'IDX_product_code', columnNames: ['code'], isUnique: true }),
    )
    await queryRunner.createIndex(
      'products',
      new TableIndex({ name: 'IDX_product_category', columnNames: ['category_id'] }),
    )
    await queryRunner.createIndex(
      'products',
      new TableIndex({ name: 'IDX_product_status', columnNames: ['status'] }),
    )

    // ── opportunity_products 表 ──
    await queryRunner.createTable(
      new Table({
        name: 'opportunity_products',
        columns: [
          {
            name: 'id',
            type: 'int',
            isPrimary: true,
            isGenerated: true,
            generationStrategy: 'increment',
          },
          { name: 'opportunity_id', type: 'int', isNullable: false },
          { name: 'product_id', type: 'int', isNullable: false },
          { name: 'quantity', type: 'int', default: 1, isNullable: false },
          { name: 'unit_price', type: 'decimal', precision: 12, scale: 2, isNullable: false },
          { name: 'discount', type: 'decimal', precision: 5, scale: 2, default: 100, isNullable: false },
          { name: 'subtotal', type: 'decimal', precision: 12, scale: 2, isNullable: false },
          {
            name: 'created_at',
            type: 'timestamp',
            precision: 6,
            default: 'CURRENT_TIMESTAMP(6)',
            isNullable: false,
          },
        ],
      }),
      true,
    )

    await queryRunner.createIndex(
      'opportunity_products',
      new TableIndex({
        name: 'UQ_opp_product',
        columnNames: ['opportunity_id', 'product_id'],
        isUnique: true,
      }),
    )
    await queryRunner.createIndex(
      'opportunity_products',
      new TableIndex({ name: 'IDX_opp_product_opp', columnNames: ['opportunity_id'] }),
    )
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropIndex('opportunity_products', 'IDX_opp_product_opp')
    await queryRunner.dropIndex('opportunity_products', 'UQ_opp_product')
    await queryRunner.dropTable('opportunity_products')

    await queryRunner.dropIndex('products', 'IDX_product_status')
    await queryRunner.dropIndex('products', 'IDX_product_category')
    await queryRunner.dropIndex('products', 'IDX_product_code')
    await queryRunner.dropTable('products')

    await queryRunner.dropTable('product_categories')
  }
}
