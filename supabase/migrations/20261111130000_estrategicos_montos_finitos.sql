-- En Postgres 'NaN'::numeric pasa el check ">= 0" (NaN se ordena por encima de
-- todo). Se cierran los montos para que solo acepten números reales y acotados.
alter table est_reportes
  add constraint est_reportes_montos_finitos check (
    ppto_inicial <> 'NaN'::numeric and total_ppto_actual <> 'NaN'::numeric and eje_financiera <> 'NaN'::numeric
  );
