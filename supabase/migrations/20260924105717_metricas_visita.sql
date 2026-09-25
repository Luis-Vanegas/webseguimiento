-- Métricas opcionales para el informe consolidado de visitas: el ingeniero
-- las completa cuando hay un cronograma/presupuesto de referencia contra el
-- que comparar el avance de campo. Nullable porque no todas las obras (ej.
-- en etapa inicial) tienen esos datos todavía.
alter table visitas_seguimiento
  add column porcentaje_programado numeric,
  add column porcentaje_pagado numeric,
  add column proximo_frente text;
