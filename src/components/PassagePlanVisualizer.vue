<template>
  <div class="visualizer-page">
    <section class="visualizer-header">
      <div>
        <h1>Passage Plan Visualizer</h1>
        <p>
          Paste backend route payload to visualize routePorts and routeSequences.
        </p>
      </div>

      <div class="summary-pills">
        <span>{{ validRoutePortCount }} valid port(s)</span>
        <span>{{ totalValidPointCount }} valid point(s)</span>
        <span>{{ routeSegments.length }} segment(s)</span>
      </div>
    </section>

    <section class="input-card">
      <div class="input-header">
        <div>
          <h2>JSON Payload</h2>
          <p>
            Paste payload with routePorts and nested routeSequences.
          </p>
        </div>

        <div class="action-row">
          <button
            type="button"
            class="secondary-button"
            @click="loadSamplePayload"
          >
            Load Sample
          </button>

          <button
            type="button"
            class="primary-button"
            @click="parsePayload"
          >
            Visualize
          </button>
        </div>
      </div>

      <textarea
        v-model="payloadText"
        spellcheck="false"
        placeholder="Paste JSON payload here..."
      />

      <div v-if="parseError" class="error-box">
        {{ parseError }}
      </div>
    </section>

    <section class="map-card">
      <div class="card-title">
        <div>
          <h2>Map Preview</h2>
          <p>
            Route segments are rendered from valid coordinates only.
            Invalid/null coordinates are skipped.
          </p>
        </div>

        <div class="legend">
          <span>
            <i class="legend-line route-line"></i>
            routeSequences
          </span>
          <span>
            <i class="legend-dot port-dot"></i>
            routePorts
          </span>
          <span>
            <i class="legend-dot waypoint-dot"></i>
            waypoints
          </span>
        </div>
      </div>

      <div class="map-wrapper">
        <ol-map
          :loadTilesWhileAnimating="true"
          :loadTilesWhileInteracting="true"
          style="height: 100%; width: 100%"
        >
          <ol-view
            :center="mapCenter"
            :zoom="zoom"
            :projection="projection"
          />

          <ol-tile-layer>
            <ol-source-osm />
          </ol-tile-layer>

          <ol-vector-layer>
            <ol-source-vector :features="mapFeatures" />
          </ol-vector-layer>
        </ol-map>
      </div>
    </section>

    <section class="bottom-grid">
      <section class="card">
        <h2>Route Ports</h2>

        <div v-if="routePorts.length === 0" class="empty-state">
          No routePorts loaded.
        </div>

        <div v-else class="table-wrapper">
          <table>
            <thead>
              <tr>
                <th>Seq</th>
                <th>Type</th>
                <th>Port</th>
                <th>Latitude</th>
                <th>Longitude</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="point in routePorts"
                :key="point.id"
                :class="{ invalid: !point.isValid }"
              >
                <td>{{ point.sequence }}</td>
                <td>{{ point.pointType }}</td>
                <td>{{ point.portCode || '-' }}</td>
                <td>{{ formatNullable(point.latitude) }}</td>
                <td>{{ formatNullable(point.longitude) }}</td>
                <td>
                  <span
                    class="status-badge"
                    :class="point.isValid ? 'valid' : 'invalid'"
                  >
                    {{ point.isValid ? 'Valid' : 'Invalid' }}
                  </span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      <section class="card">
        <h2>Route Sequence Segments</h2>

        <div v-if="routeSegments.length === 0" class="empty-state">
          No routeSequences loaded.
        </div>

        <div v-else class="segment-list">
          <div
            v-for="segment in routeSegments"
            :key="segment.id"
            class="segment-item"
          >
            <div class="segment-title">
              <strong>Segment {{ segment.index + 1 }}</strong>
              <span>
                {{ segment.validPoints.length }} valid /
                {{ segment.points.length }} total point(s)
              </span>
            </div>

            <div
              v-if="segment.points.length === 0"
              class="empty-state compact"
            >
              Empty segment.
            </div>

            <div v-else class="sequence-list">
              <div
                v-for="point in segment.points"
                :key="point.id"
                class="sequence-item"
                :class="{ invalid: !point.isValid }"
              >
                <div class="sequence-badge">
                  {{ point.sequence }}
                </div>

                <div class="sequence-info">
                  <strong>
                    {{ point.point || point.pointType || '-' }}
                  </strong>
                  <span>
                    Source:
                    <code>{{ point.source || '-' }}</code>
                  </span>
                  <span>
                    Port:
                    <code>{{ point.portCode || '-' }}</code>
                  </span>
                  <span>
                    Lat:
                    <code>{{ formatNullable(point.latitude) }}</code>
                  </span>
                  <span>
                    Lng:
                    <code>{{ formatNullable(point.longitude) }}</code>
                  </span>
                </div>

                <span
                  class="status-badge"
                  :class="point.isValid ? 'valid' : 'invalid'"
                >
                  {{ point.isValid ? 'Valid' : 'Invalid' }}
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>
    </section>
  </div>
