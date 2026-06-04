<template>
  <div class="page">
    <header class="header">
      <div>
        <h1>Passage Plan SQL Builder</h1>
        <p>
          Click on the map to add waypoint markers, then generate SQL for
          PASSAGE_PLAN and PASSAGE_PLAN_DETAIL.
        </p>
      </div>

      <button
        type="button"
        class="secondary-button"
        :disabled="markers.length === 0"
        @click="clearMarkers"
      >
        Clear Markers
      </button>
    </header>

    <main class="layout">
      <section class="map-card">
        <div class="card-title">
          <div>
            <h2>Map</h2>
            <p>Click anywhere on the map to add a waypoint.</p>
          </div>

          <div class="marker-count">{{ markers.length }} marker(s)</div>
        </div>

        <div class="map-wrapper">
          <ol-map
            :loadTilesWhileAnimating="true"
            :loadTilesWhileInteracting="true"
            style="height: 100%; width: 100%"
            @click="handleMapClick"
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
              <ol-source-vector>
                <ol-feature v-if="routeCoordinates.length > 1">
                  <ol-geom-line-string :coordinates="routeCoordinates" />
                  <ol-style>
                    <ol-style-stroke
                      color="#2563eb"
                      :width="4"
                      :lineDash="[10, 10]"
                    />
                  </ol-style>
                </ol-feature>

                <ol-feature v-for="marker in markers" :key="marker.id">
                  <ol-geom-point
                    :coordinates="[marker.longitude, marker.latitude]"
                  />
                  <ol-style>
                    <ol-style-circle :radius="13">
                      <ol-style-fill color="#1d4ed8" />
                      <ol-style-stroke color="#ffffff" :width="3" />
                    </ol-style-circle>

                    <ol-style-text
                      :text="marker.sequence.toString()"
                      font="bold 12px sans-serif"
                      fill="#ffffff"
                    />
                  </ol-style>
                </ol-feature>
              </ol-source-vector>
            </ol-vector-layer>

            <ol-overlay
              v-for="marker in markers"
              :key="`remove-${marker.id}`"
              :position="[marker.longitude, marker.latitude]"
              positioning="center-center"
            >
              <button
                type="button"
                class="marker-remove-button"
                title="Remove marker"
                @click.stop="removeMarker(marker.id)"
              >
                ×
              </button>
            </ol-overlay>
          </ol-map>
        </div>
      </section>

      <section class="bottom-panel">
        <section class="card">
          <h2>Passage Plan Header</h2>

          <div class="form-grid">
            <label>
              <span>POL <b>*</b></span>
              <input
                v-model.trim="form.pol"
                type="text"
                maxlength="15"
                placeholder="e.g. IDJKT"
              />
            </label>

            <label>
              <span>POD <b>*</b></span>
              <input
                v-model.trim="form.pod"
                type="text"
                maxlength="15"
                placeholder="e.g. IDBLW"
              />
            </label>

            <label>
              <span>ROUTE <b>*</b></span>
              <input
                v-model.trim="form.route"
                type="text"
                maxlength="50"
                placeholder="Auto: POL + POD"
              />
            </label>

            <label>
              <span>NAME</span>
              <input
                v-model.trim="form.name"
                type="text"
                maxlength="100"
                placeholder="e.g. JAKARTA - BELAWAN"
              />
            </label>

            <label>
              <span>CREATED_BY <b>*</b></span>
              <input
                v-model.trim="form.createdBy"
                type="text"
                maxlength="50"
                placeholder="e.g. kristian"
              />
            </label>

            <label>
              <span>PASSAGE_PLAN_MVISSION_ID <b>*</b></span>
              <input
                v-model.number="form.passagePlanMvisionId"
                type="number"
                min="0"
                placeholder="0"
              />
            </label>

            <label>
              <span>PASSAGE_PLAN_DETAIL_MVISSION_ID_START</span>
              <input
                :value="passagePlanDetailMvisionIdStart || ''"
                type="number"
                readonly
                placeholder="Auto from PASSAGE_PLAN_MVISSION_ID"
                class="readonly-input"
              />
            </label>
          </div>

          <div class="stats">
            <div>
              <span>Waypoint count</span>
              <strong>{{ markers.length }}</strong>
            </div>
            <div>
              <span>Total distance</span>
              <strong>{{ totalDistanceNm.toFixed(4) }} NM</strong>
            </div>
          </div>
        </section>

        <section class="card">
          <h2>Waypoint Sequences</h2>

          <div v-if="markers.length === 0" class="empty-state">
            No waypoint yet. Click on the map to add marker.
          </div>

          <div v-else class="marker-list">
            <div v-for="marker in markers" :key="marker.id" class="marker-item">
              <div class="sequence-badge">
                {{ marker.sequence }}
              </div>

              <div class="marker-info">
                <strong>{{ marker.point }}</strong>

                <span>
                  Lat:
                  <code>{{ formatCoordinate(marker.latitude) }}</code>
                </span>

                <span>
                  Lng:
                  <code>{{ formatCoordinate(marker.longitude) }}</code>
                </span>

                <span>
                  Heading:
                  <code>{{ marker.heading.toFixed(6) }}</code>
                </span>

                <span>
                  Distance:
                  <code>{{ marker.distance.toFixed(6) }} NM</code>
                </span>

                <span>
                  Detail MVision ID:
                  <code>{{ getDetailMvisionId(marker.sequence) }}</code>
                </span>
              </div>

              <button
                type="button"
                class="list-remove-button"
                title="Remove marker"
                @click="removeMarker(marker.id)"
              >
                ×
              </button>
            </div>
          </div>
        </section>
      </section>
    </main>

    <section class="sql-card">
      <div class="sql-header">
        <div>
          <h2>Generated SQL</h2>
          <p>Click textarea to select all query.</p>
        </div>

        <button
          type="button"
          class="primary-button"
          :disabled="!canGenerateSql"
          @click="generateSql"
        >
          Generate SQL
        </button>
      </div>

      <div v-if="validationMessage" class="warning">
        {{ validationMessage }}
      </div>

      <textarea
        ref="sqlTextAreaRef"
        v-model="generatedSql"
        readonly
        spellcheck="false"
        placeholder="Generated SQL will appear here..."
        @click="selectAllSql"
      />
    </section>
  </div>
