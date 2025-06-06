import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { EdgeProps } from '@xyflow/react';
import { useNodeContext } from '../../NodeContext';
import { FaSync } from "react-icons/fa";

type ControlPoint = {
  id: string;
  t: number;
  x: number;
  y: number;
};

const getLinearPoint = (t: number, x1: number, y1: number, x2: number, y2: number) => {
  const x = x1 + t * (x2 - x1);
  const y = y1 + t * (y2 - y1);
  return { x, y };
};

const CustomLinearEdge: React.FC<EdgeProps> = ({
  id,
  sourceX, sourceY,
  targetX, targetY,
  source,
  target,
  data,
}) => {
  const [controlPoints, setControlPoints] = useState<ControlPoint[]>([]);
  const [label, setLabel] = useState<string>(typeof data?.label === 'string' ? data.label : '');
  const [isEditing, setIsEditing] = useState(false);
  const { selectedEdges, setSelectedEdges } = useNodeContext();
  const [draggingIndex, setDraggingIndex] = useState<number | null>(null);
  const draggingRef = useRef<{ offsetX: number, offsetY: number } | null>(null);
  const [isCustomShape, setIsCustomShape] = useState(false);
  const [selectedControlPointIndex, setSelectedControlPointIndex] = useState<number | null>(null);
  const clickTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pathRef = useRef<SVGPathElement | null>(null);
  const [rotation, setRotation] = useState(0);
  const rotationDragRef = useRef<{ startX: number; startY: number; startAngle: number } | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const spanRef = useRef<HTMLInputElement | null>(null);
  const [inputWidth, setInputWidth] = useState<number>(0);

  const isSelected = selectedEdges.some(edge => edge.id === id);
  const strokeColor = isSelected ? '#333' : '#888';

  // Compute how many control points based on distance
  const computeControlPoints = useCallback(() => {
    const newPoints: ControlPoint[] = [];
    let t1 = (0 + 1/3) / 2;
    const { x: x1, y: y1 } = getLinearPoint(t1, sourceX, sourceY, targetX, targetY);
    newPoints.push({ id: `cp-1`, t: t1, x: x1, y: y1 });
    let t2 = (2/3 + 1) / 2; 
    const { x: x2, y: y2 } = getLinearPoint(t2, sourceX, sourceY, targetX, targetY);
    newPoints.push({ id: `cp-2`, t: t2, x: x2, y: y2 });
    setControlPoints(newPoints);
  }, [sourceX, sourceY, targetX, targetY]);

  useEffect(() => {
    if(!isCustomShape){
      computeControlPoints();
    }
  }, [computeControlPoints, isCustomShape]);

  const handleDragControlPoint = (e: React.MouseEvent, index: number) => {
    e.stopPropagation();
    setDraggingIndex(index);
    const cp = controlPoints[index];
    draggingRef.current = {
      offsetX: e.clientX - cp.x,
      offsetY: e.clientY - cp.y,
    };

    const move = (ev: MouseEvent) => {
      const newX = ev.clientX - (draggingRef.current?.offsetX || 0);
      const newY = ev.clientY - (draggingRef.current?.offsetY || 0);

      setControlPoints(prev =>
        prev.map((p, i) => (i === index ? { ...p, x: newX, y: newY } : p))
      );
    };

    const up = () => {
      window.removeEventListener('mousemove', move);
      window.removeEventListener('mouseup', up);
      setDraggingIndex(null);
      draggingRef.current = null;
    };

    window.addEventListener('mousemove', move);
    window.addEventListener('mouseup', up);

    setIsCustomShape(true);
  };

  const path = isCustomShape
    ? `M ${sourceX},${sourceY} ` + controlPoints.map(p => `L ${p.x},${p.y} `).join('') + `L ${targetX},${targetY}`
    : `M ${sourceX},${sourceY} L ${targetX},${targetY}`;

  
  const getPointAlongPath = (points: { x: number; y: number }[], t: number) => {
    // t in [0,1], fraction along the total path length
    let totalLength = 0;
    const segments = [];

    // Calculate length of each segment
    for (let i = 0; i < points.length - 1; i++) {
      const dx = points[i + 1].x - points[i].x;
      const dy = points[i + 1].y - points[i].y;
      const segLength = Math.hypot(dx, dy);
      segments.push(segLength);
      totalLength += segLength;
    }

    let distance = t * totalLength;
    for (let i = 0; i < segments.length; i++) {
      if (distance <= segments[i]) {
        const ratio = distance / segments[i];
        const x = points[i].x + ratio * (points[i + 1].x - points[i].x);
        const y = points[i].y + ratio * (points[i + 1].y - points[i].y);
        return { x, y };
      }
      distance -= segments[i];
    }

    // fallback: last point
    return points[points.length - 1];
  };

const renderedControlPoints = isCustomShape
  ? controlPoints
  : controlPoints.map(cp => {
      const { x, y } = getLinearPoint(cp.t, sourceX, sourceY, targetX, targetY);
      return { ...cp, x, y };
    });

const points = [
  { x: sourceX, y: sourceY },
  ...renderedControlPoints.map(p => ({ x: p.x, y: p.y })),
  { x: targetX, y: targetY }
];

const labelPosition = getPointAlongPath(points, 0.5);

  const handleSelectEdge = (e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedEdges(prev => {
      const already = prev.some(edge => edge.id === id);
      if (already) return prev;
      return [...prev, { id, source, target }];
    });
  };

  useEffect(() => {
    if (!isCustomShape) return;

    const newPoints = [ { x: sourceX, y: sourceY }, ...controlPoints, { x: targetX, y: targetY } ];

    // Recalculate control point position proportional to segment it lies on
    setControlPoints(prev => {
      return prev.map(cp => {
        const { index, point } = findClosestSegment(newPoints, cp);
        return { ...cp, x: point.x, y: point.y };
      });
    });
  }, [sourceX, sourceY, targetX, targetY]);

// Calculate perpendicular projection of point p onto segment [a,b]
function projectPointOnSegment(p: {x:number,y:number}, a: {x:number,y:number}, b: {x:number,y:number}) {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  if (dx === 0 && dy === 0) return a; // segment is a point

  const t = ((p.x - a.x)*dx + (p.y - a.y)*dy) / (dx*dx + dy*dy);
  const tClamped = Math.max(0, Math.min(1, t));
  return {
    x: a.x + tClamped * dx,
    y: a.y + tClamped * dy,
    t: tClamped
  };
}

function findClosestSegment(points: {x:number,y:number}[], p: {x:number,y:number}) {
  let minDist = Infinity;
  let closestSegmentIndex = 0;
  let closestPoint = points[0];

  for(let i = 0; i < points.length -1; i++) {
    const proj = projectPointOnSegment(p, points[i], points[i+1]);
    const dist = Math.hypot(proj.x - p.x, proj.y - p.y);
    if(dist < minDist) {
      minDist = dist;
      closestSegmentIndex = i;
      closestPoint = proj;
    }
  }
  return { index: closestSegmentIndex, point: closestPoint };
}

const handleClick = (e: React.MouseEvent) => {
  e.stopPropagation();

  if (!isSelected) {
    // Select edge if not selected yet
    setSelectedEdges(prev => {
      const already = prev.some(edge => edge.id === id);
      if (already) return prev;
      return [...prev, { id, source, target }];
    });
    return;
  }

  // If selected, add control point on click position
  const svg = pathRef.current?.ownerSVGElement;
  if (!svg) return;

  const pt = svg.createSVGPoint();
  pt.x = e.clientX;
  pt.y = e.clientY;
  const cursorpt = pt.matrixTransform(svg.getScreenCTM()?.inverse());

  const { index, point } = findClosestSegment(points, cursorpt);

  const newControl: ControlPoint = {
    id: `cp-${Date.now()}`,
    t: 0,  // we'll recalculate t below
    x: point.x,
    y: point.y,
  };

  setControlPoints(prev => {
    const insertionIndex = Math.max(0, index); // safe fallback

    const updated = [...prev];
    updated.splice(insertionIndex, 0, newControl);

    // Recalculate t for all control points between 0 and 1 along line
    const totalPointsCount = updated.length + 1; // control points + source+target
    return updated.map((cp, idx) => ({
      ...cp,
      id: `cp-${idx}`,
      t: (idx + 1) / (totalPointsCount + 1),
    }));
  });

    setIsCustomShape(true);
  };

  // Handle single vs double click on path to add control point or edit label
  const handlePathClick = (e: React.MouseEvent) => {
    e.stopPropagation();

    if (clickTimeoutRef.current) {
      clearTimeout(clickTimeoutRef.current);
      clickTimeoutRef.current = null;
      return; // ignore double click for adding control point
    }

    clickTimeoutRef.current = setTimeout(() => {
      clickTimeoutRef.current = null;
      if (!isSelected) {
        setSelectedEdges(prev => {
          if (prev.some(edge => edge.id === id)) return prev;
          return [...prev, { id, source, target }];
        });
      } else {
        handleClick(e);
      }
      setSelectedControlPointIndex(null);
    }, 250);
  };

  const handleSelectControlPoint = (e: React.MouseEvent, index: number) => {
    e.stopPropagation();
    setSelectedControlPointIndex(prevIndex => (prevIndex === index ? null : index));
  };

  const handleDoubleClickControlPoint = (e: React.MouseEvent, index: number) => {
    e.stopPropagation();
    setControlPoints(prev => prev.filter((_, i) => i !== index));
    if (selectedControlPointIndex === index) {
      setSelectedControlPointIndex(null);
    }
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Delete' && selectedControlPointIndex !== null) {
        e.stopImmediatePropagation(); // Prevent global delete handlers
        setControlPoints(prev => prev.filter((_, i) => i !== selectedControlPointIndex));
        setSelectedControlPointIndex(null);
      }
    };

    window.addEventListener('keydown', handleKeyDown, true); // Use capture phase
    return () => {
      window.removeEventListener('keydown', handleKeyDown, true);
    };
  }, [selectedControlPointIndex]);

  // Handle rotation drag start
  const onRotationMouseDown = (e: React.MouseEvent) => {
    e.stopPropagation();
    const centerX = labelPosition.x + 0; // approximate center X of label box (adjust if needed)
    const centerY = labelPosition.y + 0; // approximate center Y of label box (adjust if needed)

    rotationDragRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      startAngle: rotation,
    };

    const onMouseMove = (moveEvent: MouseEvent) => {
      if (!rotationDragRef.current) return;

      const dx = moveEvent.clientX - centerX;
      const dy = moveEvent.clientY - centerY;

      const startDx = rotationDragRef.current.startX - centerX;
      const startDy = rotationDragRef.current.startY - centerY;

      // Calculate initial and current angles relative to center
      const startAngleRad = Math.atan2(startDy, startDx);
      const currentAngleRad = Math.atan2(dy, dx);

      // Difference in radians
      const deltaAngle = currentAngleRad - startAngleRad;

      // Convert to degrees and update rotation
      const newRotation = rotationDragRef.current.startAngle + (deltaAngle * 180) / Math.PI;
      setRotation(newRotation);
    };

    const onMouseUp = () => {
      rotationDragRef.current = null;
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
  };

  useEffect(() => {
  if (controlPoints.length === 0) return;
  if (!isCustomShape) return; // Already updated in your existing effect

  // Compose the new path points
  const newPoints = [
    { x: sourceX, y: sourceY },
    ...controlPoints.map(p => ({ x: p.x, y: p.y })),
    { x: targetX, y: targetY }
  ];

  // Calculate total length of new path
  let totalLength = 0;
  const segments: number[] = [];
  for (let i = 0; i < newPoints.length - 1; i++) {
    const dx = newPoints[i + 1].x - newPoints[i].x;
    const dy = newPoints[i + 1].y - newPoints[i].y;
    const length = Math.hypot(dx, dy);
    segments.push(length);
    totalLength += length;
  }

  // Calculate cumulative lengths for segments start points
  const cumulativeLengths = segments.reduce<number[]>((acc, len, idx) => {
    if (idx === 0) acc.push(0);
    else acc.push(acc[idx - 1] + segments[idx - 1]);
    return acc;
  }, []);

  // For each control point, find its projection and update t and (x,y)
  const updatedControlPoints = controlPoints.map(cp => {
    // Project cp onto path to find closest segment and local t
    const { index, point } = findClosestSegment(newPoints, cp);

    // Calculate global t (normalized 0 to 1 along entire polyline)
    const segmentStartLength = cumulativeLengths[index];
    const segmentLength = segments[index];

    const localT = segmentLength === 0 ? 0 : 
      Math.hypot(point.x - newPoints[index].x, point.y - newPoints[index].y) / segmentLength;

    const globalT = (segmentStartLength + localT * segmentLength) / totalLength;

    return {
      ...cp,
      x: point.x,
      y: point.y,
      t: globalT,
    };
  });

  setControlPoints(updatedControlPoints);
}, [sourceX, sourceY, targetX, targetY]);

  useEffect(() => {
    if (spanRef.current) {
      const width = spanRef.current.offsetWidth;
      setInputWidth(width + 10); // add some padding for caret
    }
  }, [label]);

  return (
    <g
  onClick={(e) => {
    e.stopPropagation();
    handleSelectEdge(e);
    setSelectedControlPointIndex(null);
  }}
>
      <path
        ref={pathRef}
        d={path}
        stroke={strokeColor}
        strokeWidth={2}
        fill="none"
        markerEnd={`url(#arrowhead-${id})`}
        style={{ cursor: 'pointer' }}
        onClick={handlePathClick}
        onDoubleClick={(e) => {
          e.stopPropagation();
          setIsEditing(true);
        }}
      />
      <defs>
        <marker
          id={`arrowhead-${id}`}
          markerWidth="4"
          markerHeight="6"
          refX="3"
          refY="3"
          orient="auto"
          markerUnits="strokeWidth"
        >
          <polygon points="0 0, 4 3, 0 6" fill={strokeColor} />
        </marker>
      </defs>

      {/* Group label and rotation icon so both rotate together */}
      <g
        transform={`translate(${labelPosition.x}, ${labelPosition.y}) rotate(${rotation})`}
        style={{ pointerEvents: isEditing ? 'auto' : 'none' }}
      >
        <foreignObject
          x={-inputWidth / 2}
          y={-7}
          width={inputWidth + 5}
          height={15}
          onDoubleClick={(e) => {
            e.stopPropagation();
            setIsEditing(true);
          }}
        >
          <div
            style={{
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              fontSize: '12px',
              color: '#000',
              background: label.trim() === '' ? 'transparent' : 'white',
              width: inputWidth + 5,
              height: '100%',
              pointerEvents: 'auto',
            }}
          >
            {isEditing ? (
              <>
                <input
                  ref={inputRef}
                  autoFocus
                  value={label}
                  onChange={(e) => setLabel(e.target.value)}
                  onClick={(e) => e.stopPropagation()}
                  onBlur={() => setIsEditing(false)}
                  style={{
                    width: inputWidth + 5,
                    fontSize: '12px',
                    border: 'none',
                    outline: 'none',
                    background: label.trim() === '' ? 'transparent' : 'white',
                    textAlign: 'center',
                  }}
                />
                {/* Hidden span to measure width */}
                <span
                  ref={spanRef}
                  style={{
                    position: 'absolute',
                    visibility: 'hidden',
                    whiteSpace: 'pre',
                    fontSize: '12px',
                    fontFamily: 'inherit',
                  }}
                >
                  {label || ' '}
                </span>
              </>
            ) : (
              label.trim() === '' ? '' : label
            )}
          </div>
        </foreignObject>

        {/* Rotation handle positioned relative to center */}
        {isEditing && (
          <g
            transform={`translate(${inputWidth / 2 + 5}, -15)`}
            style={{ cursor: 'grab', pointerEvents: 'all', userSelect: 'none' }}
            onMouseDown={onRotationMouseDown}
          >
            <FaSync size={14} />
            <rect
              x={-10}
              y={-10}
              width={20}
              height={20}
              fill="transparent"
              pointerEvents="all"
              onMouseDown={onRotationMouseDown}
            />
          </g>
        )}
      </g>
      {isSelected && controlPoints.map((pt, index) => (
        <circle
          key={pt.id}
          cx={pt.x}
          cy={pt.y}
          r={4}
          fill={
            draggingIndex === index
              ? '#0000FF' 
              : selectedControlPointIndex === index
                ? '#0000FF' 
                : '#888' 
          }
          stroke={selectedControlPointIndex === index ? 'black' : 'none'}
          strokeWidth={selectedControlPointIndex === index ? 2 : 0}
          style={{ cursor: 'move', pointerEvents: 'all' }}
          onMouseDown={(e) => handleDragControlPoint(e, index)}
          onMouseEnter={(e) => e.currentTarget.setAttribute('fill', '#0000FF')}
          onMouseLeave={(e) => {
            if (selectedControlPointIndex !== index) {
              e.currentTarget.setAttribute('fill', '#888');
            } else {
              e.currentTarget.setAttribute('fill', '#0000FF');
            }
          }}
          onClick={(e) => handleSelectControlPoint(e, index)}
          onDoubleClick={(e) => handleDoubleClickControlPoint(e, index)}
        />
      ))}
    </g>
  );
};

export default CustomLinearEdge;