import { MigrationInterface, QueryRunner, TableIndex } from 'typeorm'

/**
 * Add indexes on 12 frequently-queried foreign-key columns that were missing indexes.
 */
export class AddMissingForeignKeyIndexes1709000061000 implements MigrationInterface {
  private readonly indexes: { table: string; columns: string[]; name: string }[] = [
    { table: 'call_records', columns: ['opportunity_id'], name: 'IDX_call_records_opportunity_id' },
    { table: 'knowledge_categories', columns: ['parent_id'], name: 'IDX_knowledge_categories_parent_id' },
    { table: 'campaign_call_items', columns: ['customer_id'], name: 'IDX_campaign_call_items_customer_id' },
    { table: 'campaign_call_items', columns: ['contact_id'], name: 'IDX_campaign_call_items_contact_id' },
    { table: 'campaign_call_items', columns: ['call_record_id'], name: 'IDX_campaign_call_items_call_record_id' },
    { table: 'ai_alerts', columns: ['customer_id'], name: 'IDX_ai_alerts_customer_id' },
    { table: 'ai_alerts', columns: ['opportunity_id'], name: 'IDX_ai_alerts_opportunity_id' },
    { table: 'intent_predictions', columns: ['customer_id'], name: 'IDX_intent_predictions_customer_id' },
    { table: 'intent_predictions', columns: ['opportunity_id'], name: 'IDX_intent_predictions_opportunity_id' },
    { table: 'competitor_reports', columns: ['customer_id'], name: 'IDX_competitor_reports_customer_id' },
    { table: 'competitor_reports', columns: ['opportunity_id'], name: 'IDX_competitor_reports_opportunity_id' },
    { table: 'sys_role_departments', columns: ['department_id'], name: 'IDX_sys_role_departments_department_id' },
  ]

  public async up(queryRunner: QueryRunner): Promise<void> {
    for (const idx of this.indexes) {
      await queryRunner.createIndex(
        idx.table,
        new TableIndex({ name: idx.name, columnNames: idx.columns }),
      ).catch(() => { /* ignore duplicate key name — index may already exist */ })
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    for (const idx of this.indexes.reverse()) {
      await queryRunner.dropIndex(idx.table, idx.name).catch(() => {})
    }
  }
}
