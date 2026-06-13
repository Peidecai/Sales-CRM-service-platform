import { MigrationInterface, QueryRunner } from 'typeorm'

export class CreateTodoAndAnnotationTables1709000103000 implements MigrationInterface {
  name = 'CreateTodoAndAnnotationTables1709000103000'

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS \`todos\` (
        \`id\` int NOT NULL AUTO_INCREMENT,
        \`user_id\` int NOT NULL,
        \`title\` varchar(200) NOT NULL,
        \`description\` text NULL,
        \`category\` varchar(20) NOT NULL DEFAULT 'other',
        \`priority\` varchar(20) NOT NULL DEFAULT 'medium',
        \`status\` varchar(20) NOT NULL DEFAULT 'pending',
        \`due_date\` datetime NULL,
        \`related_type\` varchar(50) NULL,
        \`related_id\` int NULL,
        \`completed_at\` datetime NULL,
        \`created_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        \`updated_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
        \`deleted_at\` datetime(6) NULL,
        PRIMARY KEY (\`id\`),
        INDEX \`IDX_todos_user_status\` (\`user_id\`, \`status\`),
        INDEX \`IDX_todos_user_due_date\` (\`user_id\`, \`due_date\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `)

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS \`annotations\` (
        \`id\` int NOT NULL AUTO_INCREMENT,
        \`user_id\` int NOT NULL,
        \`target_type\` varchar(30) NOT NULL,
        \`target_id\` int NOT NULL,
        \`content\` text NOT NULL,
        \`page_x\` float NULL,
        \`page_y\` float NULL,
        \`resolved\` tinyint(1) NOT NULL DEFAULT 0,
        \`resolved_by_id\` int NULL,
        \`resolved_at\` datetime NULL,
        \`created_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        \`updated_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
        \`deleted_at\` datetime(6) NULL,
        PRIMARY KEY (\`id\`),
        INDEX \`IDX_annotations_target\` (\`target_type\`, \`target_id\`),
        INDEX \`IDX_annotations_user\` (\`user_id\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `)
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS \`annotations\``)
    await queryRunner.query(`DROP TABLE IF EXISTS \`todos\``)
  }
}
