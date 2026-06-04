# Passage Plan Builder

Passage Plan Builder is a Vue-based web tool for creating and visualizing vessel passage plan route data.

The application currently provides two tools:

- **Passage Plan Builder**: add waypoint markers on a map, calculate heading and distance, then generate SQL for `PASSAGE_PLAN` and `PASSAGE_PLAN_DETAIL`.
- **Passage Plan Visualizer**: paste route JSON payloads and visualize `routePorts` and `routeSequences` on an OpenLayers map.

## Stacks

- Vue 3
- TypeScript
- Vite
- OpenLayers
- vue3-openlayers

## How to Run

Install dependencies:

```bash
npm install
```

Run the development server:

```bash
npm run dev
```

Build for production:

```bash
npm run build
```

Preview the production build:

```bash
npm run preview
```

## License

This project is licensed under the GNU General Public License v3.0.
