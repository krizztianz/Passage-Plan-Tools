<template>
  <div class="app-shell">
    <header class="app-header">
      <div>
        <h1>Passage Plan Tools</h1>
        <p>
          Utility tools for creating and validating passage plan route data.
        </p>
      </div>

      <nav class="app-menu">
        <button
          type="button"
          :class="{ active: activePage === 'builder' }"
          @click="activePage = 'builder'"
        >
          Passage Plan Builder
        </button>

        <button
          type="button"
          :class="{ active: activePage === 'visualizer' }"
          @click="activePage = 'visualizer'"
        >
          Passage Plan Visualizer
        </button>
      </nav>
    </header>

    <PassagePlanBuilder v-if="activePage === 'builder'" />
    <PassagePlanVisualizer v-else />
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import PassagePlanBuilder from './components/PassagePlanBuilder.vue';
import PassagePlanVisualizer from './components/PassagePlanVisualizer.vue';

type ActivePage = 'builder' | 'visualizer';

const activePage = ref<ActivePage>('builder');
</script>

<style scoped>
.app-shell {
  min-height: 100vh;
  background: #f8fafc;
}

.app-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 20px;
  padding: 20px 24px;
  border-bottom: 1px solid #e2e8f0;
  background: #ffffff;
}

.app-header h1 {
  margin: 0;
  color: #0f172a;
  font-size: 24px;
  line-height: 1.2;
}

.app-header p {
  margin: 6px 0 0;
  color: #64748b;
  font-size: 14px;
}

.app-menu {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}

.app-menu button {
  cursor: pointer;
  border: 1px solid #cbd5e1;
  border-radius: 999px;
  background: #ffffff;
  padding: 10px 14px;
  color: #334155;
  font-size: 14px;
  font-weight: 700;
}

.app-menu button:hover {
  background: #f8fafc;
}

.app-menu button.active {
  border-color: #2563eb;
  background: #2563eb;
  color: #ffffff;
}

@media (max-width: 760px) {
  .app-header {
    flex-direction: column;
    padding: 16px;
  }
}
</style>
