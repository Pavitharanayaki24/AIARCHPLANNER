export interface Point {
  x: number;
  y: number;
}

export interface Line {
  a: Point;
  b: Point;
}

type Direction = "h" | "v" | null;

export interface Rect {
  left: number;
  top: number;
  width: number;
  height: number;
}

export interface ConnectorPoint {
  shape: Rect;
  side: "top" | "bottom" | "left" | "right";
  distance: number; // 0..1 along side
}

export class Rectangle {
  constructor(
    readonly left: number,
    readonly top: number,
    readonly width: number,
    readonly height: number
  ) {}

  get right() {
    return this.left + this.width;
  }
  get bottom() {
    return this.top + this.height;
  }
  contains(p: Point) {
    return (
      p.x >= this.left &&
      p.x <= this.right &&
      p.y >= this.top &&
      p.y <= this.bottom
    );
  }
  inflate(h: number, v: number) {
    return new Rectangle(
      this.left - h,
      this.top - v,
      this.width + 2 * h,
      this.height + 2 * v
    );
  }
  intersects(r: Rectangle) {
    return (
      r.left < this.right &&
      this.left < r.right &&
      r.top < this.bottom &&
      this.top < r.bottom
    );
  }
  static fromRect(r: Rect) {
    return new Rectangle(r.left, r.top, r.width, r.height);
  }
  static fromLTRB(left: number, top: number, right: number, bottom: number) {
    return new Rectangle(left, top, right - left, bottom - top);
  }
  get center(): Point {
    return { x: this.left + this.width / 2, y: this.top + this.height / 2 };
  }
  get northWest() {
    return { x: this.left, y: this.top };
  }
  get northEast() {
    return { x: this.right, y: this.top };
  }
  get southWest() {
    return { x: this.left, y: this.bottom };
  }
  get southEast() {
    return { x: this.right, y: this.bottom };
  }
  get north() {
    return { x: this.center.x, y: this.top };
  }
  get south() {
    return { x: this.center.x, y: this.bottom };
  }
  get west() {
    return { x: this.left, y: this.center.y };
  }
  get east() {
    return { x: this.right, y: this.center.y };
  }
}

export function distance(a: Point, b: Point): number {
  return Math.sqrt(Math.pow(b.x - a.x, 2) + Math.pow(b.y - a.y, 2));
}

export function makePt(x: number, y: number): Point {
  return { x, y };
}

// Compute the actual point of a connector (source or target) on the node shape side with distance along side
export function computePt(p: ConnectorPoint): Point {
  const b = Rectangle.fromRect(p.shape);
  switch (p.side) {
    case "bottom":
      return makePt(b.left + b.width * p.distance, b.bottom);
    case "top":
      return makePt(b.left + b.width * p.distance, b.top);
    case "left":
      return makePt(b.left, b.top + b.height * p.distance);
    case "right":
      return makePt(b.right, b.top + b.height * p.distance);
  }
}

export function extrudeCp(cp: ConnectorPoint, margin: number): Point {
  const { x, y } = computePt(cp);
  switch (cp.side) {
    case "top":
      return makePt(x, y - margin);
    case "right":
      return makePt(x + margin, y);
    case "bottom":
      return makePt(x, y + margin);
    case "left":
      return makePt(x - margin, y);
  }
}

// Grid structure storing rectangles in rows and columns
export class Grid {
  data: Map<number, Map<number, Rectangle>> = new Map();
  rows = 0;
  columns = 0;

  set(row: number, col: number, rect: Rectangle) {
    if (!this.data.has(row)) this.data.set(row, new Map());
    this.data.get(row)!.set(col, rect);
    this.rows = Math.max(this.rows, row + 1);
    this.columns = Math.max(this.columns, col + 1);
  }
  get(row: number, col: number): Rectangle | null {
    return this.data.get(row)?.get(col) ?? null;
  }
  *[Symbol.iterator]() {
    for (const [row, rowData] of this.data) {
      for (const [col, rect] of rowData) {
        yield rect;
      }
    }
  }
}

// Create grid of rectangles from vertical and horizontal rulers inside bounds
export function rulersToGrid(
  verticals: number[],
  horizontals: number[],
  bounds: Rectangle
): Grid {
  const result = new Grid();

  verticals = [...verticals].sort((a, b) => a - b);
  horizontals = [...horizontals].sort((a, b) => a - b);

  let lastX = bounds.left;
  let lastY = bounds.top;

  for (let row = 0; row <= horizontals.length; row++) {
    const y = row < horizontals.length ? horizontals[row] : bounds.bottom;
    let lastXInRow = bounds.left;
    for (let col = 0; col <= verticals.length; col++) {
      const x = col < verticals.length ? verticals[col] : bounds.right;
      result.set(row, col, Rectangle.fromLTRB(lastXInRow, lastY, x, y));
      lastXInRow = x;
    }
    lastY = y;
  }

  return result;
}

