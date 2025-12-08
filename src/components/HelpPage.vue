<script setup lang="ts">
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Icon } from "@iconify/vue";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";

const emit = defineEmits<{
  close: [];
}>();

const sections = [
  {
    id: "getting-started",
    title: "Getting Started",
    icon: "ph:rocket-launch",
  },
  {
    id: "interface",
    title: "Interface Overview",
    icon: "ph:layout",
  },
  {
    id: "agv-cards",
    title: "Understanding AGV Cards",
    icon: "ph:cardholder",
  },
  {
    id: "network-graph",
    title: "Network Graph",
    icon: "ph:graph",
  },
  {
    id: "features",
    title: "Features & Settings",
    icon: "ph:gear",
  },
  {
    id: "troubleshooting",
    title: "Troubleshooting",
    icon: "ph:question",
  },
];

const scrollToSection = (id: string) => {
  const element = document.getElementById(id);
  if (element) {
    element.scrollIntoView({ behavior: "smooth", block: "start" });
  }
};
</script>

<template>
  <div class="h-full overflow-y-auto bg-background help-page-scroll">
    <div class="container mx-auto px-4 py-8 max-w-4xl">
      <!-- Header -->
      <div class="mb-8 flex items-center justify-between">
        <div>
          <h1 class="text-4xl font-bold mb-2">VDA5050 Visualizer Help</h1>
          <p class="text-muted-foreground text-lg">
            Learn how to use the VDA5050 Visualizer to monitor and visualize
            your AGV fleet
          </p>
        </div>
        <Button
          variant="outline"
          @click="emit('close')"
          class="flex items-center gap-2"
        >
          <Icon icon="ph:x" class="h-4 w-4" />
          Close Help
        </Button>
      </div>

      <!-- Table of Contents -->
      <Card class="mb-8">
        <CardHeader>
          <CardTitle class="flex items-center gap-2">
            <Icon icon="ph:list" class="h-5 w-5" />
            Table of Contents
          </CardTitle>
        </CardHeader>
        <CardContent>
          <nav class="grid grid-cols-1 md:grid-cols-2 gap-2">
            <button
              v-for="section in sections"
              :key="section.id"
              @click="scrollToSection(section.id)"
              class="flex items-center gap-2 text-left w-full p-2 rounded-md hover:bg-accent transition-colors"
            >
              <Icon :icon="section.icon" class="h-4 w-4" />
              <span>{{ section.title }}</span>
            </button>
          </nav>
        </CardContent>
      </Card>

      <!-- Getting Started Section -->
      <section id="getting-started" class="mb-8 scroll-mt-4">
        <Card>
          <CardHeader>
            <CardTitle class="flex items-center gap-2">
              <Icon icon="ph:rocket-launch" class="h-5 w-5" />
              Getting Started
            </CardTitle>
            <CardDescription>
              Connect to your MQTT broker and start monitoring AGVs
            </CardDescription>
          </CardHeader>
          <CardContent class="space-y-4">
            <div>
              <h3 class="font-semibold mb-2 flex items-center gap-2">
                <Icon icon="ph:plug" class="h-4 w-4" />
                Step 1: Configure MQTT Connection
              </h3>
              <ol class="list-decimal list-inside space-y-2 ml-4">
                <li>
                  Click the <strong>"Connect"</strong> button in the top menu
                  bar
                </li>
                <li>
                  Fill in your MQTT broker details:
                  <ul class="list-disc list-inside ml-6 mt-1 space-y-1">
                    <li>
                      <strong>Broker IP/Host:</strong> Your MQTT broker address
                      (e.g.,
                      <code class="bg-muted px-1 rounded">localhost</code> or
                      <code class="bg-muted px-1 rounded">192.168.1.100</code>)
                    </li>
                    <li>
                      <strong>Port:</strong> WebSocket port (typically
                      <code class="bg-muted px-1 rounded">9001</code> for
                      WebSocket connections)
                    </li>
                    <li>
                      <strong>Interface Name:</strong> Optional VDA5050
                      interface name (e.g.,
                      <code class="bg-muted px-1 rounded">vda5050</code>). Leave
                      empty to subscribe to all interfaces.
                    </li>
                    <li>
                      <strong>Basepath:</strong> Optional MQTT basepath (leave
                      empty if not needed)
                    </li>
                    <li>
                      <strong>Username/Password:</strong> Optional
                      authentication credentials
                    </li>
                  </ul>
                </li>
                <li>
                  Select connection type:
                  <ul class="list-disc list-inside ml-6 mt-1 space-y-1">
                    <li>
                      <strong>WebSocket:</strong> For web browser connections
                    </li>
                    <li>
                      <strong>MQTT (Electron only):</strong> For desktop
                      application connections
                    </li>
                  </ul>
                </li>
                <li>
                  Click <strong>"Connect"</strong> to establish the connection
                </li>
              </ol>
            </div>

            <Separator />

            <div>
              <h3 class="font-semibold mb-2 flex items-center gap-2">
                <Icon icon="ph:info" class="h-4 w-4" />
                MQTT Broker Configuration
              </h3>
              <p class="mb-2">
                Modern web browsers cannot access the MQTT protocol directly.
                You need to enable WebSocket support in your MQTT broker.
              </p>
              <p class="mb-2">
                For Mosquitto, add the following to
                <code class="bg-muted px-1 rounded"
                  >/etc/mosquitto/mosquitto.conf</code
                >:
              </p>
              <pre
                class="bg-muted p-4 rounded-md overflow-x-auto text-sm"
              ><code>per_listener_settings true
