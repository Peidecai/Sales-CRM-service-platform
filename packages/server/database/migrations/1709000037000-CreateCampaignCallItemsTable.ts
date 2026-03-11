import { MigrationInterface, QueryRunner, Table, TableIndex } from 'typeorm'

export class CreateCampaignCallItemsTable1709000037000 implements MigrationInterface {
  name = 'CreateCampaignCallItemsTable1709000037000'

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'campaign_call_items',
        columns: [
          {
            name: 'id',
            type: 'int',
            isPrimary: true,
            isGenerated: true,
            generationStrategy: 'increment',
          },
          {
            name: 'campaign_task_id',
            type: 'int',
            isNullable: false,
          },
          {
            name: 'customer_id',
            type: 'int',
            isNullable: true,
          },
          {
            name: 'contact_id',
            type: 'int',
            isNullable: true,
          },
          {
            name: 'phone',
            type: 'varchar',
            length: '20',
            isNullable: false,
          },
          {
            name: 'call_status',
            type: 'enum',
            enum: ['pending', 'calling', 'completed', 'failed', 'no_answer'],
            default: "'pending'",
          },
          {
            name: 'call_record_id',
            type: 'int',
            isNullable: true,
          },
          {
            name: 'dial_at',
            type: 'datetime',
            isNullable: true,
          },
          {
            name: 'completed_at',
            type: 'datetime',
            isNullable: true,
          },
          {
            name: 'created_at',
            type: 'datetime',
            precision: 6,
            default: 'CURRENT_TIMESTAMP',
          },
        ],
      }),
      true,
    )

    await queryRunner.createIndex(
      'campaign_call_items',
      new TableIndex({ name: 'IDX_campaign_call_items_task_id', columnNames: ['campaign_task_id'] }),
    )
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropIndex('campaign_call_items', 'IDX_campaign_call_items_task_id')
    await queryRunner.dropTable('campaign_call_items')
  }
}
