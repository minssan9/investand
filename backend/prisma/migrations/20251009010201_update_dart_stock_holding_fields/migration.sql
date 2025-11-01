-- DropIndex
DROP INDEX `dart_stock_holdings_reportDate_idx` ON `dart_stock_holdings`;

-- AlterTable
ALTER TABLE `dart_stock_holdings` ADD COLUMN `majorTransactionRatio` VARCHAR(191) NULL,
    ADD COLUMN `majorTransactionShares` VARCHAR(191) NULL,
    ADD COLUMN `receiptDate` DATE NULL,
    ADD COLUMN `receiptNumber` VARCHAR(191) NULL,
    ADD COLUMN `reportReason` TEXT NULL,
    ADD COLUMN `reportType` VARCHAR(191) NULL,
    MODIFY `reportDate` DATE NULL,
    MODIFY `holdingRatio` VARCHAR(191) NULL,
    MODIFY `holdingShares` VARCHAR(191) NULL,
    MODIFY `changeRatio` VARCHAR(191) NULL,
    MODIFY `changeShares` VARCHAR(191) NULL,
    MODIFY `changeReason` VARCHAR(191) NULL;

-- CreateIndex
CREATE INDEX `dart_stock_holdings_receiptNumber_idx` ON `dart_stock_holdings`(`receiptNumber`);

-- CreateIndex
CREATE INDEX `dart_stock_holdings_receiptDate_idx` ON `dart_stock_holdings`(`receiptDate`);

-- CreateIndex
CREATE INDEX `dart_stock_holdings_reporterName_idx` ON `dart_stock_holdings`(`reporterName`);
