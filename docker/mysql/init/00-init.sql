-- CRM Sales Platform — Database Initialization
-- This script runs on first-time container startup

CREATE DATABASE IF NOT EXISTS `crm_sales`
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

CREATE DATABASE IF NOT EXISTS `crm_sales_test`
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

-- Grant minimum required privileges (principle of least privilege)
-- crm_user is the application runtime account: DML only, no DDL, no admin, no FILE access.
-- LOCK TABLES is included so mysqldump can produce consistent backups for this account.
-- NOTE: TypeORM migrations (CREATE/ALTER/INDEX/DROP) require DDL privileges and must be
--       run as root or a dedicated migration account, NOT as crm_user.
GRANT SELECT, INSERT, UPDATE, DELETE, LOCK TABLES ON `crm_sales`.*      TO 'crm_user'@'%';
GRANT SELECT, INSERT, UPDATE, DELETE, LOCK TABLES ON `crm_sales_test`.* TO 'crm_user'@'%';

-- crm_migrator is the DDL account used exclusively for TypeORM migration:run.
-- It has full DDL rights on both schemas but no FILE or SUPER admin access.
-- Usage: DB_USERNAME=crm_migrator DB_PASSWORD=<migrator-password> pnpm migration:run
CREATE USER IF NOT EXISTS 'crm_migrator'@'%' IDENTIFIED BY 'please-change-migrator-password';
GRANT SELECT, INSERT, UPDATE, DELETE, CREATE, DROP, ALTER, INDEX, REFERENCES,
      CREATE TEMPORARY TABLES, LOCK TABLES
  ON `crm_sales`.*      TO 'crm_migrator'@'%';
GRANT SELECT, INSERT, UPDATE, DELETE, CREATE, DROP, ALTER, INDEX, REFERENCES,
      CREATE TEMPORARY TABLES, LOCK TABLES
  ON `crm_sales_test`.* TO 'crm_migrator'@'%';
FLUSH PRIVILEGES;

USE `crm_sales`;

-- System info
SELECT 'CRM Sales database initialized successfully' AS status;
