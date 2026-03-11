import { MigrationInterface, QueryRunner, Table, TableIndex } from 'typeorm';

export class CreateArticleCommentsTable1709000051000 implements MigrationInterface {
  name = 'CreateArticleCommentsTable1709000051000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'article_comments',
        columns: [
          {
            name: 'id',
            type: 'int',
            isPrimary: true,
            isGenerated: true,
            generationStrategy: 'increment',
          },
          {
            name: 'article_id',
            type: 'int',
            isNullable: false,
          },
          {
            name: 'user_id',
            type: 'int',
            isNullable: false,
          },
          {
            name: 'parent_id',
            type: 'int',
            isNullable: true,
          },
          {
            name: 'content',
            type: 'text',
            isNullable: false,
          },
          {
            name: 'created_at',
            type: 'datetime',
            length: '6',
            isNullable: false,
            default: 'CURRENT_TIMESTAMP(6)',
          },
          {
            name: 'deleted',
            type: 'boolean',
            isNullable: false,
            default: false,
          },
        ],
      }),
      true,
    );
    await queryRunner.createIndex(
      'article_comments',
      new TableIndex({ name: 'IDX_ARTICLE_COMMENTS_ARTICLE', columnNames: ['article_id'] }),
    );
    await queryRunner.createIndex(
      'article_comments',
      new TableIndex({ name: 'IDX_ARTICLE_COMMENTS_USER', columnNames: ['user_id'] }),
    );
    await queryRunner.createIndex(
      'article_comments',
      new TableIndex({ name: 'IDX_ARTICLE_COMMENTS_PARENT', columnNames: ['parent_id'] }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropIndex('article_comments', 'IDX_ARTICLE_COMMENTS_PARENT');
    await queryRunner.dropIndex('article_comments', 'IDX_ARTICLE_COMMENTS_USER');
    await queryRunner.dropIndex('article_comments', 'IDX_ARTICLE_COMMENTS_ARTICLE');
    await queryRunner.dropTable('article_comments');
  }
}
