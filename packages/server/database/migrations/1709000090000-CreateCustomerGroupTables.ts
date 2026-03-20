import { MigrationInterface, QueryRunner } from 'typeorm'

export class CreateCustomerGroupTables1709000090000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS customer_groups (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(100) NOT NULL COMMENT '分组名称',
        description VARCHAR(500) NULL COMMENT '描述',
        type VARCHAR(20) NOT NULL COMMENT '类型: static | dynamic',
        rules JSON NULL COMMENT '动态分组规则',
        member_count INT NOT NULL DEFAULT 0 COMMENT '成员数',
        last_refreshed_at DATETIME NULL COMMENT '最后刷新时间',
        created_by_id INT NOT NULL COMMENT '创建人ID',
        created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        updated_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
        deleted_at DATETIME(6) NULL,
        INDEX idx_type (type),
        INDEX idx_created_by_id (created_by_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `)

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS customer_group_members (
        id INT AUTO_INCREMENT PRIMARY KEY,
        group_id INT NOT NULL COMMENT '分组ID',
        customer_id INT NOT NULL COMMENT '客户ID',
        created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        updated_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
        deleted_at DATETIME(6) NULL,
        INDEX idx_group_id (group_id),
        INDEX idx_customer_id (customer_id),
        UNIQUE KEY UQ_group_customer (group_id, customer_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `)
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP TABLE IF EXISTS customer_group_members')
    await queryRunner.query('DROP TABLE IF EXISTS customer_groups')
  }
}
