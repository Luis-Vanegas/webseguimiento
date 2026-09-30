# Tareas del proyecto

## 🟢 Para Antigravity (rápidas, mecánicas, acotadas)
- [ ] Crear `.env.example` en la raíz (la sesión de refactor no tuvo permiso de escritura). Contenido en `docs/operacion.md` → sección "Variables de entorno" (URL local `http://127.0.0.1:54321` + anon key demo de `supabase status`).

## 🔵 Para Claude Code (arquitectura, lógica compleja, decisiones)
- [x] Aplicada en producción la migración de métricas (`porcentaje_programado`, `porcentaje_pagado`, `proximo_frente`) vía MCP de Supabase el 2026-09-30, con el nombre `metricas_visita`.
- [ ] Verificar que producción coincide con `supabase/migrations/` (`supabase link` + `supabase db diff --linked`) y luego `supabase migration repair 20260701000000 --status applied`. El MCP de Supabase ya tiene acceso (2026-09-30): el historial de producción tiene versiones `20260703…`/`20260706…` distintas a las locales, más `metricas_visita` aplicada a mano.
- [ ] Generar token de SonarQube local (`docs/calidad-sonarqube.md`) y correr `npm run sonar:scan`; priorizar issues altos y duplicaciones.
- [ ] Partir `src/features/seguimiento/seguimientoApi.ts` (~390 líneas) por dominio: catálogos/usuarios vs visitas vs fotos.
- [ ] Tests para la capa de integración (`*Api.ts`, thunks de Redux): hoy sin cobertura.
- [ ] Bug: `eliminarVisita`/`eliminarRecorrido` llaman a `storage.remove` pero no hay policy de DELETE en `storage.objects`; devuelve 200 `[]` y el archivo queda huérfano (verificado en local; confirmar en producción). Agregar la policy en una migración nueva o borrar desde un backend con service role.
- [ ] Informe consolidado: probar la descarga del PDF con datos reales (Chrome/Edge) y revisar que no queden hojas en blanco ni fotos cortadas entre páginas.
- [ ] La ficha individual (`DetalleVisitaDialog`, `#ficha-visita-imprimible`) sigue imprimiendo con `visibility:hidden`: probablemente saque hojas en blanco igual que el informe. Pasarla al mismo esquema de portal + `display:none` de `EditorInforme`.
- [ ] Si hace falta reabrir informes desde otra PC o tener historial: pasar el borrador de `EditorInforme` (hoy en localStorage) a una tabla `informes` + espejo en `postgres/esquema.sql`.
- [ ] Evaluar convertir `rol`, `estado`, `severidad`, `tipo` (text + CHECK) a enums de Postgres para eliminar los casts en los mappers.
