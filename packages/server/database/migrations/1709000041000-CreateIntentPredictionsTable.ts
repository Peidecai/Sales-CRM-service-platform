import { MigrationInterface, QueryRunner, Table, TableIndex } from 'typeorm'

export class CreateIntentPredictionsTable1709000041000 implements MigrationInterface {
  name = 'CreateIntentPredictionsTable1709000041000'

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'intent_predictions',
        columns: [
          { name: 'id', type: 'int', isPrimary: true, isGenerated: true, generationStrategy: 'increment' },
          { name: 'customer_id', type: 'int', isNullable: false },
          { name: 'opportunity_id', type: 'int', isNullable: true },
          { name: 'purchase_probability', type: 'decimal', precision: 5, scale: 2, isNullable: false, default: '0' },
          { name: 'predicted_close_date', type: 'date', isNullable: true },
          { name: 'positive_signals', type: 'json', isNullable: true },
          { name: 'negative_signals', type: 'json', isNullable: true },
          { name: 'created_at', type: 'datetime', precision: 6, default: 'CURRENT_TIMESTAMP(6)' },
          { name: 'updated_at', type: 'datetime', precision: 6, default: 'CURRENT_TIMESTAMP(6)', onUpdate: 'CURRENT_TIMESTAMP(6)' },
        ],
      }),
      true,
    )

    await queryRunner.createIndex('intent_predictions', new TableIndex({ name: 'IDX_intent_predictions_customer_id', columnNames: ['customer_id'] }))
    await queryRunner.createIndex('intent_predictions', new TableIndex({ name: 'IDX_intent_predictions_opportunity_id', columnNames: ['opportunity_id'] }))
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('intent_predictions', true)
  }
}
