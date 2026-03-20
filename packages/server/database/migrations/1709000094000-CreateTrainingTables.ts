import { MigrationInterface, QueryRunner } from 'typeorm'

export class CreateTrainingTables1709000094000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1. Training categories
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS training_categories (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        type VARCHAR(50) NOT NULL,
        sort_order INT NOT NULL DEFAULT 0,
        description TEXT NULL,
        created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        updated_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
        deleted_at DATETIME(6) NULL,
        INDEX idx_training_categories_type (type)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `)

    // 2. Training videos
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS training_videos (
        id INT AUTO_INCREMENT PRIMARY KEY,
        title VARCHAR(200) NOT NULL,
        description TEXT NULL,
        file_url VARCHAR(500) NOT NULL,
        cover_url VARCHAR(500) NULL,
        duration INT NOT NULL DEFAULT 0,
        file_size BIGINT NOT NULL DEFAULT 0,
        format VARCHAR(20) NOT NULL,
        category_id INT NOT NULL,
        sort_order INT NOT NULL DEFAULT 0,
        is_published TINYINT NOT NULL DEFAULT 0,
        uploaded_by_id INT NOT NULL,
        created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        updated_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
        deleted_at DATETIME(6) NULL,
        INDEX idx_training_videos_category_id (category_id),
        INDEX idx_training_videos_is_published (is_published),
        INDEX idx_training_videos_uploaded_by_id (uploaded_by_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `)

    // 3. Video chapters
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS video_chapters (
        id INT AUTO_INCREMENT PRIMARY KEY,
        video_id INT NOT NULL,
        title VARCHAR(200) NOT NULL,
        start_time INT NOT NULL DEFAULT 0,
        sort_order INT NOT NULL DEFAULT 0,
        created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        updated_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
        deleted_at DATETIME(6) NULL,
        INDEX idx_video_chapters_video_id (video_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `)

    // 4. Video progress
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS video_progress (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        video_id INT NOT NULL,
        watched_seconds INT NOT NULL DEFAULT 0,
        last_position INT NOT NULL DEFAULT 0,
        completion_rate DECIMAL(5,2) NOT NULL DEFAULT 0,
        is_completed TINYINT NOT NULL DEFAULT 0,
        completed_at DATETIME NULL,
        created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        updated_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
        deleted_at DATETIME(6) NULL,
        UNIQUE KEY UQ_video_progress_user_video (user_id, video_id),
        INDEX idx_video_progress_user_id (user_id),
        INDEX idx_video_progress_video_id (video_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `)

    // 5. Video bookmarks
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS video_bookmarks (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        video_id INT NOT NULL,
        timestamp INT NOT NULL,
        note TEXT NULL,
        created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        updated_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
        deleted_at DATETIME(6) NULL,
        INDEX idx_video_bookmarks_user_id (user_id),
        INDEX idx_video_bookmarks_video_id (video_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `)

    // 6. Training tasks
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS training_tasks (
        id INT AUTO_INCREMENT PRIMARY KEY,
        title VARCHAR(200) NOT NULL,
        description TEXT NULL,
        video_id INT NOT NULL,
        assigned_by_id INT NOT NULL,
        deadline DATETIME NOT NULL,
        created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        updated_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
        deleted_at DATETIME(6) NULL,
        INDEX idx_training_tasks_video_id (video_id),
        INDEX idx_training_tasks_deadline (deadline)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `)

    // 7. Training task assignees
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS training_task_assignees (
        id INT AUTO_INCREMENT PRIMARY KEY,
        task_id INT NOT NULL,
        user_id INT NOT NULL,
        is_completed TINYINT NOT NULL DEFAULT 0,
        completed_at DATETIME NULL,
        created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        updated_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
        deleted_at DATETIME(6) NULL,
        UNIQUE KEY UQ_training_task_assignee (task_id, user_id),
        INDEX idx_training_task_assignees_task_id (task_id),
        INDEX idx_training_task_assignees_user_id (user_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `)
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP TABLE IF EXISTS training_task_assignees')
    await queryRunner.query('DROP TABLE IF EXISTS training_tasks')
    await queryRunner.query('DROP TABLE IF EXISTS video_bookmarks')
    await queryRunner.query('DROP TABLE IF EXISTS video_progress')
    await queryRunner.query('DROP TABLE IF EXISTS video_chapters')
    await queryRunner.query('DROP TABLE IF EXISTS training_videos')
    await queryRunner.query('DROP TABLE IF EXISTS training_categories')
  }
}