</template>

<script setup lang="ts">
import { computed, reactive, ref, watch } from "vue";

type MapClickEvent = {
  coordinate?: [number, number];
};

type PassagePlanForm = {
  pol: string;
  pod: string;
  route: string;
  name: string;
  createdBy: string;
  passagePlanMvisionId: number;
};

type WaypointMarker = {
  id: string;
  sequence: number;
  point: string;
  latitude: number;
  longitude: number;
  heading: number;
  distance: number;
};

const projection = ref("EPSG:4326");
const zoom = ref(5);
const mapCenter = ref<[number, number]>([118.0, -2.5]);

const markers = ref<WaypointMarker[]>([]);
const generatedSql = ref("");
const validationMessage = ref("");
const sqlTextAreaRef = ref<HTMLTextAreaElement | null>(null);

const form = reactive<PassagePlanForm>({
  pol: "",
  pod: "",
  route: "",
  name: "",
  createdBy: "system",
  passagePlanMvisionId: 0,
});

const routeCoordinates = computed(() => {
  return markers.value.map((marker) => [marker.longitude, marker.latitude]);
});

const totalDistanceNm = computed(() => {
  return markers.value.reduce((total, marker) => {
    return total + marker.distance;
  }, 0);
});

const passagePlanDetailMvisionIdStart = computed(() => {
  if (!Number.isFinite(form.passagePlanMvisionId)) {
    return 0;
  }

  const headerMvisionId = Math.trunc(form.passagePlanMvisionId);

  if (headerMvisionId <= 0) {
    return 0;
  }

  return Number(`${headerMvisionId}001`);
});

const canGenerateSql = computed(() => {
  return (
    form.pol.trim().length > 0 &&
    form.pod.trim().length > 0 &&
    form.route.trim().length > 0 &&
    form.createdBy.trim().length > 0 &&
    Number.isFinite(form.passagePlanMvisionId) &&
    form.passagePlanMvisionId > 0 &&
    passagePlanDetailMvisionIdStart.value > 0 &&
    markers.value.length > 0
  );
});

watch(
  () => [form.pol, form.pod],
  ([pol, pod]) => {
    const normalizedPol = normalizePortCode(pol);
    const normalizedPod = normalizePortCode(pod);

    form.route = `${normalizedPol}${normalizedPod}`;
  },
);

const handleMapClick = (event: MapClickEvent) => {
  if (!event.coordinate || event.coordinate.length < 2) {
    return;
  }

  const [longitude, latitude] = event.coordinate;

  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
    return;
  }

  markers.value.push({
    id: createId(),
    sequence: markers.value.length + 1,
    point: `Point-${markers.value.length + 1}`,
    latitude: roundCoordinate(latitude),
    longitude: roundCoordinate(longitude),
    heading: 0,
    distance: 0,
  });

  recalculateMarkers();
  generatedSql.value = "";
  validationMessage.value = "";
};

