import { Node, NodePositionChange, XYPosition } from '@xyflow/react';

type SpacingGuide = {
  between: [XYPosition, XYPosition];
  distance: number;
};

type GetHelperLinesResult = {
  horizontal?: number;
  vertical?: number;
  snapPosition: Partial<XYPosition>;
  spacingGuides?: SpacingGuide[];
  horizontalEdges?: { left: number; right: number };
  verticalEdges?: { top: number; bottom: number };
};

export function getHelperLines(
  change: NodePositionChange,
  nodes: Node[],
  distance = 5
): GetHelperLinesResult {
  const defaultResult: GetHelperLinesResult = {
    horizontal: undefined,
    vertical: undefined,
    snapPosition: { x: undefined, y: undefined },
    spacingGuides: [],
  };

  const nodeA = nodes.find((node) => node.id === change.id);
  if (!nodeA || !change.position || nodeA.width == null || nodeA.height == null) {
    return defaultResult;
  }

  const nodeABounds = {
    left: change.position.x,
    right: change.position.x + nodeA.width,
    top: change.position.y,
    bottom: change.position.y + nodeA.height,
    width: nodeA.width,
    height: nodeA.height,
    centerX: change.position.x + nodeA.width / 2,
    centerY: change.position.y + nodeA.height / 2,
  };

  let horizontalDistance = distance;
  let verticalDistance = distance;

  const result: GetHelperLinesResult = {
    ...defaultResult,
  };

  let horizontalCenterAligned = 0;
  let verticalCenterAligned = 0;

  const rowAlignedNodes: {
    id: string;
    centerX: number;
    centerY: number;
    bounds: { left: number; right: number };
  }[] = [];

  const columnAlignedNodes: {
    id: string;
    centerX: number;
    centerY: number;
    bounds: { top: number; bottom: number };
  }[] = [];

  for (const nodeB of nodes) {
    if (nodeB.id === nodeA.id || nodeB.width == null || nodeB.height == null) continue;

    const nodeBBounds = {
      left: nodeB.position.x,
      right: nodeB.position.x + nodeB.width,
      top: nodeB.position.y,
      bottom: nodeB.position.y + nodeB.height,
      width: nodeB.width,
      height: nodeB.height,
      centerX: nodeB.position.x + nodeB.width / 2,
      centerY: nodeB.position.y + nodeB.height / 2,
    };

    const centerXDiff = Math.abs(nodeABounds.centerX - nodeBBounds.centerX);
    const centerYDiff = Math.abs(nodeABounds.centerY - nodeBBounds.centerY);

    if (centerXDiff <= distance) verticalCenterAligned++;
    if (centerYDiff <= distance) horizontalCenterAligned++;

    // Collect same-row nodes for horizontal spacing detection
    if (centerYDiff <= distance) {
      rowAlignedNodes.push({
        id: nodeB.id,
        centerX: nodeBBounds.centerX,
        centerY: nodeBBounds.centerY,
        bounds: { left: nodeBBounds.left, right: nodeBBounds.right },
      });
    }

    // Collect same-column nodes for vertical spacing detection
    if (centerXDiff <= distance) {
      columnAlignedNodes.push({
        id: nodeB.id,
        centerX: nodeBBounds.centerX,
        centerY: nodeBBounds.centerY,
        bounds: { top: nodeBBounds.top, bottom: nodeBBounds.bottom },
      });
    }

    // Vertical alignment snapping
    const distanceLeftLeft = Math.abs(nodeABounds.left - nodeBBounds.left);
    if (distanceLeftLeft < verticalDistance) {
      result.snapPosition.x = nodeBBounds.left;
      result.vertical = nodeBBounds.left;
      result.verticalEdges = { top: Math.min(nodeABounds.top, nodeBBounds.top), bottom: Math.max(nodeABounds.bottom, nodeBBounds.bottom) };
      verticalDistance = distanceLeftLeft;
    }

    const distanceRightRight = Math.abs(nodeABounds.right - nodeBBounds.right);
    if (distanceRightRight < verticalDistance) {
      result.snapPosition.x = nodeBBounds.right - nodeABounds.width;
      result.vertical = nodeBBounds.right;
      result.verticalEdges = { top: Math.min(nodeABounds.top, nodeBBounds.top), bottom: Math.max(nodeABounds.bottom, nodeBBounds.bottom) };
      verticalDistance = distanceRightRight;
    }

    const distanceLeftRight = Math.abs(nodeABounds.left - nodeBBounds.right);
    if (distanceLeftRight < verticalDistance) {
      result.snapPosition.x = nodeBBounds.right;
      result.vertical = nodeBBounds.right;
      result.verticalEdges = { top: Math.min(nodeABounds.top, nodeBBounds.top), bottom: Math.max(nodeABounds.bottom, nodeBBounds.bottom) };
      verticalDistance = distanceLeftRight;
    }

    const distanceRightLeft = Math.abs(nodeABounds.right - nodeBBounds.left);
    if (distanceRightLeft < verticalDistance) {
      result.snapPosition.x = nodeBBounds.left - nodeABounds.width;
      result.vertical = nodeBBounds.left;
      result.verticalEdges = { top: Math.min(nodeABounds.top, nodeBBounds.top), bottom: Math.max(nodeABounds.bottom, nodeBBounds.bottom) };
      verticalDistance = distanceRightLeft;
    }

    // Horizontal alignment snapping
    const distanceTopTop = Math.abs(nodeABounds.top - nodeBBounds.top);
    if (distanceTopTop < horizontalDistance) {
      result.snapPosition.y = nodeBBounds.top;
      result.horizontal = nodeBBounds.top;
      result.horizontalEdges = { left: Math.min(nodeABounds.left, nodeBBounds.left), right: Math.max(nodeABounds.right, nodeBBounds.right) };
      horizontalDistance = distanceTopTop;
    }

    const distanceBottomBottom = Math.abs(nodeABounds.bottom - nodeBBounds.bottom);
    if (distanceBottomBottom < horizontalDistance) {
      result.snapPosition.y = nodeBBounds.bottom - nodeABounds.height;
      result.horizontal = nodeBBounds.bottom;
      result.horizontalEdges = { left: Math.min(nodeABounds.left, nodeBBounds.left), right: Math.max(nodeABounds.right, nodeBBounds.right) };
      horizontalDistance = distanceBottomBottom;
    }

    const distanceBottomTop = Math.abs(nodeABounds.bottom - nodeBBounds.top);
    if (distanceBottomTop < horizontalDistance) {
      result.snapPosition.y = nodeBBounds.top - nodeABounds.height;
      result.horizontal = nodeBBounds.top;
      result.horizontalEdges = { left: Math.min(nodeABounds.left, nodeBBounds.left), right: Math.max(nodeABounds.right, nodeBBounds.right) };
      horizontalDistance = distanceBottomTop;
    }

    const distanceTopBottom = Math.abs(nodeABounds.top - nodeBBounds.bottom);
    if (distanceTopBottom < horizontalDistance) {
      result.snapPosition.y = nodeBBounds.bottom;
      result.horizontal = nodeBBounds.bottom;
      result.horizontalEdges = { left: Math.min(nodeABounds.left, nodeBBounds.left), right: Math.max(nodeABounds.right, nodeBBounds.right) };
      horizontalDistance = distanceTopBottom;
    }
  }

  // Add nodeA into row-aligned list
  rowAlignedNodes.push({
    id: nodeA.id,
    centerX: nodeABounds.centerX,
    centerY: nodeABounds.centerY,
    bounds: { left: nodeABounds.left, right: nodeABounds.right },
  });

   // Add nodeA into column-aligned list
   columnAlignedNodes.push({
    id: nodeA.id,
    centerX: nodeABounds.centerX,
    centerY: nodeABounds.centerY,
    bounds: { top: nodeABounds.top, bottom: nodeABounds.bottom },
  });

  // Add center alignment helper lines
  if (verticalCenterAligned > 0) result.vertical = nodeABounds.centerX;
  if (horizontalCenterAligned > 0) result.horizontal = nodeABounds.centerY;

  // === Equal Spacing Detection ===
  if (rowAlignedNodes.length >= 3) {
    const sorted = rowAlignedNodes.sort((a, b) => a.bounds.right - b.bounds.right);
    const distances = sorted
      .map((n, i, arr) =>
        i < arr.length - 1 ? arr[i + 1].bounds.left - n.bounds.right : null
      )
      .filter((d): d is number => d !== null);

    const allEqual = distances.every(
      (val, _, arr) => Math.abs(val - arr[0]) < 1 // <= 1px tolerance
    );

    if (allEqual) {
      for (let i = 0; i < sorted.length - 1; i++) {
        result.spacingGuides?.push({
          between: [
            { x: sorted[i].bounds.right, y: sorted[i].centerY },
            { x: sorted[i + 1].bounds.left, y: sorted[i + 1].centerY },
          ],
          distance: distances[i],
        });
      }
    }
  }

  if (columnAlignedNodes.length >= 3) {
    const sorted = columnAlignedNodes.sort((a, b) => a.bounds.bottom - b.bounds.bottom);
    const distances = sorted
      .map((n, i, arr) =>
        i < arr.length - 1 ? arr[i + 1].bounds.top - n.bounds.bottom : null
      )
      .filter((d): d is number => d !== null);

    const allEqual = distances.every(
      (val, _, arr) => Math.abs(val - arr[0]) < 1 // <= 1px tolerance
    );

    if (allEqual) {
      for (let i = 0; i < sorted.length - 1; i++) {
        result.spacingGuides?.push({
          between: [
            { x: sorted[i].centerX, y: sorted[i].bounds.bottom },
            { x: sorted[i + 1].centerX, y: sorted[i + 1].bounds.top },
          ],
          distance: distances[i],
        });
      }
    }
  }

  // === Update edges for row-aligned and column-aligned nodes ===
  if (rowAlignedNodes.length >= 2) {
    const leftMost = Math.min(...rowAlignedNodes.map(n => n.bounds.left));
    const rightMost = Math.max(...rowAlignedNodes.map(n => n.bounds.right));
    result.horizontalEdges = { left: leftMost, right: rightMost };
  }

  if (columnAlignedNodes.length >= 2) {
    const topMost = Math.min(...columnAlignedNodes.map(n => n.bounds.top));
    const bottomMost = Math.max(...columnAlignedNodes.map(n => n.bounds.bottom));
    result.verticalEdges = { top: topMost, bottom: bottomMost };
  }

  return result;
}