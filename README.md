# Milla Haulage KPI Simulator

Dashboard académico interactivo para análisis de KPIs y simulación determinística de escenarios de carguío y acarreo.

> Los parámetros base provienen de mediciones operacionales de campo. La identidad y ubicación de la operación se mantienen reservadas por confidencialidad.

## Demo pública

La versión web está diseñada para GitHub Pages y funciona únicamente con HTML, CSS, JavaScript y una base CSV anonimizada.

## Línea base validada

- 150 ciclos válidos.
- 17 859,9 t acumuladas.
- 119,07 t/ciclo de payload promedio.
- 31,27 min de tiempo medio de ciclo.
- 228,45 t/h de productividad ponderada.
- 3,54 km de distancia media.

## Funcionalidades

- Filtros por camión, pala, turno y distancia.
- Sliders para payload, carga, viaje cargado, descarga, retorno y demoras.
- Comparación línea base–escenario.
- Productividad ponderada recalculada ciclo por ciclo.
- Composición temporal del ciclo.
- Comparaciones por equipo.
- Curva de sensibilidad.
- Descarga del escenario en CSV.

## Ejecución local

Al usar `fetch()` para leer el CSV, debe abrirse desde un servidor local:

```bash
python -m http.server 8000
```

Luego visite `http://localhost:8000`.

## Alcance

La aplicación constituye una adaptación académica y acotada de un módulo analítico del ecosistema DSRL. Los escenarios son proyecciones matemáticas y no instrucciones operacionales.
