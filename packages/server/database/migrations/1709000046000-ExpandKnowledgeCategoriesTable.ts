import { MigrationInterface, QueryRunner } from 'typeorm';

export class ExpandKnowledgeCategoriesTable1709000046000 implements MigrationInterface {
  name = 'ExpandKnowledgeCategoriesTable1709000046000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE knowledge_categories ADD COLUMN category_code VARCHAR(50) NULL UNIQUE COMMENT '分类编码'`,
    );
    await queryRunner.query(
      `ALTER TABLE knowledge_categories ADD COLUMN category_type ENUM('product','sales_technique','industry','faq','training') DEFAULT 'product' COMMENT '分类类型'`,
    );
    await queryRunner.query(
      `ALTER TABLE knowledge_categories ADD COLUMN icon_url VARCHAR(500) NULL COMMENT '图标URL'`,
    );
    await queryRunner.query(
      `ALTER TABLE knowledge_categories ADD COLUMN level TINYINT DEFAULT 1 COMMENT '层级深度'`,
    );
    await queryRunner.query(
      `ALTER TABLE knowledge_categories ADD COLUMN path VARCHAR(200) NULL COMMENT '完整路径如 1/3/5'`,
    );
    await queryRunner.query(
      `ALTER TABLE knowledge_categories ADD COLUMN article_count INT DEFAULT 0 COMMENT '文章数冗余'`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE knowledge_categories DROP COLUMN article_count`,
    );
    await queryRunner.query(
      `ALTER TABLE knowledge_categories DROP COLUMN path`,
    );
    await queryRunner.query(
      `ALTER TABLE knowledge_categories DROP COLUMN level`,
    );
    await queryRunner.query(
      `ALTER TABLE knowledge_categories DROP COLUMN icon_url`,
    );
    await queryRunner.query(
      `ALTER TABLE knowledge_categories DROP COLUMN category_type`,
    );
    await queryRunner.query(
      `ALTER TABLE knowledge_categories DROP COLUMN category_code`,
    );
  }
}
