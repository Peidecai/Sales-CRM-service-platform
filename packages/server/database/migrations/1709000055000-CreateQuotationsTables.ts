import { MigrationInterface, QueryRunner, Table, TableIndex } from 'typeorm'

export class CreateQuotationsTables1709000055000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'quotations',
        columns: [
          { name: 'id', type: 'int', isPrimary: true, isGenerated: true, generationStrategy: 'increment', unsigned: true },
          { name: 'quotation_no', type: 'varchar', length: '32', isUnique: true },
          { name: 'title', type: 'varchar', length: '200' },
          { name: 'opportunity_id', type: 'int', unsigned: true },
          { name: 'customer_id', type: 'int', unsigned: true },
          { name: 'contact_id', type: 'int', isNullable: true, unsigned: true },
          { name: 'owner_id', type: 'int', unsigned: true },
          { name: 'version', type: 'int', default: 1 },
          { name: 'currency', type: 'varchar', length: '3', default: "'CNY'" },
          { name: 'subtotal', type: 'decimal', precision: 15, scale: 2, default: 0 },
          { name: 'discount_type', type: 'varchar', length: '10', isNullable: true },
          { name: 'discount_value', type: 'decimal', precision: 10, scale: 2, default: 0 },
          { name: 'discount_amount', type: 'decimal', precision: 15, scale: 2, default: 0 },
          { name: 'tax_rate', type: 'decimal', precision: 5, scale: 2, default: 0 },
          { name: 'tax_amount', type: 'decimal', precision: 15, scale: 2, default: 0 },
          { name: 'total_amount', type: 'decimal', precision: 15, scale: 2, default: 0 },
          { name: 'valid_until', type: 'date' },
          { name: 'payment_terms', type: 'varchar', length: '500', isNullable: true },
          { name: 'delivery_terms', type: 'varchar', length: '500', isNullable: true },
          { name: 'remark', type: 'text', isNullable: true },
          { name: 'status', type: 'enum', enum: ['draft', 'pending_approval', 'approved', 'rejected', 'sent', 'accepted', 'expired', 'cancelled'], default: "'draft'" },
          { name: 'sent_at', type: 'datetime', isNullable: true },
          { name: 'accepted_at', type: 'datetime', isNullable: true },
          { name: 'attachments', type: 'json', isNullable: true },
          { name: 'created_by', type: 'int', unsigned: true },
          { name: 'created_at', type: 'datetime', default: 'CURRENT_TIMESTAMP' },
          { name: 'updated_at', type: 'datetime', default: 'CURRENT_TIMESTAMP', onUpdate: 'CURRENT_TIMESTAMP' },
          { name: 'deleted', type: 'tinyint', default: 0 },
        ],
      }),
      true,
    )

    await queryRunner.createIndex('quotations', new TableIndex({ name: 'idx_quotations_opportunity', columnNames: ['opportunity_id'] }))
    await queryRunner.createIndex('quotations', new TableIndex({ name: 'idx_quotations_customer', columnNames: ['customer_id'] }))
    await queryRunner.createIndex('quotations', new TableIndex({ name: 'idx_quotations_owner', columnNames: ['owner_id'] }))
    await queryRunner.createIndex('quotations', new TableIndex({ name: 'idx_quotations_status', columnNames: ['status'] }))

    await queryRunner.createTable(
      new Table({
        name: 'quotation_items',
        columns: [
          { name: 'id', type: 'int', isPrimary: true, isGenerated: true, generationStrategy: 'increment', unsigned: true },
          { name: 'quotation_id', type: 'int', unsigned: true },
          { name: 'product_name', type: 'varchar', length: '200' },
          { name: 'product_spec', type: 'varchar', length: '500', isNullable: true },
          { name: 'unit', type: 'varchar', length: '20', isNullable: true },
          { name: 'quantity', type: 'decimal', precision: 10, scale: 2, default: 1 },
          { name: 'unit_price', type: 'decimal', precision: 15, scale: 2 },
          { name: 'list_price', type: 'decimal', precision: 15, scale: 2, default: 0 },
          { name: 'discount_rate', type: 'decimal', precision: 5, scale: 2, default: 0 },
          { name: 'line_amount', type: 'decimal', precision: 15, scale: 2 },
          { name: 'sort_order', type: 'int', default: 0 },
          { name: 'remark', type: 'varchar', length: '500', isNullable: true },
        ],
      }),
      true,
    )

    await queryRunner.createIndex('quotation_items', new TableIndex({ name: 'idx_qi_quotation', columnNames: ['quotation_id'] }))
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('quotation_items', true)
    await queryRunner.dropTable('quotations', true)
  }
}
