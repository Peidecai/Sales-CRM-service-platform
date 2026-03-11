import { MigrationInterface, QueryRunner, Table, TableIndex } from 'typeorm'

export class CreateCampaignTasksTable1709000036000 implements MigrationInterface {
  name = 'CreateCampaignTasksTable1709000036000'

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'campaign_tasks',
        columns: [
          {
            name: 'id',
            type: 'int',
            isPrimary: true,
            isGenerated: true,
            generationStrategy: 'increment',
          },
          {
            name: 'name',
            type: 'varchar',
            length: '200',
            isNullable: false,
          },
          {
            name: 'status',
            type: 'enum',
            enum: ['draft', 'scheduled', 'running', 'paused', 'completed', 'cancelled'],
            default: "'draft'",
          },
          {
            name: 'total_count',
            type: 'int',
            default: 0,
          },
          {
            name: 'completed_count',
            type: 'int',
            default: 0,
          },
          {
            name: 'success_count',
            type: 'int',
            default: 0,
          },
          {
            name: 'start_time',
            type: 'datetime',
            isNullable: true,
          },
          {
            name: 'end_time',
            type: 'datetime',
            isNullable: true,
          },
          {
            name: 'created_by',
            type: 'int',
            isNullable: false,
          },
          {
            name: 'created_at',
            type: 'datetime',
            precision: 6,
            default: 'CURRENT_TIMESTAMP',
          },
          {
            name: 'updated_at',
            type: 'datetime',
            precision: 6,
            default: 'CURRENT_TIMESTAMP',
            onUpdate: 'CURRENT_TIMESTAMP',
          },
        ],
      }),
      true,
    )

    await queryRunner.createIndex(
      'campaign_tasks',
      new TableIndex({ name: 'IDX_campaign_tasks_status', columnNames: ['status'] }),
    )
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropIndex('campaign_tasks', 'IDX_campaign_tasks_status')
    await queryRunner.dropTable('campaign_tasks')
  }
}