</template>

<script setup lang="ts">
import Feature from 'ol/Feature';
import type Geometry from 'ol/geom/Geometry';
import LineString from 'ol/geom/LineString';
import Point from 'ol/geom/Point';
import CircleStyle from 'ol/style/Circle';
import Fill from 'ol/style/Fill';
import Stroke from 'ol/style/Stroke';
import Style from 'ol/style/Style';
import Text from 'ol/style/Text';
import { computed, ref } from 'vue';

type NumericPayloadValue =
  | number
  | string
  | null
  | undefined
  | {
      source?: string | number | null;
      parsedValue?: number | string | null;
    };

type RawRoutePoint = {
  sequence?: number | string | null;
  source?: string | null;
  pointType?: string | null;
  point?: string | null;
  portCode?: string | null;
  latitude?: NumericPayloadValue;
  longitude?: NumericPayloadValue;
  heading?: NumericPayloadValue;
  distance?: NumericPayloadValue;
};

type RawRoutePayload = {
  routePorts?: unknown;
  routeSequences?: unknown;
  data?: unknown;
};

type NormalizedPoint = {
  id: string;
  segmentIndex: number | null;
  sequence: number;
  routeSequenceLabel: string | null;
  source: string | null;
  pointType: string | null;
  point: string | null;
  portCode: string | null;
  latitude: number | null;
  longitude: number | null;
  heading: number | null;
  distance: number | null;
  isValid: boolean;
  label: string;
};

type RouteSegment = {
  id: string;
  index: number;
  points: NormalizedPoint[];
  validPoints: NormalizedPoint[];
  coordinates: [number, number][];
};

const projection = ref('EPSG:4326');
const zoom = ref(5);
const mapCenter = ref<[number, number]>([112.5, -6.3]);

const payloadText = ref('');
const parseError = ref('');

const routePorts = ref<NormalizedPoint[]>([]);
const routeSegments = ref<RouteSegment[]>([]);

const validRoutePorts = computed(() => {
  return routePorts.value.filter((point) => point.isValid);
});

const validRoutePortCount = computed(() => {
  return validRoutePorts.value.length;
});

const validRouteSequencePoints = computed(() => {
  return routeSegments.value.flatMap((segment) => segment.validPoints);
});

const totalValidPointCount = computed(() => {
  return routeSegments.value.reduce((total, segment) => {
    return total + segment.validPoints.length;
  }, 0);
});

const mapFeatures = computed(() => {
  const features: Feature<Geometry>[] = [];

  routeSegments.value.forEach((segment) => {
    if (segment.coordinates.length <= 1) {
      return;
    }

    const feature = new Feature({
      geometry: new LineString(segment.coordinates),
    });

    feature.setStyle(routeLineStyle);
    features.push(feature);
  });

  validRoutePorts.value.forEach((point) => {
    const feature = new Feature({
      geometry: new Point([point.longitude as number, point.latitude as number]),
    });

    feature.setStyle(createPortPointStyle(point.label));
    features.push(feature);
  });

  validRouteSequencePoints.value.forEach((point) => {
    const feature = new Feature({
      geometry: new Point([point.longitude as number, point.latitude as number]),
    });

    feature.setStyle(createWaypointStyle(point.routeSequenceLabel ?? ''));
    features.push(feature);
  });

  return features;
});

const loadSamplePayload = () => {
  payloadText.value = JSON.stringify(samplePayload, null, 4);
  parsePayload();
};

const parsePayload = () => {
  parseError.value = '';
  routePorts.value = [];
  routeSegments.value = [];

  if (!payloadText.value.trim()) {
    parseError.value = 'Please paste JSON payload first.';
    return;
  }

  try {
    const payload = resolveRoutePayload(JSON.parse(payloadText.value));

    const rawRoutePorts = Array.isArray(payload.routePorts)
      ? payload.routePorts
      : [];

    const rawRouteSequences = Array.isArray(payload.routeSequences)
      ? payload.routeSequences
      : [];

    routePorts.value = rawRoutePorts.map((point: RawRoutePoint, index: number) => {
      return normalizePoint(point, null, index);
    });

    routeSegments.value = rawRouteSequences.map((segment: RawRoutePoint[], index: number) => {
      const points = Array.isArray(segment)
        ? segment.map((point, pointIndex) => normalizePoint(point, index, pointIndex))
        : [];

      const validPoints = points.filter((point) => point.isValid);

      return {
        id: `segment-${index}`,
        index,
        points,
        validPoints,
        coordinates: validPoints.map((point) => [
          point.longitude as number,
          point.latitude as number,
        ]),
      };
    });

    updateMapCenter();
  } catch (error) {
    parseError.value =
      error instanceof Error ? error.message : 'Invalid JSON payload.';
  }
};

