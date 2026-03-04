-- CRM Sales Platform — Database Initialization
-- This script runs on first-time container startup

CREATE DATABASE IF NOT EXISTS `crm_sales`
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

CREATE DATABASE IF NOT EXISTS `crm_sales_test`
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

-- Grant permissions
GRANT ALL PRIVILEGES ON `crm_sales`.* TO 'crm_user'@'%';
GRANT ALL PRIVILEGES ON `crm_sales_test`.* TO 'crm_user'@'%';
FLUSH PRIVILEGES;

USE `crm_sales`;

-- System info
SELECT 'CRM Sales database initialized successfully' AS status;
