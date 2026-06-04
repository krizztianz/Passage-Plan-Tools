import { createApp } from 'vue';
import App from './App.vue';

import OpenLayersMap from 'vue3-openlayers';

import './style.css';

createApp(App)
  .use(OpenLayersMap)
  .mount('#app');
