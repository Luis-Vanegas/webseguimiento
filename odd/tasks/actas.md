# Feature: módulo de Actas y Compromisos (pruebas)
Objetivo: llevar actas de reunión con sus pendientes, responsables y fechas, reemplazando `Tablero_Control_Actividades.xlsx`.
Rama: `feat/actas` · Entrega: ask-on-risk · Tests: `npm test` (node:test) + `npm run typecheck`.

## Specs
- **S1** — Ruta pública aparte, sin login: "sin login ni nada, pestaña aparte de seguimiento". "creamos un link aparte, lo usamos mientras asi, que nada lleve a tablero de seguimiento". Rutas: `/actas` y `/actas/:actaId`. Ningún link hacia `/seguimiento` ni desde `/seguimiento`.
- **S2** — Mismo entorno: "como todo esta subido a verce y esta conectado a una bd, usaremos para creacion de un modulo". Tablas nuevas `actas` y `compromisos` en la misma BD de Supabase; no se toca ninguna tabla existente. Acceso abierto para `anon` (decisión del usuario, "sera de prueba").
- **S3** — Actas: "para hacer las actas ahí y llevar pendientes, responsables y fechas". Un acta = origen (nombre de la reunión, ej. "Arenilla a sintética", "Comité Directivo") + fecha + asistentes + notas. Crear, editar y eliminar.
- **S4** — Compromisos (columnas del Excel): ACTIVIDAD ESPECÍFICA, RESPONSABLE (puede ser varios, texto libre), FECHA VENCIMIENTO (opcional), ESTADO (`Pendiente`, `En progreso`, `Crítica`, `Completada`), CRITERIO FECHA VENC. Crear, editar, eliminar y cambiar estado rápido.
- **S5** — Tablero (hoja "Tablero" del Excel): tarjetas TAREAS TOTALES / PENDIENTES / EN PROGRESO / CRÍTICAS / COMPLETADAS con "% del total"; tabla "Resumen por origen" (Total, Pendiente, En progreso, Crítica, Completada, % avance); DÍAS RESTANTES con "rojo = vencida; naranja = vence en ≤7 días" (vacío si no hay fecha o está Completada).
- **S6** — Carga inicial: las 27 filas (T-01..T-27) de la hoja "Datos" del Excel, agrupadas en actas por (ORIGEN, FECHA INICIO). Las filas "Acta de reunón" NO son compromisos: marcan que el acta existe.

## Contrato compartido (ya implementado en T1, NO modificar sin avisar al orquestador)
- Tipos: `src/types/actas.types.ts` (`Acta`, `Compromiso`, `ESTADOS_COMPROMISO`).
- API: `src/features/actas/actasApi.ts` (`listarActas`, `obtenerActa`, `crearActa`, `actualizarActa`, `eliminarActa`, `listarCompromisos(actaId?)`, `crearCompromiso`, `actualizarCompromiso`, `eliminarCompromiso`).
- Lógica del tablero: `src/utils/actas/tablero.util.ts` (`diasRestantes`, `semaforo`, `contarEstados`, `resumenPorOrigen`).
- UI: MUI v6 (ya instalado) como el resto del proyecto. Sin dependencias nuevas. Textos de UI en español.

## Tasks
| ID | Specs | Ruta / dueño | Superficie de edición | Estado | Commit |
|----|-------|--------------|------------------------|--------|--------|
| T1 | S1, S2 | inline · orquestador (Claude Code) | migración, tipos, API, util, `App.tsx` | ✅ | ver Log L3 |
| T2 | S5, S1 | delegado · Orca worker Claude | `src/pages/actas/TableroActas.tsx`, `src/components/actas/tablero/**` | ✅ mergeado (`cd03417`) | `98e75f6` (Luis-Vanegas/actas-t2-tablero) |
| T3 | S3, S4 | delegado · Orca worker Antigravity (Gemini 3.8 Flash High) | `src/pages/actas/DetalleActa.tsx`, `src/components/actas/detalle/**` | ✅ mergeado (`319e97d`) | `6d2c06a` (Luis-Vanegas/actas-t3-detalle) |
| T4 | S6 | inline · orquestador (generado desde el Excel) | `supabase/seed-actas.sql`, `supabase/config.toml` | ✅ | ver L5 |
| T5 | S2 | orquestador, con confirmación del usuario | aplicar migración + seed en producción | ⬜ | |
| T6 | todos | orquestador | revisión de costura: `npm test`, `typecheck`, `lint`, `build`; prueba en navegador | 🟡 checks OK, navegador pendiente | |

Reglas para agentes: trabajar solo dentro de su superficie; no correr formatters globales ni `npm install`; no commitear (el orquestador es dueño de git); al terminar, reportar qué `S#` cubrieron y el resultado de `npm run typecheck` y `npm run lint`.

## Log
- **L1** (2026-10-15, pedido original): "Estoy en orca, quiero que te ayudes con los dmas modelos a crear este modulo, sin login ni nada, pestaña aparte de seguimiento, el modulo ya fue subido a proudccion por lo cual ya lo creado no se va ver o usar, pero como todo esta subido a verce y esta conectado a una bd, usaremos para creacion de un modulo, te dejare un excel que es el usaremos para este modulo, es algo para poder ver todo lo relacionado y actas, y todo." Contexto pegado: "para que me ayude a pensar en una solución para hacer las actas ahí y llevar pendientes, responsables y fechas."
- **L2** (2026-10-15): "sii, creamos un link aparte, lo usamos mientras asi, que nada lleve a tablero de seguimiento,como te mencione usaremo este entorno, sera de prueba. Quiero probar el uso de ORCA, como manejar el tema con los demas agentes y tu eres el orquestador". Decisión: acceso abierto a `anon` en las dos tablas nuevas (documentado en la migración).
- **L3** (2026-10-15): T1 listo. `tablero.test.ts` 3/3 verde; `typecheck` OK. Páginas de T2/T3 quedan como placeholder enrutado. Sin espejo en `postgres/esquema.sql`: ese archivo es la entrega Azure del módulo de seguimiento y este módulo es de prueba.
- **L4** (2026-10-15): Run Orca `run_0f9820f4fc3d`. T3 con Codex falló: "You've hit your usage limit … try again at Oct 18th, 2026 2:54 PM"; dispatch abandonado y relanzado con Antigravity. Copilot CLI no devuelve respuesta (`AI Credits 0`). Revisión del orquestador: ambos diffs dentro de su superficie, `typecheck` OK en ambos worktrees, tests de T2 6/6. Advertencia T3: "no encontrada" se detecta por texto del error; un id que no es uuid muestra error en vez de "Acta no encontrada". Pendiente: merge a `feat/actas` (requiere OK del usuario), T4, T5, T6.
- **L5** (2026-10-15): "entomces terminemos todo y veo las cosas depsues en local". T2 y T3 mergeados en `feat/actas` sin conflictos. T4: `supabase/seed-actas.sql` generado desde la hoja "Datos": 5 actas, 23 compromisos (las 4 filas "Acta de reunón" no son compromisos); idempotente; registrado en `[db.seed] sql_paths`. T6: `npm test` 109/109, `typecheck` OK, `lint` exit 0, `build` OK. Pendiente: verlo en local (`npm run db:start` con Docker → `npm run db:reset` → `.env.local` con la URL local → `npm run dev` → `/actas`) y T5 (producción, con OK del usuario).
