-- DropForeignKey
ALTER TABLE `invoices` DROP FOREIGN KEY `invoices_quotation_id_fkey`;

-- AlterTable
ALTER TABLE `invoices` ADD COLUMN `charge_id` INTEGER NULL,
    MODIFY `quotation_id` INTEGER NULL;

-- CreateTable
CREATE TABLE `contracts` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `client_id` INTEGER NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `status` VARCHAR(191) NOT NULL DEFAULT 'activo',
    `billing_day` INTEGER NOT NULL DEFAULT 1,
    `currency` VARCHAR(191) NOT NULL DEFAULT 'MXN',
    `notes` VARCHAR(191) NULL,
    `start_date` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `contract_items` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `contract_id` INTEGER NOT NULL,
    `concept` VARCHAR(191) NOT NULL,
    `kind` VARCHAR(191) NOT NULL DEFAULT 'fijo',
    `unit_price` DECIMAL(12, 2) NOT NULL,
    `unit` VARCHAR(191) NOT NULL DEFAULT 'mes',
    `taxType` VARCHAR(191) NOT NULL DEFAULT 'iva',
    `active` BOOLEAN NOT NULL DEFAULT true,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `charges` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `contract_id` INTEGER NOT NULL,
    `period_year` INTEGER NOT NULL,
    `period_month` INTEGER NOT NULL,
    `status` VARCHAR(191) NOT NULL DEFAULT 'borrador',
    `subtotal` DECIMAL(14, 2) NOT NULL DEFAULT 0,
    `iva` DECIMAL(14, 2) NOT NULL DEFAULT 0,
    `total` DECIMAL(14, 2) NOT NULL DEFAULT 0,
    `notes` VARCHAR(191) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `charges_contract_id_period_year_period_month_key`(`contract_id`, `period_year`, `period_month`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `charge_lines` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `charge_id` INTEGER NOT NULL,
    `concept` VARCHAR(191) NOT NULL,
    `kind` VARCHAR(191) NOT NULL DEFAULT 'fijo',
    `quantity` DECIMAL(12, 2) NOT NULL DEFAULT 1,
    `unit_price` DECIMAL(12, 2) NOT NULL,
    `unit` VARCHAR(191) NOT NULL DEFAULT '',
    `taxType` VARCHAR(191) NOT NULL DEFAULT 'iva',
    `subtotal` DECIMAL(14, 2) NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateIndex
CREATE UNIQUE INDEX `invoices_charge_id_key` ON `invoices`(`charge_id`);

-- AddForeignKey
ALTER TABLE `invoices` ADD CONSTRAINT `invoices_quotation_id_fkey` FOREIGN KEY (`quotation_id`) REFERENCES `quotations`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `invoices` ADD CONSTRAINT `invoices_charge_id_fkey` FOREIGN KEY (`charge_id`) REFERENCES `charges`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `contracts` ADD CONSTRAINT `contracts_client_id_fkey` FOREIGN KEY (`client_id`) REFERENCES `clients`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `contract_items` ADD CONSTRAINT `contract_items_contract_id_fkey` FOREIGN KEY (`contract_id`) REFERENCES `contracts`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `charges` ADD CONSTRAINT `charges_contract_id_fkey` FOREIGN KEY (`contract_id`) REFERENCES `contracts`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `charge_lines` ADD CONSTRAINT `charge_lines_charge_id_fkey` FOREIGN KEY (`charge_id`) REFERENCES `charges`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

