-- CreateTable
CREATE TABLE `payments` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `invoice_id` INTEGER NOT NULL,
    `amount` DECIMAL(14, 2) NOT NULL,
    `paid_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `method` VARCHAR(191) NULL,
    `note` VARCHAR(191) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `payments` ADD CONSTRAINT `payments_invoice_id_fkey` FOREIGN KEY (`invoice_id`) REFERENCES `invoices`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;


-- Backfill: registra un abono total para las facturas que ya estaban pagadas,
-- así el saldo calculado (total - abonos) queda en cero.
INSERT INTO `payments` (`invoice_id`, `amount`, `paid_at`, `created_at`)
SELECT `id`, `total`, COALESCE(`payment_date`, `created_at`), NOW()
FROM `invoices` WHERE `status` = 'pagada';
