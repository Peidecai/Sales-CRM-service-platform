import { MigrationInterface, QueryRunner, TableIndex } from 'typeorm'

export class AddPerformanceRankingUniqueIndex1709000060000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createIndex(
      'performance_rankings',
      new TableIndex({
        name: 'UQ_ranking_snapshot',
        columnNames: ['snapshot_date', 'year', 'month', 'metric_type', 'user_id'],
        isUnique: true,
      }),
    )
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropIndex('performance_rankings', 'UQ_ranking_snapshot')
  }
}
