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
| T2 | S5, S1 | agente A (Orca) | `src/pages/actas/TableroActas.tsx`, `src/components/actas/tablero/**` | ⬜ | |
| T3 | S3, S4 | agente B (Orca) | `src/pages/actas/DetalleActa.tsx`, `src/components/actas/detalle/**` | ⬜ | |
| T4 | S6 | Antigravity | `supabase/seed-actas.sql` (nuevo) | ⬜ | |
| T5 | S2 | orquestador, con confirmación del usuario | aplicar migración + seed en producción | ⬜ | |
| T6 | todos | orquestador | revisión de costura: `npm test`, `typecheck`, `lint`, `build`; prueba en navegador | ⬜ | |

Reglas para agentes: trabajar solo dentro de su superficie; no correr formatters globales ni `npm install`; no commitear (el orquestador es dueño de git); al terminar, reportar qué `S#` cubrieron y el resultado de `npm run typecheck` y `npm run lint`.

## Log
- **L1** (2026-10-15, pedido original): "Estoy en orca, quiero que te ayudes con los dmas modelos a crear este modulo, sin login ni nada, pestaña aparte de seguimiento, el modulo ya fue subido a proudccion por lo cual ya lo creado no se va ver o usar, pero como todo esta subido a verce y esta conectado a una bd, usaremos para creacion de un modulo, te dejare un excel que es el usaremos para este modulo, es algo para poder ver todo lo relacionado y actas, y todo." Contexto pegado: "para que me ayude a pensar en una solución para hacer las actas ahí y llevar pendientes, responsables y fechas."
- **L2** (2026-10-15): "sii, creamos un link aparte, lo usamos mientras asi, que nada lleve a tablero de seguimiento,como te mencione usaremo este entorno, sera de prueba. Quiero probar el uso de ORCA, como manejar el tema con los demas agentes y tu eres el orquestador". Decisión: acceso abierto a `anon` en las dos tablas nuevas (documentado en la migración).
- **L3** (2026-10-15): T1 listo. `tablero.test.ts` 3/3 verde; `typecheck` OK. Páginas de T2/T3 quedan como placeholder enrutado. Sin espejo en `postgres/esquema.sql`: ese archivo es la entrega Azure del módulo de seguimiento y este módulo es de prueba.
