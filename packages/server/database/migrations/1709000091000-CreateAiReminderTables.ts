import { MigrationInterface, QueryRunner, Table, TableIndex } from 'typeorm'

export class CreateAiReminderTables1709000091000 implements MigrationInterface {
  name = 'CreateAiReminderTables1709000091000'

  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1. opportunity_scores
    await queryRunner.createTable(
      new Table({
        name: 'opportunity_scores',
        columns: [
          { name: 'id', type: 'int', isPrimary: true, isGenerated: true, generationStrategy: 'increment' },
          { name: 'opportunity_id', type: 'int' },
          { name: 'score', type: 'int' },
          { name: 'dimensions', type: 'json' },
          { name: 'ai_reasoning', type: 'text', isNullable: true },
          { name: 'scored_at', type: 'datetime' },
          { name: 'created_at', type: 'datetime', default: 'CURRENT_TIMESTAMP' },
          { name: 'updated_at', type: 'datetime', default: 'CURRENT_TIMESTAMP', onUpdate: 'CURRENT_TIMESTAMP' },
          { name: 'deleted_at', type: 'datetime', isNullable: true },
        ],
      }),
      true,
    )
    await queryRunner.createIndex('opportunity_scores', new TableIndex({
      name: 'IDX_opp_scores_opportunity_id',
      columnNames: ['opportunity_id'],
    }))

    // 2. ai_reminders
    await queryRunner.createTable(
      new Table({
        name: 'ai_reminders',
        columns: [
          { name: 'id', type: 'int', isPrimary: true, isGenerated: true, generationStrategy: 'increment' },
          { name: 'opportunity_id', type: 'int', isNullable: true },
          { name: 'customer_id', type: 'int', isNullable: true },
          { name: 'user_id', type: 'int' },
          { name: 'type', type: 'varchar', length: '50' },
          { name: 'title', type: 'varchar', length: '200' },
          { name: 'content', type: 'text' },
          { name: 'priority', type: 'varchar', length: '20', default: "'medium'" },
          { name: 'is_read', type: 'boolean', default: false },
          { name: 'feedback', type: 'varchar', length: '20', isNullable: true },
          { name: 'feedback_at', type: 'datetime', isNullable: true },
          { name: 'scheduled_at', type: 'datetime', isNullable: true },
          { name: 'created_at', type: 'datetime', default: 'CURRENT_TIMESTAMP' },
          { name: 'updated_at', type: 'datetime', default: 'CURRENT_TIMESTAMP', onUpdate: 'CURRENT_TIMESTAMP' },
          { name: 'deleted_at', type: 'datetime', isNullable: true },
        ],
      }),
      true,
    )
    await queryRunner.createIndex('ai_reminders', new TableIndex({
      name: 'IDX_ai_reminders_user_id',
      columnNames: ['user_id'],
    }))

    // 3. competitor_mentions
    await queryRunner.createTable(
      new Table({
        name: 'competitor_mentions',
        columns: [
          { name: 'id', type: 'int', isPrimary: true, isGenerated: true, generationStrategy: 'increment' },
          { name: 'call_record_id', type: 'int' },
          { name: 'opportunity_id', type: 'int', isNullable: true },
          { name: 'competitor_name', type: 'varchar', length: '200' },
          { name: 'context', type: 'text', isNullable: true },
          { name: 'sentiment', type: 'varchar', length: '30' },
          { name: 'created_at', type: 'datetime', default: 'CURRENT_TIMESTAMP' },
          { name: 'updated_at', type: 'datetime', default: 'CURRENT_TIMESTAMP', onUpdate: 'CURRENT_TIMESTAMP' },
          { name: 'deleted_at', type: 'datetime', isNullable: true },
        ],
      }),
      true,
    )
    await queryRunner.createIndex('competitor_mentions', new TableIndex({
      name: 'IDX_competitor_mentions_call_record_id',
      columnNames: ['call_record_id'],
    }))
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('competitor_mentions', true)
    await queryRunner.dropTable('ai_reminders', true)
    await queryRunner.dropTable('opportunity_scores', true)
  }
}
