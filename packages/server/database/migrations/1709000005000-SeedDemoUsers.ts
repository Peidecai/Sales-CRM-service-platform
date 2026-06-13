import { MigrationInterface, QueryRunner } from 'typeorm'
import * as bcrypt from 'bcryptjs'

export class SeedDemoUsers1709000005000 implements MigrationInterface {
  name = 'SeedDemoUsers1709000005000'

  public async up(queryRunner: QueryRunner): Promise<void> {
    const adminPassword = await bcrypt.hash('admin123', 10)
    const salesPassword = await bcrypt.hash('sales123', 10)

    await queryRunner.query(
      `INSERT INTO users (username, password, email, name, role, is_active) VALUES
        ('admin', '${adminPassword}', 'admin@crm.com', 'Admin', 'admin', true),
        ('sales01', '${salesPassword}', 'sales01@crm.com', 'Sales01', 'sales', true)
      `,
    )
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DELETE FROM users WHERE username IN ('admin', 'sales01')`,
    )
  }
}
