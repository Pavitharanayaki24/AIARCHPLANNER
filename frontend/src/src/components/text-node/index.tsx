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
  const [showShapes, setShowShapes] = useState(false);
  const [isMenuHovered, setIsMenuHovered] = useState(false);
  const textRef = useRef<HTMLDivElement>(null);
  const shapeMenuRef = useRef<HTMLDivElement>(null);
  const { getNode, setNodes, setEdges } = useReactFlow();
  const color = '#3F8AE2';
  const hideMenuTimeout = useRef<NodeJS.Timeout | null>(null);
  const shapes = ['circle', 'rectangle', 'triangle'] as const;

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

  // Add click outside handler for shape menu
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (shapeMenuRef.current && !(shapeMenuRef.current as HTMLElement).contains(event.target as HTMLElement)) {
        setShowShapes(false);
        setHoveredHandle(null);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

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
    setShowShapes(true);
  };

  const handleMouseLeave = () => {
    hideMenuTimeout.current = setTimeout(() => {
      if (!isMenuHovered) {
        setHoveredHandle(null);
        setShowShapes(false);
      }
    }, 200);
  };

  const handleShapeMenuMouseEnter = () => {
    setIsMenuHovered(true);
    if (hideMenuTimeout.current) {
      clearTimeout(hideMenuTimeout.current);
      hideMenuTimeout.current = null;
    }
  };

  const handleShapeMenuMouseLeave = () => {
    setIsMenuHovered(false);
    setHoveredHandle(null);
    setShowShapes(false);
  };

  const handleShapeClick = async (selectedShape: string) => {
    const node = getNode(id);
    if (!node) return;

    const offset = 150;
    const activeHandle = hoveredHandle ?? Position.Right;
    const newPosition = { x: node.position.x, y: node.position.y };
    let sourceHandle = '';
    let targetHandle = '';

    switch (activeHandle) {
      case Position.Top:
        newPosition.y -= offset;
        sourceHandle = 'top';
        targetHandle = 'bottom';
        break;
      case Position.Right:
        newPosition.x += offset;
        sourceHandle = 'right';
        targetHandle = 'left';
        break;
      case Position.Bottom:
        newPosition.y += offset;
        sourceHandle = 'bottom';
        targetHandle = 'top';
        break;
      case Position.Left:
        newPosition.x -= offset;
        sourceHandle = 'left';
        targetHandle = 'right';
        break;
    }

    const newId = `${id}-${selectedShape}-${Date.now()}`;
    const newNode = {
      id: newId,
      type: 'shape',
      position: newPosition,
      data: {
        title: selectedShape,
        type: selectedShape,
        color: color,
        label: selectedShape,
      },
      selected: true,
    };

    const newEdge = {
      id: `e${id}-${newId}`,
      source: id,
      target: newId,
      sourceHandle: sourceHandle,
      targetHandle: targetHandle,
      type: 'smoothstep',
    };

    setNodes((nds) => nds.map(n => ({ ...n, selected: false })).concat(newNode));
    setEdges((eds) => [...eds, newEdge]);
    setHoveredHandle(null);
    setShowShapes(false);
  };

  const showControls = selected || isNew;

  const positions = [
    { id: 'top', pos: Position.Top },
    { id: 'right', pos: Position.Right },
    { id: 'bottom', pos: Position.Bottom },
    { id: 'left', pos: Position.Left },
  ];

  const handleStyle = {
    width: 7,
    height: 7,
    borderRadius: '50%',
    backgroundColor: color,
    opacity: 0,
  };

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
            style={handleStyle}
            id={handleId}
            type="source"
            position={pos}
            className="opacity-0 group-hover:opacity-100 transition-opacity duration-200"
          />

          {/* Directional Arrows */}
          {/* Top Arrow */}
          {pos === Position.Top && (
            <div
              className={`absolute top-0 left-1/2 -translate-x-1/2 -translate-y-[30px] opacity-0 group-hover:opacity-30 hover:opacity-100 transition-all duration-200 cursor-pointer ${
                hoveredHandle === Position.Top ? 'opacity-100' : ''
              }`}
              onMouseEnter={() => handleMouseEnter(Position.Top)}
              onMouseLeave={handleMouseLeave}
            >
              <div className="w-[17px] h-[17px] flex flex-col items-center">
                <div
                  className="w-0 h-0 border-l-[8px] border-l-transparent border-r-[8px] border-r-transparent border-b-[10px]"
                  style={{ borderBottomColor: hoveredHandle === Position.Top ? color : `${color}4D` }}
                />
                <div
                  className="w-[3px] h-[17px] -mt-[1px]"
                  style={{ backgroundColor: hoveredHandle === Position.Top ? color : `${color}4D` }}
                />
              </div>
            </div>
          )}

          {/* Right Arrow */}
          {pos === Position.Right && (
            <div
              className={`absolute top-1/2 right-0 translate-x-[30px] -translate-y-1/2 opacity-0 group-hover:opacity-30 hover:opacity-100 transition-all duration-200 cursor-pointer ${
                hoveredHandle === Position.Right ? 'opacity-100' : ''
              }`}
              onMouseEnter={() => handleMouseEnter(Position.Right)}
              onMouseLeave={handleMouseLeave}
            >
              <div className="w-[17px] h-[17px] flex items-center ml-[0px]">
                <div
                  className="w-[17px] h-[3px]"
                  style={{ backgroundColor: hoveredHandle === Position.Right ? color : `${color}4D` }}
                />
                <div
                  className="w-0 h-0 border-l-[10px] border-y-[8px] border-y-transparent -ml-[1px]"
                  style={{ borderLeftColor: hoveredHandle === Position.Right ? color : `${color}4D` }}
                />
              </div>
            </div>
          )}

          {/* Bottom Arrow */}
          {pos === Position.Bottom && (
            <div
              className={`absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-[30px] opacity-0 group-hover:opacity-30 hover:opacity-100 transition-all duration-200 cursor-pointer ${
                hoveredHandle === Position.Bottom ? 'opacity-100' : ''
              }`}
              onMouseEnter={() => handleMouseEnter(Position.Bottom)}
              onMouseLeave={handleMouseLeave}
            >
              <div className="w-[17px] h-[17px] flex flex-col items-center mt-[10px]">
                <div
                  className="w-[3px] h-[17px]"
                  style={{ backgroundColor: hoveredHandle === Position.Bottom ? color : `${color}4D` }}
                />
                <div
                  className="w-0 h-0 border-l-[8px] border-l-transparent border-r-[8px] border-r-transparent border-t-[10px] -mt-[1px]"
                  style={{ borderTopColor: hoveredHandle === Position.Bottom ? color : `${color}4D` }}
                />
              </div>
            </div>
          )}

          {/* Left Arrow */}
          {pos === Position.Left && (
            <div
              className={`absolute top-1/2 left-0 -translate-x-[30px] -translate-y-1/2 opacity-0 group-hover:opacity-30 hover:opacity-100 transition-all duration-200 cursor-pointer ${
                hoveredHandle === Position.Left ? 'opacity-100' : ''
              }`}
              onMouseEnter={() => handleMouseEnter(Position.Left)}
              onMouseLeave={handleMouseLeave}
            >
              <div className="w-[17px] h-[17px] flex items-center justify-end mr-[10px]">
                <div
                  className="w-0 h-0 border-r-[10px] border-y-[8px] border-y-transparent -mr-[1px]"
                  style={{ borderRightColor: hoveredHandle === Position.Left ? color : `${color}4D` }}
                />
                <div
                  className="w-[17px] h-[3px]"
                  style={{ backgroundColor: hoveredHandle === Position.Left ? color : `${color}4D` }}
                />
              </div>
            </div>
          )}
        </React.Fragment>
      ))}

      {/* Shape Menu */}
      {showShapes && hoveredHandle && (
        <div
          ref={shapeMenuRef}
          onMouseEnter={() => {
            handleShapeMenuMouseEnter();
            setIsMenuHovered(true);
          }}
          onMouseLeave={() => {
            handleShapeMenuMouseLeave();
            setIsMenuHovered(false);
          }}
          className={`absolute bg-white shadow-md rounded-lg p-2 z-20 ${
            hoveredHandle === Position.Top || hoveredHandle === Position.Bottom
              ? 'w-[160px] grid grid-flow-col gap-2'
              : 'w-[50px] grid grid-cols-1 gap-2'
          }`}
          style={{
            left:
              hoveredHandle === Position.Right
                ? '100%'
                : hoveredHandle === Position.Left
                ? 'auto'
                : '50%',
            right: hoveredHandle === Position.Left ? '100%' : 'auto',
            top:
              hoveredHandle === Position.Bottom
                ? '100%'
                : hoveredHandle === Position.Top
                ? 'auto'
                : '50%',
            bottom: hoveredHandle === Position.Top ? '100%' : 'auto',
            transform:
              hoveredHandle === Position.Right
                ? 'translate(30px, -50%)'
                : hoveredHandle === Position.Left
                ? 'translate(-30px, -50%)'
                : hoveredHandle === Position.Bottom
                ? 'translate(-50%, 30px)'
                : 'translate(-50%, -30px)',
          }}
        >
          {shapes.map((shape) => (
            <div
              key={shape}
              className="w-[40px] h-[40px] rounded border border-gray-200 flex items-center justify-center cursor-pointer hover:border-blue-500"
              onClick={() => handleShapeClick(shape)}
            >
              {shape === 'circle' && (
                <div className="w-6 h-6 rounded-full bg-blue-500" />
              )}
              {shape === 'rectangle' && (
                <div className="w-6 h-6 bg-blue-500" />
              )}
              {shape === 'triangle' && (
                <div className="w-0 h-0 border-l-[12px] border-l-transparent border-r-[12px] border-r-transparent border-b-[20px] border-b-blue-500" />
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default TextNode;
