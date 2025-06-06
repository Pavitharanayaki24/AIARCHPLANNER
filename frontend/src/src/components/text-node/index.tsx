import React, { useState, useRef, useEffect } from "react";
import {
  NodeResizer,
  type NodeProps,
  useStore,
  Handle,
  Position,
  useKeyPress,
  useReactFlow,
} from '@xyflow/react';
import { useNodeContext } from "../../NodeContext";
import { NodeData } from '../shape/types';
import { MdAdd } from 'react-icons/md';

function useNodeDimensions(id: string) {
  const node = useStore((state) => state.nodeLookup.get(id));
  return {
    width: node?.measured?.width || 0,
    height: node?.measured?.height || 0,
  };
}

function TextNode({ id, selected, data }: NodeProps) {
  const { setSelectedNodes } = useNodeContext();
  const { width, height } = useNodeDimensions(id);
  const shiftKeyPressed = useKeyPress('Shift');
  const [isEditing, setIsEditing] = useState(false);
  const [isNew, setIsNew] = useState(true);
  const [nodeHovered, setNodeHovered] = useState(false);
  const [hoveredHandle, setHoveredHandle] = useState<Position | null>(null);
  const textRef = useRef<HTMLDivElement>(null);
  const { getNode, setNodes, setEdges } = useReactFlow();
  const color = '#3F8AE2';

  useEffect(() => {
    if (!selected && isNew) setIsNew(false);
  }, [selected]);

  useEffect(() => {
    if (isEditing && textRef.current) {
      textRef.current.focus();
      const range = document.createRange();
      const selection = window.getSelection();
      range.selectNodeContents(textRef.current);
      range.collapse(false);
      selection?.removeAllRanges();
      selection?.addRange(range);
    }
  }, [isEditing]);

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!selected) {
      setNodes((nodes) =>
        nodes.map((node) => ({ ...node, selected: node.id === id }))
      );
    }
  };

  const handleDoubleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsEditing(true);
  };

  const handleBlur = () => {
    if (textRef.current) {
      const newText = textRef.current.innerText.trim();
      if (!newText) {
        deleteNode();
        return;
      }

      setNodes((nodes) =>
        nodes.map((node) =>
          node.id === id ? { ...node, data: { ...node.data, text: newText } } : node
        )
      );
    }
    setIsEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    e.stopPropagation();
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleBlur();
    } else if (e.key === 'Escape') {
      setIsEditing(false);
      if (textRef.current && data) {
        const originalText = (data as NodeData).text || '';
        textRef.current.innerText = originalText;
        if (!originalText) {
          deleteNode();
          return;
        }
      }
    }
  };

  const deleteNode = () => {
    setNodes((nodes) => nodes.filter((node) => node.id !== id));
    setEdges((edges) => edges.filter((edge) => edge.source !== id && edge.target !== id));
  };

  const handleMouseEnter = (position: Position) => {
    setHoveredHandle(position);
  };

  const handleMouseLeave = () => {
    setTimeout(() => {
      setHoveredHandle(null);
    }, 200);
  };

  const handleClone = (pos: Position) => {
    const node = getNode(id);
    if (!node) return;

    const offset = 150;
    const directionOffset = {
      [Position.Top]: { x: 0, y: -offset },
      [Position.Bottom]: { x: 0, y: offset },
      [Position.Left]: { x: -offset, y: 0 },
      [Position.Right]: { x: offset, y: 0 },
    }[pos];

    const newId = `${id}-clone-${Date.now()}`;
    const newNode = {
      id: newId,
      type: 'text',
      data: { ...data },
      position: {
        x: node.position.x + directionOffset.x,
        y: node.position.y + directionOffset.y,
      },
      selected: true,
    };

    const newEdge = {
      id: `e${id}-${newId}`,
      source: id,
      target: newId,
      sourceHandle: pos,
      targetHandle: pos === Position.Top ? Position.Bottom :
                   pos === Position.Bottom ? Position.Top :
                   pos === Position.Left ? Position.Right : Position.Left,
      type: 'smoothstep',
    };

    setNodes((nds) => nds.map(n => ({ ...n, selected: false })).concat(newNode));
    setEdges((eds) => [...eds, newEdge]);
  };

  const showControls = selected || isNew;

  const positions = [
    { id: 'top', pos: Position.Top },
    { id: 'right', pos: Position.Right },
    { id: 'bottom', pos: Position.Bottom },
    { id: 'left', pos: Position.Left },
  ];

  return (
    <div
      className="group relative w-full h-full"
      onClick={handleClick}
      onMouseEnter={() => setNodeHovered(true)}
      onMouseLeave={() => setNodeHovered(false)}
    >
      <NodeResizer
        color={color}
        isVisible={selected}
        minWidth={100}
        minHeight={40}
        keepAspectRatio={true}
        handleStyle={{ width: 6, height: 6 }}
      />

      <div
        className={`px-4 py-2 rounded min-w-[100px] min-h-[40px] transition-all duration-300 ${
          showControls ? 'outline outline-2 outline-offset-2 outline-dashed outline-blue-500' : ''
        }`}
        onDoubleClick={handleDoubleClick}
      >
        <div
          ref={textRef}
          contentEditable={isEditing}
          suppressContentEditableWarning
          className={`outline-none w-full h-full ${isEditing ? 'cursor-text' : 'cursor-move'}`}
          onBlur={handleBlur}
          onKeyDown={handleKeyDown}
          style={{
            userSelect: isEditing ? 'text' : 'none',
            whiteSpace: 'pre-wrap',
            minHeight: '1em',
          }}
        >
          {(data as NodeData).text}
        </div>
      </div>

      {positions.map(({ id: handleId, pos }) => (
        <React.Fragment key={handleId}>
          <Handle
            key={handleId}
            style={{ 
              width: 7, 
              height: 7, 
              borderRadius: '50%', 
              backgroundColor: color,
              opacity: 0  // Make control points invisible by default
            }}
            id={handleId}
            type="source"
            position={pos}
            className={`transition-opacity duration-200 ${
              hoveredHandle === pos ? 'opacity-100' : ''
            }`}
            onMouseEnter={() => handleMouseEnter(pos)}
            onMouseLeave={handleMouseLeave}
          />

          <div
            className={`absolute ${getArrowPositionStyles(pos)} opacity-0 group-hover:opacity-30 hover:opacity-100 transition-all duration-200 cursor-pointer ${
              hoveredHandle === pos ? 'opacity-100' : ''
            }`}
            onMouseEnter={() => handleMouseEnter(pos)}
            onMouseLeave={handleMouseLeave}
          >
            <div className="w-[17px] h-[17px] flex items-center justify-center">
              {pos === Position.Top && (
                <>
                  <div className="w-0 h-0 border-l-[8px] border-l-transparent border-r-[8px] border-r-transparent border-b-[10px]" style={{ borderBottomColor: hoveredHandle === Position.Top ? color : `${color}4D` }} />
                  <div className="w-[3px] h-[17px]" style={{ backgroundColor: hoveredHandle === Position.Top ? color : `${color}4D` }} />
                </>
              )}
              {pos === Position.Right && (
                <>
                  <div className="w-[17px] h-[3px]" style={{ backgroundColor: hoveredHandle === Position.Right ? color : `${color}4D` }} />
                  <div className="w-0 h-0 border-l-[10px] border-y-[8px] border-y-transparent -ml-[1px]" style={{ borderLeftColor: hoveredHandle === Position.Right ? color : `${color}4D` }} />
                </>
              )}
              {pos === Position.Bottom && (
                <>
                  <div className="w-[3px] h-[17px]" style={{ backgroundColor: hoveredHandle === Position.Bottom ? color : `${color}4D` }} />
                  <div className="w-0 h-0 border-l-[8px] border-l-transparent border-r-[8px] border-r-transparent border-t-[10px]" style={{ borderTopColor: hoveredHandle === Position.Bottom ? color : `${color}4D` }} />
                </>
              )}
              {pos === Position.Left && (
                <>
                  <div className="w-0 h-0 border-r-[10px] border-y-[8px] border-y-transparent -mr-[1px]" style={{ borderRightColor: hoveredHandle === Position.Left ? color : `${color}4D` }} />
                  <div className="w-[17px] h-[3px]" style={{ backgroundColor: hoveredHandle === Position.Left ? color : `${color}4D` }} />
                </>
              )}
            </div>
          </div>
        </React.Fragment>
      ))}

      {hoveredHandle && (
        <div
          className="absolute bg-white rounded-full shadow p-1 cursor-pointer"
          style={{
            top: hoveredHandle === Position.Top ? -16 : 'auto',
            right: hoveredHandle === Position.Right ? -16 : 'auto',
            bottom: hoveredHandle === Position.Bottom ? -16 : 'auto',
            left: hoveredHandle === Position.Left ? -16 : 'auto',
            transform: 'translate(-50%, -50%)',
          }}
          onClick={() => handleClone(hoveredHandle)}
        >
          <MdAdd className="text-blue-500" size={18} />
        </div>
      )}
    </div>
  );
}

// Helper function to get arrow position styles
const getArrowPositionStyles = (pos: Position) => {
  switch (pos) {
    case Position.Top:
      return 'top-0 left-1/2 -translate-x-1/2 -translate-y-[30px]';
    case Position.Right:
      return 'top-1/2 right-0 translate-x-[30px] -translate-y-1/2';
    case Position.Bottom:
      return 'bottom-0 left-1/2 -translate-x-1/2 translate-y-[30px]';
    case Position.Left:
      return 'top-1/2 left-0 -translate-x-[30px] -translate-y-1/2';
    default:
      return '';
  }
};

export default TextNode;
