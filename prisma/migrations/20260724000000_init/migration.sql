-- CreateTable
CREATE TABLE `users` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(191) NOT NULL,
    `email` VARCHAR(191) NOT NULL,
    `password_hash` VARCHAR(191) NOT NULL,
    `role` VARCHAR(191) NOT NULL DEFAULT 'editor',
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `users_email_key`(`email`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `clients` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `business_name` VARCHAR(191) NOT NULL,
    `rfc` VARCHAR(191) NOT NULL,
    `curp` VARCHAR(191) NULL,
    `email` VARCHAR(191) NULL,
    `phone` VARCHAR(191) NULL,
    `address_street` VARCHAR(191) NULL,
    `address_number` VARCHAR(191) NULL,
    `address_colony` VARCHAR(191) NULL,
    `city` VARCHAR(191) NULL,
    `state` VARCHAR(191) NULL,
    `zip_code` VARCHAR(191) NULL,
    `tax_regime` VARCHAR(191) NULL,
    `cfdi_usage` VARCHAR(191) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `clients_rfc_key`(`rfc`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `products` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(191) NOT NULL,
    `description` VARCHAR(191) NULL,
    `unit_price` DECIMAL(12, 2) NOT NULL,
    `tax_type` VARCHAR(191) NOT NULL DEFAULT 'iva',
    `unit` VARCHAR(191) NOT NULL DEFAULT 'pieza',
    `sku` VARCHAR(191) NOT NULL,
    `active` BOOLEAN NOT NULL DEFAULT true,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `products_sku_key`(`sku`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `quotations` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `folio` VARCHAR(191) NOT NULL,
    `client_id` INTEGER NOT NULL,
    `user_id` INTEGER NOT NULL,
    `status` VARCHAR(191) NOT NULL DEFAULT 'borrador',
    `issue_date` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `valid_until` DATETIME(3) NULL,
    `payment_terms` VARCHAR(191) NULL,
    `delivery_terms` VARCHAR(191) NULL,
    `notes` VARCHAR(191) NULL,
    `terms_conditions` VARCHAR(191) NULL,
    `subtotal` DECIMAL(14, 2) NOT NULL DEFAULT 0,
    `discount_percent` DECIMAL(5, 2) NOT NULL DEFAULT 0,
    `discount_amount` DECIMAL(14, 2) NOT NULL DEFAULT 0,
    `iva_amount` DECIMAL(14, 2) NOT NULL DEFAULT 0,
    `isr_retencion` DECIMAL(14, 2) NOT NULL DEFAULT 0,
    `iva_retencion` DECIMAL(14, 2) NOT NULL DEFAULT 0,
    `total` DECIMAL(14, 2) NOT NULL DEFAULT 0,
    `public_hash` VARCHAR(191) NULL,
    `currency` VARCHAR(191) NOT NULL DEFAULT 'MXN',
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `quotations_folio_key`(`folio`),
    UNIQUE INDEX `quotations_public_hash_key`(`public_hash`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `quotation_items` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `quotation_id` INTEGER NOT NULL,
    `product_id` INTEGER NULL,
    `concept` VARCHAR(191) NOT NULL,
    `description` VARCHAR(191) NULL,
    `quantity` INTEGER NOT NULL,
    `unit` VARCHAR(191) NOT NULL DEFAULT 'pieza',
    `unit_price` DECIMAL(12, 2) NOT NULL,
    `discount_percent` DECIMAL(5, 2) NOT NULL DEFAULT 0,
    `subtotal` DECIMAL(14, 2) NOT NULL,
    `iva` DECIMAL(14, 2) NOT NULL DEFAULT 0,
    `total` DECIMAL(14, 2) NOT NULL,
    `sort_order` INTEGER NOT NULL DEFAULT 0,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `invoices` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `quotation_id` INTEGER NOT NULL,
    `folio` VARCHAR(191) NOT NULL,
    `status` VARCHAR(191) NOT NULL DEFAULT 'pendiente',
    `subtotal` DECIMAL(14, 2) NOT NULL,
    `iva` DECIMAL(14, 2) NOT NULL,
    `retenciones` DECIMAL(14, 2) NOT NULL,
    `total` DECIMAL(14, 2) NOT NULL,
    `issue_date` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `payment_date` DATETIME(3) NULL,
    `pdf_path` VARCHAR(191) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `invoices_quotation_id_key`(`quotation_id`),
    UNIQUE INDEX `invoices_folio_key`(`folio`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `company_settings` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `business_name` VARCHAR(191) NOT NULL,
    `rfc` VARCHAR(191) NOT NULL,
    `curp` VARCHAR(191) NULL,
    `tax_regime` VARCHAR(191) NULL,
    `address_street` VARCHAR(191) NULL,
    `address_number` VARCHAR(191) NULL,
    `address_colony` VARCHAR(191) NULL,
    `city` VARCHAR(191) NULL,
    `state` VARCHAR(191) NULL,
    `zip_code` VARCHAR(191) NULL,
    `logo_path` VARCHAR(191) NULL,
    `email` VARCHAR(191) NULL,
    `phone` VARCHAR(191) NULL,
    `website` VARCHAR(191) NULL,
    `iva_rate` DECIMAL(5, 4) NOT NULL DEFAULT 0.16,
    `isr_retencion_rate` DECIMAL(5, 4) NOT NULL DEFAULT 0.10,
    `iva_retencion_rate` DECIMAL(8, 6) NOT NULL DEFAULT 0.106666,
    `default_terms` VARCHAR(191) NULL,
    `default_notes` VARCHAR(191) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `quotations` ADD CONSTRAINT `quotations_client_id_fkey` FOREIGN KEY (`client_id`) REFERENCES `clients`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `quotations` ADD CONSTRAINT `quotations_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `quotation_items` ADD CONSTRAINT `quotation_items_quotation_id_fkey` FOREIGN KEY (`quotation_id`) REFERENCES `quotations`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `quotation_items` ADD CONSTRAINT `quotation_items_product_id_fkey` FOREIGN KEY (`product_id`) REFERENCES `products`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `invoices` ADD CONSTRAINT `invoices_quotation_id_fkey` FOREIGN KEY (`quotation_id`) REFERENCES `quotations`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
