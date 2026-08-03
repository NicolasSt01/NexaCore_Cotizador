-- Antes de esta versión las retenciones de ISR e IVA se aplicaban a TODA
-- cotización, lo que dejaba totales por debajo de lo cobrado realmente
-- (ej. 3,700 + IVA se guardaba como 3,527.34 en vez de 4,292.00).
--
-- Ahora las retenciones son opcionales y vienen apagadas. Para las cotizaciones
-- que quedaron con retenciones aplicadas pero sin la bandera activa, se
-- restituye el total a subtotal + IVA.
UPDATE `quotations`
SET `isr_retencion` = 0,
    `iva_retencion` = 0,
    `total` = `subtotal` + `iva_amount`
WHERE `apply_isr_retencion` = FALSE
  AND `apply_iva_retencion` = FALSE
  AND (`isr_retencion` <> 0 OR `iva_retencion` <> 0);

-- Mismo criterio para las facturas ya generadas a partir de esas cotizaciones.
UPDATE `invoices` i
JOIN `quotations` q ON q.`id` = i.`quotation_id`
SET i.`retenciones` = 0,
    i.`total` = i.`subtotal` + i.`iva`
WHERE q.`apply_isr_retencion` = FALSE
  AND q.`apply_iva_retencion` = FALSE
  AND i.`retenciones` <> 0;
