import { MigrationInterface, QueryRunner } from 'typeorm'

export class CreateServiceRecord1709000088000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS service_records (
        id INT AUTO_INCREMENT PRIMARY KEY,
        title VARCHAR(200) NOT NULL,
        description TEXT NOT NULL,
        type ENUM('complaint','consultation','maintenance','return') NOT NULL,
        status ENUM('pending','processing','resolved','closed') NOT NULL DEFAULT 'pending',
        priority ENUM('low','medium','high','urgent') NOT NULL DEFAULT 'medium',
        customer_id INT NOT NULL,
        contract_id INT NULL,
        assignee_id INT NULL,
        created_by INT NOT NULL,
        resolution TEXT NULL,
        satisfaction_score INT NULL,
        satisfaction_comment VARCHAR(500) NULL,
        sla_response_deadline DATETIME NULL,
        sla_resolve_deadline DATETIME NULL,
        responded_at DATETIME NULL,
        resolved_at DATETIME NULL,
        closed_at DATETIME NULL,
        created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        updated_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
        deleted_at DATETIME(6) NULL,
        INDEX idx_service_records_customer_id (customer_id),
        INDEX idx_service_records_assignee_id (assignee_id),
        INDEX idx_service_records_status (status),
        INDEX idx_service_records_type (type),
        INDEX idx_service_records_priority (priority),
        INDEX idx_service_records_created_by (created_by)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `)
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP TABLE IF EXISTS service_records')
  }
}
