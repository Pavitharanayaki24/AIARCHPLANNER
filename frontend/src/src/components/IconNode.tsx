import React, { useState, useEffect, useRef } from "react";
import {
  NodeResizer,
  Handle,
  Position,
  type NodeProps,
  useKeyPress,
  useReactFlow,
  useStore,
  Edge,
} from "@xyflow/react";
import { FaPlusCircle } from "react-icons/fa";
import { ShapeNode, ShapeType } from './shape/types';
import { v4 as uuidv4 } from 'uuid';
import { useNodeContext } from "../NodeContext";
import Shape from './shape';
import ELK from 'elkjs/lib/elk.bundled.js';
import { FaSync } from "react-icons/fa";

interface IconNodeProps extends NodeProps {
  data: {
    iconSrc: string;
    title: string;
    hideLabel?: boolean;
    onShapeSelect?: (shape: string, handle: Position) => void;
    id?: string;
  };
}

function useNodeDimensions(id: string) {
  const node = useStore((state) => state.nodeLookup.get(id));
  return {
    width: node?.measured?.width || 0,
    height: node?.measured?.height || 0,
  };
}

const IconNode: React.FC<IconNodeProps> = ({   
  data,
  selected,
  type,
  id
}: {
  data: { 
    iconSrc: string; 
    title: string; 
    hideLabel?: boolean; 
    onShapeSelect?: (shape: string, handle: Position) => void;
    id?: string; 
  };
  selected: boolean;
  type: string;
  id: string;
}) => {
  const {
    nodes,
    setSelectedNode,
    setSelectedNodes,
    edges,
    setEdges,
    setSortedNodes,
    pushToHistory,
  } = useNodeContext();
  const [isEditing, setIsEditing] = useState(false);
  const [label, setLabel] = useState(data.title);
  const shiftKeyPressed = useKeyPress('Shift');
  const { width, height } = useNodeDimensions(id);

  const [showShapes, setShowShapes] = useState(false);
  const { getNodes, getEdges } = useReactFlow();  
  const shapeMenuRef = useRef<HTMLDivElement>(null);
  const [isMenuHovered, setIsMenuHovered] = useState(false);
  const [hoveredHandle, setHoveredHandle] = useState<string | null>(null);
  const [nodeHovered, setNodeHovered] = useState(false);
  const [hoveredPlus, setHoveredPlus] = useState<Position | null>(null);
  const shapes = ['circle', 'rectangle', 'triangle'] as const;
  const hideMenuTimeout = useRef<NodeJS.Timeout | null>(null);

  // Add click outside handler
  const handleDoubleClick = () => {
    if (!data.hideLabel) setIsEditing(true);
  };

  const handleBlur = () => setIsEditing(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setLabel(e.target.value);
  };

  // Add click outside handler
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
  
  // for Handle
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

  const elk = new ELK();
  const elkOptions = {
    'elk.algorithm': 'layered',
    'elk.layered.spacing.nodeNodeBetweenLayers': '50',
  };

  const getLayoutedElements = async (
    nodes: any[],
    edges: Edge[],
    rootNodeId: string,
    sourceHandle: string,
    options = {}
  ): Promise<{ nodes: any[]; edges: Edge[] }> => {
    const nodeMap = new Map(nodes.map((node) => [node.id, node]));
    const sourceNode = nodeMap.get(rootNodeId);
    if (!sourceNode) return { nodes, edges };

    // Get edges that are children from this sourceHandle
    const childEdges = edges.filter(
      (edge) =>
        edge.source === rootNodeId &&
        edge.sourceHandle === sourceHandle &&
        nodeMap.has(edge.target)
    );

    // Collect child node ids (includes all children, so includes newly added nodes)
    const childNodeIds = childEdges.map((edge) => edge.target);
    if (childNodeIds.length === 0) return { nodes, edges };

    // Build elkNodes for layout: source node + all children
    const elkNodes = [
      {
        id: sourceNode.id,
        width: sourceNode.width,
        height: sourceNode.height,
      },
      ...childNodeIds.map((id) => {
        const node = nodeMap.get(id);
        return {
          id: node.id,
          width: node.width,
          height: node.height,
        };
      }),
    ];

    const elkEdges = childEdges.map((edge) => ({
      id: edge.id,
      sources: [edge.source],
      targets: [edge.target],
    }));

    const graph = {
      id: 'root',
      layoutOptions: options,
      children: elkNodes,
      edges: elkEdges,
    };

    // Perform layout
    const layout = await elk.layout(graph);

    // Find the first existing child (for offset baseline)
    const firstChildId = childNodeIds[0];
    const originalFirstChild = nodeMap.get(firstChildId);
    const layoutedFirstChild = layout.children?.find((n) => n.id === firstChildId);

    // Calculate offset between original position and layouted position of first child
    let offsetX = 0;
    let offsetY = 0;
    if (
      layoutedFirstChild &&
      originalFirstChild &&
      originalFirstChild.position &&
      layoutedFirstChild.x != null &&
      layoutedFirstChild.y != null
    ) {
      offsetX = originalFirstChild.position.x - layoutedFirstChild.x;
      offsetY = originalFirstChild.position.y - layoutedFirstChild.y;
    }

    // Apply offset to all layouted children nodes
    const layoutedNodes = nodes.map((node) => {
      if (!childNodeIds.includes(node.id)) return node;

      const layoutedNode = layout.children?.find((n) => n.id === node.id);
      if (!layoutedNode || layoutedNode.x == null || layoutedNode.y == null) return node;

      return {
        ...node,
        position: {
          x: layoutedNode.x + offsetX,
          y: layoutedNode.y + offsetY,
        },
      };
    });

    return { nodes: layoutedNodes, edges };
  };

  const layoutGraph = async (
    nodes: any[],
    edges: Edge[],
    sourceNodeId: string,
    sourceHandle: string
  ) => {
    let direction: string;

    switch (sourceHandle) {
      case 'top':
        direction = 'UP';
        break;
      case 'bottom':
        direction = 'DOWN';
        break;
      case 'left':
        direction = 'LEFT';
        break;
      case 'right':
        direction = 'RIGHT';
        break;
      default:
        direction = 'RIGHT';
    }

    const layouted = await getLayoutedElements(nodes, edges, sourceNodeId, sourceHandle, {
      'elk.direction': direction,
      ...elkOptions,
    });

    return layouted;
  };

  const handleShapeClick = async (selectedShape: string) => {
    const nodes = getNodes();
    const currentNode = nodes.find(node => node.id === id);
    
    if (!currentNode) return;
    
    const offset = 200;
    const activeHandle = hoveredHandle ?? Position.Right;
    const newPosition = { x: currentNode.position.x, y: currentNode.position.y };
    let sourceHandle = '';
    let targetHandle = '';
    
    // Determine position and handles based on the active handle
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
    
    // Create new node
    const newNode = {
          id: uuidv4(),
          type: 'shape',
          position: newPosition,
          width: 100,
          height: 100,
          data: {
            title: selectedShape,
            iconSrc: '',
            type: selectedShape as ShapeType,
            color: '#3F8AE2',
            label: selectedShape,
          },
          selected: true,
        };

    // Create edge with proper handles
    const newEdge = {
      id: `edge-${uuidv4()}`,
      source: currentNode.id,
      target: newNode.id,
      type: 'smoothstep',
      sourceHandle: sourceHandle,
      targetHandle: targetHandle,
      data: {
        algorithm: 'smoothstep',
        points: []
      }
    };
    const updatedNodes = [...nodes.map(n => ({ ...n, selected: false })), newNode];
    const updatedEdges = [...edges, newEdge];
    const { nodes: layoutedNodes, edges: layoutedEdges } = await layoutGraph(
      updatedNodes,
      updatedEdges,
      currentNode.id,
      sourceHandle
    );
    setSortedNodes(layoutedNodes);
    setEdges(layoutedEdges);
    pushToHistory(layoutedNodes, layoutedEdges);
    const layoutedNewNode = layoutedNodes.find(n => n.id === newNode.id);
    if (layoutedNewNode) {
      setSelectedNode(layoutedNewNode);
      setSelectedNodes([layoutedNewNode]);
    }
    setHoveredHandle(null);
    setShowShapes(false);
  };
  
  const handleStyle = {
    width: 7,
    height: 7,
    borderRadius: '50%',
    backgroundColor: '#555',
  };

  const positions = [
    { id: 'top', pos: Position.Top },
    { id: 'right', pos: Position.Right },
    { id: 'bottom', pos: Position.Bottom },
    { id: 'left', pos: Position.Left },
  ];

  // Find child nodes connected from a specific handle (sourceHandleId)
  function getChildNodesForHandle(sourceHandleId: string | null | undefined) {
    // edges where source = current node id and sourceHandle = handle id
    const childEdges = edges.filter(
      (e) => e.source === id && e.sourceHandle === sourceHandleId
    );
    const childNodeIds = childEdges.map((e) => e.target);
    const childNodes = nodes.filter((node) => childNodeIds.includes(node.id));
    return childNodes;
  }

  // Check if all child nodes are "identical" (by type, or data.id)
  function areAllChildNodesIdentical(childNodes: any[]) {
    if (childNodes.length === 0) return false;
    const first = childNodes[0];
    return childNodes.every(
        (node) => node.data.title === first.data.title
    );
  }

  // Clone child nodes connected from handle if all are identical
  function handlePlusClick(sourceHandle: string) {
    const nodes = getNodes();
    const currentNode = nodes.find(node => node.id === id);
    if (!currentNode) return;

    const childNodes = getChildNodesForHandle(sourceHandle);

    if (!areAllChildNodesIdentical(childNodes)) {
      alert("Child nodes are not identical. Cannot clone.");
      return;
    }

    const lastChild = childNodes[childNodes.length - 1];
    const newNodeId = `clone-${Date.now()}`;

    const newNode = {
      ...lastChild,
      id: newNodeId,
      selected: true,
      position: { ...lastChild.position }, // Temporary; will be overridden by layout
      data: { ...lastChild.data },
    };

    let targetHandle = '';
    switch (sourceHandle) {
      case 'top': targetHandle = 'bottom'; break;
      case 'right': targetHandle = 'left'; break;
      case 'bottom': targetHandle = 'top'; break;
      case 'left': targetHandle = 'right'; break;
      default: targetHandle = 'top';
    }

    const newEdge = {
      id: `edge-${uuidv4()}`,
      source: currentNode.id,
      sourceHandle: sourceHandle,
      target: newNodeId,
      targetHandle: targetHandle,
      type: 'smoothstep',
      data: {
        algorithm: 'smoothstep',
        points: [],
      },
    };

    const updatedNodes = [...getNodes(), newNode];
    const updatedEdges = [...getEdges(), newEdge];

    layoutGraph(updatedNodes, updatedEdges, currentNode.id, sourceHandle).then(({ nodes, edges }) => {
      setSortedNodes(nodes);
      setEdges(edges);

      const layoutedNewNode = nodes.find(n => n.id === newNodeId);
      if (layoutedNewNode) {
        setSelectedNode(layoutedNewNode);
        setSelectedNodes([layoutedNewNode]);
      }
    });
  }

  // Conditionally render the plus icon
  function shouldRenderPlusIcon(handleId: string) {
    const childNodes = getChildNodesForHandle(handleId);
    return childNodes.length > 0 && areAllChildNodesIdentical(childNodes);
  }

  // For showing plus icon between Handle and Arrow
  function renderPlusIcon(handleId: string, position: Position) {
    if (!nodeHovered) return null;
    const isPlusHovered = hoveredPlus === position;
    return (
      <div
        className="absolute cursor-pointer z-30"
        style={{
          top:
            position === Position.Top
              ? "2px"
              : position === Position.Bottom
              ? "calc(100% - 17px)"
              : "50%",
          left:
            position === Position.Left
              ? "2px"
              : position === Position.Right
              ? "calc(100% - 16px)"
              : "50%",
          transform:
            position === Position.Top || position === Position.Bottom
              ? "translateX(-50%)"
              : "translateY(-50%)",
        }}
        onClick={(e) => {
          e.stopPropagation();
          handlePlusClick(position);
        }}
        title="Clone child node"
        onMouseEnter={() => setHoveredPlus(position)}
        onMouseLeave={() => setHoveredPlus(null)}
        >
        <FaPlusCircle size={14} style={{color: isPlusHovered ? "#000" : "#555", cursor: "pointer"}}/>      
      </div>
    );
  }

  
  return (
    <div className="group relative w-full h-full"
      onMouseEnter={() => setNodeHovered(true)}
      onMouseLeave={() => setNodeHovered(false)}>
      <NodeResizer
        isVisible={selected}
        keepAspectRatio={shiftKeyPressed}
        minWidth={50}
        minHeight={50}
        handleStyle={{ width: 6, height: 6 }}
        color={"#555"}
      />
      <div className="w-full h-full flex items-center justify-center relative">
        <img
          src={data.iconSrc as string}
          alt={label as string}
          className="w-full h-full object-contain pointer-events-none"
        />
        {!data.hideLabel && (
          <div
            onDoubleClick={handleDoubleClick}
            className="absolute inset-0 flex items-center justify-center"
          >
            {isEditing ? (
              <input
                value={label as string}
                autoFocus
                onChange={handleChange}
                onBlur={handleBlur}
                onKeyDown={(e) => {
                  if (e.key === "Enter") e.currentTarget.blur();
                }}
                className="outline-none text-black text-xs bg-transparent border-none p-0 m-0 w-3/4 text-center"
              />
            ) : null}
          </div>
        )}
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
      {/* Plus icon between handle and arrow */}
      {shouldRenderPlusIcon(handleId) && renderPlusIcon(handleId, pos)}
      {/* Directional Arrows */}
        {/* Top Arrow */}
        <div className={`absolute top-0 left-1/2 -translate-x-1/2 -translate-y-[30px] opacity-0 group-hover:opacity-30 hover:opacity-100 transition-all duration-200 cursor-pointer ${hoveredHandle === Position.Top ? 'opacity-100' : ''}`}
            onMouseEnter={() => handleMouseEnter(Position.Top)}
            onMouseLeave={handleMouseLeave}
        >
          <div className="w-[17px] h-[17px] flex flex-col items-center">
            {/* Top arrow head */}
            <div
              className="w-0 h-0 border-l-[8px] border-l-transparent border-r-[8px] border-r-transparent border-b-[10px] transition-all duration-200"
              style={{ borderBottomColor: hoveredHandle === Position.Top ? '#000' : '#555' }}
            />
            {/* Top arrow body */}
            <div
              className="w-[3px] h-[17px] transition-all duration-200 -mt-[1px]"
              style={{ backgroundColor: hoveredHandle === Position.Top ? '#000' : '#555' }}
            />
          </div>
        </div>

        {/* Right Arrow */}
        <div className={`absolute top-1/2 right-0 translate-x-[30px] -translate-y-1/2 opacity-0 group-hover:opacity-30 hover:opacity-100 transition-all duration-200 cursor-pointer ${hoveredHandle === Position.Right ? 'opacity-100' : ''}`}
            onMouseEnter={() => handleMouseEnter(Position.Right)}
            onMouseLeave={handleMouseLeave}
        >
          <div className="w-[17px] h-[17px] flex items-center ml-[10px]">
            {/* Right arrow body */}
            <div
              className="w-[17px] h-[3px] transition-all duration-200"
              style={{ backgroundColor: hoveredHandle === Position.Right ? '#000' : '#555' }}
            />
            {/* Right arrow head */}
            <div
              className="w-0 h-0 border-l-[10px] border-y-[8px] border-y-transparent transition-all duration-200 -ml-[1px]"
              style={{ borderLeftColor: hoveredHandle === Position.Right ? '#000' : '#555' }}
            />
          </div>
        </div>
        
        {/* Bottom Arrow */}
        <div className={`absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-[30px] opacity-0 group-hover:opacity-30 hover:opacity-100 transition-all duration-200 cursor-pointer ${hoveredHandle === Position.Bottom ? 'opacity-100' : ''}`}
            onMouseEnter={() => handleMouseEnter(Position.Bottom)}
            onMouseLeave={handleMouseLeave}
        >
          <div className="w-[17px] h-[17px] flex flex-col items-center mt-[10px]">
            {/* Bottom arrow body */}
            <div
              className="w-[3px] h-[17px] transition-all duration-200"
              style={{ backgroundColor: hoveredHandle === Position.Bottom ? '#000' : '#555' }}
            />
            {/* Bottom arrow head */}
            <div
              className="w-0 h-0 border-l-[8px] border-l-transparent border-r-[8px] border-r-transparent border-t-[10px] transition-all duration-200 -mt-[1px]"
              style={{ borderTopColor: hoveredHandle === Position.Bottom ? '#000' : '#555' }}
            />
          </div>
        </div>

        {/* Left Arrow */}
        <div className={`absolute top-1/2 left-0 -translate-x-[30px] -translate-y-1/2 opacity-0 group-hover:opacity-30 hover:opacity-100 transition-all duration-200 cursor-pointer ${hoveredHandle === Position.Left ? 'opacity-100' : ''}`}
            onMouseEnter={() => handleMouseEnter(Position.Left)}
            onMouseLeave={handleMouseLeave}
        >
          <div className="w-[17px] h-[17px] flex items-center justify-end mr-[10px]">
            {/* Left arrow head */}
            <div
              className="w-0 h-0 border-r-[10px] border-y-[8px] border-y-transparent transition-all duration-200 -mr-[1px]"
              style={{ borderRightColor: hoveredHandle === Position.Left ? '#000' : '#555' }}
            />
            {/* Left arrow body */}
            <div
              className="w-[17px] h-[3px] transition-all duration-200"
              style={{ backgroundColor: hoveredHandle === Position.Left ? '#000' : '#555' }}
            />
          </div>
        </div>
      </React.Fragment>
      ))}
      {/* Shape Selection Menu */}
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
            left: hoveredHandle === Position.Right ? '100%' : 
                  hoveredHandle === Position.Left ? 'auto' : '50%',
            right: hoveredHandle === Position.Left ? '100%' : 'auto',
            top: hoveredHandle === Position.Bottom ? '100%' : 
                  hoveredHandle === Position.Top ? 'auto' : '50%',
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
          {shapes.map((shapeType) => (
            <div
              key={shapeType}
              className="w-8 h-8 cursor-pointer flex items-center justify-center hover:bg-blue-50"
              onClick={(e) => {e.stopPropagation(); handleShapeClick(shapeType)}}
            >
              <Shape
                type={shapeType}
                width={30}
                height={30}
                fill="#3F8AE2"
                fillOpacity={0.7}
                stroke="#3F8AE2"
                strokeWidth={2}
              /> 
            </div>
          ))}
        </div>         
      )}
    </div>
  );
};

export default IconNode;