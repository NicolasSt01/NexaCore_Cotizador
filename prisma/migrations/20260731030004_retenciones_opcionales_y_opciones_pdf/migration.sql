-- AlterTable
ALTER TABLE `quotations` ADD COLUMN `apply_isr_retencion` BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN `apply_iva_retencion` BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN `pdf_show_discount` BOOLEAN NOT NULL DEFAULT true,
    ADD COLUMN `pdf_show_iva` BOOLEAN NOT NULL DEFAULT true,
    ADD COLUMN `pdf_show_retenciones` BOOLEAN NOT NULL DEFAULT true,
    ADD COLUMN `pdf_show_subtotal` BOOLEAN NOT NULL DEFAULT true;
