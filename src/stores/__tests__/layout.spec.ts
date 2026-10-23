import { describe, it, expect, beforeEach } from "vitest";
import { setActivePinia, createPinia } from "pinia";
import { useLayoutStore } from "@/stores/layout";

describe("Layout Store", () => {
  beforeEach(() => {
    setActivePinia(createPinia());
  });

  it("initializes with default layout state", () => {
    const layout = useLayoutStore();

    expect(layout.showLeftSidebar).toBe(true);
    expect(layout.showRightSidebar).toBe(false);
    expect(layout.showJsonSidebar).toBe(false);
    expect(layout.showSidebarOffline).toBe(false);
    expect(layout.showHelp).toBe(false);
    expect(layout.jsonViewerData).toBeNull();
  });

  it("toggles and controls left sidebar", () => {
    const layout = useLayoutStore();

    layout.toggleLeftSidebar();
    expect(layout.showLeftSidebar).toBe(false);

    layout.openLeftSidebar();
    expect(layout.showLeftSidebar).toBe(true);

    layout.closeLeftSidebar();
    expect(layout.showLeftSidebar).toBe(false);
  });

  it("controls right sidebar and closes json viewer when closing right sidebar", () => {
    const layout = useLayoutStore();

    layout.openJsonSidebar("Test", () => ({ foo: "bar" }));
    expect(layout.showJsonSidebar).toBe(true);
    expect(layout.jsonViewerData?.title).toBe("Test");

    layout.openRightSidebar();
    expect(layout.showRightSidebar).toBe(true);
    // Opening right sidebar closes json viewer sidebar by design
    expect(layout.showJsonSidebar).toBe(false);

    // Re-open JSON viewer
    layout.openJsonSidebar("Test 2", () => ({ test: 123 }));
    expect(layout.showJsonSidebar).toBe(true);

    // Closing right sidebar should also close JSON viewer
    layout.closeRightSidebar();
    expect(layout.showRightSidebar).toBe(false);
    expect(layout.showJsonSidebar).toBe(false);
    expect(layout.jsonViewerData).toBeNull();
  });

  it("handles offline sidebar mutual exclusivity", () => {
    const layout = useLayoutStore();

    // Set initial state
    layout.openRightSidebar();
    layout.openJsonSidebar();
    expect(layout.showRightSidebar).toBe(true);
    expect(layout.showJsonSidebar).toBe(true);

    // Opening offline sidebar should ensure left is open and right/json are closed
    layout.openOfflineSidebar();
    expect(layout.showSidebarOffline).toBe(true);
    expect(layout.showLeftSidebar).toBe(true);
    expect(layout.showRightSidebar).toBe(false);
    expect(layout.showJsonSidebar).toBe(false);

    // Closing offline sidebar
    layout.closeOfflineSidebar();
    expect(layout.showSidebarOffline).toBe(false);
  });

  it("controls help page state", () => {
    const layout = useLayoutStore();

    expect(layout.showHelp).toBe(false);
    layout.toggleHelp();
    expect(layout.showHelp).toBe(true);
    layout.setHelp(false);
    expect(layout.showHelp).toBe(false);
  });
});