const resolveRoutePayload = (payload: unknown): RawRoutePayload => {
  if (hasRouteCollections(payload)) {
    return payload;
  }

  if (isRecord(payload) && hasRouteCollections(payload.data)) {
    return payload.data;
  }

  return {};
};

const hasRouteCollections = (value: unknown): value is RawRoutePayload => {
  return (
    isRecord(value) &&
    (Array.isArray(value.routePorts) || Array.isArray(value.routeSequences))
  );
};

const isRecord = (value: unknown): value is Record<string, unknown> => {
  return typeof value === 'object' && value !== null;
};

const normalizePoint = (
  rawPoint: RawRoutePoint,
  segmentIndex: number | null,
  fallbackIndex: number,
): NormalizedPoint => {
  const sequence = toNumber(rawPoint.sequence) ?? fallbackIndex;
  const latitude = readPayloadNumber(rawPoint.latitude);
  const longitude = readPayloadNumber(rawPoint.longitude);
  const heading = readPayloadNumber(rawPoint.heading);
  const distance = readPayloadNumber(rawPoint.distance);
  const isValid =
    typeof latitude === 'number' &&
    typeof longitude === 'number' &&
    Number.isFinite(latitude) &&
    Number.isFinite(longitude);

  const pointType = rawPoint.pointType ?? null;
  const portCode = rawPoint.portCode ?? null;

  return {
    id: `${segmentIndex ?? 'port'}-${fallbackIndex}-${sequence}-${portCode ?? rawPoint.point ?? ''}`,
    segmentIndex,
    sequence,
    routeSequenceLabel:
      segmentIndex === null ? null : `${segmentIndex + 1}-${sequence}`,
    source: rawPoint.source ?? null,
    pointType,
    point: rawPoint.point ?? null,
    portCode,
    latitude,
    longitude,
    heading,
    distance,
    isValid,
    label: buildPointLabel(pointType, portCode, sequence),
  };
};

const readPayloadNumber = (value: NumericPayloadValue): number | null => {
  if (value === null || value === undefined) {
    return null;
  }

  if (typeof value === 'object') {
    const parsedValue = toNumber(value.parsedValue);
    if (parsedValue !== null) {
      return parsedValue;
    }

    return toNumber(value.source);
  }

  return toNumber(value);
};

const toNumber = (value: unknown): number | null => {
  if (value === null || value === undefined || value === '') {
    return null;
  }

  const result = Number(value);

  return Number.isFinite(result) ? result : null;
};

const buildPointLabel = (
  pointType: string | null,
  portCode: string | null,
  sequence: number,
) => {
  if (pointType && portCode) {
    return `${pointType}-${portCode}`;
  }

  if (pointType) {
    return pointType;
  }

  return `${sequence}`;
};

const routeLineStyle = new Style({
  stroke: new Stroke({
    color: '#2563eb',
    width: 4,
    lineDash: [10, 10],
  }),
});

const createPortPointStyle = (label: string) => {
  return new Style({
    image: new CircleStyle({
      radius: 13,
      fill: new Fill({ color: '#dc2626' }),
      stroke: new Stroke({ color: '#ffffff', width: 3 }),
    }),
    text: new Text({
      text: label,
      font: 'bold 13px sans-serif',
      fill: new Fill({ color: '#ffffff' }),
      offsetY: -28,
      stroke: new Stroke({ color: '#0f172a', width: 4 }),
    }),
  });
};

const createWaypointStyle = (label: string) => {
  return new Style({
    image: new CircleStyle({
      radius: 8,
      fill: new Fill({ color: '#1d4ed8' }),
      stroke: new Stroke({ color: '#ffffff', width: 2 }),
    }),
    text: new Text({
      text: label,
      font: 'bold 13px sans-serif',
      fill: new Fill({ color: '#0f172a' }),
      offsetY: 22,
      stroke: new Stroke({ color: '#ffffff', width: 5 }),
    }),
  });
};

