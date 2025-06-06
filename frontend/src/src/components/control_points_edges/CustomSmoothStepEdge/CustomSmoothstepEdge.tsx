import React, { useMemo, useRef, useState, useEffect } from "react";
import { EdgeProps, Position } from "@xyflow/react";
import { useNodeContext } from "@/src/NodeContext";
import {
  addEdge,
  computePt,
  dijkstra,
  distance,
  extrudeCp,
  Grid,
  Point,
  PointGraph,
  Rectangle,
  rulersToGrid,
  gridToSpots,
  reduceNumbers,
  reducePoints,
  perpendicularOffset,
  ConnectorPoint,
  createPolyline,
  pointsToPath,
} from "./CustomSmoothStepEdgeUtils";

export default function CustomSmoothStepEdge({
  id,
  sourceX,
  sourceY,
  sourcePosition,
  targetX,
  targetY,
  targetPosition,
  style = {},
  markerEnd,
  source,
  target,
  data,
}: EdgeProps) {
  const margin = 10;
  const { nodes } = useNodeContext();
  const sourceNode = nodes.find((n) => n.id === source);
  const targetNode = nodes.find((n) => n.id === target);
  const [label, setLabel] = useState<string>(
    typeof data?.label === "string" ? data.label : ""
  );
  const [isEditingLabel, setIsEditingLabel] = useState(false);
  const labelInputRef = useRef<HTMLInputElement | null>(null);
  const [selectedSegmentIndex, setSelectedSegmentIndex] = useState<number | null>(null);
  const { selectedEdges, setSelectedEdges } = useNodeContext();
  const isSelected = selectedEdges.some(edge => edge.id === id);

  if (!sourceNode || !targetNode) return null;

  const sourceWidth = sourceNode.width ?? 0;
  const sourceHeight = sourceNode.height ?? 0;
  const targetWidth = targetNode.width ?? 0;
  const targetHeight = targetNode.height ?? 0;

  const sourceRect = new Rectangle(
    sourceNode.position.x - margin,
    sourceNode.position.y - margin,
    sourceWidth + 2 * margin,
    sourceHeight + 2 * margin
  );

  const targetRect = new Rectangle(
    targetNode.position.x - margin,
    targetNode.position.y - margin,
    targetWidth + 2 * margin,
    targetHeight + 2 * margin
  );

  const sourceConnector: ConnectorPoint = {
    shape: sourceRect,
    side: sourcePosition,
    distance:
      sourcePosition === "left" || sourcePosition === "right"
        ? (sourceY - sourceRect.top) / sourceRect.height
        : (sourceX - sourceRect.left) / sourceRect.width,
  };

  const targetConnector: ConnectorPoint = {
    shape: targetRect,
    side: targetPosition,
    distance:
      targetPosition === "left" || targetPosition === "right"
        ? (targetY - targetRect.top) / targetRect.height
        : (targetX - targetRect.left) / targetRect.width,
  };

  const sourcePerp = perpendicularOffset({ x: sourceX, y: sourceY }, sourcePosition);
  const targetPerp = perpendicularOffset({ x: targetX, y: targetY }, targetPosition);

  const startPoint = extrudeCp(sourceConnector, margin);
  const endPoint = extrudeCp(targetConnector, margin);

  const left = Math.min(startPoint.x, endPoint.x, sourceRect.left, targetRect.left) - margin;
  const right = Math.max(startPoint.x, endPoint.x, sourceRect.right, targetRect.right) + margin;
  const top = Math.min(startPoint.y, endPoint.y, sourceRect.top, targetRect.top) - margin;
  const bottom = Math.max(startPoint.y, endPoint.y, sourceRect.bottom, targetRect.bottom) + margin;
  const bounds = new Rectangle(left, top, right - left, bottom - top);

  const verticalRulers = reduceNumbers([
    sourceRect.left,
    sourceRect.right,
    targetRect.left,
    targetRect.right,
    startPoint.x,
    endPoint.x,
  ]);

  const horizontalRulers = reduceNumbers([
    sourceRect.top,
    sourceRect.bottom,
    targetRect.top,
    targetRect.bottom,
    startPoint.y,
    endPoint.y,
  ]);

  const grid = rulersToGrid(verticalRulers, horizontalRulers, bounds);
  const obstacles = [sourceRect, targetRect];
  const spots = gridToSpots(grid, obstacles);

  const graph = new PointGraph();
  for (const a of spots) {
    for (const b of spots) {
      if ((a.x === b.x || a.y === b.y) && a !== b) {
        addEdge(graph, a, b, obstacles);
      }
    }
  }

  graph.add(startPoint);
  graph.add(endPoint);
  for (const spot of spots) {
    if (startPoint.x === spot.x || startPoint.y === spot.y) {
      addEdge(graph, startPoint, spot, obstacles);
    }
    if (endPoint.x === spot.x || endPoint.y === spot.y) {
      addEdge(graph, endPoint, spot, obstacles);
    }
  }

  let shortestPath = dijkstra(graph, startPoint, endPoint);
  if (!shortestPath) shortestPath = [startPoint, endPoint];

  const polyline = createPolyline(shortestPath);
  const [polylinePoints, setPolylinePoints] = useState<Point[]>(() => {
    const pl = createPolyline(shortestPath);
    return pl;
  });

const [sourcePerpPoint, setSourcePerpPoint] = useState(sourcePerp);
const [targetPerpPoint, setTargetPerpPoint] = useState(targetPerp);

const finalPath = useMemo(() => {
  return [sourcePerpPoint, ...polylinePoints, targetPerpPoint];
}, [sourcePerpPoint, polylinePoints, targetPerpPoint]);

  useEffect(() => {
  const updatedSourcePerp = perpendicularOffset({ x: sourceX, y: sourceY }, sourcePosition);
  const updatedTargetPerp = perpendicularOffset({ x: targetX, y: targetY }, targetPosition);
  const updatedPath = [updatedSourcePerp, ...createPolyline(shortestPath), updatedTargetPerp];
  const middlePolyline = updatedPath.slice(1, -1); // remove sourcePerp and targetPerp
  setPolylinePoints(middlePolyline);
}, [sourceX, sourceY, targetX, targetY, nodes]);

   // Function to check if segment is horizontal or vertical
  function isSegmentHorizontal(p1: Point, p2: Point) {
    return p1.y === p2.y;
  }
  function isSegmentVertical(p1: Point, p2: Point) {
    return p1.x === p2.x;
  }

  // Compute midpoints of each segment for draggable handles
  const midpoints = [];
  for (let i = 0; i < finalPath.length - 1; i++) {
    const p1 = finalPath[i];
    const p2 = finalPath[i + 1];
    midpoints.push({
      x: (p1.x + p2.x) / 2,
      y: (p1.y + p2.y) / 2,
      segmentIndex: i, // index of segment start point in finalPath
    });
  }

  // Drag state
  const [draggingIndex, setDraggingIndex] = useState<number | null>(null);
  const [dragStart, setDragStart] = useState<{ x: number; y: number } | null>(null);

// Handle drag start on control point
function onDragStart(e: React.MouseEvent, index: number) {
  e.stopPropagation();
  setDraggingIndex(index);
  setDragStart({ x: e.clientX, y: e.clientY });
}

const onControlPointDoubleClick = (segmentIndex: number) => {
  if (selectedSegmentIndex === segmentIndex) {
    setSelectedSegmentIndex(null);
  } else {
    setSelectedSegmentIndex(segmentIndex);
  }
};

function calculateNewTargetPerpPoint(dx: number, dy: number, currentPoint: Point, segmentIsVertical: boolean) {
  if (segmentIsVertical) {
    // Only update y to keep vertical segment
    return { x: currentPoint.x, y: currentPoint.y + dy };
  } else {
    // Only update x to keep horizontal segment
    return { x: currentPoint.x + dx, y: currentPoint.y };
  }
}

function calculateNewSourcePerpPoint(dx: number, dy: number, currentPoint: Point, segmentIsVertical: boolean) {
  if (segmentIsVertical) {
    return { x: currentPoint.x, y: currentPoint.y + dy };
  } else {
    return { x: currentPoint.x + dx, y: currentPoint.y };
  }
}

function onDragMove(e: React.MouseEvent) {
  if (draggingIndex === null || !dragStart) return;
  e.preventDefault();

  const dx = e.clientX - dragStart.x;
  const dy = e.clientY - dragStart.y;

  const i = draggingIndex;
  if (i < 0 || i >= polylinePoints.length - 1) return;

  const p1 = polylinePoints[i];
  const p2 = polylinePoints[i + 1];

  const newPolylinePoints = [...polylinePoints];

  if (isSegmentHorizontal(p1, p2)) {
    // ✅ Allow only horizontal dragging (dx), keep y fixed
    const newX1 = p1.x + dx;
    const newX2 = p2.x + dx;

    newPolylinePoints[i] = { x: newX1, y: p1.y };
    newPolylinePoints[i + 1] = { x: newX2, y: p2.y };

    // Maintain verticality with previous segment (if vertical)
    if (i - 1 >= 0 && isSegmentVertical(polylinePoints[i - 1], p1)) {
      newPolylinePoints[i - 1] = {
        x: newX1,
        y: newPolylinePoints[i - 1].y,
      };
    }

    // Maintain verticality with next segment (if vertical)
    if (i + 2 < polylinePoints.length && isSegmentVertical(p2, polylinePoints[i + 2])) {
      newPolylinePoints[i + 2] = {
        x: newX2,
        y: newPolylinePoints[i + 2].y,
      };
    }

  } else if (isSegmentVertical(p1, p2)) {
    // ✅ Allow only vertical dragging (dy), keep x fixed
    const newY1 = p1.y + dy;
    const newY2 = p2.y + dy;

    newPolylinePoints[i] = { x: p1.x, y: newY1 };
    newPolylinePoints[i + 1] = { x: p2.x, y: newY2 };

    // Maintain horizontality with previous segment (if horizontal)
    if (i - 1 >= 0 && isSegmentHorizontal(polylinePoints[i - 1], p1)) {
      newPolylinePoints[i - 1] = {
        x: newPolylinePoints[i - 1].x,
        y: newY1,
      };
    }

    // ✅ Prevent horizontal segment before target perpendicular from slanting
    const isBeforeTargetPerp = i + 2 === polylinePoints.length && targetPerpPoint;
    if (isBeforeTargetPerp) {
      // The segment p2 → targetPerpPoint must remain vertical
      // Keep the x of targetPerpPoint fixed, just update its y with dy
      const updatedTargetPerpPoint = {
        x: targetPerpPoint.x,
        y: targetPerpPoint.y + dy,
      };
      setTargetPerpPoint(updatedTargetPerpPoint);
    }

    // Maintain horizontality with next segment (if horizontal), if not the last segment
    if (!isBeforeTargetPerp && i + 2 < polylinePoints.length && isSegmentHorizontal(p2, polylinePoints[i + 2])) {
      newPolylinePoints[i + 2] = {
        x: newPolylinePoints[i + 2].x,
        y: newY2,
      };
    }
  } else {
    return; // Skip non-orthogonal segments
  }

  // Handle source/target perpendicular anchors
  if (i === polylinePoints.length - 1) {
    const prevPoint = polylinePoints[i];
    const currPoint = targetPerpPoint;
    const segmentIsVertical = isSegmentVertical(prevPoint, currPoint);
    const newTargetPerpPoint = calculateNewTargetPerpPoint(dx, dy, targetPerpPoint, segmentIsVertical);
    setTargetPerpPoint(newTargetPerpPoint);
  } else if (i === 0) {
    const nextPoint = polylinePoints[0];
    const currPoint = sourcePerpPoint;
    const segmentIsVertical = isSegmentVertical(currPoint, nextPoint);
    const newSourcePerpPoint = calculateNewSourcePerpPoint(dx, dy, sourcePerpPoint, segmentIsVertical);
    setSourcePerpPoint(newSourcePerpPoint);
  } else {
    setPolylinePoints(newPolylinePoints);
  }

  setDragStart({ x: e.clientX, y: e.clientY });
}

  // Handle drag end
  function onDragEnd(e: React.MouseEvent) {
    setDraggingIndex(null);
    setDragStart(null);
  }

  useEffect(() => {
  function onGlobalMouseMove(e: MouseEvent) {
    if (draggingIndex !== null && dragStart) {
      onDragMove({ clientX: e.clientX, clientY: e.clientY, preventDefault: () => {}, stopPropagation: () => {} } as React.MouseEvent);
    }
  }
  function onGlobalMouseUp(e: MouseEvent) {
    if (draggingIndex !== null) {
      onDragEnd({} as React.MouseEvent);
    }
  }

  if (draggingIndex !== null) {
    window.addEventListener('mousemove', onGlobalMouseMove);
    window.addEventListener('mouseup', onGlobalMouseUp);
  }

  return () => {
    window.removeEventListener('mousemove', onGlobalMouseMove);
    window.removeEventListener('mouseup', onGlobalMouseUp);
  };
}, [draggingIndex, dragStart]);

  // Label click toggles editing mode
  const onLabelClick = () => {
    setIsEditingLabel(true);
  };

  // Label input handlers
  const onLabelChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setLabel(e.target.value);
  };

  const onLabelBlur = () => {
    setIsEditingLabel(false);
  };

  // Focus input when editing mode enabled
  useEffect(() => {
    if (isEditingLabel && labelInputRef.current) {
      labelInputRef.current.focus();
      labelInputRef.current.select();
    }
  }, [isEditingLabel]);

  // Compute label position (middle of path)
  const total = finalPath.length;
  const midIndex = Math.floor(total / 2);
  const mid = finalPath[midIndex];

  // Compute SVG path from points
  const path = pointsToPath(finalPath);

  
 // Allow all control points to be draggable
