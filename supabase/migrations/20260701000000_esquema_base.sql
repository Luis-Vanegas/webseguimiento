-- Esquema base del módulo de Seguimiento de Obras.
--
-- Representa el estado FINAL de la base real (ya incorpora las 8 migraciones
-- manuales que antes vivían comentadas en schema.sql). Producción ya lo tiene
-- aplicado: NO se corre ahí, se marca como aplicado con
--   supabase migration repair 20260701000000 --status applied
-- Una base nueva (o la local con `supabase start`) sí lo ejecuta completo.
--
-- TEMPORAL: estas tablas viven en Supabase mientras no exista el backend
-- definitivo del Visor Estratégico. Ver docs/base-de-datos.md.
--
-- Para cualquier cambio nuevo: NO editar este archivo. Crear otra migración
-- con `npm run db:migracion -- <nombre>` (ver docs/base-de-datos.md).

-- ============================================================================
-- Tablas
-- ============================================================================

-- Perfiles de quienes usan el módulo (independiente del auth del Visor real).
create table usuarios_seguimiento (
  id uuid primary key references auth.users (id),
  nombre text not null,
  rol text not null check (rol in ('ingeniero', 'visitador', 'visualizador')),
  activo boolean not null default true
);
comment on table usuarios_seguimiento is 'Temporal, reemplazar cuando exista backend definitivo.';

-- Puntos fijos por obra, para comparar fotos del mismo ángulo entre visitas.
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
  created_at timestamptz not null default now(),
  -- 'grabado': trazo real capturado con GPS mientras alguien camina.
  -- 'planeado': ruta armada de antemano clickeando puntos en el mapa, sin
  -- GPS. Misma tabla para ambos — comparten forma (trazo, distancia,
  -- título/observaciones) y toda la maquinaria de mapa/detalle ya construida;
  -- para 'planeado', fecha_inicio = fecha_fin = momento de creación (no hubo
  -- caminata con duración real que registrar).
  tipo text not null default 'grabado' check (tipo in ('grabado', 'planeado'))
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

-- Catálogo fijo de tipos de alerta. Vive en la migración (no en seed.sql)
-- porque la app lo necesita en TODO ambiente. Idempotente por el unique(nombre).
insert into tipos_alerta (nombre) values
  ('Cimentaciones'),
  ('Trámites EPM'),
  ('Importación de materiales'),
  ('Clima'),
  ('Gestión predial'),
  ('Prórroga'),
  ('Adición de recursos'),
  ('Diseños'),
  ('Otra')
on conflict (nombre) do nothing;

-- ============================================================================
-- Row Level Security: todas las tablas quedan cerradas a `authenticated`
-- (ningún acceso anónimo).
-- ============================================================================

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

-- rol_actual() es SECURITY DEFINER; solo authenticated puede invocarla por RPC.
revoke execute on function rol_actual() from anon, public;
grant execute on function rol_actual() to authenticated;

-- Lectura: abierta a cualquier autenticado del módulo.
create policy "lectura_autenticados" on usuarios_seguimiento for select to authenticated using (true);
create policy "lectura_autenticados" on puntos_referencia_obra for select to authenticated using (true);
create policy "lectura_autenticados" on tipos_alerta for select to authenticated using (true);
create policy "lectura_autenticados" on visitas_seguimiento for select to authenticated using (true);
create policy "lectura_autenticados" on alertas_visita for select to authenticated using (true);
create policy "lectura_autenticados" on fotos_visita for select to authenticated using (true);
create policy "lectura_autenticados" on historial_revision for select to authenticated using (true);
create policy "lectura_autenticados" on recorridos_seguimiento for select to authenticated using (true);
create policy "lectura_autenticados" on fotos_recorrido for select to authenticated using (true);

create policy "insertar_propio_perfil" on usuarios_seguimiento for insert to authenticated
  with check (id = auth.uid());

-- Visitas: cada quien crea la suya (el estado inicial lo decide la app según autor_rol).
create policy "crear_propia_visita" on visitas_seguimiento for insert to authenticated
  with check (autor_id = auth.uid());

