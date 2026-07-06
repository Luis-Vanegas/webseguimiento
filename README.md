# Seguimiento de Obras

Módulo de seguimiento de campo para el Visor Estratégico: ingenieros y visitadores registran visitas de obra (avance observado, presupuesto observado, alertas, fotos) y se comparan contra lo que el sistema ya reporta oficialmente.

Repo aislado pensado para fusionarse a futuro con el repo real del Visor Estratégico — mismo stack, mismas convenciones.

## Stack

Vite 6 + React 18.3 + TypeScript · Redux Toolkit + redux-saga · MUI 6 · maplibre-gl + react-map-gl + use-supercluster · react-hook-form + yup · Supabase (Postgres + Auth + Storage + Edge Functions).

## Configuración local

1. `npm install`
2. Crear un archivo `.env` en la raíz con:
   ```
   VITE_SUPABASE_URL=https://<tu-proyecto>.supabase.co
   VITE_SUPABASE_ANON_KEY=<tu-anon-key>
   ```
   Estos valores salen de Settings → API en el dashboard de Supabase del proyecto `seguimiento-obras`. **Nunca se versionan** (ver `.gitignore`).
3. `npm run dev`

## Base de datos

El esquema completo (tablas, RLS, bucket de Storage) vive en [`supabase/schema.sql`](supabase/schema.sql) — se aplica directo en el SQL Editor de Supabase o vía la CLI. Todas las tablas están marcadas como temporales: se reemplazan cuando exista el backend definitivo del Visor real.

## Conexión con la API real de obras

La API real del Visor se consume a través de una Edge Function (`supabase/functions/obras-proxy`), nunca directo desde el frontend — la clave de esa API va por header HTTP y no puede vivir en variables `VITE_*` (quedarían expuestas en el bundle del navegador). Los secrets de la función (`OBRAS_API_URL`, `OBRAS_API_KEY`, `OBRAS_API_HEADER_NAME`) se configuran con:

```
supabase secrets set OBRAS_API_URL=... OBRAS_API_KEY=... --project-ref <ref>
```

## Scripts

- `npm run dev` — servidor de desarrollo
- `npm run build` — build de producción
- `npm test` — self-checks con el test runner nativo de Node (`--experimental-strip-types`)
- `npm run lint` — oxlint

## Estructura

```
src/
  api/            # obrasVisorApi.ts — lectura de obras reales vía la Edge Function
  features/       # slice + saga + api de seguimiento (Redux)
  components/     # componentes compartidos (layout, diálogos, filtros)
  pages/seguimiento/  # pantallas: MisVisitas, RegistrarVisita, RevisarVisitas, HistorialObra, MapaSeguimiento
  utils/seguimiento/  # comparator y filtro de visitas (lógica pura)
supabase/
  schema.sql               # esquema + RLS + seed
  functions/obras-proxy/    # Edge Function proxy hacia la API real
```
