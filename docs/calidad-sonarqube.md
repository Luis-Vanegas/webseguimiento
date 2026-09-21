# Calidad de código con SonarQube

SonarQube corre **local en Docker** (`docker/sonarqube.yml`), sin depender de un plan de SonarCloud. La configuración del análisis está en `sonar-project.properties`.

## Primera vez

1. `npm run sonar:up` y esperar ~1-2 min a que `http://localhost:9000` responda.
2. Entrar con `admin` / `admin`; pide cambiar la contraseña.
3. Crear un token: **My Account → Security → Generate Token** (tipo *User* o *Project Analysis*).
4. Exportarlo y analizar:

```bash
export SONAR_TOKEN=<tu-token>     # PowerShell: $env:SONAR_TOKEN="<tu-token>"
npm run sonar:scan
```

El resultado aparece en http://localhost:9000/dashboard?id=webseguimiento. `npm run sonar:down` apaga el servidor; los datos quedan en volúmenes de Docker.

El token es una credencial: no se commitea ni se pone en archivos del repo.

## Usarlo desde Claude Code (MCP)

El MCP de SonarQube lee del servidor al que esté configurado (URL + token). Si el token no es válido para ese servidor responde `Not authorized`; para usar el SonarQube local hay que generar el token en esta instancia y configurarlo en el MCP.

## Qué mirar primero

- **Quality Gate** del proyecto y los *issues* de severidad alta.
- **Duplicaciones**: `src/pages/seguimiento/` y `src/components/seguimiento/` son las zonas con más código repetido probable.
- **Cobertura**: no se calcula todavía (los tests usan el runner nativo de Node, sin reporte lcov). Agregarlo si se quiere cobertura en Sonar.
