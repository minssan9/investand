-- DropForeignKey
ALTER TABLE `admin_audit_logs` DROP FOREIGN KEY `admin_audit_logs_userId_fkey`;

-- DropForeignKey
ALTER TABLE `admin_login_attempts` DROP FOREIGN KEY `admin_login_attempts_userId_fkey`;

-- DropForeignKey
ALTER TABLE `admin_refresh_tokens` DROP FOREIGN KEY `admin_refresh_tokens_userId_fkey`;

-- DropForeignKey
ALTER TABLE `admin_sessions` DROP FOREIGN KEY `admin_sessions_userId_fkey`;

-- DropForeignKey
ALTER TABLE `data_export_requests` DROP FOREIGN KEY `data_export_requests_requestedBy_fkey`;

-- DropForeignKey
ALTER TABLE `notification_logs` DROP FOREIGN KEY `notification_logs_channelId_fkey`;

-- DropForeignKey
ALTER TABLE `notification_logs` DROP FOREIGN KEY `notification_logs_templateId_fkey`;

-- DropForeignKey
ALTER TABLE `notification_subscriptions` DROP FOREIGN KEY `notification_subscriptions_channelId_fkey`;

-- DropForeignKey
ALTER TABLE `notification_subscriptions` DROP FOREIGN KEY `notification_subscriptions_userId_fkey`;

-- DropForeignKey
ALTER TABLE `notification_templates` DROP FOREIGN KEY `notification_templates_channelId_fkey`;

-- DropForeignKey
ALTER TABLE `report_definitions` DROP FOREIGN KEY `report_definitions_createdBy_fkey`;

-- DropForeignKey
ALTER TABLE `report_executions` DROP FOREIGN KEY `report_executions_executedBy_fkey`;

-- DropForeignKey
ALTER TABLE `report_executions` DROP FOREIGN KEY `report_executions_reportId_fkey`;

-- DropForeignKey
ALTER TABLE `report_schedules` DROP FOREIGN KEY `report_schedules_reportId_fkey`;

-- DropForeignKey
ALTER TABLE `system_insights` DROP FOREIGN KEY `system_insights_acknowledgedBy_fkey`;

-- DropForeignKey
ALTER TABLE `websocket_connections` DROP FOREIGN KEY `websocket_connections_userId_fkey`;

-- DropIndex
DROP INDEX `dart_stock_holdings_corpCode_reportDate_reporterName_key` ON `dart_stock_holdings`;

-- AlterTable
ALTER TABLE `dart_stock_holdings` ADD COLUMN `isu_exctv_ofcps` VARCHAR(191) NULL,
    ADD COLUMN `isu_exctv_rgist_at` VARCHAR(191) NULL,
    ADD COLUMN `isu_main_shrholdr` VARCHAR(191) NULL;
