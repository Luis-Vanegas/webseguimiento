-- Módulo de actas y compromisos (pruebas). Independiente del módulo de
-- seguimiento: no referencia sus tablas ni usa sus roles.
--
-- ACCESO ABIERTO: decisión del usuario (2026-10-15). El módulo se usa sin
-- login mientras está en prueba, así que anon puede leer y escribir. Cualquiera
-- con la anon key (que viaja en el bundle) puede modificar estas dos tablas.
-- Cerrar estas policies antes de usar el módulo con información sensible.

create table actas (
  id uuid primary key default gen_random_uuid(),
  origen text not null,
  fecha date not null,
  asistentes text,
  notas text,
  created_at timestamptz not null default now()
);

create table compromisos (
  id uuid primary key default gen_random_uuid(),
  acta_id uuid not null references actas(id) on delete cascade,
  actividad text not null,
  responsable text,
  fecha_vencimiento date,
  estado text not null default 'Pendiente'
    check (estado in ('Pendiente', 'En progreso', 'Crítica', 'Completada')),
  criterio_fecha text,
  created_at timestamptz not null default now()
);

create index compromisos_acta_id_idx on compromisos (acta_id);

alter table actas enable row level security;
alter table compromisos enable row level security;

create policy "acceso_abierto_pruebas" on actas for all to anon, authenticated
  using (true) with check (true);
create policy "acceso_abierto_pruebas" on compromisos for all to anon, authenticated
  using (true) with check (true);
