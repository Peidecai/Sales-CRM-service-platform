import { MigrationInterface, QueryRunner, Table, TableIndex } from 'typeorm'

export class CreateLeaderReviewTable1709000098000 implements MigrationInterface {
  name = 'CreateLeaderReviewTable1709000098000'

  public async up(queryRunner: QueryRunner): Promise<void> {
    const exists = await queryRunner.hasTable('leader_reviews')
    if (exists) return

    await queryRunner.createTable(
      new Table({
        name: 'leader_reviews',
        columns: [
          { name: 'id', type: 'int', isPrimary: true, isGenerated: true, generationStrategy: 'increment' },
          { name: 'call_record_id', type: 'int' },
          { name: 'customer_id', type: 'int', isNullable: true },
          { name: 'reviewer_id', type: 'int' },
          { name: 'content', type: 'text' },
          { name: 'created_at', type: 'datetime', precision: 6, default: 'CURRENT_TIMESTAMP(6)' },
          { name: 'updated_at', type: 'datetime', precision: 6, default: 'CURRENT_TIMESTAMP(6)' },
          { name: 'deleted_at', type: 'datetime', precision: 6, isNullable: true },
        ],
      }),
      true,
    )

    await queryRunner.createIndex(
      'leader_reviews',
      new TableIndex({ columnNames: ['call_record_id'] }),
    )
    await queryRunner.createIndex(
      'leader_reviews',
      new TableIndex({ columnNames: ['customer_id'] }),
    )
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('leader_reviews', true)
  }
}