// Reduce duplicate points (unique by x,y)
export function reduceNumbers(nums: number[]): number[] {
  return Array.from(new Set(nums));
}

export function reducePoints(points: Point[]): Point[] {
  const map = new Map<string, Point>();
  points.forEach((p) => {
    map.set(`${p.x},${p.y}`, p);
  });
  return Array.from(map.values());
}

// Get spots (points) from grid avoiding obstacles
export function gridToSpots(grid: Grid, obstacles: Rectangle[]): Point[] {
  function obstacleCollision(p: Point) {
    return obstacles.some((o) => o.contains(p));
  }
  const spots: Point[] = [];

  for (const [row, rowData] of grid.data) {
    for (const [col, r] of rowData) {
      // Add corners for edge cells, else add more points
      const firstRow = row === 0;
      const lastRow = row === grid.rows - 1;
      const firstCol = col === 0;
      const lastCol = col === grid.columns - 1;

      if (firstRow && firstCol) spots.push(r.northWest);
      if (firstRow && lastCol) spots.push(r.northEast);
      if (lastRow && lastCol) spots.push(r.southEast);
      if (lastRow && firstCol) spots.push(r.southWest);

      if (firstRow)
        spots.push(r.northWest, r.north, r.northEast);
      else if (lastRow)
        spots.push(r.southWest, r.south, r.southEast);
      else if (firstCol)
        spots.push(r.northWest, r.west, r.southWest);
      else if (lastCol)
        spots.push(r.northEast, r.east, r.southEast);
      else
        spots.push(
          r.northWest,
          r.north,
          r.northEast,
          r.east,
          r.southEast,
          r.south,
          r.southWest,
          r.west,
          r.center
        );
    }
  }

  return reducePoints(spots).filter((p) => !obstacleCollision(p));
}

// Graph node representing a point with distance for Dijkstra
export class PointNode {
  distance = Number.MAX_SAFE_INTEGER;
  shortestPath: PointNode[] = [];
  adjacentNodes: Map<PointNode, number> = new Map();

  constructor(public data: Point) {}
}

export class PointGraph {
  private index: { [x: string]: { [y: string]: PointNode } } = {};

  add(p: Point) {
    const xs = p.x.toString();
    const ys = p.y.toString();
    if (!(xs in this.index)) this.index[xs] = {};
    if (!(ys in this.index[xs])) this.index[xs][ys] = new PointNode(p);
    return this.index[xs][ys];
  }

  get(x: number, y: number): PointNode | null {
    const xs = x.toString();
    const ys = y.toString();
    if (!(xs in this.index)) return null;
    if (!(ys in this.index[xs])) return null;
    return this.index[xs][ys];
  }

  getAllNodes(): PointNode[] {
    const nodes: PointNode[] = [];
    Object.values(this.index).forEach((yMap) =>
      Object.values(yMap).forEach((node) => nodes.push(node))
    );
    return nodes;
  }
}

// Add edge between nodes if no obstacle blocks direct orthogonal path
export function addEdge(
  graph: PointGraph,
  from: Point,
  to: Point,
  obstacles: Rectangle[]
) {
  if (from.x !== to.x && from.y !== to.y) return; // only orthogonal edges

  const edgeLine: Line = { a: from, b: to };

  // check for collision with obstacles, excluding the start and end point intersection
  for (const o of obstacles) {
    if (lineIntersectsRect(edgeLine, o)) {
      return;
    }
  }

  const fromNode = graph.add(from);
  const toNode = graph.add(to);
  const dist = distance(from, to);
  fromNode.adjacentNodes.set(toNode, dist);
  toNode.adjacentNodes.set(fromNode, dist);
}

// Check if line intersects rectangle (excluding if line endpoint is exactly on rect edge)
export function lineIntersectsRect(line: Line, rect: Rectangle): boolean {
  // If both points inside, consider intersecting
  if (rect.contains(line.a) && rect.contains(line.b)) return true;

  // We test intersection with 4 edges of rect
  const edges: Line[] = [
    { a: rect.northWest, b: rect.northEast },
    { a: rect.northEast, b: rect.southEast },
    { a: rect.southEast, b: rect.southWest },
    { a: rect.southWest, b: rect.northWest },
  ];

  for (const edge of edges) {
    if (linesIntersect(line.a, line.b, edge.a, edge.b)) {
      // If intersection point is exactly one endpoint, ignore
      const inter = lineSegmentIntersection(line.a, line.b, edge.a, edge.b);
      if (inter) {
        if (
          (pointsEqual(inter, line.a) || pointsEqual(inter, line.b)) &&
          (rect.left <= inter.x && inter.x <= rect.right) &&
          (rect.top <= inter.y && inter.y <= rect.bottom)
        ) {
          continue;
        }
        return true;
      }
    }
  }
  return false;
}

