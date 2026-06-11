<template>
  <div class="visualizer-page">
    <section class="visualizer-header">
      <div>
        <h1>Passage Plan Visualizer</h1>
        <p>
          Paste backend route-map response to visualize routePorts, routeSequences,
          routeLegs solid/dotted split, and vessel marker position.
        </p>
      </div>

      <div class="summary-pills">
        <span>{{ validRoutePortCount }} valid port(s)</span>
        <span>{{ totalValidPointCount }} valid point(s)</span>
        <span>{{ routeSegments.length }} raw segment(s)</span>
        <span>{{ routeLegs.length }} route leg(s)</span>
        <span v-if="vesselMarker">Vessel: {{ vesselMarker.status || '-' }}</span>
      </div>
    </section>

    <section class="input-card">
      <div class="input-header">
        <div>
          <h2>JSON Payload</h2>
          <p>
            Paste full API response or only the data object. Latest response with
            routeLegs and vesselMarker is supported.
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
            If routeLegs exist, the map uses solid/dotted rendering from routeLegs.
            Otherwise, it falls back to raw routeSequences.
          </p>
        </div>

        <div class="legend">
          <span>
            <i class="legend-line raw-line"></i>
            raw route
          </span>
          <span>
            <i class="legend-line solid-line"></i>
            solid traveled
          </span>
          <span>
            <i class="legend-line dotted-line"></i>
            dotted upcoming
          </span>
          <span>
            <i class="legend-dot port-dot"></i>
            ports
          </span>
          <span>
            <i class="legend-dot vessel-dot"></i>
            vessel
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

    <section v-if="vesselMarker || routeLegs.length > 0" class="progress-grid">
      <section class="card vessel-card">
        <h2>Vessel Marker</h2>

        <div v-if="!vesselMarker" class="empty-state">
          No vesselMarker loaded.
        </div>

        <div v-else class="info-grid">
          <div>
            <span>Vessel</span>
            <strong>{{ vesselMarker.vesselCode || '-' }}</strong>
          </div>
          <div>
            <span>Voyage</span>
            <strong>{{ vesselMarker.voyage || '-' }}</strong>
          </div>
          <div>
            <span>Status</span>
            <strong>{{ vesselMarker.status || '-' }}</strong>
          </div>
          <div>
            <span>Calculation</span>
            <strong>{{ vesselMarker.calculationMethod || '-' }}</strong>
          </div>
          <div>
            <span>Current leg</span>
            <strong>
              {{ vesselMarker.currentLegIndex ?? '-' }}
              <template v-if="vesselMarker.currentLegFrom || vesselMarker.currentLegTo">
                ({{ vesselMarker.currentLegFrom || '-' }} → {{ vesselMarker.currentLegTo || '-' }})
              </template>
            </strong>
          </div>
          <div>
            <span>Progress</span>
            <strong>{{ formatPercent(vesselMarker.progressPercentage) }}</strong>
          </div>
          <div>
            <span>Latitude</span>
            <strong>{{ formatNullable(vesselMarker.latitude) }}</strong>
          </div>
          <div>
            <span>Longitude</span>
            <strong>{{ formatNullable(vesselMarker.longitude) }}</strong>
          </div>
        </div>
      </section>

      <section class="card">
        <h2>Route Legs</h2>

        <div v-if="routeLegs.length === 0" class="empty-state">
          No routeLegs loaded.
        </div>

        <div v-else class="leg-list">
          <div
            v-for="leg in routeLegs"
            :key="leg.id"
            class="leg-item"
            :class="leg.renderStatus.toLowerCase()"
          >
            <div>
              <strong>Leg {{ leg.legIndex }}</strong>
              <span>{{ leg.fromPortCode || '-' }} → {{ leg.toPortCode || '-' }}</span>
            </div>
            <span class="status-badge" :class="leg.renderStatus.toLowerCase()">
              {{ leg.renderStatus }}
            </span>
            <span>{{ formatPercent(leg.progressPercentage) }}</span>
            <span>Solid: {{ leg.solidSegment.validPoints.length }}</span>
            <span>Dotted: {{ leg.dottedSegment.validPoints.length }}</span>
          </div>
        </div>
      </section>
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