listener 1883
allow_anonymous true

listener 14520
protocol websockets
allow_anonymous true</code></pre>
            </div>

            <Separator />

            <div>
              <h3 class="font-semibold mb-2 flex items-center gap-2">
                <Icon icon="ph:check-circle" class="h-4 w-4" />
                Step 2: Monitor Your AGVs
              </h3>
              <p>
                Once connected, AGVs will automatically appear in the left
                sidebar as they connect to the MQTT broker. The network graph in
                the center will display all AGVs and their paths in real-time.
              </p>
            </div>
          </CardContent>
        </Card>
      </section>

      <!-- Interface Overview Section -->
      <section id="interface" class="mb-8 scroll-mt-4">
        <Card>
          <CardHeader>
            <CardTitle class="flex items-center gap-2">
              <Icon icon="ph:layout" class="h-5 w-5" />
              Interface Overview
            </CardTitle>
            <CardDescription>
              Understanding the dashboard layout and components
            </CardDescription>
          </CardHeader>
          <CardContent class="space-y-4">
            <div>
              <h3 class="font-semibold mb-2">Main Components</h3>
              <div class="space-y-3">
                <div class="flex items-start gap-3">
                  <Icon
                    icon="ph:sidebar-simple"
                    class="h-5 w-5 mt-0.5 text-primary"
                  />
                  <div>
                    <strong>Left Sidebar (AGV List)</strong>
                    <p class="text-sm text-muted-foreground">
                      Displays all connected AGVs as cards. Click on any AGV
                      card to select it and view detailed information.
                    </p>
                  </div>
                </div>
                <div class="flex items-start gap-3">
                  <Icon icon="ph:graph" class="h-5 w-5 mt-0.5 text-primary" />
                  <div>
                    <strong>Center Panel (Network Graph)</strong>
                    <p class="text-sm text-muted-foreground">
                      Interactive visualization showing AGV positions, paths,
                      nodes, and edges. You can zoom, pan, and interact with the
                      graph.
                    </p>
                  </div>
                </div>
                <div class="flex items-start gap-3">
                  <Icon
                    icon="ph:sidebar-simple"
                    class="h-5 w-5 mt-0.5 text-primary rotate-y-180"
                  />
                  <div>
                    <strong>Right Sidebar (AGV Details)</strong>
                    <p class="text-sm text-muted-foreground">
                      Shows detailed information about the selected AGV,
                      including raw JSON data, order information, and instant
                      actions.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <Separator />

            <div>
              <h3 class="font-semibold mb-2">Top Bar Controls</h3>
              <div class="space-y-2">
                <div class="flex items-center gap-2">
                  <Badge variant="outline">Connect</Badge>
                  <span class="text-sm"
                    >Opens the MQTT connection settings dialog</span
                  >
                </div>
                <div class="flex items-center gap-2">
                  <Badge variant="outline">View</Badge>
                  <span class="text-sm"
                    >Access view settings (e.g., Show Grid toggle)</span
                  >
                </div>
                <div class="flex items-center gap-2">
                  <Badge variant="outline">Help</Badge>
                  <span class="text-sm">Opens this help page</span>
                </div>
                <div class="flex items-center gap-2">
                  <Icon icon="radix-icons:sun" class="h-4 w-4" />
                  <span class="text-sm">Theme toggle (Light/Dark/System)</span>
                </div>
                <div class="flex items-center gap-2">
                  <Icon icon="ph:sidebar-simple" class="h-4 w-4" />
                  <span class="text-sm"
                    >Toggle left/right sidebars visibility</span
                  >
                </div>
                <div class="flex items-center gap-2">
                  <Icon icon="ph:layout" class="h-4 w-4" />
                  <span class="text-sm"
                    >Switch between Dashboard and Visualizer views</span
                  >
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </section>

      <!-- AGV Cards Section -->
      <section id="agv-cards" class="mb-8 scroll-mt-4">
        <Card>
          <CardHeader>
            <CardTitle class="flex items-center gap-2">
              <Icon icon="ph:cardholder" class="h-5 w-5" />
              Understanding AGV Cards
            </CardTitle>
            <CardDescription>
              What information is displayed on each AGV card
            </CardDescription>
          </CardHeader>
          <CardContent class="space-y-4">
            <div>
              <h3 class="font-semibold mb-2">Card Header</h3>
              <ul class="list-disc list-inside space-y-1 ml-4">
                <li>
                  <strong>AGV Identifier:</strong> Manufacturer and Serial
                  Number (e.g.,
                  <code class="bg-muted px-1 rounded"
                    >Manufacturer / SerialNumber</code
                  >)
                </li>
                <li>
                  <strong>Connection Status Badge:</strong>
                  <div class="flex gap-2 mt-2 mb-2">
                    <Badge class="bg-green-500">ONLINE</Badge>
                    <Badge class="bg-red-500">OFFLINE</Badge>
                    <Badge class="bg-orange-500">CONNECTIONBROKEN</Badge>
                  </div>
                </li>
              </ul>
            </div>

            <Separator />

            <div>
              <h3 class="font-semibold mb-2">Information Badges</h3>
              <div class="space-y-2">
                <div class="flex items-center gap-2">
                  <Icon icon="material-symbols:gps-fixed" class="h-4 w-4" />
                  <span
                    ><strong>Position:</strong> Current x, y coordinates and
                    orientation (θ)</span
                  >
                </div>
                <div class="flex items-center gap-2">
                  <Icon icon="material-symbols:speed" class="h-4 w-4" />
                  <span
                    ><strong>Velocity:</strong> Linear velocity (vx, vy)
                    components</span
                  >
                </div>
                <div class="flex items-center gap-2">
                  <Icon icon="material-symbols:auto-mode" class="h-4 w-4" />
                  <span
                    ><strong>Operating Mode:</strong> Current AGV operating
                    mode</span
                  >
                </div>
                <div class="flex items-center gap-2">
                  <Icon icon="material-symbols:map" class="h-4 w-4" />
                  <span><strong>Map ID:</strong> Current map identifier</span>
                </div>
                <div class="flex items-center gap-2">
                  <Icon icon="material-symbols:view-in-ar" class="h-4 w-4" />
                  <span><strong>Loads:</strong> Number of active loads</span>
                </div>
                <div class="flex items-center gap-2">
                  <Icon
                    icon="material-symbols:pending-actions"
                    class="h-4 w-4"
                  />
                  <span
                    ><strong>Actions:</strong> Number of pending actions</span
                  >
                </div>
                <div class="flex items-center gap-2">
                  <Icon
                    icon="material-symbols:error"
                    class="h-4 w-4 text-red-500"
                  />
                  <span
                    ><strong>Errors:</strong> Error count (fatal errors shown in
                    red, warnings in yellow)</span
                  >
                </div>
              </div>
            </div>

            <Separator />

            <div>
              <h3 class="font-semibold mb-2">Expandable Sections</h3>
              <div class="space-y-2">
                <div>
                  <strong>Order Information</strong>
                  <p class="text-sm text-muted-foreground">
                    Click to expand and view order details including Order ID,
                    Update ID, Header ID, and timestamp.
                  </p>
                </div>
                <div>
                  <strong>Instant Actions</strong>
                  <p class="text-sm text-muted-foreground">
                    Click to expand and view instant action information
                    including Action ID and count.
                  </p>
                </div>
              </div>
            </div>

            <Separator />

            <div>
              <h3 class="font-semibold mb-2">Progress Bar</h3>
              <p class="text-sm text-muted-foreground">
                Shows the completion progress of the current order sequence
                (current node / total nodes) as a percentage.
              </p>
            </div>
          </CardContent>
        </Card>
      </section>

      <!-- Network Graph Section -->
      <section id="network-graph" class="mb-8 scroll-mt-4">
        <Card>
          <CardHeader>
            <CardTitle class="flex items-center gap-2">
              <Icon icon="ph:graph" class="h-5 w-5" />
              Network Graph
            </CardTitle>
            <CardDescription>
              How to interact with the visualization
            </CardDescription>
          </CardHeader>
          <CardContent class="space-y-4">
            <div>
              <h3 class="font-semibold mb-2">Graph Elements</h3>
              <ul class="list-disc list-inside space-y-2 ml-4">
                <li>
                  <strong>Nodes:</strong> Represent waypoints or positions in
                  the AGV's path
                </li>
                <li><strong>Edges:</strong> Represent paths between nodes</li>
                <li>
                  <strong>AGV Icons:</strong> Show current positions of all AGVs
                </li>
                <li>
                  <strong>Colors:</strong> Different colors indicate different
                  states or action types
                </li>
              </ul>
            </div>

            <Separator />

            <div>
              <h3 class="font-semibold mb-2">Interactions</h3>
              <ul class="list-disc list-inside space-y-2 ml-4">
                <li>
                  <strong>Zoom:</strong> Use mouse wheel or pinch gesture to
                  zoom in/out
                </li>
                <li>
                  <strong>Pan:</strong> Click and drag to move around the graph
                </li>
                <li>
                  <strong>Select AGV:</strong> Click on an AGV icon or card to
                  select it and view details
                </li>
                <li>
                  <strong>Hover:</strong> Hover over nodes and edges to see
                  additional information
                </li>
              </ul>
            </div>

            <Separator />

            <div>
              <h3 class="font-semibold mb-2">Real-time Updates</h3>
              <p class="text-sm text-muted-foreground">
                The graph updates in real-time as AGVs move and receive new
                orders. Positions, paths, and states are automatically
                synchronized with MQTT messages.
              </p>
            </div>
          </CardContent>
        </Card>
      </section>

      <!-- Features Section -->
      <section id="features" class="mb-8 scroll-mt-4">
        <Card>
          <CardHeader>
            <CardTitle class="flex items-center gap-2">
              <Icon icon="ph:gear" class="h-5 w-5" />
              Features & Settings
            </CardTitle>
            <CardDescription>
              Available features and customization options
            </CardDescription>
          </CardHeader>
          <CardContent class="space-y-4">
            <div>
              <h3 class="font-semibold mb-2">Theme Settings</h3>
              <p class="mb-2">Switch between light and dark themes:</p>
              <ul class="list-disc list-inside space-y-1 ml-4">
                <li>Click the sun/moon icon in the top bar</li>
                <li>
                  Choose from Light, Dark, or System (follows OS preference)
                </li>
              </ul>
            </div>

            <Separator />

            <div>
              <h3 class="font-semibold mb-2">Grid Display</h3>
              <p class="mb-2">Toggle grid overlay on the network graph:</p>
              <ul class="list-disc list-inside space-y-1 ml-4">
                <li>Go to <strong>View</strong> menu in the top bar</li>
                <li>Toggle <strong>"Show Grid"</strong> checkbox</li>
              </ul>
            </div>

            <Separator />

            <div>
              <h3 class="font-semibold mb-2">Sidebar Management</h3>
              <p class="mb-2">Show or hide sidebars:</p>
              <ul class="list-disc list-inside space-y-1 ml-4">
                <li>
                  Click the sidebar icons in the top bar to toggle visibility
                </li>
                <li>Resize sidebars by dragging the divider between panels</li>
                <li>
                  Right sidebar automatically opens when an AGV is selected
                </li>
              </ul>
            </div>

            <Separator />

            <div>
              <h3 class="font-semibold mb-2">View Modes</h3>
              <p class="mb-2">Switch between different views:</p>
              <ul class="list-disc list-inside space-y-1 ml-4">
                <li>
                  <strong>Dashboard:</strong> Main view with network graph and
                  sidebars
                </li>
                <li>
                  <strong>Visualizer:</strong> Alternative visualization view
                </li>
              </ul>
            </div>

            <Separator />

            <div>
              <h3 class="font-semibold mb-2">AGV Details Sidebar</h3>
              <p class="mb-2">
                When an AGV is selected, the right sidebar shows:
              </p>
              <ul class="list-disc list-inside space-y-1 ml-4">
                <li>Complete JSON data structure</li>
                <li>Order information (nodes, edges, IDs)</li>
                <li>Instant actions details</li>
                <li>Connection and state information</li>
              </ul>
            </div>
          </CardContent>
        </Card>
      </section>

      <!-- Troubleshooting Section -->
      <section id="troubleshooting" class="mb-8 scroll-mt-4">
        <Card>
          <CardHeader>
            <CardTitle class="flex items-center gap-2">
              <Icon icon="ph:question" class="h-5 w-5" />
              Troubleshooting
            </CardTitle>
            <CardDescription> Common issues and solutions </CardDescription>
          </CardHeader>
          <CardContent class="space-y-4">
            <div>
              <h3 class="font-semibold mb-2">Connection Issues</h3>
              <div class="space-y-3">
                <div>
                  <strong>Cannot connect to MQTT broker</strong>
                  <ul
                    class="list-disc list-inside space-y-1 ml-4 mt-1 text-sm text-muted-foreground"
                  >
                    <li>Verify broker IP address and port are correct</li>
                    <li>Ensure WebSocket is enabled on your MQTT broker</li>
                    <li>Check firewall settings and network connectivity</li>
                    <li>
                      Verify username/password if authentication is required
                    </li>
                  </ul>
                </div>
                <div>
                  <strong>Connection drops frequently</strong>
                  <ul
                    class="list-disc list-inside space-y-1 ml-4 mt-1 text-sm text-muted-foreground"
                  >
                    <li>Check network stability</li>
                    <li>Verify broker is not overloaded</li>
                    <li>Check broker logs for errors</li>
                  </ul>
                </div>
              </div>
            </div>

            <Separator />

            <div>
              <h3 class="font-semibold mb-2">AGV Not Appearing</h3>
              <ul class="list-disc list-inside space-y-1 ml-4">
                <li>
                  Verify the AGV is publishing messages to the correct MQTT
                  topics
                </li>
                <li>
                  Check that the Interface Name matches your configuration
                </li>
                <li>Ensure the AGV is connected to the same MQTT broker</li>
                <li>Check browser console for error messages</li>
              </ul>
            </div>

            <Separator />

            <div>
              <h3 class="font-semibold mb-2">Graph Not Updating</h3>
              <ul class="list-disc list-inside space-y-1 ml-4">
                <li>
                  Verify MQTT connection is active (check connection status)
                </li>
                <li>Check that AGVs are sending state updates</li>
                <li>Refresh the page if updates stop</li>
                <li>Check browser console for JavaScript errors</li>
              </ul>
            </div>

            <Separator />

            <div>
              <h3 class="font-semibold mb-2">Performance Issues</h3>
              <ul class="list-disc list-inside space-y-1 ml-4">
                <li>Reduce the number of visible AGVs if possible</li>
                <li>Close unnecessary browser tabs</li>
                <li>Disable browser extensions that might interfere</li>
                <li>Check browser memory usage</li>
              </ul>
            </div>

            <Separator />

            <div>
              <h3 class="font-semibold mb-2">Getting More Help</h3>
              <p class="mb-2">If you continue to experience issues:</p>
              <ul class="list-disc list-inside space-y-1 ml-4">
                <li>
                  Check the
                  <a
                    href="https://github.com/bekirbostanci/vda5050_visualizer"
                    target="_blank"
                    class="text-primary hover:underline"
                    >GitHub repository</a
                  >
                  for documentation and issues
                </li>
                <li>Review browser console for error messages</li>
                <li>Verify your MQTT broker configuration</li>
                <li>
                  Ensure you're using a compatible browser (Chrome, Firefox,
                  Edge, Safari)
                </li>
              </ul>
            </div>
          </CardContent>
        </Card>
      </section>

      <!-- Footer -->
      <div class="text-center text-muted-foreground text-sm mb-8">
        <p>VDA5050 Visualizer - Version 2.1.0</p>
        <p class="mt-2">
          <a
            href="https://github.com/bekirbostanci/vda5050_visualizer"
            target="_blank"
            class="text-primary hover:underline"
          >
            View on GitHub
          </a>
        </p>
      </div>
    </div>
  </div>
</template>

<style scoped>
code {
  font-family: "Courier New", monospace;
}

pre {
  font-family: "Courier New", monospace;
}

/* Scrollbar styling */
.help-page-scroll {
  scrollbar-width: thin;
  scrollbar-color: hsl(var(--muted-foreground) / 0.3) transparent;
}

.help-page-scroll::-webkit-scrollbar {
  width: 8px;
}

.help-page-scroll::-webkit-scrollbar-track {
  background: transparent;
}

.help-page-scroll::-webkit-scrollbar-thumb {
  background-color: hsl(var(--muted-foreground) / 0.3);
  border-radius: 4px;
}

.help-page-scroll::-webkit-scrollbar-thumb:hover {
  background-color: hsl(var(--muted-foreground) / 0.5);
}

/* Dark mode specific scrollbar */
:global(.dark) .help-page-scroll {
  scrollbar-color: hsl(var(--muted-foreground) / 0.4) transparent;
}

:global(.dark) .help-page-scroll::-webkit-scrollbar-thumb {
  background-color: hsl(var(--muted-foreground) / 0.4);
}

:global(.dark) .help-page-scroll::-webkit-scrollbar-thumb:hover {
  background-color: hsl(var(--muted-foreground) / 0.6);
}
</style>
