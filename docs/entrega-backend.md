# Entrega: backend propio con PostgreSQL en Azure

Este documento es para quien reciba el proyecto y monte la base en **Azure Database for PostgreSQL** con su propio backend. Complementa a `postgres/esquema.sql` (el modelo) y explica lo que el SQL no puede decir: qué reglas hay que aplicar y qué contrato espera el frontend.

## 1. Qué cambia respecto a hoy

Hoy el frontend habla **directo** con la base desde el navegador, usando `supabase-js`. Supabase pone en medio PostgREST (API automática sobre las tablas), Auth (login) y Storage (fotos), y la seguridad la dan las policies de RLS dentro de la BD.

Azure PostgreSQL es solo la base. No trae API, login ni almacenamiento, y el navegador no debe conectarse a ella. Necesitan un **backend** (el lenguaje y framework que elijan) que haga tres cosas:

1. Exponer al frontend las operaciones de la sección 4.
2. **Aplicar las reglas de permisos de la sección 3.** Ya no las aplica la BD: si el backend no las implementa, se pierden.
3. Resolver login (sección 5) y archivos (sección 6).

`postgres/esquema.sql` es el modelo listo para una base vacía (PostgreSQL 13 o superior; usa `gen_random_uuid()`, que ya viene incluido). Se verificó en un Postgres limpio y su estructura es idéntica a la de Supabase, salvo la FK de `usuarios_seguimiento.id` hacia `auth.users`, que no existe fuera de Supabase.

## 2. Dónde se rompe el frontend: los puntos de corte

Supabase está acotado a **7 archivos**. El resto de la app no lo conoce y no hay que tocarlo.

| Archivo | Qué hace con Supabase | Qué reemplazar |
| --- | --- | --- |
| `src/lib/supabaseClient.ts` | Crea el cliente (`VITE_SUPABASE_URL` / `_ANON_KEY`) | Cliente HTTP hacia su backend |
| `src/features/seguimiento/seguimientoApi.ts` | Consultas de visitas, alertas, fotos, usuarios, catálogos | Llamadas a su backend (sección 4) |
| `src/features/seguimiento/recorridosApi.ts` | Consultas de recorridos y sus fotos | Ídem |
| `src/api/obrasVisorApi.ts` | Invoca la Edge Function `obras-proxy` | Su propio endpoint proxy (sección 7) |
| `src/pages/seguimiento/LoginSeguimiento.tsx` | `auth.signInWithPassword` | Su login |
| `src/features/auth/useUsuarioActual.ts` | `auth.getSession`, `onAuthStateChange`, lee el perfil | Su manejo de sesión |
| `src/components/layout/SeguimientoLayout.tsx` | `auth.signOut` | Su cierre de sesión |

Cada función de los dos `*Api.ts` tiene una firma TypeScript clara (entra y sale el tipo de dominio en camelCase). Mantengan esas firmas y cambien solo el interior: nada más se entera.

Conviene además quitar `@supabase/supabase-js` de `package.json` y borrar `src/types/database.types.ts` (es generado desde Supabase) y `supabase/`. `scripts/` usa `supabase-js` con la service role key: son utilidades para la base de Supabase y hay que reescribirlas o descartarlas.

## 3. Reglas de permisos que el backend debe aplicar

Hoy están como policies de RLS en `supabase/migrations/20260701000000_esquema_base.sql`. En la tabla, "usuario actual" es la identidad que sale del token de sesión. **Nunca confíen en un `autor_id` o `usuario_id` que venga en el cuerpo de la petición: se toma del token.**

| Tabla | Leer | Crear | Editar | Borrar |
| --- | --- | --- | --- | --- |
| `usuarios_seguimiento` | Cualquier usuario autenticado | Solo el propio perfil (`id` = usuario actual) | No se edita desde la app | — |
| `tipos_alerta`, `puntos_referencia_obra` | Cualquier autenticado | No desde la app (catálogo) | — | — |
| `visitas_seguimiento` | Cualquier autenticado, **todas** | Solo con `autor_id` = usuario actual | **Cualquier autenticado, cualquier visita, en cualquier estado** | El autor, o cualquier `ingeniero` |
| `alertas_visita`, `fotos_visita` | Cualquier autenticado | Si la visita es del usuario actual, o si es `ingeniero` | No se edita | Si la visita es del usuario actual, o si es `ingeniero` |
| `historial_revision` | Cualquier autenticado | Solo con `usuario_id` = usuario actual | No | Si la visita es del usuario actual, o si es `ingeniero` |
| `recorridos_seguimiento` | Cualquier autenticado, todos | Solo con `autor_id` = usuario actual | No | El autor, o cualquier `ingeniero` |
| `fotos_recorrido` | Cualquier autenticado | Si el recorrido es del usuario actual | No | Si el recorrido es del usuario actual, o si es `ingeniero` |
| Archivos (fotos) | Cualquier autenticado | Cualquier autenticado | — | Ver sección 6 |

