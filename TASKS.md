# Tareas del proyecto

## 🟢 Para Antigravity (rápidas, mecánicas, acotadas)
- [ ] Crear `.env.example` en la raíz (la sesión de refactor no tuvo permiso de escritura). Contenido en `docs/operacion.md` → sección "Variables de entorno" (URL local `http://127.0.0.1:54321` + anon key demo de `supabase status`).

## 🔵 Para Claude Code (arquitectura, lógica compleja, decisiones)
- [ ] Verificar que producción coincide con `supabase/migrations/` (`supabase link` + `supabase db diff --linked`) y luego `supabase migration repair 20260701000000 --status applied`. Bloqueado: el MCP de Supabase no tiene permiso sobre el proyecto y hace falta `supabase login`.
- [ ] Generar token de SonarQube local (`docs/calidad-sonarqube.md`) y correr `npm run sonar:scan`; priorizar issues altos y duplicaciones.
- [ ] Partir `src/features/seguimiento/seguimientoApi.ts` (~390 líneas) por dominio: catálogos/usuarios vs visitas vs fotos.
- [ ] Tests para la capa de integración (`*Api.ts`, thunks de Redux): hoy sin cobertura.
- [ ] Evaluar convertir `rol`, `estado`, `severidad`, `tipo` (text + CHECK) a enums de Postgres para eliminar los casts en los mappers.
