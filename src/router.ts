import { createRouter, createWebHistory } from "vue-router";

export const router = createRouter({
  history: createWebHistory("/"),
  routes: [
    {
      path: "/",
      name: "vda5050-visualizer",
      component: () =>
        import("./views/vda5050-visualizer/vda5050-visualizer.component.vue"),
    },
  ],
});