const removeMarker = (id: string) => {
  markers.value = markers.value.filter((marker) => marker.id !== id);
  recalculateMarkers();
  generatedSql.value = "";
  validationMessage.value = "";
};

const clearMarkers = () => {
  markers.value = [];
  generatedSql.value = "";
  validationMessage.value = "";
};

const recalculateMarkers = () => {
  markers.value = markers.value.map((marker, index, array) => {
    const previousMarker = index > 0 ? array[index - 1] : null;

    return {
      ...marker,
      sequence: index + 1,
      point: `Point-${index + 1}`,
      heading: previousMarker
        ? calculateBearing(
            previousMarker.latitude,
            previousMarker.longitude,
            marker.latitude,
            marker.longitude,
          )
        : 0,
      distance: previousMarker
        ? calculateDistanceNm(
            previousMarker.latitude,
            previousMarker.longitude,
            marker.latitude,
            marker.longitude,
          )
        : 0,
    };
  });
};

const generateSql = () => {
  validationMessage.value = "";

  if (!canGenerateSql.value) {
    validationMessage.value =
      "Please fill POL, POD, ROUTE, CREATED_BY, PASSAGE_PLAN_MVISSION_ID greater than 0, and add at least one marker.";
    return;
  }

  const pol = normalizePortCode(form.pol);
  const pod = normalizePortCode(form.pod);
  const route = normalizeSqlText(form.route);
  const name = form.name.trim().length > 0 ? normalizeSqlText(form.name) : null;
  const createdBy = normalizeSqlText(form.createdBy);
  const passagePlanMvisionId = Math.trunc(form.passagePlanMvisionId);
  const detailMvisionIdStart = passagePlanDetailMvisionIdStart.value;

  const detailValues = markers.value
    .map((marker) => {
      const passagePlanDetailMvisionId =
        detailMvisionIdStart + marker.sequence - 1;

      return [
        "(",
        marker.sequence,
        ", ",
        toSqlString(marker.point),
        ", ",
        toSqlNumber(marker.latitude, 15),
        ", ",
        toSqlNumber(marker.longitude, 15),
        ", ",
        toSqlNumber(marker.heading, 6),
        ", ",
        toSqlNumber(marker.distance, 6),
        ", ",
        passagePlanDetailMvisionId,
        ")",
      ].join("");
    })
    .join(",\n        ");

  generatedSql.value = [
    "BEGIN;",
    "",
    "WITH inserted_plan AS (",
    '    INSERT INTO "MASTER_SA"."PASSAGE_PLAN" (',
    '        "POL",',
    '        "POD",',
    '        "ROUTE",',
    '        "NAME",',
    '        "TOTAL_DISTANCE",',
    '        "CREATED_DATE",',
    '        "CREATED_BY",',
    '        "PASSAGE_PLAN_MVISSION_ID"',
    "    )",
    "    VALUES (",
    `        ${toSqlString(pol)},`,
    `        ${toSqlString(pod)},`,
    `        ${toSqlString(route)},`,
    `        ${name ? toSqlString(name) : "NULL"},`,
    `        ${toSqlNumber(totalDistanceNm.value, 4)},`,
    "        NOW(),",
    `        ${toSqlString(createdBy)},`,
    `        ${passagePlanMvisionId}`,
    "    )",
    '    RETURNING "PASSAGE_PLAN_ID"',
    ")",
    'INSERT INTO "MASTER_SA"."PASSAGE_PLAN_DETAIL" (',
    '    "PASSAGE_PLAN_ID",',
    '    "SEQUENCE",',
    '    "POINT",',
    '    "LATITUDE",',
    '    "LONGITUDE",',
    '    "HEADING",',
    '    "DISTANCE",',
    '    "PASSAGE_PLAN_DETAIL_MVISSION_ID"',
    ")",
    "SELECT",
    '    inserted_plan."PASSAGE_PLAN_ID",',
    '    detail."SEQUENCE",',
    '    detail."POINT",',
    '    detail."LATITUDE",',
    '    detail."LONGITUDE",',
    '    detail."HEADING",',
    '    detail."DISTANCE",',
    '    detail."PASSAGE_PLAN_DETAIL_MVISSION_ID"',
    "FROM inserted_plan",
    "CROSS JOIN (",
    "    VALUES",
    `        ${detailValues}`,
    ') AS detail("SEQUENCE", "POINT", "LATITUDE", "LONGITUDE", "HEADING", "DISTANCE", "PASSAGE_PLAN_DETAIL_MVISSION_ID");',
    "",
    "COMMIT;",
  ].join("\n");
};

