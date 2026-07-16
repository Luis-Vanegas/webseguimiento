-- Esquema del módulo de Seguimiento de Obras.
-- TEMPORAL: todas las tablas de este archivo viven en Supabase mientras no
-- existe backend definitivo para el módulo. Reemplazar cuando se fusione con
-- el sistema real del Visor Estratégico.

-- Perfiles de quienes usan el módulo (independiente del auth del Visor real).
create table usuarios_seguimiento (
  id uuid primary key references auth.users (id),
  nombre text not null,
  rol text not null check (rol in ('ingeniero', 'visitador', 'visualizador')),
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
  observaciones text not null default '',
  estado text not null check (estado in ('pendiente_revisar', 'en_revision', 'revisada')),
  revisado_por uuid references usuarios_seguimiento (id),
  fecha_revision timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  -- Marca independiente del flujo de revisión de ingeniería: gerencia (rol
  -- 'visualizador') la usa para llevar registro de qué ya miró, sin tocar
  -- 'estado' ni el historial de revisión.
  visto_gerencia boolean not null default false
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

-- Recorrido caminado con el GPS del celular (independiente de una obra
-- puntual — puede cruzar varias, o ninguna). El trazo se guarda como jsonb
-- (array de {lat,lon,ts}): no hace falta PostGIS solo para dibujar una
-- polilínea en el mapa con maplibre, que ya consume GeoJSON armado en el cliente.
create table recorridos_seguimiento (
  id uuid primary key default gen_random_uuid(),
  autor_id uuid not null references usuarios_seguimiento (id),
  titulo text not null,
  observaciones text not null default '',
  trazo jsonb not null,
  distancia_metros numeric not null default 0,
  fecha_inicio timestamptz not null,
  fecha_fin timestamptz not null,
  created_at timestamptz not null default now()
);
comment on table recorridos_seguimiento is 'Temporal, reemplazar cuando exista backend definitivo.';

create index recorridos_seguimiento_autor_id_idx on recorridos_seguimiento (autor_id);

create table fotos_recorrido (
  id uuid primary key default gen_random_uuid(),
  recorrido_id uuid not null references recorridos_seguimiento (id) on delete cascade,
  storage_path text not null, -- mismo bucket "fotos-seguimiento", prefijo recorridos/<id>/...
  orden integer not null default 0
);
comment on table fotos_recorrido is 'Temporal, reemplazar cuando exista backend definitivo.';

-- Seed del catálogo fijo de tipos de alerta (sección 5 del brief).
insert into tipos_alerta (nombre) values
  ('Cimentaciones'),
  ('Trámites EPM'),
  ('Importación de materiales'),
  ('Clima'),
  ('Gestión predial'),
  ('Prórroga'),
  ('Adición de recursos'),
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
alter table recorridos_seguimiento enable row level security;
alter table fotos_recorrido enable row level security;

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
create policy "lectura_autenticados" on recorridos_seguimiento for select to authenticated using (true);
create policy "lectura_autenticados" on fotos_recorrido for select to authenticated using (true);

-- Cada quien crea su propia visita (el estado inicial ya lo decide la app según autor_rol).
create policy "crear_propia_visita" on visitas_seguimiento for insert to authenticated
  with check (autor_id = auth.uid());

-- Edición de visitas: sin restricción — cualquier autenticado puede editar
-- cualquier visita, en cualquier estado. Decisión del usuario (2026-07-14):
-- se priorizó la flexibilidad operativa sobre el control de auditoría por
-- estado/autor/rol que tenía el diseño original (ver historial de git para
-- la regla anterior, más granular, si hace falta volver atrás).
create policy "editar_segun_estado_y_rol" on visitas_seguimiento for update to authenticated
  using (true)
  with check (true);

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

-- Cada quien crea sus propios recorridos y sus fotos.
create policy "crear_propio_recorrido" on recorridos_seguimiento for insert to authenticated
  with check (autor_id = auth.uid());
create policy "escribir_fotos_de_recorrido_propio" on fotos_recorrido for insert to authenticated
  with check (
    exists (select 1 from recorridos_seguimiento r where r.id = recorrido_id and r.autor_id = auth.uid())
  );

-- rol_actual() es SECURITY DEFINER; solo authenticated puede invocarla por RPC.
revoke execute on function rol_actual() from anon, public;
grant execute on function rol_actual() to authenticated;

-- Storage: bucket privado, solo autenticados pueden leer/subir fotos de visita.
insert into storage.buckets (id, name, public) values ('fotos-seguimiento', 'fotos-seguimiento', false);

create policy "leer_fotos_autenticados" on storage.objects for select to authenticated
  using (bucket_id = 'fotos-seguimiento');

create policy "subir_fotos_autenticados" on storage.objects for insert to authenticated
  with check (bucket_id = 'fotos-seguimiento');

-- ============================================================================
-- MIGRACIONES MANUALES PENDIENTES — este archivo describe el esquema para una
-- instalación NUEVA; el proyecto real ya tiene datos, así que estos cambios
-- hay que correrlos a mano en el SQL Editor de Supabase. No se aplican solos.
-- ============================================================================

-- Migración 1 (DESTRUCTIVA, pide confirmación antes de correrla): se elimina
-- el campo "presupuesto observado en campo" — el ingeniero de campo pidió
-- sacarlo porque es muy difícil de estimar en obra. Esto borra el histórico
-- de esa columna para siempre.
--
-- alter table visitas_seguimiento drop column presupuesto_observado_campo;

-- Migración 2 (SUPERADA por la Migración 3 — no correr): permitía que el
-- AUTOR de una visita la siguiera editando aunque ya estuviera 'revisada'.
-- Quedó obsoleta porque la Migración 3 es más permisiva y la contiene.
--
-- drop policy "editar_segun_estado_y_rol" on visitas_seguimiento;
-- create policy "editar_segun_estado_y_rol" on visitas_seguimiento for update to authenticated
--   using (
--     (autor_id = auth.uid() and estado = 'pendiente_revisar' and rol_actual() = 'visitador')
--     or (rol_actual() = 'ingeniero' and estado in ('pendiente_revisar', 'en_revision'))
--     or (autor_id = auth.uid() and rol_actual() = 'ingeniero')
--   )
--   with check (
--     (autor_id = auth.uid() and estado = 'pendiente_revisar' and rol_actual() = 'visitador')
--     or (rol_actual() = 'ingeniero')
--   );

-- Migración 3 — CORRER ESTA en el SQL Editor de Supabase (proyecto real):
-- elimina toda restricción de edición sobre visitas_seguimiento. Cualquier
-- autenticado puede editar cualquier visita, en cualquier estado, sin
-- importar quién la creó. Decisión del usuario 2026-07-14: sin esto, el
-- frontend ya deja el botón "Editar" habilitado siempre — sin correr esta
-- migración, esos intentos de guardar van a fallar con 403 porque la
-- policy vieja en la base real sigue siendo la restrictiva.
--
-- drop policy "editar_segun_estado_y_rol" on visitas_seguimiento;
-- create policy "editar_segun_estado_y_rol" on visitas_seguimiento for update to authenticated
--   using (true)
--   with check (true);

-- Migración 4 — CORRER ESTA en el SQL Editor de Supabase (proyecto real):
-- agrega el rol 'visualizador' (módulo de gestión para gerencia, solo
-- lectura) y la columna visto_gerencia. Sin esto, crear un usuario con
-- rol='visualizador' falla contra el constraint viejo, y la pantalla de
-- Gestión no puede guardar el toggle "Visto por gerencia".
--
-- alter table usuarios_seguimiento drop constraint usuarios_seguimiento_rol_check;
-- alter table usuarios_seguimiento add constraint usuarios_seguimiento_rol_check
--   check (rol in ('ingeniero', 'visitador', 'visualizador'));
--
-- alter table visitas_seguimiento add column visto_gerencia boolean not null default false;

-- Migración 5 — CORRER ESTA en el SQL Editor de Supabase (proyecto real):
-- crea las tablas nuevas para grabar recorridos con GPS (botón "Grabar
-- recorrido" en el mapa) y sus fotos. Sin esto, guardar un recorrido falla
-- porque las tablas no existen en la base real todavía.
--
-- create table recorridos_seguimiento (
--   id uuid primary key default gen_random_uuid(),
--   autor_id uuid not null references usuarios_seguimiento (id),
--   titulo text not null,
--   observaciones text not null default '',
--   trazo jsonb not null,
--   distancia_metros numeric not null default 0,
--   fecha_inicio timestamptz not null,
--   fecha_fin timestamptz not null,
--   created_at timestamptz not null default now()
-- );
-- create index recorridos_seguimiento_autor_id_idx on recorridos_seguimiento (autor_id);
--
-- create table fotos_recorrido (
--   id uuid primary key default gen_random_uuid(),
--   recorrido_id uuid not null references recorridos_seguimiento (id) on delete cascade,
--   storage_path text not null,
--   orden integer not null default 0
-- );
--
-- alter table recorridos_seguimiento enable row level security;
-- alter table fotos_recorrido enable row level security;
--
-- create policy "lectura_autenticados" on recorridos_seguimiento for select to authenticated using (true);
-- create policy "lectura_autenticados" on fotos_recorrido for select to authenticated using (true);
--
-- create policy "crear_propio_recorrido" on recorridos_seguimiento for insert to authenticated
--   with check (autor_id = auth.uid());
-- create policy "escribir_fotos_de_recorrido_propio" on fotos_recorrido for insert to authenticated
--   with check (
--     exists (select 1 from recorridos_seguimiento r where r.id = recorrido_id and r.autor_id = auth.uid())
--   );
