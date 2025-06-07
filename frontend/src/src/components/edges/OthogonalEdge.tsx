import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Edge, EdgeProps, getBezierPath } from '@xyflow/react';
import { useNodeContext } from '../../NodeContext';
import { FaSync } from "react-icons/fa";

type CustomEdgeData = {
  label?: string;
  labelPosition?: { x: number; y: number };
  labelStyle?: React.CSSProperties;
  [key: string]: unknown;
};

const OthogonalEdge = ({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  data,
  selected,
}: EdgeProps<CustomEdgeData>) => {
  const [isEditing, setIsEditing] = useState(false);
  const [label, setLabel] = useState(data?.label || '');
  const { selectedEdges, setSelectedEdges, setSortedNodes } = useNodeContext();
  const pathRef = useRef<SVGPathElement | null>(null);
  const [rotation, setRotation] = useState(0);
  const rotationDragRef = useRef<{ startX: number; startY: number; startAngle: number } | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const spanRef = useRef<HTMLInputElement | null>(null);
  const [inputWidth, setInputWidth] = useState<number>(0);
  const [labelOffset] = useState({ x: 0, y: -20 });
  const labelDragRef = useRef<{ startX: number; startY: number; startOffset: { x: number; y: number } } | null>(null);

  const isSelected = selectedEdges.some(edge => edge.id === id);
  const strokeColor = selected ? '#3182ce' : '#000';

  const [path] = getBezierPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
  });

  const midPoint = {
    x: (sourceX + targetX) / 2,
    y: (sourceY + targetY) / 2
  };

  // Only show label if it's explicitly set in data
  const showLabel = data?.label && data.label.length > 0;

  const handleSelectEdge = (e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedEdges(prev => {
      const already = prev.some(edge => edge.id === id);
      if (already) return prev;
      return [...prev, { id, source, target }];
    });
  };

  // Handle label drag
  const onLabelMouseDown = (e: React.MouseEvent) => {
    if (isEditing) return;
    e.stopPropagation();
    
    labelDragRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      startOffset: { ...labelOffset }
    };

    const onMouseMove = (moveEvent: MouseEvent) => {
      if (!labelDragRef.current) return;

      const dx = moveEvent.clientX - labelDragRef.current.startX;
      const dy = moveEvent.clientY - labelDragRef.current.startY;

      setLabelOffset({
        x: labelDragRef.current.startOffset.x + dx,
        y: labelDragRef.current.startOffset.y + dy
      });
    };

    const onMouseUp = () => {
      labelDragRef.current = null;
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
  };

  // Handle rotation drag
  const onRotationMouseDown = (e: React.MouseEvent) => {
    e.stopPropagation();
    const centerX = midPoint.x;
    const centerY = midPoint.y;

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

      const startAngleRad = Math.atan2(startDy, startDx);
      const currentAngleRad = Math.atan2(dy, dx);

      const deltaAngle = currentAngleRad - startAngleRad;
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
      setInputWidth(width + 10);
    }
  }, [label]);

  // Calculate label position
  const labelX = data?.labelPosition?.x || (sourceX + targetX) / 2;
  const labelY = data?.labelPosition?.y || (sourceY + targetY) / 2;

  return (
    <g onClick={(e) => e.stopPropagation()}>
      <path
        ref={pathRef}
        d={path}
        fill="none"
        stroke={strokeColor}
        strokeWidth={1.5}
        className="react-flow__edge-path"
      />

      {(data?.label || isEditing) && (
        <g
          transform={`translate(${labelX}, ${labelY})`}
          style={{ 
            pointerEvents: 'all',
            cursor: isEditing ? 'text' : 'move'
          }}
        >
          <foreignObject
            x={-inputWidth / 2}
            y={-9}
            width={inputWidth}
            height={18}
            style={{
              ...data?.labelStyle,
              overflow: 'visible'
            }}
            onDoubleClick={(e) => {
              e.stopPropagation();
              setIsEditing(true);
            }}
          >
            <div
              style={{
                width: '100%',
                height: '100%',
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                fontSize: '11px',
                padding: '1px 2px',
                background: 'white',
                border: '1px dashed #999',
                minWidth: '30px',
                maxWidth: '80px',
                position: 'absolute',
                transform: 'translate(0, -50%)',
                pointerEvents: 'all'
              }}
            >
              {isEditing ? (
                <input
                  type="text"
                  value={label}
                  onChange={(e) => setLabel(e.target.value)}
                  onBlur={() => {
                    setIsEditing(false);
                    if (data) {
                      data.label = label;
                    }
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      setIsEditing(false);
                      if (data) {
                        data.label = label;
                      }
                    }
                  }}
                  autoFocus
                  style={{
                    border: 'none',
                    outline: 'none',
                    width: '100%',
                    fontSize: '11px',
                    padding: '0',
                    background: 'transparent',
                    textAlign: 'center'
                  }}
                />
              ) : (
                <div style={{
                  width: '100%',
                  textAlign: 'center',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap'
                }}>
                  {label}
                </div>
              )}
            </div>
          </foreignObject>
        </g>
      )}
    </g>
  );
};

export default OthogonalEdge;