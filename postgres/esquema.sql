-- Esquema del módulo de Seguimiento de Obras en PostgreSQL PURO
-- (pensado para Azure Database for PostgreSQL, versión 13 o superior).
--
-- Es el mismo modelo que supabase/migrations/20260701000000_esquema_base.sql,
-- sin nada específico de Supabase. Diferencias, todas intencionales:
--
--   * usuarios_seguimiento.id NO referencia auth.users (no existe en Azure).
--     Es el id que asigne el proveedor de identidad que elijan; las FKs de
--     autor_id / revisado_por / usuario_id apuntan a esta tabla igual que antes.
--   * Sin RLS, sin policies, sin GRANT a roles de Supabase (authenticated,
--     anon, service_role) ni rol_actual(). Esas reglas de permisos ahora las
--     debe aplicar el BACKEND: ver docs/entrega-backend.md, sección 3.
--   * Sin bucket de Storage: storage_path es solo el texto de la ruta/clave del
--     archivo en el almacenamiento que elijan (ver docs/entrega-backend.md, sección 5).
--
-- Ejecutar con: psql -v ON_ERROR_STOP=1 -f postgres/esquema.sql <cadena-de-conexion>
-- No es idempotente: es para una base vacía. Los cambios posteriores van en
-- migraciones propias del equipo que lo reciba.

-- Perfiles de quienes usan el módulo.
create table usuarios_seguimiento (
  id uuid primary key, -- id de la identidad en su proveedor de login (sin FK a propósito)
  nombre text not null,
  rol text not null check (rol in ('ingeniero', 'visitador', 'visualizador')),
  activo boolean not null default true
);

-- Puntos fijos por obra, para comparar fotos del mismo ángulo entre visitas.
create table puntos_referencia_obra (
  id uuid primary key default gen_random_uuid(),
  obra_id integer not null, -- id real de la obra en el Visor; sin FK, la obra vive fuera de esta base
  nombre text not null
);

-- Catálogo fijo de tipos de alerta de campo.
create table tipos_alerta (
  id uuid primary key default gen_random_uuid(),
  nombre text not null unique
);

-- El corazón del módulo: cada visita registrada en campo.
create table visitas_seguimiento (
  id uuid primary key default gen_random_uuid(),
  obra_id integer not null, -- id real de la obra en el Visor; sin FK, la obra vive fuera de esta base
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
  updated_at timestamptz not null default now(), -- ojo: no hay trigger ni la app lo escribe; hoy siempre vale lo mismo que created_at
  -- Marca independiente del flujo de revisión de ingeniería: gerencia (rol
  -- 'visualizador') la usa para llevar registro de qué ya miró, sin tocar
  -- 'estado' ni el historial de revisión.
  visto_gerencia boolean not null default false,
  -- Métricas opcionales para el informe consolidado: el ingeniero las carga
  -- cuando hay cronograma/presupuesto de referencia. Nullable porque no toda
  -- obra los tiene (ej. etapa inicial, sin línea base todavía).
  porcentaje_programado numeric,
  porcentaje_pagado numeric,
  proximo_frente text
);

create index visitas_seguimiento_obra_id_idx on visitas_seguimiento (obra_id);
create index visitas_seguimiento_autor_id_idx on visitas_seguimiento (autor_id);
create index visitas_seguimiento_estado_idx on visitas_seguimiento (estado);

create table alertas_visita (
  id uuid primary key default gen_random_uuid(),
  visita_id uuid not null references visitas_seguimiento (id) on delete cascade,
  tipo_alerta_id uuid not null references tipos_alerta (id),
  detalle text, -- obligatorio solo si el tipo de alerta es 'Otra' (regla de negocio, no de la BD)
  severidad text not null check (severidad in ('baja', 'media', 'alta'))
);

create table fotos_visita (
  id uuid primary key default gen_random_uuid(),
  visita_id uuid not null references visitas_seguimiento (id) on delete cascade,
  punto_referencia_id uuid references puntos_referencia_obra (id),
  storage_path text not null, -- ruta/clave del archivo; ver docs/entrega-backend.md sección 5
  orden integer not null default 0
);

create table historial_revision (
  id uuid primary key default gen_random_uuid(),
  visita_id uuid not null references visitas_seguimiento (id) on delete cascade,
  accion text not null check (accion in ('creada', 'en_revision', 'editada', 'revisada')),
  usuario_id uuid not null references usuarios_seguimiento (id),
  comentario text,
  fecha timestamptz not null default now()
);

-- Recorrido caminado con el GPS del celular (independiente de una obra
-- puntual — puede cruzar varias, o ninguna). El trazo se guarda como jsonb
-- (array de {lat,lon,ts}): no hace falta PostGIS para dibujar una polilínea.
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
  -- 'planeado': ruta armada de antemano clickeando puntos en el mapa, sin GPS;
  -- en ese caso fecha_inicio = fecha_fin = momento de creación.
  tipo text not null default 'grabado' check (tipo in ('grabado', 'planeado'))
);

create index recorridos_seguimiento_autor_id_idx on recorridos_seguimiento (autor_id);

create table fotos_recorrido (
  id uuid primary key default gen_random_uuid(),
  recorrido_id uuid not null references recorridos_seguimiento (id) on delete cascade,
  storage_path text not null, -- prefijo recorridos/<recorrido_id>/...
  orden integer not null default 0
);

-- Catálogo fijo de tipos de alerta. La app lo necesita en TODO ambiente.
insert into tipos_alerta (nombre) values
  ('Cimentaciones'),
  ('Trámites EPM'),
  ('Importación de materiales'),
  ('Clima'),
  ('Gestión predial'),
  ('Prórroga'),
  ('Adición de recursos'),
  ('Diseños'),
  ('Otra');
