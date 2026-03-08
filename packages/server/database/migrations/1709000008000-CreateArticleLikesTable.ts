import { MigrationInterface, QueryRunner, Table, TableIndex } from 'typeorm'

export class CreateArticleLikesTable1709000008000 implements MigrationInterface {
  name = 'CreateArticleLikesTable1709000008000'

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'article_likes',
        columns: [
          { name: 'id', type: 'int', isPrimary: true, isGenerated: true, generationStrategy: 'increment' },
          { name: 'user_id', type: 'int', isNullable: false },
          { name: 'article_id', type: 'int', isNullable: false },
          { name: 'created_at', type: 'datetime', default: 'CURRENT_TIMESTAMP' },
        ],
      }),
      true,
    )

    await queryRunner.createTable(
      new Table({
        name: 'article_favorites',
        columns: [
          { name: 'id', type: 'int', isPrimary: true, isGenerated: true, generationStrategy: 'increment' },
          { name: 'user_id', type: 'int', isNullable: false },
          { name: 'article_id', type: 'int', isNullable: false },
          { name: 'created_at', type: 'datetime', default: 'CURRENT_TIMESTAMP' },
        ],
      }),
      true,
    )

    await queryRunner.createIndex(
      'article_likes',
      new TableIndex({
        name: 'UQ_article_likes_user_article',
        columnNames: ['user_id', 'article_id'],
        isUnique: true,
      }),
    )
    await queryRunner.createIndex(
      'article_favorites',
      new TableIndex({
        name: 'UQ_article_favorites_user_article',
        columnNames: ['user_id', 'article_id'],
        isUnique: true,
      }),
    )

    await queryRunner.createIndex(
      'article_likes',
      new TableIndex({
        name: 'IDX_article_likes_article_id',
        columnNames: ['article_id'],
      }),
    )
    await queryRunner.createIndex(
      'article_favorites',
      new TableIndex({
        name: 'IDX_article_favorites_user_id',
        columnNames: ['user_id'],
      }),
    )
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('article_favorites', true)
    await queryRunner.dropTable('article_likes', true)
  }
}
