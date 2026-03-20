import { MigrationInterface, QueryRunner } from 'typeorm'

export class CreateSpeechTables1709000087000 implements MigrationInterface {
  name = 'CreateSpeechTables1709000087000'

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Speech categories
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS speech_categories (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        code VARCHAR(50) NOT NULL UNIQUE,
        sort INT NOT NULL DEFAULT 0,
        created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        updated_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
        deleted_at DATETIME(6) NULL
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `)

    // Seed default categories
    await queryRunner.query(`INSERT IGNORE INTO speech_categories (name, code, sort) VALUES ('开场白', 'opening', 1)`)
    await queryRunner.query(`INSERT IGNORE INTO speech_categories (name, code, sort) VALUES ('异议处理', 'objection', 2)`)
    await queryRunner.query(`INSERT IGNORE INTO speech_categories (name, code, sort) VALUES ('促单话术', 'closing', 3)`)
    await queryRunner.query(`INSERT IGNORE INTO speech_categories (name, code, sort) VALUES ('产品介绍', 'product', 4)`)
    await queryRunner.query(`INSERT IGNORE INTO speech_categories (name, code, sort) VALUES ('客户挽留', 'retention', 5)`)
    await queryRunner.query(`INSERT IGNORE INTO speech_categories (name, code, sort) VALUES ('其他', 'other', 6)`)

    // Speech templates
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS speech_templates (
        id INT AUTO_INCREMENT PRIMARY KEY,
        title VARCHAR(200) NOT NULL,
        content TEXT NOT NULL,
        category_id INT NOT NULL,
        scene VARCHAR(200) NULL,
        tags VARCHAR(500) NULL,
        usage_count INT NOT NULL DEFAULT 0,
        status VARCHAR(20) NOT NULL DEFAULT 'draft',
        created_by INT NOT NULL,
        created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        updated_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
        deleted_at DATETIME(6) NULL,
        INDEX idx_speech_templates_category (category_id),
        INDEX idx_speech_templates_status (status),
        FULLTEXT INDEX ft_speech_templates_title_content (title, content)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `)

    // Speech annotations
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS speech_annotations (
        id INT AUTO_INCREMENT PRIMARY KEY,
        call_record_id INT NOT NULL,
        template_id INT NULL,
        start_time INT NOT NULL,
        end_time INT NOT NULL,
        text TEXT NOT NULL,
        comment VARCHAR(500) NULL,
        score INT NULL,
        annotated_by INT NOT NULL,
        created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        updated_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
        deleted_at DATETIME(6) NULL,
        INDEX idx_speech_annotations_call_record (call_record_id),
        INDEX idx_speech_annotations_template (template_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `)
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP TABLE IF EXISTS speech_annotations')
    await queryRunner.query('DROP TABLE IF EXISTS speech_templates')
    await queryRunner.query('DROP TABLE IF EXISTS speech_categories')
  }
}
