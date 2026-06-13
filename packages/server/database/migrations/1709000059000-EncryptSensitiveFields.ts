import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Widen phone/email columns to VARCHAR(255) to accommodate AES-256-GCM ciphertext.
 * Encrypted format: hex(iv):hex(authTag):hex(ciphertext) ≈ 24+32+2*N chars.
 *
 * NOTE: After this migration, encrypted fields cannot be used with SQL LIKE queries.
 * Exact-match lookups require encrypting the search term first in application code.
 */
export class EncryptSensitiveFields1709000059000 implements MigrationInterface {
  name = 'EncryptSensitiveFields1709000059000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // customers table — phone (20 → 255), email (100 → 255)
    await queryRunner.query(
      `ALTER TABLE customers MODIFY COLUMN phone VARCHAR(255) NULL COMMENT '手机号(encrypted)'`,
    );
    await queryRunner.query(
      `ALTER TABLE customers MODIFY COLUMN email VARCHAR(255) NULL COMMENT '邮箱(encrypted)'`,
    );

    // contacts table — mobile (20 → 255), email (100 → 255)
    await queryRunner.query(
      `ALTER TABLE contacts MODIFY COLUMN mobile VARCHAR(255) NULL COMMENT '手机号(encrypted)'`,
    );
    await queryRunner.query(
      `ALTER TABLE contacts MODIFY COLUMN email VARCHAR(255) NULL COMMENT '邮箱(encrypted)'`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Revert contacts
    await queryRunner.query(
      `ALTER TABLE contacts MODIFY COLUMN email VARCHAR(100) NULL COMMENT '邮箱'`,
    );
    await queryRunner.query(
      `ALTER TABLE contacts MODIFY COLUMN mobile VARCHAR(20) NULL COMMENT '手机号'`,
    );

    // Revert customers
    await queryRunner.query(
      `ALTER TABLE customers MODIFY COLUMN email VARCHAR(100) NULL COMMENT '邮箱'`,
    );
    await queryRunner.query(
      `ALTER TABLE customers MODIFY COLUMN phone VARCHAR(20) NULL COMMENT '手机号'`,
    );
  }
}
