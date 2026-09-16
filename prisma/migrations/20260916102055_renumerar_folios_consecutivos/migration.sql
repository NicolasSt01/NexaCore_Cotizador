-- Renumera los folios de COTIZACIONES a consecutivos por año: COT-YYYY-0001, 0002…
-- Paso 1: folio temporal único (por id) para no chocar con el índice único al
-- reasignar. Paso 2: consecutivo real por año, ordenado por fecha de creación.
UPDATE `quotations` SET `folio` = CONCAT('TMP-Q-', `id`);

UPDATE `quotations` q
JOIN (
  SELECT `id`,
         CONCAT('COT-', YEAR(`created_at`), '-',
                LPAD(ROW_NUMBER() OVER (PARTITION BY YEAR(`created_at`) ORDER BY `created_at`, `id`), 4, '0')) AS nf
  FROM `quotations`
) x ON q.`id` = x.`id`
SET q.`folio` = x.nf;

-- Igual para FACTURAS: F-YYYY-0001…
UPDATE `invoices` SET `folio` = CONCAT('TMP-F-', `id`);

UPDATE `invoices` i
JOIN (
  SELECT `id`,
         CONCAT('F-', YEAR(`created_at`), '-',
                LPAD(ROW_NUMBER() OVER (PARTITION BY YEAR(`created_at`) ORDER BY `created_at`, `id`), 4, '0')) AS nf
  FROM `invoices`
) x ON i.`id` = x.`id`
SET i.`folio` = x.nf;
