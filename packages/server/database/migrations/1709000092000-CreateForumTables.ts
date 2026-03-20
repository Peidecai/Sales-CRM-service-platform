import { MigrationInterface, QueryRunner } from 'typeorm'

export class CreateForumTables1709000092000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS forum_categories (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(100) NOT NULL COMMENT '分类名称',
        description VARCHAR(500) NULL COMMENT '描述',
        icon VARCHAR(100) NULL COMMENT '图标',
        sort_order INT NOT NULL DEFAULT 0 COMMENT '排序',
        post_count INT NOT NULL DEFAULT 0 COMMENT '帖子数',
        is_active TINYINT(1) NOT NULL DEFAULT 1 COMMENT '是否启用',
        created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        updated_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
        deleted_at DATETIME(6) NULL
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `)

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS forum_posts (
        id INT AUTO_INCREMENT PRIMARY KEY,
        title VARCHAR(200) NOT NULL COMMENT '标题',
        content TEXT NOT NULL COMMENT '内容',
        category_id INT NOT NULL COMMENT '分类ID',
        author_id INT NOT NULL COMMENT '作者ID',
        is_pinned TINYINT(1) NOT NULL DEFAULT 0 COMMENT '是否置顶',
        is_featured TINYINT(1) NOT NULL DEFAULT 0 COMMENT '是否精华',
        is_locked TINYINT(1) NOT NULL DEFAULT 0 COMMENT '是否锁定',
        view_count INT NOT NULL DEFAULT 0 COMMENT '浏览数',
        like_count INT NOT NULL DEFAULT 0 COMMENT '点赞数',
        comment_count INT NOT NULL DEFAULT 0 COMMENT '评论数',
        linked_article_id INT NULL COMMENT '关联知识库文章ID',
        last_comment_at DATETIME NULL COMMENT '最后评论时间',
        created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        updated_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
        deleted_at DATETIME(6) NULL,
        INDEX idx_forum_posts_category (category_id),
        INDEX idx_forum_posts_author (author_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `)

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS forum_comments (
        id INT AUTO_INCREMENT PRIMARY KEY,
        post_id INT NOT NULL COMMENT '帖子ID',
        author_id INT NOT NULL COMMENT '作者ID',
        content TEXT NOT NULL COMMENT '内容',
        parent_id INT NULL COMMENT '父评论ID',
        reply_to_user_id INT NULL COMMENT '回复目标用户ID',
        like_count INT NOT NULL DEFAULT 0 COMMENT '点赞数',
        created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        updated_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
        deleted_at DATETIME(6) NULL,
        INDEX idx_forum_comments_post (post_id),
        INDEX idx_forum_comments_author (author_id),
        INDEX idx_forum_comments_parent (parent_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `)

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS forum_likes (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL COMMENT '用户ID',
        target_type VARCHAR(20) NOT NULL COMMENT '目标类型',
        target_id INT NOT NULL COMMENT '目标ID',
        created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        updated_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
        deleted_at DATETIME(6) NULL,
        UNIQUE KEY UQ_forum_like_user_target (user_id, target_type, target_id),
        INDEX idx_forum_likes_user (user_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `)

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS forum_favorites (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL COMMENT '用户ID',
        post_id INT NOT NULL COMMENT '帖子ID',
        created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        updated_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
        deleted_at DATETIME(6) NULL,
        UNIQUE KEY UQ_forum_favorite_user_post (user_id, post_id),
        INDEX idx_forum_favorites_user (user_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `)

    // Seed default categories
    await queryRunner.query(`
      INSERT IGNORE INTO forum_categories (id, name, description, icon, sort_order)
      VALUES
        (1, '经验分享', '分享销售经验和技巧', 'Share', 1),
        (2, '问题求助', '工作中遇到的问题求助', 'QuestionFilled', 2),
        (3, '公告', '公司和团队公告', 'Bell', 3),
        (4, '闲聊', '轻松聊天，增进了解', 'ChatRound', 4);
    `)
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP TABLE IF EXISTS forum_favorites')
    await queryRunner.query('DROP TABLE IF EXISTS forum_likes')
    await queryRunner.query('DROP TABLE IF EXISTS forum_comments')
    await queryRunner.query('DROP TABLE IF EXISTS forum_posts')
    await queryRunner.query('DROP TABLE IF EXISTS forum_categories')
  }
}
