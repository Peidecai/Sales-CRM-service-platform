import { MigrationInterface, QueryRunner } from 'typeorm';

export class ExpandCustomersTable1709000011000 implements MigrationInterface {
  name = 'ExpandCustomersTable1709000011000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1. Modify status ENUM to 8-state
    await queryRunner.query(
      `ALTER TABLE customers MODIFY COLUMN status ENUM('lead','potential','intention','opportunity','deal','maintain','invalid','lost') DEFAULT 'lead'`,
    );

    // 2. Add new columns
    await queryRunner.query(
      `ALTER TABLE customers ADD COLUMN customer_no VARCHAR(20) NULL COMMENT '客户编号' AFTER source`,
    );
    await queryRunner.query(
      `ALTER TABLE customers ADD COLUMN customer_type ENUM('enterprise','individual') DEFAULT 'enterprise' COMMENT '客户类型' AFTER customer_no`,
    );
    await queryRunner.query(
      `ALTER TABLE customers ADD COLUMN scale ENUM('micro','small','medium','large','enterprise') NULL COMMENT '企业规模' AFTER customer_type`,
    );
    await queryRunner.query(
      `ALTER TABLE customers ADD COLUMN region VARCHAR(100) NULL COMMENT '所在区域' AFTER scale`,
    );
    await queryRunner.query(
      `ALTER TABLE customers ADD COLUMN level ENUM('A','B','C','D') NULL COMMENT '客户等级' AFTER region`,
    );
    await queryRunner.query(
      `ALTER TABLE customers ADD COLUMN intention_level TINYINT NULL COMMENT '意向等级(1-5)' AFTER level`,
    );
    await queryRunner.query(
      `ALTER TABLE customers ADD COLUMN credit_rating ENUM('AAA','AA','A','BBB','BB','B','C','D') NULL COMMENT '信用评级' AFTER intention_level`,
    );
    await queryRunner.query(
      `ALTER TABLE customers ADD COLUMN unified_credit_code VARCHAR(18) NULL COMMENT '统一社会信用代码' AFTER credit_rating`,
    );
    await queryRunner.query(
      `ALTER TABLE customers ADD COLUMN legal_person VARCHAR(50) NULL COMMENT '法人代表' AFTER unified_credit_code`,
    );
    await queryRunner.query(
      `ALTER TABLE customers ADD COLUMN registered_capital DECIMAL(12,2) NULL COMMENT '注册资本(万元)' AFTER legal_person`,
    );
    await queryRunner.query(
      `ALTER TABLE customers ADD COLUMN annual_revenue DECIMAL(14,2) NULL COMMENT '年营收(万元)' AFTER registered_capital`,
    );
    await queryRunner.query(
      `ALTER TABLE customers ADD COLUMN employee_count INT NULL COMMENT '员工人数' AFTER annual_revenue`,
    );
    await queryRunner.query(
      `ALTER TABLE customers ADD COLUMN is_in_pool BOOLEAN DEFAULT FALSE COMMENT '是否在公海池' AFTER employee_count`,
    );
    await queryRunner.query(
      `ALTER TABLE customers ADD COLUMN pool_enter_time DATETIME NULL COMMENT '进入公海池时间' AFTER is_in_pool`,
    );
    await queryRunner.query(
      `ALTER TABLE customers ADD COLUMN protect_until DATETIME NULL COMMENT '保护期截止时间' AFTER pool_enter_time`,
    );
    await queryRunner.query(
      `ALTER TABLE customers ADD COLUMN custom_fields JSON NULL COMMENT '自定义字段' AFTER protect_until`,
    );
    await queryRunner.query(
      `ALTER TABLE customers ADD COLUMN address VARCHAR(500) NULL COMMENT '详细地址' AFTER custom_fields`,
    );
    await queryRunner.query(
      `ALTER TABLE customers ADD COLUMN website VARCHAR(200) NULL COMMENT '公司网站' AFTER address`,
    );
    await queryRunner.query(
      `ALTER TABLE customers ADD COLUMN description TEXT NULL COMMENT '客户描述' AFTER website`,
    );

