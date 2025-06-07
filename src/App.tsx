import React, { useState, useCallback, DragEvent, DragEventHandler, useEffect, useRef } from 'react';
import { BezierEdge, StraightEdge, StepEdge, SmoothStepEdge, ReactFlow, Background, ReactFlowProvider, ConnectionLineType, MarkerType, ConnectionMode, Panel, NodeTypes, 
  DefaultEdgeOptions, useReactFlow, MiniMap, addEdge, useNodesState, Node, Edge, Connection, useEdgesState, applyNodeChanges, NodeChange, OnNodesChange, 
  Viewport,
  OnConnect,
  EdgeProps,
  EdgeChange,
  Controls,
  applyEdgeChanges,
} from '@xyflow/react';
import { v4 as uuidv4 } from 'uuid';
import { NodeContext, NodeProvider } from './NodeContext';
import { ShapeNode } from './components/shape/types';

interface FloatingText {
  id: string;
  text: string;
  position: { x: number; y: number };
  isEditing: boolean;
  selected?: boolean;
}

interface ExampleProps {
  theme?: 'light';
  snapToGrid?: boolean;
  panOnScroll?: boolean;
  zoomOnDoubleClick?: boolean;
}

interface HistoryState {
  nodes: ShapeNode[];
  edges: Edge[];
}

function ShapesProExampleApp({
  theme = 'light',
  snapToGrid = true,
  panOnScroll = true,
  zoomOnDoubleClick = false,
}: ExampleProps) {
  const [nodes, setNodes] = useNodesState<ShapeNode>([]);
  const [edges, setEdges] = useEdgesState<Edge>([]);
  const [selectedNode, setSelectedNode] = useState<ShapeNode | null>(null);
  const [selectedNodes, setSelectedNodes] = useState<ShapeNode[]>([]);
  const [selectedEdges, setSelectedEdges] = useState<Edge[]>([]);
  const [floatingTexts, setFloatingTexts] = useState<FloatingText[]>([]);
  const [history, setHistory] = useState<HistoryState[]>([]);
  const [future, setFuture] = useState<HistoryState[]>([]);
  const flowRef = useRef<HTMLDivElement | null>(null);

  const setSortedNodes = (valueOrFn: any[] | ((prev: any[]) => any[])) => {
    setNodes(prev => {
      const updatedNodes =
        typeof valueOrFn === "function"
          ? (valueOrFn as (prev: any[]) => any[])(prev)
          : valueOrFn;
      return updatedNodes;
    });
  };

  const selectAll = () => {
    // Update nodes
    const updatedNodes = nodes.map(node => ({ ...node, selected: true }));
    const updatedEdges = edges.map(edge => ({ ...edge, selected: true }));
    const updatedTexts = floatingTexts.map(text => ({ ...text, selected: true }));

    // Update React Flow's internal state
    setSortedNodes(updatedNodes);
    setNodes(updatedNodes);
    setSelectedNodes(updatedNodes);
    
    // Update edges state
    setEdges(updatedEdges);
    setSelectedEdges(updatedEdges);

    // Update floating texts
    setFloatingTexts(updatedTexts);

    // Push to history for undo/redo
    pushToHistory(updatedNodes, updatedEdges);
  };

  const handleCanvasClick = () => {
    setSelectedNode(null);
    setSelectedNodes([]);
    setSelectedEdges([]);
    setNodes(nodes.map(n => ({ ...n, selected: false })));
    setEdges(edges.map(e => ({ ...e, selected: false })));
    setFloatingTexts(texts => texts.map(t => ({ ...t, selected: false })));
  };

  const contextValue = {
    selectedNode,
    setSelectedNode,
    selectedNodes,
    setSelectedNodes,
    selectedEdges,
    setSelectedEdges,
    nodes,
    setNodes,
    setSortedNodes,
    edges,
    setEdges,
    pushToHistory: (newNodes: ShapeNode[], newEdges: Edge[]) => {
      setHistory(prev => [...prev, { nodes: nodes, edges: edges }]);
      setFuture([]);
      setNodes(newNodes);
      setEdges(newEdges);
    }
  };

  return (
    <div className="app-container">
      <NodeProvider value={contextValue}>
        <div ref={flowRef} 
          onMouseDown={handleMouseDown}
          onContextMenu={onContextMenu}
          onDoubleClick={handleDoubleClick} 
          style={{ width: '100%', height: '100vh', position: "relative" }}
        >
          {/* ... existing components ... */}
          {floatingTexts.map(floatingText => (
            <div
              key={floatingText.id}
              style={{
                position: 'absolute',
                left: `${floatingText.position.x}px`,
                top: `${floatingText.position.y}px`,
                background: 'white',
                padding: '1px 2px',
                border: floatingText.selected ? '1px solid #1a192b' : '1px dashed #999',
                cursor: floatingText.isEditing ? 'text' : 'move',
                zIndex: 1000,
                transform: 'translate(-50%, -50%)',
                minWidth: '30px',
                maxWidth: '80px',
                height: '18px',
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center'
              }}
              onClick={(e) => {
                e.stopPropagation();
                if (!ctrlPressed) {
                  // Clear other selections if Ctrl is not pressed
                  setSelectedNode(null);
                  setSelectedNodes([]);
                  setSelectedEdges([]);
                  setNodes(nodes.map(n => ({ ...n, selected: false })));
                  setEdges(edges.map(e => ({ ...e, selected: false })));
                  setFloatingTexts(texts => texts.map(t => ({ 
                    ...t, 
                    selected: t.id === floatingText.id 
                  })));
                } else {
                  // Toggle selection of this text box while keeping other selections
                  setFloatingTexts(texts => texts.map(t => 
                    t.id === floatingText.id ? { ...t, selected: !t.selected } : t
                  ));
                }
              }}
              draggable={!floatingText.isEditing}
              onDragStart={(e) => {
                const dragImg = document.createElement('div');
                dragImg.style.opacity = '0';
                document.body.appendChild(dragImg);
                e.dataTransfer.setDragImage(dragImg, 0, 0);
                setTimeout(() => document.body.removeChild(dragImg), 0);
              }}
              onDrag={(e) => onFloatingTextDrag(e, floatingText.id)}
              onDragEnd={() => {}}
              onDragLeave={onFloatingTextDragLeave}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => onFloatingTextDrop(e, floatingText.id)}
            >
              <input
                type="text"
                value={floatingText.text}
                onChange={(e) => setFloatingTexts(prev => prev.map(text => 
                  text.id === floatingText.id ? { ...text, text: e.target.value } : text
                ))}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    setFloatingTexts(prev => prev.map(text => 
                      text.id === floatingText.id ? { ...text, isEditing: false } : text
                    ));
                  }
                }}
                onBlur={() => {
                  setFloatingTexts(prev => prev.map(text => 
                    text.id === floatingText.id ? { ...text, isEditing: false } : text
                  ));
                }}
                placeholder="Text"
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
                onClick={(e) => {
                  e.stopPropagation();
                  setFloatingTexts(prev => prev.map(text => 
                    text.id === floatingText.id ? { ...text, isEditing: true } : text
                  ));
                }}
              />
            </div>
          ))}
          {/* ... rest of the existing components ... */}
        </div>
      </NodeProvider>
    </div>
  );
}

export default ShapesProExampleApp; 