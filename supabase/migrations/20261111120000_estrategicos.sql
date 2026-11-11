-- Recolección masiva: aporte de proyectos de inversión a proyectos estratégicos.
-- Formulario público (sin login) que llenan las dependencias. Independiente
-- de los módulos de seguimiento y actas.
--
-- SEGURIDAD: anon NO toca las tablas de reportes directamente. Solo puede
-- leer los catálogos y llamar a las funciones est_* (security definer), que
-- validan la entrada. Cada reporte tiene un token secreto (uuid) que se le
-- entrega a quien lo envía: con él, y solo con él, se consulta, corrige o
-- anula ese reporte. Así se corrigen errores sin login y nadie puede editar
-- reportes ajenos.

create table est_dependencias (
  cen_gestor integer primary key,
  nombre text not null
);

create table est_proyectos_estrategicos (
  id smallint generated always as identity primary key,
  nombre text not null unique
);

-- Catálogo de proyectos de inversión conocidos, solo para autocompletar.
-- El formulario acepta proyectos que no estén aquí.
create table est_proyectos_inversion (
  cod_bpin text primary key,
  cod_sap text,
  nombre text not null,
  cen_gestor integer references est_dependencias(cen_gestor)
);

create table est_reportes (
  -- Consecutivo legible que se muestra como REP-0001.
  id bigint generated always as identity primary key,
  token uuid not null unique default gen_random_uuid(),
  vigencia smallint not null check (vigencia between 2020 and 2035),
  cen_gestor integer not null references est_dependencias(cen_gestor),
  cod_bpin text not null check (cod_bpin ~ '^[0-9]{6,20}$'),
  cod_sap text check (cod_sap is null or cod_sap ~ '^[0-9]{1,12}$'),
  nom_proyecto text not null check (length(trim(nom_proyecto)) between 3 and 500),
  ppto_inicial numeric(18,2) not null check (ppto_inicial >= 0),
  total_ppto_actual numeric(18,2) not null check (total_ppto_actual >= 0),
  eje_financiera numeric(18,2) not null check (eje_financiera >= 0),
  reportado_por text not null check (length(trim(reportado_por)) between 3 and 150),
  correo text check (correo is null or correo ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  observaciones text check (observaciones is null or length(observaciones) <= 2000),
  estado text not null default 'activo' check (estado in ('activo', 'anulado')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Un solo reporte vigente por proyecto y vigencia: evita duplicados cuando
-- dos personas de la misma dependencia llenan el mismo proyecto.
create unique index est_reportes_unico_activo
  on est_reportes (vigencia, cod_bpin) where estado = 'activo';

create table est_reporte_aportes (
  id bigint generated always as identity primary key,
  reporte_id bigint not null references est_reportes(id) on delete cascade,
  proyecto_estrategico_id smallint not null references est_proyectos_estrategicos(id),
  porcentaje numeric(5,2) not null check (porcentaje > 0 and porcentaje <= 100),
  unique (reporte_id, proyecto_estrategico_id)
);

alter table est_dependencias enable row level security;
alter table est_proyectos_estrategicos enable row level security;
alter table est_proyectos_inversion enable row level security;
alter table est_reportes enable row level security;
alter table est_reporte_aportes enable row level security;

create policy "lectura_publica" on est_dependencias for select to anon, authenticated using (true);
create policy "lectura_publica" on est_proyectos_estrategicos for select to anon, authenticated using (true);
create policy "lectura_publica" on est_proyectos_inversion for select to anon, authenticated using (true);
-- est_reportes y est_reporte_aportes: sin policies → anon no tiene acceso directo.

-- Consolidado para exportar (una fila por aporte). El valor aportado se
-- calcula sobre la ejecución financiera, igual que en el Excel de la UIP.
create view est_v_consolidado with (security_invoker = true) as
select
  'REP-' || lpad(r.id::text, 4, '0') as reporte,
  r.vigencia, r.cen_gestor, d.nombre as dependencia,
  r.cod_bpin, r.cod_sap, r.nom_proyecto,
  r.ppto_inicial, r.total_ppto_actual, r.eje_financiera,
  pe.nombre as proyecto_estrategico,
  a.porcentaje,
  round(r.eje_financiera * a.porcentaje / 100, 2) as valor_aportado,
  r.reportado_por, r.correo, r.observaciones,
  r.created_at, r.updated_at
from est_reportes r
join est_dependencias d on d.cen_gestor = r.cen_gestor
left join est_reporte_aportes a on a.reporte_id = r.id
left join est_proyectos_estrategicos pe on pe.id = a.proyecto_estrategico_id
where r.estado = 'activo';

-- Devuelve el reporte completo como JSON (para el formulario de edición).
create function est_obtener_reporte(p_token uuid)
returns jsonb
language sql stable security definer set search_path = public
as $$
  select jsonb_build_object(
    'id', r.id, 'vigencia', r.vigencia, 'cen_gestor', r.cen_gestor,
    'cod_bpin', r.cod_bpin, 'cod_sap', r.cod_sap, 'nom_proyecto', r.nom_proyecto,
    'ppto_inicial', r.ppto_inicial, 'total_ppto_actual', r.total_ppto_actual,
    'eje_financiera', r.eje_financiera, 'reportado_por', r.reportado_por,
    'correo', r.correo, 'observaciones', r.observaciones, 'estado', r.estado,
    'updated_at', r.updated_at,
    'aportes', coalesce((
      select jsonb_agg(jsonb_build_object(
        'proyecto_estrategico_id', a.proyecto_estrategico_id, 'porcentaje', a.porcentaje
      ) order by a.id)
      from est_reporte_aportes a where a.reporte_id = r.id
    ), '[]'::jsonb)
  )
  from est_reportes r where r.token = p_token;
$$;

-- Crea (p_token null) o corrige (p_token del reporte) un reporte con sus
-- aportes. Devuelve {id, token}. Todo en una transacción: si un aporte es
-- inválido no queda un reporte a medias.
create function est_guardar_reporte(p jsonb, p_token uuid default null)
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
  if jsonb_array_length(v_aportes) > 20 then
    raise exception 'Máximo 20 proyectos estratégicos por reporte.' using errcode = 'P0001';
  end if;
  if (select sum((x->>'porcentaje')::numeric) from jsonb_array_elements(v_aportes) x) > 100 then
    raise exception 'La suma de porcentajes no puede superar el 100 %%.' using errcode = 'P0001';
  end if;

  select id into v_existente from est_reportes
  where vigencia = (p->>'vigencia')::smallint and cod_bpin = trim(p->>'cod_bpin')
    and estado = 'activo' and (p_token is null or token <> p_token);
  if v_existente is not null then
    raise exception 'Ya existe el reporte REP-% para este proyecto y vigencia. Para corregirlo usa el enlace de edición que se generó al enviarlo.',
      lpad(v_existente::text, 4, '0') using errcode = 'P0001';
  end if;

  if p_token is null then
    insert into est_reportes (vigencia, cen_gestor, cod_bpin, cod_sap, nom_proyecto,
      ppto_inicial, total_ppto_actual, eje_financiera, reportado_por, correo, observaciones)
    values ((p->>'vigencia')::smallint, (p->>'cen_gestor')::integer, trim(p->>'cod_bpin'),
      nullif(trim(p->>'cod_sap'), ''), trim(p->>'nom_proyecto'),
      (p->>'ppto_inicial')::numeric, (p->>'total_ppto_actual')::numeric, (p->>'eje_financiera')::numeric,
      trim(p->>'reportado_por'), nullif(trim(p->>'correo'), ''), nullif(trim(p->>'observaciones'), ''))
    returning id, token into v_id, v_token;
  else
    update est_reportes set
      vigencia = (p->>'vigencia')::smallint, cen_gestor = (p->>'cen_gestor')::integer,
      cod_bpin = trim(p->>'cod_bpin'), cod_sap = nullif(trim(p->>'cod_sap'), ''),
      nom_proyecto = trim(p->>'nom_proyecto'),
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

  insert into est_reporte_aportes (reporte_id, proyecto_estrategico_id, porcentaje)
  select v_id, (x->>'proyecto_estrategico_id')::smallint, (x->>'porcentaje')::numeric
  from jsonb_array_elements(v_aportes) x;

  return jsonb_build_object('id', v_id, 'token', v_token);
exception
  when unique_violation then
    -- Dos envíos simultáneos del mismo proyecto chocan en el índice parcial.
    if sqlerrm like '%est_reportes_unico_activo%' then
      raise exception 'Ya existe un reporte para este proyecto y vigencia.' using errcode = 'P0001';
    end if;
    raise exception 'Hay un proyecto estratégico repetido en el reporte.' using errcode = 'P0001';
  when check_violation or foreign_key_violation or invalid_text_representation or not_null_violation then
    raise exception 'Revisa los datos del formulario: hay un valor vacío o con formato inválido.' using errcode = 'P0001';
end;
$$;

create function est_anular_reporte(p_token uuid)
returns void
language plpgsql security definer set search_path = public
as $$
begin
  update est_reportes set estado = 'anulado', updated_at = now() where token = p_token;
  if not found then
    raise exception 'El enlace de edición no es válido.' using errcode = 'P0001';
  end if;
end;
$$;

revoke all on function est_obtener_reporte(uuid), est_guardar_reporte(jsonb, uuid), est_anular_reporte(uuid) from public;
grant execute on function est_obtener_reporte(uuid), est_guardar_reporte(jsonb, uuid), est_anular_reporte(uuid) to anon, authenticated;
revoke all on est_v_consolidado from anon;
-- Además de RLS sin policies, sin privilegios: anon ni siquiera ve filas vacías.
revoke all on est_reportes, est_reporte_aportes from anon;