Puntos que conviene decidir de forma consciente:

- **Editar visitas está abierto a propósito** (decisión del 2026-07-14: se priorizó la flexibilidad operativa sobre el control por estado, autor o rol). Incluye marcar `visto_gerencia`. Si quieren restringirlo por rol, este es el momento; el diseño original más estricto está en el historial de git.
- **El rol `visualizador` (gerencia) es de solo lectura solo en el frontend.** La BD no lo impedía. Si quieren que sea de solo lectura de verdad, hay que aplicarlo en el backend.
- **El borrado en cascada de la BD borra filas, no archivos.** Al borrar una visita o un recorrido, sus fotos (filas) se borran solas por `on delete cascade`; los archivos reales hay que borrarlos aparte.

## 4. Contrato de datos

Todas las funciones devuelven o reciben los tipos de `src/types/seguimiento.types.ts`. Hoy el frontend recibe filas en `snake_case` y las traduce a camelCase en los mappers de cada `*Api.ts` (`mapVisitaRow`, `mapFotoRow`, `mapRecorridoRow`…); pueden devolver camelCase directamente y simplificar esos mappers.

**Forma de una visita.** Todas las lecturas de visitas devuelven la visita con sus `alertas` y `fotos` **anidadas** (hoy `select('*, alertas_visita(*), fotos_visita(*)')`). Lo mismo con recorridos y `fotos_recorrido`.

| Función (`seguimientoApi.ts`) | Qué hace | Notas |
| --- | --- | --- |
| `listarTiposAlerta()` | Catálogo, ordenado por `nombre` | El cliente lo cachea toda la sesión |
| `listarPuntosReferencia(obraId)` | Puntos de una obra | |
| `obtenerUltimaVisitaPorObra()` | Última `fecha_visita` por `obra_id` | Sirve para marcar "obra desatendida" (más de 30 días) |
| `listarUsuarios()` | `id, nombre, rol, activo` | Cacheado en el cliente |
| `crearVisita(input)` | Inserta visita + sus alertas + una entrada `creada` en el historial | Hoy son 3 llamadas sueltas, **sin transacción**. Háganlo en una transacción |
| `listarMisVisitas(autorId)` | Visitas del autor, `fecha_visita` descendente | |
| `listarPendientes(usuarioActualId)` | Bandeja del ingeniero (regla abajo) | |
| `listarVisitasDeObra(obraId)` | Visitas de una obra, `fecha_visita` **ascendente** | |
| `listarTodasLasVisitas()` | Todas, `fecha_visita` descendente | Vista de gerencia |
| `marcarVistoGerencia(id, visto)` | Cambia `visto_gerencia` | No toca `estado` ni el historial |
| `editarVisita(input)` | Actualiza avance, observaciones, fechas + entrada `editada` en el historial (con comentario opcional) | Transacción |
| `marcarEnRevision(id, usuarioId)` | `estado = 'en_revision'` + historial `en_revision` | |
| `marcarRevisada(id, revisadoPor)` | `estado = 'revisada'`, `revisado_por`, `fecha_revision = ahora` + historial `revisada` | |
| `eliminarVisita(id)` | Borra los archivos de sus fotos y luego la visita | Debe **fallar** si no se borró nada |
| `subirFoto(visitaId, archivo, puntoReferenciaId, orden)` | Guarda el archivo y crea la fila en `fotos_visita` | Ver sección 6 |
| `obtenerUrlFoto(storagePath)` | URL temporal de lectura, válida 1 hora | |

| Función (`recorridosApi.ts`) | Qué hace |
| --- | --- |
| `crearRecorrido(input)` | Inserta el recorrido (`trazo` es jsonb con `[{lat, lon, ts}]`) |
| `subirFotoRecorrido(recorridoId, archivo, orden)` | Guarda el archivo y crea la fila en `fotos_recorrido` |
| `listarRecorridos()` | Todos, `fecha_inicio` descendente, con sus fotos |
| `eliminarRecorrido(id)` | Borra los archivos y luego el recorrido |

**Reglas de negocio que hoy viven en el frontend** (`seguimientoApi.ts`) y conviene mover al backend:

- **Estado inicial de una visita**: si el autor es `ingeniero` nace `revisada`; si es `visitador`, `pendiente_revisar`. Hoy el cliente lo decide y lo manda; el backend debe deducirlo del rol del usuario, no aceptarlo del cliente.
- **Bandeja del ingeniero** (`listarPendientes`): visitas cuyo `autor_id` sea distinto del usuario actual **y** (`estado` en `pendiente_revisar` o `en_revision`, **o** `estado = 'revisada'` con `autor_rol = 'ingeniero'`). Así los ingenieros se auditan entre sí. Nunca incluye las propias.
- **Historial**: cada acción (`creada`, `editada`, `en_revision`, `revisada`) deja una fila. Hoy el cliente no revisa si ese insert falló; en el backend debe ir en la misma transacción.
- **`detalle` obligatorio** en una alerta solo cuando su tipo es `Otra` (`RegistrarVisita.tsx`, esquema yup). Conviene validarlo también en el backend.
- **`numeric` a `number`**: el cliente convierte `porcentaje_avance_campo` y `distancia_metros` con `Number(...)`. Si su driver devuelve `numeric` como texto, se mantiene; si devuelve número, no molesta.
- **`updated_at`** no lo actualiza nada hoy (ni la app ni un trigger): siempre vale lo mismo que `created_at`. Decidan si lo quieren vivo.

