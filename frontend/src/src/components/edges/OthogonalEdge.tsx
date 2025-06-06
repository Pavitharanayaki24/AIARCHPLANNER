import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { EdgeProps } from '@xyflow/react';
import { useNodeContext } from '../../NodeContext';
import { FaSync } from "react-icons/fa";
import { getSmoothStepPath } from '@xyflow/react';

const OthogonalEdge: React.FC<EdgeProps> = ({
  id,
  sourceX, sourceY,
  targetX, targetY,
  source,
  target,
  sourcePosition,
  targetPosition,
  data,
}) => {
const [label, setLabel] = useState<string>(typeof data?.label === 'string' ? data.label : '');
  const [isEditing, setIsEditing] = useState(false);
  const { selectedEdges, setSelectedEdges } = useNodeContext();
  const pathRef = useRef<SVGPathElement | null>(null);
  const [rotation, setRotation] = useState(0);
  const rotationDragRef = useRef<{ startX: number; startY: number; startAngle: number } | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const spanRef = useRef<HTMLInputElement | null>(null);
  const [inputWidth, setInputWidth] = useState<number>(0);

  const isSelected = selectedEdges.some(edge => edge.id === id);
  const strokeColor = isSelected ? '#333' : '#888';

  const getPointAlongPath = (): { x: number; y: number } => {
    if (pathRef.current) {
        const totalLength = pathRef.current.getTotalLength();
        const midpoint = pathRef.current.getPointAtLength(totalLength / 2);
        return { x: midpoint.x, y: midpoint.y };
    }
    return { x: (sourceX + targetX) / 2, y: (sourceY + targetY) / 2 };
    };

    const [path, labelX, labelY] = getSmoothStepPath({
      sourceX,
      sourceY,
      targetX,
      targetY,
      sourcePosition,
      targetPosition,
    });

    const labelPosition = getPointAlongPath();

  const handleSelectEdge = (e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedEdges(prev => {
      const already = prev.some(edge => edge.id === id);
      if (already) return prev;
      return [...prev, { id, source, target }];
    });
  };

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
    </g>
  );
};

export default OthogonalEdge;