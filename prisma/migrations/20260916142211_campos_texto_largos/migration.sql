-- AlterTable
ALTER TABLE `company_settings` MODIFY `default_terms` TEXT NULL,
    MODIFY `default_notes` TEXT NULL;

-- AlterTable
ALTER TABLE `quotations` MODIFY `payment_terms` TEXT NULL,
    MODIFY `delivery_terms` TEXT NULL,
    MODIFY `notes` TEXT NULL,
    MODIFY `terms_conditions` TEXT NULL;
