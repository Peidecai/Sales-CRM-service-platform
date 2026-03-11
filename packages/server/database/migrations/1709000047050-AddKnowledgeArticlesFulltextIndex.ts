import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddKnowledgeArticlesFulltextIndex1709000047050 implements MigrationInterface {
  name = 'AddKnowledgeArticlesFulltextIndex1709000047050';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE knowledge_articles ADD FULLTEXT INDEX ft_article_ngram (title, content) WITH PARSER ngram`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE knowledge_articles DROP INDEX ft_article_ngram`);
  }
}
