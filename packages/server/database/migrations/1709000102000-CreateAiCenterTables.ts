import { MigrationInterface, QueryRunner } from 'typeorm'

export class CreateAiCenterTables1709000102000 implements MigrationInterface {
  name = 'CreateAiCenterTables1709000102000'

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS \`knowledge_article_versions\` (
        \`id\` int NOT NULL AUTO_INCREMENT,
        \`article_id\` int NOT NULL,
        \`version\` int NOT NULL,
        \`title\` varchar(300) NOT NULL,
        \`content\` longtext NOT NULL,
        \`edited_by_id\` int NOT NULL,
        \`created_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        PRIMARY KEY (\`id\`),
        INDEX \`IDX_article_version_article_id\` (\`article_id\`),
        INDEX \`IDX_article_version_version\` (\`article_id\`, \`version\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `)
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS \`knowledge_article_versions\``)
  }
}