    // 3. Modify source column to ENUM type
    await queryRunner.query(
      `ALTER TABLE customers MODIFY COLUMN source ENUM('website','referral','cold_call','exhibition','ad','import','other') NULL COMMENT '客户来源'`,
    );

    // 4. Add indexes
    await queryRunner.query(
      `ALTER TABLE customers ADD UNIQUE INDEX IDX_CUSTOMERS_CUSTOMER_NO (customer_no)`,
    );
    await queryRunner.query(
      `ALTER TABLE customers ADD UNIQUE INDEX IDX_CUSTOMERS_UNIFIED_CREDIT_CODE (unified_credit_code)`,
    );
    await queryRunner.query(
      `ALTER TABLE customers ADD INDEX IDX_CUSTOMERS_REGION (region)`,
    );
    await queryRunner.query(
      `ALTER TABLE customers ADD INDEX IDX_CUSTOMERS_LEVEL (level)`,
    );
    await queryRunner.query(
      `ALTER TABLE customers ADD INDEX IDX_CUSTOMERS_INTENTION_LEVEL (intention_level)`,
    );
    await queryRunner.query(
      `ALTER TABLE customers ADD INDEX IDX_CUSTOMERS_IS_IN_POOL (is_in_pool)`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop indexes
    await queryRunner.query(`ALTER TABLE customers DROP INDEX IDX_CUSTOMERS_IS_IN_POOL`);
    await queryRunner.query(`ALTER TABLE customers DROP INDEX IDX_CUSTOMERS_INTENTION_LEVEL`);
    await queryRunner.query(`ALTER TABLE customers DROP INDEX IDX_CUSTOMERS_LEVEL`);
    await queryRunner.query(`ALTER TABLE customers DROP INDEX IDX_CUSTOMERS_REGION`);
    await queryRunner.query(`ALTER TABLE customers DROP INDEX IDX_CUSTOMERS_UNIFIED_CREDIT_CODE`);
    await queryRunner.query(`ALTER TABLE customers DROP INDEX IDX_CUSTOMERS_CUSTOMER_NO`);

    // Drop new columns
    await queryRunner.query(`ALTER TABLE customers DROP COLUMN description`);
    await queryRunner.query(`ALTER TABLE customers DROP COLUMN website`);
    await queryRunner.query(`ALTER TABLE customers DROP COLUMN address`);
    await queryRunner.query(`ALTER TABLE customers DROP COLUMN custom_fields`);
    await queryRunner.query(`ALTER TABLE customers DROP COLUMN protect_until`);
    await queryRunner.query(`ALTER TABLE customers DROP COLUMN pool_enter_time`);
    await queryRunner.query(`ALTER TABLE customers DROP COLUMN is_in_pool`);
    await queryRunner.query(`ALTER TABLE customers DROP COLUMN employee_count`);
    await queryRunner.query(`ALTER TABLE customers DROP COLUMN annual_revenue`);
    await queryRunner.query(`ALTER TABLE customers DROP COLUMN registered_capital`);
    await queryRunner.query(`ALTER TABLE customers DROP COLUMN legal_person`);
    await queryRunner.query(`ALTER TABLE customers DROP COLUMN unified_credit_code`);
    await queryRunner.query(`ALTER TABLE customers DROP COLUMN credit_rating`);
    await queryRunner.query(`ALTER TABLE customers DROP COLUMN intention_level`);
    await queryRunner.query(`ALTER TABLE customers DROP COLUMN level`);
    await queryRunner.query(`ALTER TABLE customers DROP COLUMN region`);
    await queryRunner.query(`ALTER TABLE customers DROP COLUMN scale`);
    await queryRunner.query(`ALTER TABLE customers DROP COLUMN customer_type`);
    await queryRunner.query(`ALTER TABLE customers DROP COLUMN customer_no`);

    // Revert source to VARCHAR
    await queryRunner.query(
      `ALTER TABLE customers MODIFY COLUMN source VARCHAR(20) NULL`,
    );

    // Revert status ENUM to 6-state
    await queryRunner.query(
      `ALTER TABLE customers MODIFY COLUMN status ENUM('potential','following','negotiating','signed','lost','inactive') DEFAULT 'potential'`,
    );
  }
}
