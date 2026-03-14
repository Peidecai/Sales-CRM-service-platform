import { MigrationInterface, QueryRunner } from 'typeorm'

/**
 * Unify datetime column naming convention to `_at` suffix.
 *
 * pool_enter_time  → pool_entered_at
 * publish_time     → published_at
 * review_time      → reviewed_at
 * start_time       → started_at
 * end_time         → ended_at
 */
export class RenameTimestampColumns1709000064000 implements MigrationInterface {
  private readonly renames: { table: string; oldName: string; newName: string }[] = [
    { table: 'customers', oldName: 'pool_enter_time', newName: 'pool_entered_at' },
    { table: 'knowledge_articles', oldName: 'publish_time', newName: 'published_at' },
    { table: 'knowledge_articles', oldName: 'review_time', newName: 'reviewed_at' },
    { table: 'campaign_tasks', oldName: 'start_time', newName: 'started_at' },
    { table: 'campaign_tasks', oldName: 'end_time', newName: 'ended_at' },
  ]

  public async up(queryRunner: QueryRunner): Promise<void> {
    for (const { table, oldName, newName } of this.renames) {
      await queryRunner.query(
        `ALTER TABLE \`${table}\` RENAME COLUMN \`${oldName}\` TO \`${newName}\``,
      )
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    for (const { table, oldName, newName } of this.renames.slice().reverse()) {
      await queryRunner.query(
        `ALTER TABLE \`${table}\` RENAME COLUMN \`${newName}\` TO \`${oldName}\``,
      )
    }
  }
}
