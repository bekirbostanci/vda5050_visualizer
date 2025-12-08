import { defineConfigs } from "v-network-graph";
import type { Configs } from "v-network-graph";

/**
 * Converts a hex color to RGB
 */
function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16),
      }
    : null;
}

/**
 * Calculates the luminance of a color (0-1)
 */
function getLuminance(hex: string): number {
  const rgb = hexToRgb(hex);
  if (!rgb) return 0.5;

  const [r, g, b] = [rgb.r, rgb.g, rgb.b].map((val) => {
    val = val / 255;
    return val <= 0.03928 ? val / 12.92 : Math.pow((val + 0.055) / 1.055, 2.4);
  });

  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/**
 * Adjusts a color to ensure visibility in dark mode
 * If the color is too light (high luminance), makes it darker
 */
function adjustColorForDarkMode(color: string): string {
  // Handle common color values
  if (
    color === "#000" ||
    color === "#000000" ||
    color.toLowerCase() === "black"
  ) {
    return "#ffffff"; // White for dark mode
  }
  if (
    color === "#fff" ||
    color === "#ffffff" ||
    color.toLowerCase() === "white"
  ) {
    return "#e5e7eb"; // Light gray for dark mode
  }

  const luminance = getLuminance(color);
  // If luminance is too high (light color), darken it
  if (luminance > 0.7) {
    const rgb = hexToRgb(color);
    if (rgb) {
      // Darken by reducing RGB values
      const factor = 0.5; // Darken to 50% brightness
      const r = Math.round(rgb.r * factor);
      const g = Math.round(rgb.g * factor);
      const b = Math.round(rgb.b * factor);
      return `#${[r, g, b]
        .map((x) => x.toString(16).padStart(2, "0"))
        .join("")}`;
    }
  }
  return color;
}

/**
 * Creates network graph configs with dark mode support
 * @param isDark - Whether dark mode is enabled
 * @param showGrid - Whether to show the grid
 * @returns Network graph configuration
 */
export function createConfigs(
  isDark: boolean = false,
  showGrid: boolean = true
): Configs {
  return defineConfigs({
    node: {
      draggable: false,
      zOrder: {
        enabled: true,
        zIndex: (node) => node.zIndex,
      },
      normal: {
        type: "circle",
        radius: 15,
        color: (node) => {
          // Adjust color for dark mode visibility
          return isDark ? adjustColorForDarkMode(node.color) : node.color;
        },
      },
      hover: {
        color: isDark ? "#ffffff" : "#000000",
      },
      label: {
        directionAutoAdjustment: true,
        visible: true,
        fontSize: 15,
        color: isDark ? "#e5e7eb" : "#1f2937",
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
        color: isDark ? "#e5e7eb" : "#1f2937",
      },
      selfLoop: {
        radius: 25,
      },
      hover: {
        color: isDark ? "#ffffff" : "#000000",
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
        visible: showGrid,
        interval: 2,
        thickIncrements: 5,
        line: {
          color: isDark ? "#374151" : "#e0e0e0",
          width: 1,
          dasharray: 1,
        },
      },
    },
  });
}

// Default export for backward compatibility (light mode)
const configs = createConfigs(false);
export default configs;
