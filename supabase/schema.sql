-- Esquema del módulo de Seguimiento de Obras.
-- TEMPORAL: todas las tablas de este archivo viven en Supabase mientras no
-- existe backend definitivo para el módulo. Reemplazar cuando se fusione con
-- el sistema real del Visor Estratégico.

-- Perfiles de quienes usan el módulo (independiente del auth del Visor real).
create table usuarios_seguimiento (
  id uuid primary key references auth.users (id),
  nombre text not null,
  rol text not null check (rol in ('ingeniero', 'visitador')),
  activo boolean not null default true
);
comment on table usuarios_seguimiento is 'Temporal, reemplazar cuando exista backend definitivo.';

-- Puntos fijos por obra, para poder comparar fotos del mismo ángulo entre visitas.
create table puntos_referencia_obra (
  id uuid primary key default gen_random_uuid(),
  obra_id integer not null, -- id real de la obra en el Visor; sin FK, la obra vive fuera de Supabase
  nombre text not null
);
comment on table puntos_referencia_obra is 'Temporal, reemplazar cuando exista backend definitivo.';

-- Catálogo fijo de tipos de alerta de campo.
create table tipos_alerta (
  id uuid primary key default gen_random_uuid(),
  nombre text not null unique
);
comment on table tipos_alerta is 'Temporal, reemplazar cuando exista backend definitivo.';

