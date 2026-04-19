# daybook

Dashboard personal para organizar el día: sprint kanban semanal, recordatorios por categoría con pop-ups y snooze, notas por cuadernos, calendario mensual, widget del tiempo y reloj.

Todo el estado se persiste en `localStorage` — no hay backend.

## Stack

- Vite + React 19 + TypeScript
- Tailwind CSS v3
- lucide-react (iconos)
- Open-Meteo (tiempo, sin API key)

## Desarrollo

```bash
npm install
npm run dev
```

## Build

```bash
npm run build
npm run preview
```

## Estructura

- `src/App.tsx` — todo el dashboard en un único componente.
- `src/index.css` — Tailwind + resets mínimos.

El modelo de datos es un store unificado de `items`: cada item puede pertenecer a un sprint (columna todo/doing/done), ser un recordatorio (con categoría y prioridad), o tener fecha/hora para aparecer en el calendario. El estado `done` se propaga entre vistas.