type RawRouteLeg = {
  legIndex?: number | string | null;
  fromPortCode?: string | null;
  toPortCode?: string | null;
  progressPercentage?: NumericPayloadValue;
  renderStatus?: string | null;
  solidSequences?: unknown;
  dottedSequences?: unknown;
};

type RawVesselMarker = {
  vesselCode?: string | null;
  voyage?: string | null;
  currentLegIndex?: number | string | null;
  currentLegFrom?: string | null;
  currentLegTo?: string | null;
  distanceTraveled?: NumericPayloadValue;
  remainingDistance?: NumericPayloadValue;
  totalDistance?: NumericPayloadValue;
  targetDistance?: NumericPayloadValue;
  targetDistancePercentage?: NumericPayloadValue;
  progressPercentage?: NumericPayloadValue;
  latitude?: NumericPayloadValue;
  longitude?: NumericPayloadValue;
  calculationMethod?: string | null;
  source?: string | null;
  status?: string | null;
  statusMessage?: string | null;
};

type RawRoutePayload = {
  routePorts?: unknown;
  routeSequences?: unknown;
  routeLegs?: unknown;
  vesselMarker?: unknown;
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

type RouteSegmentKind = 'raw' | 'solid' | 'dotted';

type RouteSegment = {
  id: string;
  index: number;
  kind: RouteSegmentKind;
  points: NormalizedPoint[];
  validPoints: NormalizedPoint[];
  coordinates: [number, number][];
};

type NormalizedRouteLeg = {
  id: string;
  legIndex: number;
  fromPortCode: string | null;
  toPortCode: string | null;
  progressPercentage: number | null;
  renderStatus: string;
  solidSegment: RouteSegment;
  dottedSegment: RouteSegment;
};

type NormalizedVesselMarker = {
  vesselCode: string | null;
  voyage: string | null;
  currentLegIndex: number | null;
  currentLegFrom: string | null;
  currentLegTo: string | null;
  distanceTraveled: number | null;
  remainingDistance: number | null;
  totalDistance: number | null;
  targetDistance: number | null;
  targetDistancePercentage: number | null;
  progressPercentage: number | null;
  latitude: number | null;
  longitude: number | null;
  calculationMethod: string | null;
  source: string | null;
  status: string | null;
  statusMessage: string | null;
  isValid: boolean;
};

const projection = ref('EPSG:4326');
const zoom = ref(5);
const mapCenter = ref<[number, number]>([112.5, -6.3]);

const payloadText = ref('');
const parseError = ref('');

const routePorts = ref<NormalizedPoint[]>([]);
const routeSegments = ref<RouteSegment[]>([]);
const routeLegs = ref<NormalizedRouteLeg[]>([]);
const vesselMarker = ref<NormalizedVesselMarker | null>(null);

const validRoutePorts = computed(() => {
  return routePorts.value.filter((point) => point.isValid);
});

const validRoutePortCount = computed(() => {
  return validRoutePorts.value.length;
});

const validRouteSequencePoints = computed(() => {
  return routeSegments.value.flatMap((segment) => segment.validPoints);
});

const routeLegRenderSegments = computed(() => {
  return routeLegs.value.flatMap((leg) => [leg.solidSegment, leg.dottedSegment]);
});

const activeRenderSegments = computed(() => {
  const validRouteLegSegments = routeLegRenderSegments.value.filter(
    (segment) => segment.coordinates.length > 1,
  );

  return validRouteLegSegments.length > 0
    ? validRouteLegSegments
    : routeSegments.value;
});

const totalValidPointCount = computed(() => {
  return routeSegments.value.reduce((total, segment) => {
    return total + segment.validPoints.length;
  }, 0);
});

const mapFeatures = computed(() => {
  const features: Feature<Geometry>[] = [];

  activeRenderSegments.value.forEach((segment) => {
    if (segment.coordinates.length <= 1) {
      return;
    }

    const feature = new Feature({
      geometry: new LineString(segment.coordinates),
    });

    feature.setStyle(resolveSegmentStyle(segment.kind));
    features.push(feature);
  });

  validRoutePorts.value.forEach((point) => {
    const feature = new Feature({
      geometry: new Point([point.longitude as number, point.latitude as number]),
    });

    feature.setStyle(createPortPointStyle(point.label));
    features.push(feature);
  });

  if (vesselMarker.value?.isValid) {
    const marker = vesselMarker.value;
    const feature = new Feature({
      geometry: new Point([marker.longitude as number, marker.latitude as number]),
    });

    feature.setStyle(createVesselMarkerStyle('VESSEL'));
    features.push(feature);
  }

  if (routeLegs.value.length === 0) {
    validRouteSequencePoints.value.forEach((point) => {
      const feature = new Feature({
        geometry: new Point([point.longitude as number, point.latitude as number]),
      });

      feature.setStyle(createWaypointStyle(point.routeSequenceLabel ?? ''));
      features.push(feature);
    });
  }

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
  routeLegs.value = [];
  vesselMarker.value = null;

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

    const rawRouteLegs = Array.isArray(payload.routeLegs)
      ? payload.routeLegs
      : [];

    routePorts.value = rawRoutePorts.map((point: RawRoutePoint, index: number) => {
      return normalizePoint(point, null, index, 'port');
    });

    routeSegments.value = rawRouteSequences.map((segment: RawRoutePoint[], index: number) => {
      return buildRouteSegment(segment, index, 'raw', `segment-${index}`);
    });

    routeLegs.value = rawRouteLegs.map((leg: RawRouteLeg, index: number) => {
      return normalizeRouteLeg(leg, index);
    });

    vesselMarker.value = isRecord(payload.vesselMarker)
      ? normalizeVesselMarker(payload.vesselMarker as RawVesselMarker)
      : null;

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
    (Array.isArray(value.routePorts) ||
      Array.isArray(value.routeSequences) ||
      Array.isArray(value.routeLegs) ||
      isRecord(value.vesselMarker))
  );
};

const isRecord = (value: unknown): value is Record<string, unknown> => {
  return typeof value === 'object' && value !== null;
};

const normalizeRouteLeg = (
  rawLeg: RawRouteLeg,
  fallbackIndex: number,
): NormalizedRouteLeg => {
  const legIndex = toNumber(rawLeg.legIndex) ?? fallbackIndex;
  const solidSequences = Array.isArray(rawLeg.solidSequences)
    ? rawLeg.solidSequences
    : [];
  const dottedSequences = Array.isArray(rawLeg.dottedSequences)
    ? rawLeg.dottedSequences
    : [];

  return {
    id: `leg-${legIndex}-${fallbackIndex}`,
    legIndex,
    fromPortCode: rawLeg.fromPortCode ?? null,
    toPortCode: rawLeg.toPortCode ?? null,
    progressPercentage: readPayloadNumber(rawLeg.progressPercentage),
    renderStatus: rawLeg.renderStatus ?? 'UNKNOWN',
    solidSegment: buildRouteSegment(
      solidSequences as RawRoutePoint[],
      legIndex,
      'solid',
      `leg-${legIndex}-solid`,
    ),
    dottedSegment: buildRouteSegment(
      dottedSequences as RawRoutePoint[],
      legIndex,
      'dotted',
      `leg-${legIndex}-dotted`,
    ),
  };
};

const normalizeVesselMarker = (
  rawMarker: RawVesselMarker,
): NormalizedVesselMarker => {
  const latitude = readPayloadNumber(rawMarker.latitude);
  const longitude = readPayloadNumber(rawMarker.longitude);
  const isValid =
    typeof latitude === 'number' &&
    typeof longitude === 'number' &&
    Number.isFinite(latitude) &&
    Number.isFinite(longitude);

  return {
    vesselCode: rawMarker.vesselCode ?? null,
    voyage: rawMarker.voyage ?? null,
    currentLegIndex: toNumber(rawMarker.currentLegIndex),
    currentLegFrom: rawMarker.currentLegFrom ?? null,
    currentLegTo: rawMarker.currentLegTo ?? null,
    distanceTraveled: readPayloadNumber(rawMarker.distanceTraveled),
    remainingDistance: readPayloadNumber(rawMarker.remainingDistance),
    totalDistance: readPayloadNumber(rawMarker.totalDistance),
    targetDistance: readPayloadNumber(rawMarker.targetDistance),
    targetDistancePercentage: readPayloadNumber(rawMarker.targetDistancePercentage),
    progressPercentage: readPayloadNumber(rawMarker.progressPercentage),
    latitude,
    longitude,
    calculationMethod: rawMarker.calculationMethod ?? null,
    source: rawMarker.source ?? null,
    status: rawMarker.status ?? null,
    statusMessage: rawMarker.statusMessage ?? null,
    isValid,
  };
};

const buildRouteSegment = (
  rawPoints: RawRoutePoint[],
  index: number,
  kind: RouteSegmentKind,
  id: string,
): RouteSegment => {
  const points = Array.isArray(rawPoints)
    ? rawPoints.map((point, pointIndex) => normalizePoint(point, index, pointIndex, kind))
    : [];
  const validPoints = points.filter((point) => point.isValid);

  return {
    id,
    index,
    kind,
    points,
    validPoints,
    coordinates: validPoints.map((point) => [
      point.longitude as number,
      point.latitude as number,
    ]),
  };
};

const normalizePoint = (
  rawPoint: RawRoutePoint,
  segmentIndex: number | null,
  fallbackIndex: number,
  kind: string,
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
    id: `${kind}-${segmentIndex ?? 'port'}-${fallbackIndex}-${sequence}-${portCode ?? rawPoint.point ?? ''}`,
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

  if (pointType === 'VESSEL_MARKER') {
    return 'VESSEL';
  }

  if (pointType) {
    return pointType;
  }

  return `${sequence}`;
};

const rawRouteLineStyle = new Style({
  stroke: new Stroke({
    color: '#2563eb',
    width: 4,
    lineDash: [10, 10],
  }),
});

const solidRouteLineStyle = new Style({
  stroke: new Stroke({
    color: '#16a34a',
    width: 5,
  }),
});

const dottedRouteLineStyle = new Style({
  stroke: new Stroke({
    color: '#f97316',
    width: 5,
    lineDash: [10, 12],
  }),
});

const resolveSegmentStyle = (kind: RouteSegmentKind) => {
  if (kind === 'solid') {
    return solidRouteLineStyle;
  }

  if (kind === 'dotted') {
    return dottedRouteLineStyle;
  }

  return rawRouteLineStyle;
};

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

const createVesselMarkerStyle = (label: string) => {
  return new Style({
    image: new CircleStyle({
      radius: 14,
      fill: new Fill({ color: '#7c3aed' }),
      stroke: new Stroke({ color: '#ffffff', width: 3 }),
    }),
    text: new Text({
      text: label,
      font: 'bold 13px sans-serif',
      fill: new Fill({ color: '#ffffff' }),
      offsetY: -30,
      stroke: new Stroke({ color: '#312e81', width: 5 }),
    }),
  });
};

const updateMapCenter = () => {
  const markerPoints = vesselMarker.value?.isValid
    ? [
        {
          latitude: vesselMarker.value.latitude,
          longitude: vesselMarker.value.longitude,
        },
      ]
    : [];

  const allValidPoints = [
    ...validRoutePorts.value,
    ...routeSegments.value.flatMap((segment) => segment.validPoints),
    ...routeLegRenderSegments.value.flatMap((segment) => segment.validPoints),
    ...markerPoints,
  ].filter((point) => {
    return (
      typeof point.latitude === 'number' &&
      typeof point.longitude === 'number' &&
      Number.isFinite(point.latitude) &&
      Number.isFinite(point.longitude)
    );
  });

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

const formatPercent = (value: number | null) => {
  return typeof value === 'number' && Number.isFinite(value)
    ? `${value.toFixed(2)}%`
    : '-';
};

const samplePayload = {
  message: null,
  status: 0,
  data: {
    routePorts: [
      {
        sequence: 0,
        pointType: 'POL',
        portCode: 'IDJKT',
        latitude: -6.1667,
        longitude: 106.871483,
      },
      {
        sequence: 1,
        pointType: 'POT',
        portCode: 'IDSUB',
        latitude: -7.22195,
        longitude: 112.73213,
      },
      {
        sequence: 2,
        pointType: 'POD',
        portCode: 'IDMAK',
        latitude: -5.1239219407559,
        longitude: 119.407976926018,
      },
    ],
    routeSequences: [
      [
        {
          sequence: 0,
          source: 'PORT_LOCATION',
          pointType: 'POL',
          point: null,
          portCode: 'IDJKT',
          latitude: -6.1667,
          longitude: 106.871483,
          heading: null,
          distance: null,
        },
        {
          sequence: 1,
          source: 'PASSAGE_PLAN_DETAIL',
          pointType: 'WAYPOINT',
          point: 'POINT 1',
          portCode: null,
          latitude: -6.026834383084784,
          longitude: 106.88072789377323,
          heading: 20.686352,
          distance: 0,
        },
        {
          sequence: 7,
          source: 'PORT_LOCATION',
          pointType: 'POD',
          point: null,
          portCode: 'IDSUB',
          latitude: -7.22195,
          longitude: 112.73213,
          heading: null,
          distance: null,
        },
      ],
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
          sequence: 4,
          source: 'PASSAGE_PLAN_DETAIL',
          pointType: 'WAYPOINT',
          point: 'POINT-4',
          portCode: null,
          latitude: -6.033333,
          longitude: 116.666667,
          heading: 0,
          distance: 0,
        },
        {
          sequence: 5,
          source: 'PASSAGE_PLAN_DETAIL',
          pointType: 'WAYPOINT',
          point: 'POINT-5',
          portCode: null,
          latitude: -5.366667,
          longitude: 118.422222,
          heading: 0,
          distance: 0,
        },
        {
          sequence: 8,
          source: 'PORT_LOCATION',
          pointType: 'POD',
          point: null,
          portCode: 'IDMAK',
          latitude: -5.1239219407559,
          longitude: 119.407976926018,
          heading: null,
          distance: null,
        },
      ],
    ],
    routeLegs: [
      {
        legIndex: 0,
        fromPortCode: 'IDJKT',
        toPortCode: 'IDSUB',
        progressPercentage: 100,
        renderStatus: 'COMPLETED',
        solidSequences: [
          {
            sequence: 0,
            source: 'PORT_LOCATION',
            pointType: 'POL',
            point: null,
            portCode: 'IDJKT',
            latitude: -6.1667,
            longitude: 106.871483,
            heading: null,
            distance: null,
          },
          {
            sequence: 7,
            source: 'PORT_LOCATION',
            pointType: 'POD',
            point: null,
            portCode: 'IDSUB',
            latitude: -7.22195,
            longitude: 112.73213,
            heading: null,
            distance: null,
          },
        ],
        dottedSequences: [],
      },
      {
        legIndex: 1,
        fromPortCode: 'IDSUB',
        toPortCode: 'IDMAK',
        progressPercentage: 64.5613035492806,
        renderStatus: 'ACTIVE',
        solidSequences: [
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
            sequence: 4,
            source: 'PASSAGE_PLAN_DETAIL',
            pointType: 'WAYPOINT',
            point: 'POINT-4',
            portCode: null,
            latitude: -6.033333,
            longitude: 116.666667,
            heading: 0,
            distance: 0,
          },
          {
            sequence: 5,
            source: 'VESSEL_MARKER',
            pointType: 'VESSEL_MARKER',
            point: 'VESSEL_MARKER',
            portCode: null,
            latitude: -5.912843334124183,
            longitude: 116.9839566703546,
            heading: null,
            distance: null,
          },
        ],
        dottedSequences: [
          {
            sequence: 5,
            source: 'VESSEL_MARKER',
            pointType: 'VESSEL_MARKER',
            point: 'VESSEL_MARKER',
            portCode: null,
            latitude: -5.912843334124183,
            longitude: 116.9839566703546,
            heading: null,
            distance: null,
          },
          {
            sequence: 5,
            source: 'PASSAGE_PLAN_DETAIL',
            pointType: 'WAYPOINT',
            point: 'POINT-5',
            portCode: null,
            latitude: -5.366667,
            longitude: 118.422222,
            heading: 0,
            distance: 0,
          },
          {
            sequence: 8,
            source: 'PORT_LOCATION',
            pointType: 'POD',
            point: null,
            portCode: 'IDMAK',
            latitude: -5.1239219407559,
            longitude: 119.407976926018,
            heading: null,
            distance: null,
          },
        ],
      },
    ],
    vesselMarker: {
      vesselCode: 'DUMMY',
      voyage: 'PT215N',
      currentLegIndex: 1,
      currentLegFrom: 'IDSUB',
      currentLegTo: 'IDMAK',
      distanceTraveled: 471.297515909748,
      remainingDistance: 258.702484090252,
      totalDistance: 730,
      targetDistance: 258.702484090252,
      targetDistancePercentage: 35.4386964507194,
      progressPercentage: 64.5613035492806,
      latitude: -5.912843334124183,
      longitude: 116.9839566703546,
      calculationMethod: 'DIRECT_INTERPOLATION',
      source: 'MELISA_GET_DISTANCE_VESSEL',
      status: 'DIRECT_INTERPOLATION_CALCULATED',
      statusMessage: null,
    },
  },
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
  vertical-align: middle;
}

