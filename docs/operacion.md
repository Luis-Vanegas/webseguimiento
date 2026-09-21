# Operación

## Variables de entorno

| Variable | Dónde | Para qué |
| --- | --- | --- |
| `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` | `.env` (local) · Vercel → Settings → Environment Variables (producción) | El frontend las incrusta en el bundle: son públicas por diseño. La seguridad la da RLS, no ocultarlas. |
| `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` | Solo en la terminal al correr un script de `scripts/` | **Saltan RLS.** Nunca en el frontend, nunca en un commit. Supabase → Settings → API → `service_role`. |
| `OBRAS_API_URL`, `OBRAS_API_KEY`, `OBRAS_API_HEADER_NAME` | Secrets de la Edge Function | Credenciales de la API real de obras del Visor. |

`.env.example` trae los valores del entorno local; el `.env` real está en `.gitignore`. Contenido para local (las llaves son las demo públicas de la CLI de Supabase, iguales para todos; `supabase status` las muestra):

```
VITE_SUPABASE_URL=http://127.0.0.1:54321
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0
```

## Conexión con la API de obras

La API real del Visor se consume **solo** a través de la Edge Function `supabase/functions/obras-proxy`, porque su clave va por header y en el frontend quedaría expuesta. El mapeo a los campos del módulo está en `src/api/obrasVisorApi.ts`.

```bash
supabase secrets set OBRAS_API_URL=... OBRAS_API_KEY=... --project-ref <ref>
supabase functions deploy obras-proxy --project-ref <ref>
```

Mientras los secrets no estén, la función responde **501** y el mapa no muestra obras. En local se pasan con `supabase functions serve obras-proxy --env-file <archivo>`.

## Despliegue

- **Frontend**: Vercel, conectado al repo de GitHub (`Luis-Vanegas/webseguimiento`, privado). Confirmar en el dashboard de Vercel si el despliegue automático por push está activo. `vercel.json` tiene el rewrite a `index.html` que necesita React Router (sin él, cualquier ruta que no sea `/` da 404).
- **Base de datos**: `supabase db push` (ver [base-de-datos.md](base-de-datos.md#aplicar-migraciones)).
- **Edge Function**: `supabase functions deploy` (arriba).

## Problemas conocidos

- **Mapa en blanco en producción**: no activar `esbuild.keepNames` en `vite.config.ts`. maplibre arma su Worker serializando funciones minificadas y `keepNames` inyecta un helper que no viaja con ese texto. Detalle en el comentario de `vite.config.ts`.
- **`permission denied for table X`** en una tabla nueva: falta el `GRANT` en la migración (RLS y GRANT son cosas distintas). Ver el checklist en [base-de-datos.md](base-de-datos.md#cómo-crear-una-tabla-nueva-checklist).
- **Un `DELETE` "funciona" pero no borra nada**: RLS filtra en silencio, no da error. Falta la policy de borrado.
- **`supabase start` falla con "ports are not available: 54321"** (Windows): los puertos por defecto de Supabase caen en el rango dinámico de Windows y pueden chocar con una conexión saliente al azar. Reintentar suele bastar; si persiste, cambiar los puertos en `supabase/config.toml` (`[api] port`, `[db] port`…) a un valor por debajo de 49152 y actualizar `.env`.
- **Storage casi lleno**: el plan gratuito da 1 GB. Las fotos se comprimen en el navegador antes de subir (`comprimirImagen.util.ts`). Un error de subida puede ser cuota llena aunque el mensaje no lo diga.

## Scripts de mantenimiento (`scripts/`)

Se corren contra la base **real** con la service role key. Todos piden confirmación escrita y dejan registro en `scripts/logs/eliminaciones-historial.jsonl`. Los destructivos aceptan `--dry-run` o muestran antes lo que van a tocar.

| Script | Qué hace |
| --- | --- |
| `crear-usuario.mjs` | Crea un usuario completo: cuenta de auth **y** su fila en `usuarios_seguimiento`. Hacen falta las dos. |
| `borrar-datos-usuario.mjs` | Borra todas las visitas de un autor y sus archivos de Storage. |
| `borrar-archivos-huerfanos.mjs` | Borra archivos del bucket que ya no tienen fila (típico tras un `DELETE` a mano en SQL, que no toca Storage). |
| `convertir-fotos-heic.mjs` | Migración de un solo uso: HEIC → JPEG. Ya corrida. |
| `recomprimir-fotos.mjs` | Migración de un solo uso: recomprime fotos viejas (1-6 MB → ~180 KB). Ya corrida. |
| `auditar-visitas-huso-horario.mjs` | Detecta visitas con `fecha_visita` corrida un día por un bug de zona horaria ya corregido. |
| `diff-subproyectos-por-visitar.mjs` | Compara la lista `SUBPROYECTOS_POR_VISITAR` contra lo que devuelve el Visor. |

`npm run migrar:fotos-heic` y `npm run migrar:recomprimir-fotos` son atajos de los dos de un solo uso.
