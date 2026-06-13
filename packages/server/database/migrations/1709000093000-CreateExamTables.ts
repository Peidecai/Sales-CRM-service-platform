import { MigrationInterface, QueryRunner } from 'typeorm'

export class CreateExamTables1709000093000 implements MigrationInterface {
  name = 'CreateExamTables1709000093000'

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Question categories
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS exam_question_categories (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        description VARCHAR(500) NULL,
        parent_id INT NULL,
        sort_order INT NOT NULL DEFAULT 0,
        created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        updated_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
        deleted_at DATETIME(6) NULL,
        INDEX idx_exam_qcat_parent (parent_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `)

    // Questions
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS exam_questions (
        id INT AUTO_INCREMENT PRIMARY KEY,
        type VARCHAR(30) NOT NULL,
        content TEXT NOT NULL,
        options JSON NOT NULL,
        answer JSON NOT NULL,
        explanation TEXT NULL,
        category_id INT NOT NULL,
        difficulty INT NOT NULL DEFAULT 1,
        usage_count INT NOT NULL DEFAULT 0,
        correct_rate DECIMAL(5,2) NOT NULL DEFAULT 0,
        linked_article_id INT NULL,
        created_by_id INT NOT NULL,
        created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        updated_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
        deleted_at DATETIME(6) NULL,
        INDEX idx_exam_q_category (category_id),
        INDEX idx_exam_q_type (type),
        INDEX idx_exam_q_difficulty (difficulty)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `)

    // Exam papers
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS exam_papers (
        id INT AUTO_INCREMENT PRIMARY KEY,
        title VARCHAR(200) NOT NULL,
        description VARCHAR(500) NULL,
        build_mode VARCHAR(20) NOT NULL,
        random_config JSON NULL,
        total_score INT NOT NULL,
        pass_score INT NOT NULL,
        duration INT NOT NULL,
        created_by_id INT NOT NULL,
        created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        updated_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
        deleted_at DATETIME(6) NULL
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `)

    // Exam paper questions (join table)
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS exam_paper_questions (
        id INT AUTO_INCREMENT PRIMARY KEY,
        paper_id INT NOT NULL,
        question_id INT NOT NULL,
        sort_order INT NOT NULL DEFAULT 0,
        score INT NOT NULL,
        created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        updated_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
        deleted_at DATETIME(6) NULL,
        UNIQUE KEY uq_paper_question (paper_id, question_id),
        INDEX idx_epq_paper (paper_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `)

    // Exam sessions
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS exam_sessions (
        id INT AUTO_INCREMENT PRIMARY KEY,
        paper_id INT NOT NULL,
        user_id INT NOT NULL,
        status VARCHAR(30) NOT NULL DEFAULT 'not_started',
        started_at DATETIME NULL,
        submitted_at DATETIME NULL,
        total_score INT NULL,
        passed TINYINT NULL,
        answers JSON NULL,
        attempt_no INT NOT NULL DEFAULT 1,
        created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        updated_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
        deleted_at DATETIME(6) NULL,
        INDEX idx_exam_session_paper (paper_id),
        INDEX idx_exam_session_user (user_id),
        INDEX idx_exam_session_status (status)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `)
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP TABLE IF EXISTS exam_sessions')
    await queryRunner.query('DROP TABLE IF EXISTS exam_paper_questions')
    await queryRunner.query('DROP TABLE IF EXISTS exam_papers')
    await queryRunner.query('DROP TABLE IF EXISTS exam_questions')
    await queryRunner.query('DROP TABLE IF EXISTS exam_question_categories')
  }
}