const controlPoints = midpoints.map(({ x, y, segmentIndex }) => {
  const isSelected = selectedSegmentIndex === segmentIndex;

  return (
    <circle
      key={`cp-${segmentIndex}`}
      cx={x}
      cy={y}
      r={4}
      fill={isSelected ? "blue" : "currentColor"}
      stroke={isSelected ? "black" : "none"}
      strokeWidth={isSelected ? 1.5 : 0}
      style={{ cursor: "move", pointerEvents: "all" }}
      onMouseDown={(e) => onDragStart(e, segmentIndex)}
      onDoubleClick={() => onControlPointDoubleClick(segmentIndex)}
    />
  );
});


 return (
  <>
    <path
      id={id}
      style={style}
      className="react-flow__edge-path"
      d={path}
      markerEnd={markerEnd}
      onMouseMove={onDragMove}
    />
    
    {/* RENDER CONTROL POINTS AFTER THE PATH */}
    {isSelected && controlPoints}
    
    {isEditingLabel ? (
      <foreignObject x={mid.x - 50} y={mid.y - 10} width={100} height={20}>
        <input
          ref={labelInputRef}
          value={label}
          onChange={onLabelChange}
          onBlur={onLabelBlur}
          style={{ width: "100%", height: "100%" }}
        />
      </foreignObject>
    ) : (
      <text
        x={mid.x}
        y={mid.y}
        onClick={onLabelClick}
        style={{ userSelect: "none", cursor: "pointer" }}
      >
        {label}
      </text>
    )}
  </>
);

}