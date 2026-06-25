# Metodología computacional

## Fuente de los datos

Los parámetros base provienen de mediciones operacionales de campo. La identidad y ubicación de la operación se mantienen reservadas por confidencialidad.

## Preparación

La base pública conserva 150 ciclos válidos y reemplaza las fechas absolutas por días relativos `D01` a `D30`. No contiene nombre de mina, ubicación, razón social ni identificadores individuales de equipos.

## Validación

En cada registro se verificó:

- identificador de ciclo;
- tonelaje y tiempo total positivos;
- presencia de modelo de camión, pala y turno;
- suma de carga, viaje cargado, descarga, retorno y demoras;
- consistencia entre productividad registrada y productividad recalculada.

## Productividad principal

La productividad ponderada se calcula como:

```text
Productividad ponderada = Σ toneladas / (Σ tiempo de ciclo / 60)
```

## Simulación

Cada slider se aplica a los 150 ciclos individualmente:

```text
Tiempo simulado = Tiempo observado × (1 − reducción)
Payload simulado = Payload observado × (1 + variación)
```

El nuevo ciclo es la suma de los cinco componentes simulados. Después se recalculan la productividad de cada ciclo y la productividad ponderada de la selección.

## Limitaciones

- No demuestra causalidad.
- No representa una intervención ejecutada.
- No sustituye Dispatch ni un sistema de control operacional.
- Requiere validación humana antes de convertir un escenario en una acción de campo.