const updateMapCenter = () => {
  const allValidPoints = [
    ...validRoutePorts.value,
    ...routeSegments.value.flatMap((segment) => segment.validPoints),
  ];

  if (allValidPoints.length === 0) {
    mapCenter.value = [112.5, -6.3];
    zoom.value = 5;
    return;
  }

  const averageLongitude =
    allValidPoints.reduce((total, point) => total + (point.longitude ?? 0), 0) /
    allValidPoints.length;

  const averageLatitude =
    allValidPoints.reduce((total, point) => total + (point.latitude ?? 0), 0) /
    allValidPoints.length;

  mapCenter.value = [averageLongitude, averageLatitude];
  zoom.value = allValidPoints.length > 10 ? 6 : 7;
};

const formatNullable = (value: number | null) => {
  return typeof value === 'number' && Number.isFinite(value)
    ? value.toFixed(6)
    : '-';
};

const samplePayload = {
  routePorts: [
    {
      sequence: 0,
      pointType: 'POL',
      portCode: 'IDSUB',
      latitude: -7.22195,
      longitude: 112.73213,
    },
    {
      sequence: 1,
      pointType: 'POT',
      portCode: 'IDJKT',
      latitude: -6.1667,
      longitude: 106.871483,
    },
    {
      sequence: 2,
      pointType: 'POD',
      portCode: 'IDTBR',
      latitude: null,
      longitude: null,
    },
  ],
  routeSequences: [
    [
      {
        sequence: 0,
        source: 'PORT_LOCATION',
        pointType: 'POL',
        point: null,
        portCode: 'IDSUB',
        latitude: -7.22195,
        longitude: 112.73213,
        heading: null,
        distance: null,
      },
      {
        sequence: 1,
        source: 'PASSAGE_PLAN_DETAIL',
        pointType: 'WAYPOINT',
        point: 'POINT 1',
        portCode: null,
        latitude: {
          source: '-6.869444000000000',
          parsedValue: -6.869444,
        },
        longitude: {
          source: '112.753333000000000',
          parsedValue: 112.753333,
        },
        heading: {
          source: '0.000000',
          parsedValue: 0,
        },
        distance: {
          source: '0.000000',
          parsedValue: 0,
        },
      },
      {
        sequence: 8,
        source: 'PORT_LOCATION',
        pointType: 'POD',
        point: null,
        portCode: 'IDJKT',
        latitude: -6.1667,
        longitude: 106.871483,
        heading: null,
        distance: null,
      },
    ],
    [],
  ],
};
</script>

<style scoped>
* {
  box-sizing: border-box;
}

.visualizer-page {
  min-height: calc(100vh - 82px);
  padding: 24px;
  background: #f8fafc;
  color: #0f172a;
  font-family:
    Inter,
    ui-sans-serif,
    system-ui,
    -apple-system,
    BlinkMacSystemFont,
    'Segoe UI',
    sans-serif;
}

.visualizer-header,
.input-card,
.map-card,
.card {
  border: 1px solid #e2e8f0;
  border-radius: 20px;
  background: #ffffff;
  box-shadow: 0 1px 3px rgb(15 23 42 / 0.08);
}

.visualizer-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 20px;
  margin-bottom: 20px;
  padding: 20px;
}

.visualizer-header h1,
.input-card h2,
.map-card h2,
.card h2 {
  margin: 0;
  color: #0f172a;
}

.visualizer-header h1 {
  font-size: 24px;
  line-height: 1.2;
}

.visualizer-header p,
.input-header p,
.card-title p {
  margin: 6px 0 0;
  color: #64748b;
  font-size: 14px;
}

.summary-pills,
.legend,
.action-row {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}

.summary-pills span,
.legend span {
  border-radius: 999px;
  background: #eff6ff;
  padding: 7px 12px;
  color: #1d4ed8;
  font-size: 13px;
  font-weight: 700;
}

.input-card {
  margin-bottom: 20px;
  padding: 20px;
}

.input-header,
.card-title {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 16px;
}

textarea {
  display: block;
  width: 100%;
  min-height: 260px;
  border: 1px solid #cbd5e1;
  border-radius: 16px;
  background: #020617;
  padding: 16px;
  color: #e2e8f0;
  font-family:
    ui-monospace,
    SFMono-Regular,
    Menlo,
    Monaco,
    Consolas,
    'Liberation Mono',
    monospace;
  font-size: 13px;
  line-height: 1.6;
  outline: none;
  resize: vertical;
}

textarea:focus {
  border-color: #2563eb;
  box-shadow: 0 0 0 3px rgb(37 99 235 / 0.2);
}

button {
  cursor: pointer;
  border: 0;
  font-family: inherit;
}