const selectAllSql = () => {
  sqlTextAreaRef.value?.focus();
  sqlTextAreaRef.value?.select();
};

const normalizePortCode = (value: string) => {
  return value.trim().toUpperCase();
};

const normalizeSqlText = (value: string) => {
  return value.trim();
};

const toSqlString = (value: string) => {
  return `'${value.replaceAll("'", "''")}'`;
};

const toSqlNumber = (value: number, precision: number) => {
  return Number(value).toFixed(precision);
};

const roundCoordinate = (value: number) => {
  return Number(value.toFixed(15));
};

const formatCoordinate = (value: number) => {
  return value.toFixed(15);
};

const createId = () => {
  if (crypto?.randomUUID) {
    return crypto.randomUUID();
  }

  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
};

const getDetailMvisionId = (sequence: number) => {
  if (passagePlanDetailMvisionIdStart.value <= 0) {
    return "-";
  }

  return passagePlanDetailMvisionIdStart.value + sequence - 1;
};

const calculateDistanceNm = (
  latitude1: number,
  longitude1: number,
  latitude2: number,
  longitude2: number,
) => {
  const earthRadiusNm = 3440.065;
  const lat1 = toRadians(latitude1);
  const lat2 = toRadians(latitude2);
  const deltaLatitude = toRadians(latitude2 - latitude1);
  const deltaLongitude = toRadians(longitude2 - longitude1);

  const a =
    Math.sin(deltaLatitude / 2) * Math.sin(deltaLatitude / 2) +
    Math.cos(lat1) *
      Math.cos(lat2) *
      Math.sin(deltaLongitude / 2) *
      Math.sin(deltaLongitude / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return earthRadiusNm * c;
};

const calculateBearing = (
  latitude1: number,
  longitude1: number,
  latitude2: number,
  longitude2: number,
) => {
  const lat1 = toRadians(latitude1);
  const lat2 = toRadians(latitude2);
  const deltaLongitude = toRadians(longitude2 - longitude1);

  const y = Math.sin(deltaLongitude) * Math.cos(lat2);
  const x =
    Math.cos(lat1) * Math.sin(lat2) -
    Math.sin(lat1) * Math.cos(lat2) * Math.cos(deltaLongitude);

  const bearing = toDegrees(Math.atan2(y, x));

  return (bearing + 360) % 360;
};

const toRadians = (value: number) => {
  return (value * Math.PI) / 180;
};

const toDegrees = (value: number) => {
  return (value * 180) / Math.PI;
};
</script>

<style scoped>
* {
  box-sizing: border-box;
}

.page {
  min-height: 100vh;
  padding: 24px;
  background: #f8fafc;
  color: #0f172a;
  font-family:
    Inter,
    ui-sans-serif,
    system-ui,
    -apple-system,
    BlinkMacSystemFont,
    "Segoe UI",
    sans-serif;
}

.header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 20px;
  padding: 20px;
  border: 1px solid #e2e8f0;
  border-radius: 20px;
  background: #ffffff;
  box-shadow: 0 1px 3px rgb(15 23 42 / 0.08);
}

.header h1,
.card h2,
.map-card h2,
.sql-card h2 {
  margin: 0;
  color: #0f172a;
}

.header h1 {
  font-size: 24px;
  line-height: 1.2;
}

.header p,
.card-title p,
.sql-header p {
  margin: 6px 0 0;
  color: #64748b;
  font-size: 14px;
}

.layout {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.map-card,
.card,
.sql-card {
  border: 1px solid #e2e8f0;
  border-radius: 20px;
  background: #ffffff;
  box-shadow: 0 1px 3px rgb(15 23 42 / 0.08);
}

.map-card {
  overflow: hidden;
}

.card-title,
.sql-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  padding: 18px 20px;
  border-bottom: 1px solid #e2e8f0;
}

.marker-count {
  flex-shrink: 0;
  border-radius: 999px;
  background: #eff6ff;
  padding: 6px 12px;
  color: #1d4ed8;
  font-size: 13px;
  font-weight: 700;
}

.map-wrapper {
  position: relative;
  height: 640px;
}

.bottom-panel {
  display: grid;
  grid-template-columns: minmax(0, 420px) minmax(0, 1fr);
  gap: 20px;
  align-items: start;
}

