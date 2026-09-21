# Seguimiento de Obras

Módulo de seguimiento de campo para el Visor Estratégico: ingenieros y visitadores registran **visitas de obra** (avance observado, alertas, fotos), planean y graban **recorridos** con GPS, y gerencia consulta el estado. Lo observado en campo se compara contra lo que el sistema oficial reporta.

Repo aislado pensado para fusionarse a futuro con el repo real del Visor Estratégico. Las tablas de Supabase son **temporales** hasta que exista el backend definitivo.

## Stack

Vite 6 · React 18 · TypeScript · Redux Toolkit · MUI 6 · maplibre-gl + react-map-gl · react-hook-form + yup · Supabase (Postgres, Auth, Storage, Edge Functions). Lint con oxlint; tests con el runner nativo de Node.

## Arranque local (Docker)

Requisitos: Node 22+, Docker Desktop encendido, [Supabase CLI](https://supabase.com/docs/guides/local-development/cli/getting-started).

```bash
npm install
npm run db:start        # Postgres + Auth + Storage en Docker; aplica migraciones y seed
cp .env.example .env    # ya trae los valores del entorno local
npm run dev             # http://localhost:5173
```

Entrá con `ingeniero@local.test` / `123456` (también `visitador@` y `visualizador@`). Studio (visor de la BD): http://localhost:54323. Para apagar: `npm run db:stop`. Para dejar la BD como nueva: `npm run db:reset`.

Sin la Edge Function `obras-proxy` configurada no hay obras reales en el mapa (responde 501). Ver [Conexión con la API de obras](#conexión-con-la-api-de-obras).

## Comandos

| Comando | Qué hace |
| --- | --- |
| `npm run dev` | Servidor de desarrollo |
| `npm run build` | Build de producción (tsc + vite) |
| `npm run typecheck` | Chequeo de tipos sin generar archivos |
| `npm run lint` | oxlint |
| `npm test` | Tests (Node `--test`, sin framework) |
| `npm run db:start` / `db:stop` / `db:reset` | BD local en Docker |
| `npm run db:migracion -- <nombre>` | Crea una migración nueva |
| `npm run db:tipos` | Regenera `src/types/database.types.ts` desde la BD local |
| `npm run sonar:up` / `sonar:scan` / `sonar:down` | Calidad de código con SonarQube en Docker |

Antes de abrir un PR: `npm run typecheck && npm run lint && npm test`.

## Estructura

Las dependencias van **solo hacia la izquierda** (una capa importa de las anteriores, nunca de las siguientes):

```
types  <  utils  <  lib  <  api / features  <  hooks  <  components  <  pages
```

```
src/
  types/        Tipos del dominio (camelCase) y tipos generados de la BD
  utils/        Lógica pura, sin React ni Supabase; cada archivo con su .test.ts
  lib/          Clientes de terceros (supabaseClient)
  api/          Lectura de obras reales del Visor (vía Edge Function)
  features/     Acceso a datos de Supabase (*Api.ts), Redux slice, hooks de dominio
  hooks/        Hooks genéricos de UI
  components/   Piezas reutilizables (layout/, seguimiento/, seguimiento/mapa/)
  pages/        Una pantalla por ruta
  theme/        Tema MUI y colores (contraste AA verificado)
postgres/       Esquema en PostgreSQL puro, sin Supabase (para la entrega a Azure)
supabase/
  migrations/   Esquema versionado del entorno actual con Supabase
  seed.sql      Usuarios de prueba (solo local)
  functions/    Edge Function obras-proxy
scripts/        Utilidades operativas contra la BD real (ver abajo)
docker/         SonarQube local
docs/           Documentación de traspaso
```

## Documentación

- **[Entrega a un backend propio (Azure PostgreSQL)](docs/entrega-backend.md)**: qué reglas y contrato debe implementar el backend, y cómo migrar los datos. El modelo en PostgreSQL puro está en [`postgres/esquema.sql`](postgres/esquema.sql).
- [Base de datos (Supabase)](docs/base-de-datos.md): modelo, tabla ↔ código, **cómo crear una tabla nueva y migrar datos**, cómo aplicar a producción. Aplica al entorno actual con Supabase.
- [Calidad de código con SonarQube](docs/calidad-sonarqube.md)
- [Operación y scripts](docs/operacion.md): variables de entorno, deploy, scripts de mantenimiento.
