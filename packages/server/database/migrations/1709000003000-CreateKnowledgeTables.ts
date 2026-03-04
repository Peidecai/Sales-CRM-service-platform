import { MigrationInterface, QueryRunner, Table, TableIndex } from 'typeorm';

export class CreateKnowledgeTables1709000003000 implements MigrationInterface {
  name = 'CreateKnowledgeTables1709000003000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create knowledge_categories table
    await queryRunner.createTable(
      new Table({
        name: 'knowledge_categories',
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
            length: '100',
            isNullable: false,
          },
          {
            name: 'parent_id',
            type: 'int',
            isNullable: true,
            default: null,
          },
          {
            name: 'sort',
            type: 'int',
            isNullable: false,
            default: 0,
          },
          {
            name: 'description',
            type: 'varchar',
            length: '200',
            isNullable: true,
          },
          {
            name: 'created_at',
            type: 'datetime',
            isNullable: false,
            default: 'CURRENT_TIMESTAMP',
          },
          {
            name: 'updated_at',
            type: 'datetime',
            isNullable: false,
            default: 'CURRENT_TIMESTAMP',
            onUpdate: 'CURRENT_TIMESTAMP',
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

    // Create knowledge_articles table
    await queryRunner.createTable(
      new Table({
        name: 'knowledge_articles',
        columns: [
          {
            name: 'id',
            type: 'int',
            isPrimary: true,
            isGenerated: true,
            generationStrategy: 'increment',
          },
          {
            name: 'title',
            type: 'varchar',
            length: '300',
            isNullable: false,
          },
          {
            name: 'content',
            type: 'longtext',
            isNullable: false,
          },
          {
            name: 'category_id',
            type: 'int',
            isNullable: true,
          },
          {
            name: 'author_id',
            type: 'int',
            isNullable: false,
          },
          {
            name: 'view_count',
            type: 'int',
            isNullable: false,
            default: 0,
          },
          {
            name: 'like_count',
            type: 'int',
            isNullable: false,
            default: 0,
          },
          {
            name: 'tags',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'is_published',
            type: 'boolean',
            isNullable: false,
            default: false,
          },
          {
            name: 'created_at',
            type: 'datetime',
            isNullable: false,
            default: 'CURRENT_TIMESTAMP',
          },
          {
            name: 'updated_at',
            type: 'datetime',
            isNullable: false,
            default: 'CURRENT_TIMESTAMP',
            onUpdate: 'CURRENT_TIMESTAMP',
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

    // Index on category_id
    await queryRunner.createIndex(
      'knowledge_articles',
      new TableIndex({
        name: 'IDX_KNOWLEDGE_ARTICLES_CATEGORY_ID',
        columnNames: ['category_id'],
      }),
    );

    // Index on author_id
    await queryRunner.createIndex(
      'knowledge_articles',
      new TableIndex({
        name: 'IDX_KNOWLEDGE_ARTICLES_AUTHOR_ID',
        columnNames: ['author_id'],
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropIndex(
      'knowledge_articles',
      'IDX_KNOWLEDGE_ARTICLES_AUTHOR_ID',
    );
    await queryRunner.dropIndex(
      'knowledge_articles',
      'IDX_KNOWLEDGE_ARTICLES_CATEGORY_ID',
    );
    await queryRunner.dropTable('knowledge_articles');
    await queryRunner.dropTable('knowledge_categories');
  }
}