-- El corazón del módulo: cada visita registrada en campo.
create table visitas_seguimiento (
  id uuid primary key default gen_random_uuid(),
  obra_id integer not null, -- id real de la obra en el Visor; sin FK, la obra vive fuera de Supabase
  autor_id uuid not null references usuarios_seguimiento (id),
  autor_rol text not null check (autor_rol in ('ingeniero', 'visitador')),
  fecha_visita date not null,
  fecha_proxima_visita date,
  porcentaje_avance_campo numeric not null,
  presupuesto_observado_campo numeric not null,
  observaciones text not null default '',
  estado text not null check (estado in ('pendiente_revisar', 'en_revision', 'revisada')),
  revisado_por uuid references usuarios_seguimiento (id),
  fecha_revision timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
comment on table visitas_seguimiento is 'Temporal, reemplazar cuando exista backend definitivo.';

create index visitas_seguimiento_obra_id_idx on visitas_seguimiento (obra_id);
create index visitas_seguimiento_autor_id_idx on visitas_seguimiento (autor_id);
create index visitas_seguimiento_estado_idx on visitas_seguimiento (estado);

create table alertas_visita (
  id uuid primary key default gen_random_uuid(),
  visita_id uuid not null references visitas_seguimiento (id) on delete cascade,
  tipo_alerta_id uuid not null references tipos_alerta (id),
  detalle text, -- obligatorio solo si tipo_alerta = 'Otra' (validado en la app)
  severidad text not null check (severidad in ('baja', 'media', 'alta'))
);
comment on table alertas_visita is 'Temporal, reemplazar cuando exista backend definitivo.';

create table fotos_visita (
  id uuid primary key default gen_random_uuid(),
  visita_id uuid not null references visitas_seguimiento (id) on delete cascade,
  punto_referencia_id uuid references puntos_referencia_obra (id),
  storage_path text not null, -- bucket "fotos-seguimiento"
  orden integer not null default 0
);
comment on table fotos_visita is 'Temporal, reemplazar cuando exista backend definitivo.';

create table historial_revision (
  id uuid primary key default gen_random_uuid(),
  visita_id uuid not null references visitas_seguimiento (id) on delete cascade,
  accion text not null check (accion in ('creada', 'en_revision', 'editada', 'revisada')),
  usuario_id uuid not null references usuarios_seguimiento (id),
  comentario text,
  fecha timestamptz not null default now()
);
comment on table historial_revision is 'Temporal, reemplazar cuando exista backend definitivo.';

-- Seed del catálogo fijo de tipos de alerta (sección 5 del brief).
insert into tipos_alerta (nombre) values
  ('Cimentaciones'),
  ('Trámites EPM'),
  ('Importación de materiales'),
  ('Clima'),
  ('Gestión predial'),
  ('Otra');

-- Row Level Security: todas las tablas quedan cerradas a `authenticated`
-- (ningún acceso anónimo). Ver reglas de negocio en la sección 5 del brief.
alter table usuarios_seguimiento enable row level security;
alter table puntos_referencia_obra enable row level security;
alter table tipos_alerta enable row level security;
alter table visitas_seguimiento enable row level security;
alter table alertas_visita enable row level security;
alter table fotos_visita enable row level security;
alter table historial_revision enable row level security;

-- Rol del usuario autenticado actual, para no repetir el subquery en cada policy.
create function rol_actual() returns text
language sql stable security definer
set search_path = public
as $$
  select rol from usuarios_seguimiento where id = auth.uid()
$$;

-- Catálogos, perfiles e historial: lectura abierta a cualquier autenticado del módulo.
create policy "lectura_autenticados" on usuarios_seguimiento for select to authenticated using (true);
create policy "insertar_propio_perfil" on usuarios_seguimiento for insert to authenticated
  with check (id = auth.uid());
create policy "lectura_autenticados" on puntos_referencia_obra for select to authenticated using (true);
create policy "lectura_autenticados" on tipos_alerta for select to authenticated using (true);
create policy "lectura_autenticados" on visitas_seguimiento for select to authenticated using (true);
create policy "lectura_autenticados" on alertas_visita for select to authenticated using (true);
create policy "lectura_autenticados" on fotos_visita for select to authenticated using (true);
create policy "lectura_autenticados" on historial_revision for select to authenticated using (true);

-- Cada quien crea su propia visita (el estado inicial ya lo decide la app según autor_rol).
create policy "crear_propia_visita" on visitas_seguimiento for insert to authenticated
  with check (autor_id = auth.uid());

-- Edición de visitas: el visitador edita solo la suya mientras siga
-- pendiente_revisar; el ingeniero edita cualquiera en
-- pendiente_revisar/en_revision; revisada es de solo lectura para todos
-- (no existe policy de update que la habilite sobre una fila ya revisada).
--
-- USING decide qué filas se pueden tocar (evaluado sobre el estado ANTES
-- del update). WITH CHECK decide qué resultado final es válido (evaluado
-- sobre la fila DESPUÉS). Si se omite WITH CHECK, Postgres reutiliza el
-- mismo USING como check final — eso bloqueaba la transición a 'revisada'
-- porque el USING exige que el estado siga en pendiente_revisar/en_revision.
-- Separados: el ingeniero puede llevar cualquier visita tocable hacia
-- cualquier estado (incluida 'revisada'); el visitador solo puede dejarla
-- igual (pendiente_revisar), nunca marcarla revisada ni pasarla a en_revision.
create policy "editar_segun_estado_y_rol" on visitas_seguimiento for update to authenticated
  using (
    (autor_id = auth.uid() and estado = 'pendiente_revisar' and rol_actual() = 'visitador')
    or (rol_actual() = 'ingeniero' and estado in ('pendiente_revisar', 'en_revision'))
  )
  with check (
    (autor_id = auth.uid() and estado = 'pendiente_revisar' and rol_actual() = 'visitador')
    or (rol_actual() = 'ingeniero')
  );

-- Alertas y fotos se escriben junto con la visita propia, o por el ingeniero en revisión.
create policy "escribir_de_visita_propia" on alertas_visita for insert to authenticated
  with check (
    exists (select 1 from visitas_seguimiento v where v.id = visita_id and v.autor_id = auth.uid())
    or rol_actual() = 'ingeniero'
  );
create policy "escribir_de_visita_propia" on fotos_visita for insert to authenticated
  with check (
    exists (select 1 from visitas_seguimiento v where v.id = visita_id and v.autor_id = auth.uid())
    or rol_actual() = 'ingeniero'
  );

-- Historial: lo inserta la app tras cada acción válida, siempre a nombre de quien la ejecuta.
create policy "insertar_propio_usuario" on historial_revision for insert to authenticated
  with check (usuario_id = auth.uid());

-- rol_actual() es SECURITY DEFINER; solo authenticated puede invocarla por RPC.
revoke execute on function rol_actual() from anon, public;
grant execute on function rol_actual() to authenticated;

-- Storage: bucket privado, solo autenticados pueden leer/subir fotos de visita.
insert into storage.buckets (id, name, public) values ('fotos-seguimiento', 'fotos-seguimiento', false);

create policy "leer_fotos_autenticados" on storage.objects for select to authenticated
  using (bucket_id = 'fotos-seguimiento');

create policy "subir_fotos_autenticados" on storage.objects for insert to authenticated
  with check (bucket_id = 'fotos-seguimiento');