.primary-button,
.secondary-button {
  border-radius: 12px;
  padding: 10px 14px;
  font-size: 14px;
  font-weight: 700;
}

.primary-button {
  background: #2563eb;
  color: #ffffff;
}

.primary-button:hover {
  background: #1d4ed8;
}

.secondary-button {
  border: 1px solid #cbd5e1;
  background: #ffffff;
  color: #334155;
}

.secondary-button:hover {
  background: #f8fafc;
}

.error-box {
  margin-top: 12px;
  border: 1px solid #fecaca;
  border-radius: 14px;
  background: #fef2f2;
  padding: 12px 14px;
  color: #991b1b;
  font-size: 14px;
}

.map-card {
  overflow: hidden;
  margin-bottom: 20px;
}

.card-title {
  margin: 0;
  padding: 18px 20px;
  border-bottom: 1px solid #e2e8f0;
}

.map-wrapper {
  height: 620px;
}

.legend-line {
  display: inline-block;
  width: 28px;
  height: 0;
  border-top: 3px dashed #2563eb;
  vertical-align: middle;
}

.legend-dot {
  display: inline-block;
  width: 11px;
  height: 11px;
  border-radius: 999px;
  vertical-align: middle;
}

.port-dot {
  background: #dc2626;
}

.waypoint-dot {
  background: #1d4ed8;
}

.bottom-grid {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, 1.4fr);
  gap: 20px;
}

.card {
  padding: 20px;
}

.empty-state {
  margin-top: 16px;
  border: 1px dashed #cbd5e1;
  border-radius: 14px;
  padding: 18px;
  color: #64748b;
  font-size: 14px;
  text-align: center;
}

.empty-state.compact {
  margin-top: 10px;
  padding: 10px;
}

.table-wrapper {
  margin-top: 16px;
  overflow: auto;
}

table {
  width: 100%;
  border-collapse: collapse;
  font-size: 13px;
}

th,
td {
  border-bottom: 1px solid #e2e8f0;
  padding: 10px 8px;
  text-align: left;
  white-space: nowrap;
}

th {
  color: #475569;
  font-size: 12px;
  font-weight: 800;
  letter-spacing: 0.02em;
}

tr.invalid {
  background: #fff7ed;
}

.status-badge {
  display: inline-flex;
  align-items: center;
  border-radius: 999px;
  padding: 4px 8px;
  font-size: 11px;
  font-weight: 800;
}

.status-badge.valid {
  background: #dcfce7;
  color: #166534;
}

.status-badge.invalid {
  background: #fee2e2;
  color: #991b1b;
}

.segment-list {
  display: flex;
  max-height: 620px;
  flex-direction: column;
  gap: 14px;
  margin-top: 16px;
  overflow: auto;
  padding-right: 4px;
}

.segment-item {
  border: 1px solid #e2e8f0;
  border-radius: 16px;
  background: #f8fafc;
  padding: 14px;
}

.segment-title {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  color: #64748b;
  font-size: 13px;
}

.segment-title strong {
  color: #0f172a;
}

.sequence-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-top: 12px;
}

.sequence-item {
  display: grid;
  grid-template-columns: 36px minmax(0, 1fr) 70px;
  gap: 10px;
  align-items: start;
  border-radius: 12px;
  background: #ffffff;
  padding: 10px;
}

.sequence-item.invalid {
  background: #fff7ed;
}

.sequence-badge {
  display: flex;
  height: 32px;
  width: 32px;
  align-items: center;
  justify-content: center;
  border-radius: 999px;
  background: #1d4ed8;
  color: #ffffff;
  font-size: 13px;
  font-weight: 800;
}

.sequence-info {
  display: flex;
  min-width: 0;
  flex-direction: column;
  gap: 3px;
  color: #475569;
  font-size: 12px;
}

.sequence-info strong {
  color: #0f172a;
  font-size: 14px;
}

.sequence-info code {
  color: #334155;
  font-family:
    ui-monospace,
    SFMono-Regular,
    Menlo,
    Monaco,
    Consolas,
    'Liberation Mono',
    monospace;
}

@media (max-width: 1180px) {
  .bottom-grid {
    grid-template-columns: 1fr;
  }

  .visualizer-header,
  .input-header,
  .card-title {
    flex-direction: column;
  }
}

@media (max-width: 760px) {
  .visualizer-page {
    padding: 14px;
  }

  .map-wrapper {
    height: 480px;
  }

  .sequence-item {
    grid-template-columns: 32px minmax(0, 1fr);
  }

  .sequence-item .status-badge {
    grid-column: 2;
  }
}
</style>
