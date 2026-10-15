-- Initial data imported from Tablero_Control_Actividades.xlsx (sheet "Datos").
-- One acta per (ORIGEN, FECHA INICIO); "Acta de reunión" rows mark the acta itself, not a commitment.
-- Idempotent: fixed acta ids, skipped when they already exist.
begin;

insert into actas (id, origen, fecha) values
  ('650bbafa-a35f-53e3-8473-21f11e2f1aa2', 'Arenilla a sintética', '2026-10-07'),
  ('bb426363-a03c-5dbf-b99d-296a646e7922', 'Seguimiento Fomento', '2026-10-07'),
  ('e0988e38-5359-5723-a41b-838dda2b504e', 'Comité Directivo', '2026-10-06'),
  ('052f5798-280b-599b-8348-965289c03595', 'Seguimiento Financiero', '2026-10-06'),
  ('863ac529-4099-5949-91b1-b37fc201986c', 'Plan Piscinas', '2026-10-14')
on conflict (id) do nothing;

insert into compromisos (acta_id, actividad, responsable, fecha_vencimiento, estado, criterio_fecha)
select v.* from (values
  ('650bbafa-a35f-53e3-8473-21f11e2f1aa2'::uuid, 'Formalizar ante el DAP cuáles son las dos obras que no se pueden realizar y las razones', 'Jorge Rondón', '2026-10-16'::date, 'Pendiente', 'Estimada: corto plazo (≈1-2 semanas)'),
  ('650bbafa-a35f-53e3-8473-21f11e2f1aa2'::uuid, 'Validar el reemplazo o la eliminación de esas dos obras', 'Jorge Rondón', '2026-10-23'::date, 'Pendiente', 'Estimada: mediano plazo (≈3-4 semanas)'),
  ('650bbafa-a35f-53e3-8473-21f11e2f1aa2'::uuid, 'Seguir los cronogramas de estructuración de contratos', 'Jurídica', '2026-10-30'::date, 'Pendiente', 'Estimada: seguimiento continuo, primer corte a fin de mes'),
  ('650bbafa-a35f-53e3-8473-21f11e2f1aa2'::uuid, 'Revisar con el Jefe Jurídico el equipo que acompaña licitaciones y obra para aumentar el número de personas', 'Nataly Hoyos', '2026-10-23'::date, 'Pendiente', 'Estimada: mediano plazo (≈3-4 semanas)'),
  ('650bbafa-a35f-53e3-8473-21f11e2f1aa2'::uuid, 'LP05 – Citar al contratista por atrasos y desviaciones superiores al 20%. Está en riesgo la entrega del 14 de diciembre. Reunión con Carlos Monsalve viernes 9 de octubre.', 'Andrea Herrera, Carlos Monsalve', '2026-10-09'::date, 'Crítica', 'Explícita en el texto: reunión viernes 9 de octubre'),
  ('650bbafa-a35f-53e3-8473-21f11e2f1aa2'::uuid, 'LP09 – Revisar problemas con el contratista y riesgo de atraso', 'José Viera', '2026-10-16'::date, 'Pendiente', 'Estimada: corto plazo (≈1-2 semanas)'),
  ('650bbafa-a35f-53e3-8473-21f11e2f1aa2'::uuid, 'LP08 – Desglosar las necesidades de presupuesto adicional, 840 MM aprox. Desfase del 20% y problemas con el proceso de diseño y cálculo, se debe mitigar para los escenarios faltantes.', 'Diego Martínez', '2026-10-16'::date, 'Crítica', 'Estimada: corto plazo (≈1-2 semanas)'),
  ('650bbafa-a35f-53e3-8473-21f11e2f1aa2'::uuid, 'Mitigar errores de diseño y cálculo para el presupuesto de los escenarios faltantes', 'Claudia Hincapie', '2026-10-30'::date, 'Crítica', 'Estimada: mediano plazo (≈3-4 semanas)'),
  ('bb426363-a03c-5dbf-b99d-296a646e7922'::uuid, 'Elaborar tablero de seguimiento fomento', 'Juana Giraldo', '2026-10-16'::date, 'En progreso', 'Estimada: corto plazo (≈1-2 semanas)'),
  ('bb426363-a03c-5dbf-b99d-296a646e7922'::uuid, 'Definir política de prestación de servicios: mínimos y máximos por subestrategia', 'Líderes Fomento - Planeación', '2026-11-06'::date, 'Pendiente', 'Estimada: ≈4-6 semanas'),
  ('bb426363-a03c-5dbf-b99d-296a646e7922'::uuid, 'Definir política de apertura, cierre y traslado de puntos', 'Líderes Fomento - Planeación', '2026-11-06'::date, 'Pendiente', 'Estimada: ≈4-6 semanas'),
  ('bb426363-a03c-5dbf-b99d-296a646e7922'::uuid, 'Definir política de registro de usuarios, padres, acompañantes y cuidadores', 'Líderes Fomento - Planeación', '2026-11-13'::date, 'Pendiente', 'Estimada: ≈4-6 semanas'),
  ('bb426363-a03c-5dbf-b99d-296a646e7922'::uuid, 'Definir política de registro de eventos especiales y eventos apoyados con capacidad instalada', 'Líderes Fomento - Planeación', '2026-11-13'::date, 'Pendiente', 'Estimada: ≈4-6 semanas'),
  ('bb426363-a03c-5dbf-b99d-296a646e7922'::uuid, 'Proponer política de préstamo de escenarios', 'Líderes Fomento', '2026-11-20'::date, 'Pendiente', 'Estimada: ≈4-6 semanas'),
  ('bb426363-a03c-5dbf-b99d-296a646e7922'::uuid, 'Elaborar listado de escenarios de la oferta INDER', 'Jorge Rondón', '2026-10-30'::date, 'Pendiente', 'Estimada: mediano plazo (≈3-4 semanas)'),
  ('bb426363-a03c-5dbf-b99d-296a646e7922'::uuid, 'Elaborar listado de clubes y espacios que utiliza en escenarios', 'Jorge Rondón, Ricardo Valencia', '2026-10-30'::date, 'Pendiente', 'Estimada: mediano plazo (≈3-4 semanas)'),
  ('e0988e38-5359-5723-a41b-838dda2b504e'::uuid, 'Enviar información de POAI 2027 para presentación Junta Directiva', 'Jorge Rondón', '2026-10-08'::date, 'Completada', 'Estimada: mediano plazo (≈3-4 semanas)'),
  ('052f5798-280b-599b-8348-965289c03595'::uuid, 'Desembolsar recursos de superávit por $4.500 MM', 'Wilson Yoanny', null::date, 'En progreso', 'Estimada: mediano plazo (≈3-4 semanas)'),
  ('052f5798-280b-599b-8348-965289c03595'::uuid, 'Revisar avance físico Recreos con la EDU para que Hacienda pueda desembolsar recursos para pago por $21.000 MM', 'Nataly Hoyos', null::date, 'Pendiente', 'Estimada: mediano plazo (≈3-4 semanas)'),
  ('052f5798-280b-599b-8348-965289c03595'::uuid, 'Verificar recaudo Tasa Prodeporte para realizar desembolso al INDER de los $25.000 MM adicionados.', 'Wilson Yoanny', null::date, 'Pendiente', 'Estimada: mediano plazo (≈3-4 semanas)'),
  ('052f5798-280b-599b-8348-965289c03595'::uuid, 'Ajustar las necesidades del PAC con las necesidades de recursos para noviembre y diciembre para enviar a Hacienda', 'Equipo seguimiento financiero', null::date, 'Pendiente', 'Estimada: mediano plazo (≈3-4 semanas)'),
  ('863ac529-4099-5949-91b1-b37fc201986c'::uuid, 'revisar el presupuesto de las piscinas porque están desfasados de la planeación inicial de 2.500 MM', 'Diego Palacio', null::date, 'Pendiente', 'Estimada: mediano plazo (≈3-4 semanas)'),
  ('863ac529-4099-5949-91b1-b37fc201986c'::uuid, 'revisa la posibilidad de cambiar CDP a orden labor con IDEA para poder avanzar con el proceso de contratación de Preventorio.', 'Paula Osorio', '2026-10-15'::date, 'Pendiente', 'Estimada: mediano plazo (≈3-4 semanas)')
) as v(acta_id, actividad, responsable, fecha_vencimiento, estado, criterio_fecha)
where not exists (select 1 from compromisos c where c.acta_id = v.acta_id);

commit;
