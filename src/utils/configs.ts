import { defineConfigs } from "v-network-graph";
const configs = defineConfigs({
  node: {
    draggable: false,
    zOrder: {
      enabled: true,
      zIndex: (node) => node.zIndex,
    },
    normal: {
      type: "circle",
      radius: 15,
      color: (node) => node.color,
    },
    hover: {
      color: "black",
    },
    label: {
      directionAutoAdjustment: true,
      visible: true,
      fontSize: 15,
    },
  },
  edge: {
    gap: 12,
    normal: {
      width: 3,
      color: (edge) => edge.color,
      dasharray: "20 16",
      animate: false,
      animationSpeed: -20,
    },
    label: {
      fontSize: 15,
    },
    selfLoop: {
      radius: 25,
    },
    hover: {
      color: "black",
    },
    marker: {
      source: {
        type: "angle",
        width: 4,
        height: 4,
        margin: -1,
        offset: 0,
        units: "strokeWidth",
        color: null,
      },
    },
  },
  view: {
    maxZoomLevel: 200,
    grid: {
      visible: true,
      interval: 2,
      thickIncrements: 2,
      line: {
        color: "#e0e0e0",
        width: 1,
        dasharray: 1,
      },
    },
  },
});

export default configs;
