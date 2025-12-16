import {
  AgvController,
  AgvId,
  ClientOptions,
  Headerless,
  MasterControlClient,
  Order,
  VirtualAgvAdapter,
  VirtualAgvAdapterOptions,
} from "vda-5050-lib";
import { ref, toRaw } from "vue";
import type { Ref } from "vue";

export const simulatorAgvs: Ref<VirtualAgvAdapter[]> = ref([]);

export async function createSimulatorAgv(
  serial: string,
  mapId: string,
  x: number,
  y: number,
  agvClientOptions: ClientOptions,
  theta = 0
): Promise<VirtualAgvAdapter> {
  // The target AGV
  const agvId: AgvId = { manufacturer: "rikeb", serialNumber: serial };

  // Specify associated adapter type
  const agvControllerOptions = {
    agvAdapterType: VirtualAgvAdapter,
    publishVisualizationInterval: 100, // Update position 10x per second for smooth movement
    publishStateInterval: 1000,
  };

  // Virtual AGV adapter options
  const agvAdapterOptions: VirtualAgvAdapterOptions = {
    vehicleSpeed: 0.75,
    timeLapse: 1,
    tickRate: 20,
    agvNormalDeviationThetaTolerance: 10,
    agvNormalDeviationXyTolerance: 10,
    initialPosition: {
      mapId: mapId,
      x: x,
      y: y,
      theta: theta,
      lastNodeId: "0",
    },
  };

  // Create instance of AGV Controller
  const agvController = new AgvController(
    agvId,
    agvClientOptions,
    agvControllerOptions,
    agvAdapterOptions
  );

  // Start client interaction
  await agvController.start();

  const adapter: VirtualAgvAdapter = new VirtualAgvAdapter(
    agvController,
    agvAdapterOptions,
    agvController.debug
  );

  simulatorAgvs.value.push(adapter);
  return adapter;
}

export async function createRandomVdaOrder(
  virtualAgvAdapter: VirtualAgvAdapter
): Promise<void> {
  const initialPosition = toRaw(
    virtualAgvAdapter.controller.currentState.agvPosition
  );
  if (!initialPosition) {
    return;
  }

  const route = generateManhattanRoute(
    { x: initialPosition.x, y: initialPosition.y },
    {
      x: Math.floor(Math.random() * 20 - 10),
      y: Math.round(Math.random() * 20 - 10),
    }
  );

  if (route.length < 3) {
    return createRandomVdaOrder(virtualAgvAdapter);
  }

  const order: Headerless<Order> = {
    orderId: Math.random().toString(),
    orderUpdateId: 0,
    nodes: route.map(({ x, y }, i) => ({
      nodeId: (i + 1).toString(),
      sequenceId: i * 2,
      released: true,
      actions: [],
      nodePosition: {
        x,
        y,
        mapId: initialPosition.mapId,
      },
    })),
    edges: route.slice(1).map((_, i) => ({
      edgeId: (i + 1).toString(),
      released: true,
      actions: [],
      startNodeId: (i + 1).toString(),
      endNodeId: (i + 2).toString(),
      sequenceId: i * 2 + 1,
    })),
  };

  const mcClient = new MasterControlClient(
    virtualAgvAdapter.controller.clientOptions
  );
  await mcClient.start();
  await mcClient.publish("order", virtualAgvAdapter.controller.agvId, order);
  await mcClient.stop();
}

export function pauseSimulatorAgv(serialNumber: string): void {
  const agv = simulatorAgvs.value.find(
    (a) => a.controller.agvId.serialNumber === serialNumber
  );
  if (agv) {
    agv.controller.stop();
  }
}

export function resumeSimulatorAgv(serialNumber: string): void {
  const agv = simulatorAgvs.value.find(
    (a) => a.controller.agvId.serialNumber === serialNumber
  );
  if (agv) {
    agv.controller.start();
  }
}

export function removeSimulatorAgv(serialNumber: string): void {
  const index = simulatorAgvs.value.findIndex(
    (a) => a.controller.agvId.serialNumber === serialNumber
  );
  if (index !== -1) {
    const agv = simulatorAgvs.value[index];
    agv.controller.stop();
    simulatorAgvs.value.splice(index, 1);
  }
}

export function clearAllSimulatorAgvs(): void {
  simulatorAgvs.value.forEach((agv) => {
    agv.controller.stop();
  });
  simulatorAgvs.value = [];
}

type Point = { x: number; y: number };

type Direction = "north" | "south" | "east" | "west";

function generateManhattanRoute(start: Point, end: Point): Point[] {
  const route: Point[] = [];
  const current: Point = { ...start };

  // While not at the destination, move towards the end point
  while (current.x !== end.x || current.y !== end.y) {
    const possibleMoves: Direction[] = [];

    // Add valid moves towards the destination
    if (current.x < end.x) possibleMoves.push("east");
    if (current.x > end.x) possibleMoves.push("west");
    if (current.y < end.y) possibleMoves.push("north");
    if (current.y > end.y) possibleMoves.push("south");

    // Choose a random valid move
    const randomMove =
      possibleMoves[Math.floor(Math.random() * possibleMoves.length)];

    // Update current position based on the chosen move
    switch (randomMove) {
      case "east":
        current.x += 1;
        break;
      case "west":
        current.x -= 1;
        break;
      case "north":
        current.y += 1;
        break;
      case "south":
        current.y -= 1;
        break;
    }

    // Add the new position to the route
    route.push({ ...current });
  }

  return route;
}
