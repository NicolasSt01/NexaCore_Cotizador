-- AlterTable
ALTER TABLE `company_settings` ADD COLUMN `logo_data` LONGTEXT NULL,
    ADD COLUMN `logo_height` INTEGER NOT NULL DEFAULT 48;
