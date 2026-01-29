/**
 * Generates a Manhattan (grid) route from start to end by moving one unit
 * at a time along x or y, choosing randomly among valid moves.
 * Used for random VDA5050 order generation (simulator and order publisher).
 */

export interface Point {
  x: number;
  y: number;
}

type Direction = "north" | "south" | "east" | "west";

export function generateManhattanRoute(start: Point, end: Point): Point[] {
  const route: Point[] = [];
  const current: Point = { ...start };

  while (current.x !== end.x || current.y !== end.y) {
    const possibleMoves: Direction[] = [];
    if (current.x < end.x) possibleMoves.push("east");
    if (current.x > end.x) possibleMoves.push("west");
    if (current.y < end.y) possibleMoves.push("north");
    if (current.y > end.y) possibleMoves.push("south");

    const randomMove =
      possibleMoves[Math.floor(Math.random() * possibleMoves.length)];
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
    route.push({ ...current });
  }

  return route;
}
