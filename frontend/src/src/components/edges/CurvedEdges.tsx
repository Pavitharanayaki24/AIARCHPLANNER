import React, { useState, useEffect, useRef, useCallback } from 'react';
import { EdgeProps } from '@xyflow/react';
import { useNodeContext } from '../../NodeContext';
import { FaSync } from "react-icons/fa";
import { getBezierPath } from '@xyflow/react';

const CurvedEdge: React.FC<EdgeProps> = ({
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
  const { selectedEdges, setSelectedEdges, setSortedNodes } = useNodeContext();
  const pathRef = useRef<SVGPathElement | null>(null);
  const [rotation, setRotation] = useState(0);
  const rotationDragRef = useRef<{ startX: number; startY: number; startAngle: number } | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const spanRef = useRef<HTMLInputElement | null>(null);
  const [inputWidth, setInputWidth] = useState<number>(0);
  const [labelOffset, setLabelOffset] = useState({ x: 0, y: -20 }); // Default offset above the edge
  const labelDragRef = useRef<{ startX: number; startY: number; startOffset: { x: number; y: number } } | null>(null);

  const isSelected = selectedEdges.some(edge => edge.id === id);
  const strokeColor = isSelected ? '#333' : '#888';

  const [path] = getBezierPath({
    sourceX,
    sourceY,
    targetX,
    targetY,
    sourcePosition,
    targetPosition,
  });

  const midPoint = {
    x: (sourceX + targetX) / 2 + labelOffset.x,
    y: (sourceY + targetY) / 2 + labelOffset.y
  };

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

  return (
    <g onClick={handleSelectEdge}>
      <path
        ref={pathRef}
        d={path}
        fill="none"
        stroke={strokeColor}
        strokeWidth={1.5}
        className="react-flow__edge-path"
      />

      <g
        transform={`translate(${midPoint.x}, ${midPoint.y}) rotate(${rotation})`}
        style={{ 
          pointerEvents: 'all',
          cursor: isEditing ? 'text' : 'move'
        }}
        onMouseDown={onLabelMouseDown}
      >
        <foreignObject
          x={-inputWidth / 2}
          y={-12}
          width={inputWidth + 10}
          height={24}
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
              background: 'white',
              border: isSelected ? '1px solid #3182ce' : '1px solid #e2e8f0',
              borderRadius: '4px',
              padding: '2px 6px',
              boxShadow: '0 1px 2px rgba(0,0,0,0.1)',
              width: '100%',
              height: '100%',
              cursor: isEditing ? 'text' : 'move',
            }}
          >
            {isEditing ? (
              <>
                <input
                  ref={inputRef}
                  autoFocus
                  value={label}
                  onChange={(e) => setLabel(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      setIsEditing(false);
                    }
                  }}
                  onClick={(e) => e.stopPropagation()}
                  onBlur={() => setIsEditing(false)}
                  style={{
                    width: '100%',
                    fontSize: '12px',
                    border: 'none',
                    outline: 'none',
                    background: 'transparent',
                    textAlign: 'center',
                  }}
                />
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
              <span>{label || 'Add label'}</span>
            )}
          </div>
        </foreignObject>

        {isSelected && (
          <g
            transform={`translate(${inputWidth / 2 + 15}, 0)`}
            style={{ cursor: 'grab', pointerEvents: 'all' }}
            onMouseDown={onRotationMouseDown}
          >
            <circle
              r={8}
              fill="white"
              stroke="#3182ce"
              strokeWidth={1}
            />
            <FaSync size={10} style={{ transform: 'translate(-5px, -5px)' }} />
          </g>
        )}
      </g>
    </g>
  );
};

export default CurvedEdge;