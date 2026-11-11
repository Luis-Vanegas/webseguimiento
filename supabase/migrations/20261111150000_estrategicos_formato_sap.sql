-- Formato definitivo de la plantilla (2026-11-11): el proyecto de inversión se
-- identifica por Código SAP (ya no se pide BPIN) y cada aporte trae, además del
-- porcentaje, el presupuesto que aporta al proyecto estratégico.

-- El catálogo de proyectos de inversión solo servía para autocompletar el BPIN
-- en el formulario individual, que ya no existe para registrar.
drop table est_proyectos_inversion;

-- La vista depende de las columnas que cambian de tipo: se recrea al final.
drop view est_v_consolidado;

drop index est_reportes_unico_activo;
alter table est_reportes alter column cod_bpin drop not null;
alter table est_reportes drop constraint est_reportes_cod_bpin_check;
alter table est_reportes add constraint est_reportes_cod_bpin_check
  check (cod_bpin is null or cod_bpin ~ '^[0-9]{6,20}$');
alter table est_reportes alter column cod_sap set not null;
create unique index est_reportes_unico_activo
  on est_reportes (vigencia, cod_sap) where estado = 'activo';

-- Más decimales: cuando reportan solo el valor, el % se calcula y puede ser pequeño.
alter table est_reporte_aportes alter column porcentaje type numeric(9,6);
alter table est_reporte_aportes add column valor_aportado numeric(18,2)
  check (valor_aportado is null or (valor_aportado >= 0 and valor_aportado <> 'NaN'::numeric));

create view est_v_consolidado with (security_invoker = true) as
select
  'REP-' || lpad(r.id::text, 4, '0') as reporte,
  r.vigencia, r.cen_gestor, d.nombre as dependencia,
  r.cod_sap, r.nom_proyecto,
  r.ppto_inicial, r.total_ppto_actual, r.eje_financiera,
  pe.nombre as proyecto_estrategico,
  a.porcentaje,
  coalesce(a.valor_aportado, round(r.eje_financiera * a.porcentaje / 100, 2)) as valor_aportado,
  r.reportado_por, r.correo, r.observaciones,
  r.created_at, r.updated_at
from est_reportes r
join est_dependencias d on d.cen_gestor = r.cen_gestor
left join est_reporte_aportes a on a.reporte_id = r.id
left join est_proyectos_estrategicos pe on pe.id = a.proyecto_estrategico_id
where r.estado = 'activo';
revoke all on est_v_consolidado from anon;

create or replace function est_obtener_reporte(p_token uuid)
returns jsonb
language sql stable security definer set search_path = public
as $$
  select jsonb_build_object(
    'id', r.id, 'vigencia', r.vigencia, 'cen_gestor', r.cen_gestor,
    'cod_sap', r.cod_sap, 'nom_proyecto', r.nom_proyecto,
    'ppto_inicial', r.ppto_inicial, 'total_ppto_actual', r.total_ppto_actual,
    'eje_financiera', r.eje_financiera, 'reportado_por', r.reportado_por,
    'correo', r.correo, 'observaciones', r.observaciones, 'estado', r.estado,
    'updated_at', r.updated_at,
    'aportes', coalesce((
      select jsonb_agg(jsonb_build_object(
        'proyecto_estrategico_id', a.proyecto_estrategico_id, 'porcentaje', a.porcentaje,
        'valor_aportado', a.valor_aportado
      ) order by a.id)
      from est_reporte_aportes a where a.reporte_id = r.id
    ), '[]'::jsonb)
  )
  from est_reportes r where r.token = p_token;
$$;

create or replace function est_guardar_reporte(p jsonb, p_token uuid default null)
returns jsonb
language plpgsql security definer set search_path = public
as $$
declare
  v_id bigint;
  v_token uuid;
  v_aportes jsonb := coalesce(p->'aportes', '[]'::jsonb);
  v_existente bigint;
begin
  if jsonb_typeof(v_aportes) <> 'array' or jsonb_array_length(v_aportes) = 0 then
    raise exception 'Agrega al menos un proyecto estratégico.' using errcode = 'P0001';
  end if;
  if jsonb_array_length(v_aportes) > 30 then
    raise exception 'Máximo 30 proyectos estratégicos por proyecto de inversión.' using errcode = 'P0001';
  end if;
  if (select sum((x->>'porcentaje')::numeric) from jsonb_array_elements(v_aportes) x) > 100.0001 then
    raise exception 'La suma de porcentajes no puede superar el 100 %%.' using errcode = 'P0001';
  end if;

  select id into v_existente from est_reportes
  where vigencia = (p->>'vigencia')::smallint and cod_sap = trim(p->>'cod_sap')
    and estado = 'activo' and (p_token is null or token <> p_token);
  if v_existente is not null then
    raise exception 'Ya existe el reporte REP-% para este proyecto (SAP) y vigencia. Para corregirlo usa su enlace de corrección.',
      lpad(v_existente::text, 4, '0') using errcode = 'P0001';
  end if;

  if p_token is null then
    insert into est_reportes (vigencia, cen_gestor, cod_sap, nom_proyecto,
      ppto_inicial, total_ppto_actual, eje_financiera, reportado_por, correo, observaciones)
    values ((p->>'vigencia')::smallint, (p->>'cen_gestor')::integer, trim(p->>'cod_sap'),
      trim(p->>'nom_proyecto'),
      (p->>'ppto_inicial')::numeric, (p->>'total_ppto_actual')::numeric, (p->>'eje_financiera')::numeric,
      trim(p->>'reportado_por'), nullif(trim(p->>'correo'), ''), nullif(trim(p->>'observaciones'), ''))
    returning id, token into v_id, v_token;
  else
    update est_reportes set
      vigencia = (p->>'vigencia')::smallint, cen_gestor = (p->>'cen_gestor')::integer,
      cod_sap = trim(p->>'cod_sap'), nom_proyecto = trim(p->>'nom_proyecto'),
      ppto_inicial = (p->>'ppto_inicial')::numeric, total_ppto_actual = (p->>'total_ppto_actual')::numeric,
      eje_financiera = (p->>'eje_financiera')::numeric, reportado_por = trim(p->>'reportado_por'),
      correo = nullif(trim(p->>'correo'), ''), observaciones = nullif(trim(p->>'observaciones'), ''),
      estado = 'activo', updated_at = now()
    where token = p_token
    returning id, token into v_id, v_token;
    if v_id is null then
      raise exception 'El enlace de edición no es válido.' using errcode = 'P0001';
    end if;
    delete from est_reporte_aportes where reporte_id = v_id;
  end if;

  insert into est_reporte_aportes (reporte_id, proyecto_estrategico_id, porcentaje, valor_aportado)
  select v_id, (x->>'proyecto_estrategico_id')::smallint, (x->>'porcentaje')::numeric,
    (x->>'valor_aportado')::numeric
  from jsonb_array_elements(v_aportes) x;

  return jsonb_build_object('id', v_id, 'token', v_token);
exception
  when unique_violation then
    if sqlerrm like '%est_reportes_unico_activo%' then
      raise exception 'Ya existe un reporte para este proyecto (SAP) y vigencia.' using errcode = 'P0001';
    end if;
    raise exception 'Hay un proyecto estratégico repetido en el mismo proyecto de inversión.' using errcode = 'P0001';
  when check_violation or foreign_key_violation or invalid_text_representation or not_null_violation then
    raise exception 'Revisa los datos: hay un valor vacío o con formato inválido.' using errcode = 'P0001';
end;
$$;
