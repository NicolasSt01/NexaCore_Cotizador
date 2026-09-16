-- AlterTable
ALTER TABLE `invoices` ADD COLUMN `cfdi_pdf_key` VARCHAR(191) NULL,
    ADD COLUMN `cfdi_xml_key` VARCHAR(191) NULL,
    ADD COLUMN `forma_pago` VARCHAR(191) NULL,
    ADD COLUMN `invoiced_at` DATETIME(3) NULL,
    ADD COLUMN `metodo_pago` VARCHAR(191) NULL,
    ADD COLUMN `uuid` VARCHAR(191) NULL,
    MODIFY `status` VARCHAR(191) NOT NULL DEFAULT 'solicitada';

-- Normaliza las facturas creadas con el estado anterior ("pendiente" = aún no
-- facturada) al nuevo estado inicial del ciclo.
UPDATE `invoices` SET `status` = 'solicitada' WHERE `status` = 'pendiente';
