import { createApp, h } from "vue";
import { createPinia } from "pinia";
import App from "./App.vue";
import "./assets/index.css";
import "./assets/main.scss";

import VNetworkGraph from "v-network-graph";
import "v-network-graph/lib/style.css";

import { Buffer } from "buffer";
window.Buffer = Buffer;

const pinia = createPinia();

const app = createApp({
  setup() {},
  render: () => h(App),
});

app.use(pinia);
app.use(VNetworkGraph);

app.mount("#app");