.card {
  padding: 20px;
}

.form-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: 14px;
  margin-top: 16px;
}

label {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

label span {
  color: #475569;
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.02em;
}

label b {
  color: #dc2626;
}

input {
  width: 100%;
  border: 1px solid #cbd5e1;
  border-radius: 12px;
  background: #ffffff;
  padding: 10px 12px;
  color: #0f172a;
  font-size: 14px;
  outline: none;
  color-scheme: light;
  transition:
    border-color 0.15s ease,
    box-shadow 0.15s ease;
}

input::placeholder {
  color: #94a3b8;
  opacity: 1;
}

input:focus {
  border-color: #2563eb;
  box-shadow: 0 0 0 3px rgb(37 99 235 / 0.12);
}

.readonly-input {
  border-color: #cbd5e1;
  background: #f1f5f9;
  color: #64748b;
  cursor: not-allowed;
}

.readonly-input::placeholder {
  color: #94a3b8;
}

.stats {
  display: grid;
  grid-template-columns: 1fr;
  gap: 8px;
  margin-top: 16px;
  border-radius: 14px;
  background: #f8fafc;
  padding: 12px;
}

.stats div {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  color: #64748b;
  font-size: 14px;
}

.stats strong {
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

.marker-list {
  display: flex;
  max-height: 460px;
  flex-direction: column;
  gap: 10px;
  margin-top: 16px;
  overflow: auto;
  padding-right: 4px;
}

.marker-item {
  display: grid;
  grid-template-columns: 36px minmax(0, 1fr) 32px;
  gap: 10px;
  align-items: flex-start;
  border: 1px solid #e2e8f0;
  border-radius: 14px;
  background: #f8fafc;
  padding: 12px;
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
  font-size: 14px;
  font-weight: 800;
}

.marker-info {
  display: flex;
  min-width: 0;
  flex-direction: column;
  gap: 4px;
  color: #475569;
  font-size: 12px;
}

.marker-info strong {
  color: #0f172a;
  font-size: 14px;
}

.marker-info code {
  color: #334155;
  font-family:
    ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono",
    monospace;
}

button {
  cursor: pointer;
  border: 0;
  font-family: inherit;
}

button:disabled {
  cursor: not-allowed;
  opacity: 0.5;
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

.primary-button:hover:not(:disabled) {
  background: #1d4ed8;
}

.secondary-button {
  border: 1px solid #cbd5e1;
  background: #ffffff;
  color: #334155;
}

.secondary-button:hover:not(:disabled) {
  background: #f8fafc;
}

.marker-remove-button {
  position: absolute;
  top: -26px;
  right: -26px;
  display: flex;
  height: 22px;
  width: 22px;
  align-items: center;
  justify-content: center;
  border-radius: 999px;
  background: #dc2626;
  color: #ffffff;
  font-size: 14px;
  font-weight: 900;
  line-height: 1;
  box-shadow: 0 6px 12px rgb(15 23 42 / 0.2);
}

.marker-remove-button:hover {
  background: #b91c1c;
}

.list-remove-button {
  display: flex;
  height: 28px;
  width: 28px;
  align-items: center;
  justify-content: center;
  border-radius: 999px;
  background: #fee2e2;
  color: #dc2626;
  font-size: 16px;
  font-weight: 900;
}

.list-remove-button:hover {
  background: #fecaca;
}

.sql-card {
  margin-top: 20px;
  padding-bottom: 20px;
}

.warning {
  margin: 16px 20px 0;
  border: 1px solid #fde68a;
  border-radius: 14px;
  background: #fffbeb;
  padding: 12px 14px;
  color: #92400e;
  font-size: 14px;
}

textarea {
  display: block;
  width: calc(100% - 40px);
  height: 340px;
  margin: 16px 20px 0;
  border: 1px solid #334155;
  border-radius: 16px;
  background: #020617;
  padding: 16px;
  color: #e2e8f0;
  font-family:
    ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono",
    monospace;
  font-size: 13px;
  line-height: 1.6;
  outline: none;
  resize: vertical;
  color-scheme: dark;
}

textarea:focus {
  border-color: #2563eb;
  box-shadow: 0 0 0 3px rgb(37 99 235 / 0.2);
}

@media (max-width: 1180px) {
  .bottom-panel {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 760px) {
  .page {
    padding: 14px;
  }

  .header,
  .card-title,
  .sql-header {
    flex-direction: column;
  }

  .map-wrapper {
    height: 480px;
  }
}
</style>