.raw-line {
  border-top: 3px dashed #2563eb;
}

.solid-line {
  border-top: 4px solid #16a34a;
}

.dotted-line {
  border-top: 4px dashed #f97316;
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

.vessel-dot {
  background: #7c3aed;
}

.progress-grid,
.bottom-grid {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, 1.4fr);
  gap: 20px;
}

.progress-grid {
  margin-bottom: 20px;
}

.card {
  padding: 20px;
}

.info-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
  margin-top: 16px;
}

.info-grid div {
  border: 1px solid #e2e8f0;
  border-radius: 14px;
  background: #f8fafc;
  padding: 12px;
}

.info-grid span {
  display: block;
  color: #64748b;
  font-size: 12px;
  font-weight: 700;
}

.info-grid strong {
  display: block;
  margin-top: 4px;
  color: #0f172a;
  font-size: 13px;
  word-break: break-word;
}

.leg-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
  margin-top: 16px;
}

.leg-item {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto auto auto auto;
  gap: 10px;
  align-items: center;
  border: 1px solid #e2e8f0;
  border-radius: 14px;
  background: #f8fafc;
  padding: 12px;
  color: #475569;
  font-size: 13px;
}

.leg-item strong,
.leg-item span {
  display: block;
}

.leg-item strong {
  color: #0f172a;
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

.status-badge.valid,
.status-badge.completed {
  background: #dcfce7;
  color: #166534;
}

.status-badge.invalid {
  background: #fee2e2;
  color: #991b1b;
}

.status-badge.active {
  background: #ede9fe;
  color: #5b21b6;
}

.status-badge.upcoming {
  background: #ffedd5;
  color: #9a3412;
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
  .progress-grid,
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

  .info-grid,
  .leg-item {
    grid-template-columns: 1fr;
  }

  .sequence-item {
    grid-template-columns: 32px minmax(0, 1fr);
  }

  .sequence-item .status-badge {
    grid-column: 2;
  }
}
</style>