## 5. Login y usuarios

El frontend necesita cuatro cosas: iniciar sesión con correo y contraseña, saber si hay sesión al cargar, reaccionar a que la sesión cambie o expire, y cerrar sesión. Con la sesión, carga el perfil: la fila de `usuarios_seguimiento` cuyo `id` es el del usuario.

Eso deja una regla que sí o sí hay que respetar: **`usuarios_seguimiento.id` debe ser el id de la identidad en el proveedor de login que elijan.** Las opciones más comunes son Microsoft Entra ID o una tabla de credenciales propia; el esquema no se casa con ninguna (por eso `id` no tiene FK).

Tres roles: `ingeniero`, `visitador`, `visualizador` (gerencia). Un usuario sin fila en `usuarios_seguimiento` puede autenticarse pero **no tiene rol ni aparece en ningún selector**: crear la identidad y la fila son dos pasos, siempre.

## 6. Archivos (fotos)

- Las rutas se guardan en `storage_path` como texto y **hay que respetar las convenciones** para no romper lo existente:
  - Visitas: `<visita_id>/<uuid>-<nombre-original>`
  - Recorridos: `recorridos/<recorrido_id>/<uuid>-<nombre-original>`
- Los archivos son **privados**: se muestran con URL temporal (hoy 1 hora).
- El navegador comprime las fotos antes de subir (`comprimirImagen.util.ts`, ~180 KB cada una) y convierte HEIC a JPEG (`heic.util.ts`). No hace falta que el backend lo haga.
- **Bug que ya existía y no deben heredar**: la app intenta borrar los archivos al eliminar una visita o un recorrido, pero el esquema del repo no define ninguna policy de borrado sobre el almacenamiento de Supabase. Verificado en la base local: el borrado responde `200 []` y el archivo **queda en el bucket**. No se pudo comprobar en producción, pero coincide con que exista `scripts/borrar-archivos-huerfanos.mjs`. En su backend el borrado debe ser real y verificable.

## 7. Obras del Visor Estratégico

Las obras no están en esta base (`obra_id` es solo un entero sin FK). Vienen de la API real del Visor. Hoy la app llama a la Edge Function `supabase/functions/obras-proxy`, que agrega la API key por header y devuelve el JSON tal cual; el mapeo al modelo del módulo está en `src/api/obrasVisorApi.ts`. La clave no puede ir en el frontend (las variables `VITE_*` quedan visibles en el navegador), así que necesitan su propio proxy en el backend. La Edge Function es código de Deno y no corre en Azure tal cual, pero su lógica es corta (una petición con un header) y sirve de referencia.

## 8. Migrar los datos existentes

Si van a traer los datos de producción (Supabase) a Azure:

1. **No corran el `insert` de `tipos_alerta` de `esquema.sql` si van a importar datos.** `tipos_alerta.id` (y `puntos_referencia_obra.id`) son UUID generados al azar: en Azure el seed tendría ids distintos a los de producción y `alertas_visita.tipo_alerta_id` quedaría apuntando a la nada. Importen esas tablas **con sus ids** (vacíen `tipos_alerta` antes) o mapeen por `nombre`.
2. **Ids de usuario.** Las FKs de usuario son `visitas_seguimiento.autor_id`, `visitas_seguimiento.revisado_por`, `historial_revision.usuario_id`, `recorridos_seguimiento.autor_id` y `usuarios_seguimiento.id`. Si su proveedor de login asigna ids distintos a los de Supabase, hay que armar una tabla de equivalencias y reescribir todas esas columnas.
3. **Orden de carga** (por las FKs): `usuarios_seguimiento`, `tipos_alerta`, `puntos_referencia_obra`, `visitas_seguimiento`, `alertas_visita`, `fotos_visita`, `historial_revision`, `recorridos_seguimiento`, `fotos_recorrido`.
4. **Archivos**: copiar el contenido del bucket `fotos-seguimiento` al almacenamiento nuevo **conservando cada `storage_path` exacto**. Si cambian las rutas, hay que actualizar `fotos_visita.storage_path` y `fotos_recorrido.storage_path`.
5. **Verificar**: contar filas por tabla antes y después, y abrir una visita con fotos.

Los datos reales pueden incluir nombres de personas y fotos de obra: transfiéranlos por un canal seguro.
