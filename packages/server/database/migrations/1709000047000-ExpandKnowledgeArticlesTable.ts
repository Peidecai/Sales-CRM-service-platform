import { MigrationInterface, QueryRunner } from 'typeorm';

export class ExpandKnowledgeArticlesTable1709000047000 implements MigrationInterface {
  name = 'ExpandKnowledgeArticlesTable1709000047000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE knowledge_articles ADD COLUMN summary VARCHAR(500) NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE knowledge_articles ADD COLUMN cover_image VARCHAR(500) NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE knowledge_articles ADD COLUMN is_top BOOLEAN DEFAULT FALSE`,
    );
    await queryRunner.query(
      `ALTER TABLE knowledge_articles ADD COLUMN is_recommend BOOLEAN DEFAULT FALSE`,
    );
    await queryRunner.query(
      `ALTER TABLE knowledge_articles ADD COLUMN collect_count INT DEFAULT 0`,
    );
    await queryRunner.query(
      `ALTER TABLE knowledge_articles ADD COLUMN comment_count INT DEFAULT 0`,
    );
    await queryRunner.query(
      `ALTER TABLE knowledge_articles ADD COLUMN version INT DEFAULT 1`,
    );
    await queryRunner.query(
      `ALTER TABLE knowledge_articles ADD COLUMN publish_time DATETIME NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE knowledge_articles ADD COLUMN review_id INT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE knowledge_articles ADD COLUMN review_remark TEXT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE knowledge_articles ADD COLUMN review_time DATETIME NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE knowledge_articles ADD COLUMN source VARCHAR(50) NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE knowledge_articles ADD COLUMN visible_scope ENUM('all','role','department') DEFAULT 'all'`,
    );
    await queryRunner.query(
      `ALTER TABLE knowledge_articles ADD COLUMN visible_target JSON NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE knowledge_articles ADD COLUMN status ENUM('draft','submitted','published','rejected','offline') DEFAULT 'draft'`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE knowledge_articles DROP COLUMN status`,
    );
    await queryRunner.query(
      `ALTER TABLE knowledge_articles DROP COLUMN visible_target`,
    );
    await queryRunner.query(
      `ALTER TABLE knowledge_articles DROP COLUMN visible_scope`,
    );
    await queryRunner.query(
      `ALTER TABLE knowledge_articles DROP COLUMN source`,
    );
    await queryRunner.query(
      `ALTER TABLE knowledge_articles DROP COLUMN review_time`,
    );
    await queryRunner.query(
      `ALTER TABLE knowledge_articles DROP COLUMN review_remark`,
    );
    await queryRunner.query(
      `ALTER TABLE knowledge_articles DROP COLUMN review_id`,
    );
    await queryRunner.query(
      `ALTER TABLE knowledge_articles DROP COLUMN publish_time`,
    );
    await queryRunner.query(
      `ALTER TABLE knowledge_articles DROP COLUMN version`,
    );
    await queryRunner.query(
      `ALTER TABLE knowledge_articles DROP COLUMN comment_count`,
    );
    await queryRunner.query(
      `ALTER TABLE knowledge_articles DROP COLUMN collect_count`,
    );
    await queryRunner.query(
      `ALTER TABLE knowledge_articles DROP COLUMN is_recommend`,
    );
    await queryRunner.query(
      `ALTER TABLE knowledge_articles DROP COLUMN is_top`,
    );
    await queryRunner.query(
      `ALTER TABLE knowledge_articles DROP COLUMN cover_image`,
    );
    await queryRunner.query(
      `ALTER TABLE knowledge_articles DROP COLUMN summary`,
    );
  }
}