-- Edición de visitas: sin restricción — cualquier autenticado puede editar
-- cualquier visita, en cualquier estado. Decisión del usuario (2026-07-14):
-- se priorizó la flexibilidad operativa sobre el control de auditoría por
-- estado/autor/rol que tenía el diseño original (ver historial de git).
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

-- Borrado de visitas: el autor borra la suya, o cualquier ingeniero borra
-- cualquiera (rol de supervisor). Los hijos (alertas/fotos/historial) llevan
-- la misma regla para que el "on delete cascade" no se tope con RLS al borrar
-- la fila padre.
create policy "borrar_propia_o_ingeniero" on visitas_seguimiento for delete to authenticated
  using (autor_id = auth.uid() or rol_actual() = 'ingeniero');
create policy "borrar_de_visita_propia_o_ingeniero" on alertas_visita for delete to authenticated
  using (
    exists (select 1 from visitas_seguimiento v where v.id = visita_id and v.autor_id = auth.uid())
    or rol_actual() = 'ingeniero'
  );
create policy "borrar_de_visita_propia_o_ingeniero" on fotos_visita for delete to authenticated
  using (
    exists (select 1 from visitas_seguimiento v where v.id = visita_id and v.autor_id = auth.uid())
    or rol_actual() = 'ingeniero'
  );
create policy "borrar_de_visita_propia_o_ingeniero" on historial_revision for delete to authenticated
  using (
    exists (select 1 from visitas_seguimiento v where v.id = visita_id and v.autor_id = auth.uid())
    or rol_actual() = 'ingeniero'
  );

-- Recorridos: cada quien crea los suyos y sus fotos; borra el autor o un ingeniero.
create policy "crear_propio_recorrido" on recorridos_seguimiento for insert to authenticated
  with check (autor_id = auth.uid());
create policy "escribir_fotos_de_recorrido_propio" on fotos_recorrido for insert to authenticated
  with check (
    exists (select 1 from recorridos_seguimiento r where r.id = recorrido_id and r.autor_id = auth.uid())
  );
create policy "borrar_propio_o_ingeniero" on recorridos_seguimiento for delete to authenticated
  using (autor_id = auth.uid() or rol_actual() = 'ingeniero');
create policy "borrar_de_recorrido_propio_o_ingeniero" on fotos_recorrido for delete to authenticated
  using (
    exists (select 1 from recorridos_seguimiento r where r.id = recorrido_id and r.autor_id = auth.uid())
    or rol_actual() = 'ingeniero'
  );

-- ============================================================================
-- Privilegios a nivel de tabla (GRANT). Van APARTE de las policies de RLS y
-- hacen falta las dos cosas: sin GRANT, PostgREST responde
-- "permission denied for table X" aunque la policy lo permita.
--
-- Supabase ya no concede privilegios por defecto a las tablas nuevas de
-- `public`; producción los tiene porque se creó antes de ese cambio. Por eso
-- se declaran explícitos: toda tabla nueva necesita su propio GRANT.
-- Se concede solo lo que las policies de arriba autorizan (mínimo privilegio).
-- ============================================================================

grant usage on schema public to authenticated;

grant select, insert on usuarios_seguimiento to authenticated;
grant select on puntos_referencia_obra, tipos_alerta to authenticated;
grant select, insert, update, delete on visitas_seguimiento to authenticated;
grant select, insert, delete on
  alertas_visita, fotos_visita, historial_revision, recorridos_seguimiento, fotos_recorrido
  to authenticated;

-- Los scripts operativos (scripts/*.mjs) usan service_role, que salta RLS
-- pero igual necesita privilegios de tabla.
grant all on all tables in schema public to service_role;

-- ============================================================================
-- Storage: bucket privado, solo autenticados leen/suben fotos.
-- (Sin policy de delete: el borrado de archivos lo hacen los scripts/ con service role.)
-- ============================================================================

insert into storage.buckets (id, name, public)
values ('fotos-seguimiento', 'fotos-seguimiento', false)
on conflict (id) do nothing;

create policy "leer_fotos_autenticados" on storage.objects for select to authenticated
  using (bucket_id = 'fotos-seguimiento');

create policy "subir_fotos_autenticados" on storage.objects for insert to authenticated
  with check (bucket_id = 'fotos-seguimiento');