export function pointsEqual(a: Point, b: Point) {
  return a.x === b.x && a.y === b.y;
}

// Check if two line segments intersect
export function linesIntersect(p1: Point, p2: Point, p3: Point, p4: Point) {
  function ccw(a: Point, b: Point, c: Point) {
    return (c.y - a.y) * (b.x - a.x) > (b.y - a.y) * (c.x - a.x);
  }
  return (
    ccw(p1, p3, p4) !== ccw(p2, p3, p4) && ccw(p1, p2, p3) !== ccw(p1, p2, p4)
  );
}

// Calculate intersection point of two line segments if it exists
export function lineSegmentIntersection(
  p1: Point,
  p2: Point,
  p3: Point,
  p4: Point
): Point | null {
  const denom =
    (p4.y - p3.y) * (p2.x - p1.x) - (p4.x - p3.x) * (p2.y - p1.y);
  if (denom === 0) return null; // parallel

  const ua =
    ((p4.x - p3.x) * (p1.y - p3.y) - (p4.y - p3.y) * (p1.x - p3.x)) / denom;
  const ub =
    ((p2.x - p1.x) * (p1.y - p3.y) - (p2.y - p1.y) * (p1.x - p3.x)) / denom;

  if (ua >= 0 && ua <= 1 && ub >= 0 && ub <= 1) {
    return {
      x: p1.x + ua * (p2.x - p1.x),
      y: p1.y + ua * (p2.y - p1.y),
    };
  }
  return null;
}

// Dijkstra's algorithm for shortest path on PointGraph
export function dijkstra(
  graph: PointGraph,
  start: Point,
  end: Point
): Point[] | null {
  const startNode = graph.get(start.x, start.y);
  const endNode = graph.get(end.x, end.y);
  if (!startNode || !endNode) return null;

  const nodes = graph.getAllNodes();
  nodes.forEach((n) => {
    n.distance = Number.MAX_SAFE_INTEGER;
    n.shortestPath = [];
  });

  startNode.distance = 0;
  const unsettledNodes = new Set<PointNode>(nodes);

  while (unsettledNodes.size > 0) {
    let currentNode: PointNode | null = null;
    let smallestDistance = Number.MAX_SAFE_INTEGER;

    for (const node of unsettledNodes) {
      if (node.distance < smallestDistance) {
        smallestDistance = node.distance;
        currentNode = node;
      }
    }

    if (!currentNode) break;
    unsettledNodes.delete(currentNode);

    if (currentNode === endNode) break;

    for (const [adjNode, weight] of currentNode.adjacentNodes) {
      if (!unsettledNodes.has(adjNode)) continue;
      const tentativeDist = currentNode.distance + weight;
      if (tentativeDist < adjNode.distance) {
        adjNode.distance = tentativeDist;
        adjNode.shortestPath = [...currentNode.shortestPath, currentNode];
      }
    }
  }

  if (endNode.distance === Number.MAX_SAFE_INTEGER) return null;

  return [...endNode.shortestPath.map((n) => n.data), endNode.data];
}

export function isHorizontalLine(a: Point, b: Point) {
  return a.y === b.y;
}
export function isVerticalLine(a: Point, b: Point) {
  return a.x === b.x;
}

// Create orthogonal polyline points from path points
export function createPolyline(path: Point[]): Point[] {
  if (path.length < 2) return path;

  const result: Point[] = [path[0]];
  for (let i = 1; i < path.length; i++) {
    const prev = result[result.length - 1];
    const curr = path[i];

    if (isHorizontalLine(prev, curr) || isVerticalLine(prev, curr)) {
      result.push(curr);
    } else {
      // This should not happen for orthogonal routing,
      // but if happens, we insert an intermediate point for orthogonality
      // Add point horizontally aligned with prev, vertically aligned with curr
      result.push({ x: curr.x, y: prev.y });
      result.push(curr);
    }
  }
  return result;
}

// Generate SVG path from points (polyline)
export function pointsToPath(points: Point[]): string {
  if (points.length === 0) return "";
  let path = `M${points[0].x},${points[0].y}`;
  for (let i = 1; i < points.length; i++) {
    path += ` L${points[i].x},${points[i].y}`;
  }
  return path;
}

export function perpendicularOffset(
  point: Point,
  side: "top" | "bottom" | "left" | "right",
): Point {
  switch (side) {
    case "top":
      return { x: point.x, y: point.y };
    case "bottom":
      return { x: point.x, y: point.y };
    case "left":
      return { x: point.x, y: point.y };
    case "right":
      return { x: point.x, y: point.y };
  }
}