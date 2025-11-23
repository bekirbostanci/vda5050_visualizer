import { createApp, h } from "vue";
import { createPinia } from "pinia";
import App from "./App.vue";
import { router } from "./router";
import "./assets/index.css";

// BalmUI
import "balm-ui/components/core.css";
import "balm-ui/components/icon-button/icon-button.css";
import "balm-ui/components/button/button.css";
import "balm-ui/components/icon/icon.css";
import "balm-ui/components/list/list.css";
import "balm-ui/components/icon/icon.css";
import "balm-ui/components/divider/divider.css";
import "balm-ui/components/icon-button/icon-button.css";
import "balm-ui/components/grid/grid.css";
import "balm-ui/components/chips/chips.css";
import "balm-ui/components/card/card.css";
import "balm-ui/components/select/select.css";
import "balm-ui/components/menu/menu.css";
import "balm-ui/components/textfield/textfield.css";
import "balm-ui/components/fab/fab.css";
import "./assets/main.scss";

import BalmUI from "balm-ui";

import VNetworkGraph from "v-network-graph";
import "v-network-graph/lib/style.css";

import { Buffer } from "buffer";
window.Buffer = Buffer;

const pinia = createPinia();

const app = createApp({
  setup() { },
  render: () => h(App),
});

app.use(pinia);
app.use(router);
app.use(BalmUI, {
  $theme: {},
});
app.use(VNetworkGraph);

app.mount("#app");
