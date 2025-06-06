'use client';

import React, { useState, useCallback, DragEvent, DragEventHandler, useEffect, useRef } from 'react';
import { BezierEdge, StraightEdge, StepEdge, SmoothStepEdge, ReactFlow, Background, ReactFlowProvider, ConnectionLineType, MarkerType, ConnectionMode, Panel, NodeTypes, 
  DefaultEdgeOptions, useReactFlow, MiniMap, addEdge, useNodesState, Node, Edge, Connection, useEdgesState, applyNodeChanges, NodeChange, OnNodesChange, 
  Viewport,
  OnConnect,
  EdgeProps} from '@xyflow/react';
import { v4 as uuidv4 } from 'uuid';
import { NodeContext } from "./NodeContext";
import NodeEdgeContextMenu from './components/NodeEdgeContextMenu';

import '@xyflow/react/dist/style.css';

import ShapeNodeComponent from './components/shape-node';
import { ShapeNode, ShapeType } from './components/shape/types';
import Sidebar from './components/SideBar';
import TopBar from './components/TopBar';
import { BottomControls } from './components/BottomControls';
import { CenterBar } from './components/CenterBar';
import { UserInfoBar, RocketCounter } from './components/UserInfoBar';
import IconNode from './components/IconNode';
import HelperLines from './HelperLines';
import { getHelperLines } from './utils';
import RightsidePanel from './components/toolbar/RightsidePanel'; 
import PreviewModal from './PreviewModal';
import { saveGraph, loadGraph, ensureGraphReady } from "./graphStorage";
import MessageBox from './MessageBox';
import { attachNodesToContainer } from './DynamicGrouping';
import CustomBezierEdge from './components/control_points_edges/CustomBezierEdge';
import CustomLinearEdge from './components/control_points_edges/CustomLinearEdge';
import CustomSmoothStepEdge from './components/control_points_edges/CustomSmoothStepEdge/CustomSmoothstepEdge';
import CurvedEdge from './components/edges/CurvedEdges';
import LinearEdge from './components/edges/LinearEdges';
import OthogonalEdge from './components/edges/OthogonalEdge';
import TextNode from './components/text-node';
import ContextMenu from './components/ContextMenu';

const nodeTypes: NodeTypes = {
  'custom-shape': IconNode,
  shape: ShapeNodeComponent,
  text: TextNode,
};

// Define edgeTypes outside the component to prevent recreation on each render
// const edgeTypes = {
//   curved: CustomBezierEdge,
//   linear: CustomLinearEdge,
//   smoothstep: CustomSmoothStepEdge,
// };

// Define edgeTypes outside the component to prevent recreation on each render
const edgeTypes = {
  curved: CurvedEdge,
  linear: LinearEdge,
  smoothstep: OthogonalEdge,
};

const defaultEdgeOptions: DefaultEdgeOptions = {
  type: 'smoothstep',
  markerEnd: { type: MarkerType.ArrowClosed, orient: 'auto' },
  style: { strokeWidth: 2 },
};

const isAwsIcon = (iconSrc: any) => {
  return iconSrc.toLowerCase().includes('aws');
};

const proOptions = { account: 'paid-pro', hideAttribution: true };

type ExampleProps = {
  theme?: 'light';
  snapToGrid?: boolean;
  panOnScroll?: boolean;
  zoomOnDoubleClick?: boolean;
};

type HistoryState = {
  nodes: ShapeNode[];
  edges: Edge[];
};

// Add this type definition
interface CopiedElements {
  nodes: Node[];
  edges: Edge[];
}

function ShapesProExampleApp({
  theme = 'light', // Always light theme
  snapToGrid = true, // Always snap to grid
  panOnScroll = true, // Always pan on scroll
  zoomOnDoubleClick = false,
}: ExampleProps) {
  const [nodes, setNodes] = useNodesState<ShapeNode>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);  
  const { screenToFlowPosition } = useReactFlow<ShapeNode>();
  const [title, setTitle] = useState("Untitled");
  const [history, setHistory] = useState<HistoryState[]>([]);
  const [future, setFuture] = useState<HistoryState[]>([]);
  const [copiedElements, setCopiedElements] = useState<CopiedElements | null>(null);
  const [selectedNode, setSelectedNode] = useState<ShapeNode | null>(null);
  const [selectedNodes, setSelectedNodes] = useState<ShapeNode[]>([]);
  const [selectedEdges, setSelectedEdges] = useState<Edge[]>([]);
  const [isFirstUndo, setIsFirstUndo] = useState(true);
  const [pasteCount, setPasteCount] = useState<number>(1);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [forceUpdate, setForceUpdate] = useState(0);
  const [selectionStart, setSelectionStart] = useState<{ x: number, y: number } | null>(null);
  const [selectionBox, setSelectionBox] = useState<DOMRect | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [skipNextClick, setSkipNextClick] = useState(false);
  const lastSelectionBoxRef = useRef<DOMRect | null>(null);
  const [ctrlPressed, setCtrlPressed] = useState(false);
  const flowRef = useRef<HTMLDivElement | null>(null);
  const { getViewport, getZoom } = useReactFlow();

  const [helperLineHorizontal, setHelperLineHorizontal] = useState<
    number | undefined
  >(undefined);
  const [helperLineVertical, setHelperLineVertical] = useState<
    number | undefined
  >(undefined);
  const [helperLineSpacingGuides, setHelperLineSpacingGuides] = useState<
  {
    between: [{ x: number; y: number }, { x: number; y: number }];
    distance: number;
  }[]
  >([]);
  const [helperLineHorizontalEdges, setHelperLineHorizontalEdges] = useState<
  { left: number; right: number } | undefined
  >(undefined);
  const [helperLineVerticalEdges, setHelperLineVerticalEdges] = useState<
    { top: number; bottom: number } | undefined
  >(undefined);

  const [contextMenu, setContextMenu] = useState<{ x: number; y: number } | null>(null);
  const [nodeEdgeContextMenu, setNodeEdgeContextMenu] = useState<{ x: number; y: number } | null>(null);

    function sortNodesByParentChildRelationship(nodes: ShapeNode[]) {
      // First, create a map of node ids for easy lookup
      const nodeMap = new Map(nodes.map(node => [node.id, node]));

      // Sort nodes: parent nodes first
      return nodes.slice().sort((a, b) => {
        if (a.parentId && !b.parentId) {
          return 1; // a is child, comes after b
        }
        if (!a.parentId && b.parentId) {
          return -1; // a is parent, comes before b
        }
        if (a.parentId && b.parentId) {
          return a.parentId.localeCompare(b.parentId); // arbitrary but consistent
        }
        return 0; // no parent-child relation
      });
    }

    const setSortedNodes = (valueOrFn: any[] | ((prev: any[]) => any[])) => {
      setNodes(prev => {
        const updatedNodes =
          typeof valueOrFn === "function"
            ? (valueOrFn as (prev: any[]) => any[])(prev)
            : valueOrFn;
        return sortNodesByParentChildRelationship(updatedNodes);
      });
    };
    
  const pushToHistory = (newNodes: any[], newEdges: Edge[]) => {
    const cloneNode = (node: any): any => ({
      ...node,
      data: {
        ...node.data,
        label: node.data.label,
      },
    });
    const withoutSelected = (nodes: any[]) =>
      nodes.map(({ selected, ...node }) => cloneNode(node));
  
    if (newNodes.length === 0 && newEdges.length === 0) return;
  
    const prevNodesCleaned = withoutSelected(nodes);
    const newNodesCleaned = withoutSelected(newNodes);
    const positionsChanged = nodes.some((node) => {
      const newNode = newNodes.find((n) => n.id === node.id);
      return newNode && (
        newNode.position.x !== node.position.x ||
        newNode.position.y !== node.position.y
      );
    });
    const nodeCountChanged = nodes.length !== newNodes.length;
    const nodeStructureChanged = JSON.stringify(prevNodesCleaned) !== JSON.stringify(newNodesCleaned);
    const edgesChanged = JSON.stringify(edges) !== JSON.stringify(newEdges);
    const nodesChanged = nodeCountChanged || nodeStructureChanged || positionsChanged;
  
    if (!nodesChanged && !edgesChanged) return;
    setHistory((prev) => {
      if (prev.length === 0) {
        return [
          {
            nodes: nodes.map(cloneNode),
            edges: [...edges], // shallow copy is okay unless deeply mutated
          },
        ];
      }
      const last = prev[prev.length - 1];
      const lastNodesCleaned = withoutSelected(last.nodes);
      const lastEdges = last.edges;
      const isDuplicate =
        JSON.stringify(lastNodesCleaned) === JSON.stringify(newNodesCleaned) &&
        JSON.stringify(lastEdges) === JSON.stringify(newEdges);
  
      setIsFirstUndo(true);
      if (isDuplicate) return prev;
      return [
        ...prev,
        {
          nodes: newNodes.map(cloneNode),
          edges: [...newEdges],
        },
      ];
    });
    setFuture([]); // Clear redo stack
  };  
 
  const onColorChange = (nodeId: string, newColor: string) => {
    setSortedNodes((nds) => {
      const updatedNodes = nds.map((node) =>
        node.id === nodeId
          ? {
              ...node,
              data: {
                ...node.data,
                color: newColor,
              },
            }
          : node
      );  
      pushToHistory(updatedNodes, edges);
      return updatedNodes;
    });
  };

  const undo = () => {
    if (history.length === 0) return;
    const stepsToUndo = isFirstUndo ? 2 : 1;
    const sliceIndex = history.length - stepsToUndo;
    const newIndex = Math.max(0, sliceIndex);
    const targetState = history[newIndex];
  
    setFuture((f) => [{ nodes, edges }, ...f]);
    setSortedNodes(() => targetState.nodes);
    setEdges(targetState.edges);
    setHistory((h) => h.slice(0, newIndex));
    setIsFirstUndo(false);
  };
  
  const redo = () => {
    if (future.length === 0) return;
    const next = future[0];
    setHistory((h) => [...h, { nodes, edges}]);
    setSortedNodes(()=>next.nodes);
    setEdges(next.edges);
    setFuture((f) => f.slice(1));
  };  

  const getSelectedEdgesByNodeIds = (nodeIds: string[], allEdges: Edge[]) => {
    return allEdges.filter(
      (e) => nodeIds.includes(e.source) && nodeIds.includes(e.target)
    );
  };  
  
  const cut = () => {
    if (selectedNodes.length === 0) return;

    const selectedNodeIds = new Set(selectedNodes.map((n) => n.id));

    // Include child nodes of selected containers
    const groupedChildNodes = nodes.filter(
      (n) => n.parentId && selectedNodeIds.has(n.parentId)
    );

    const allSelectedNodes = [...selectedNodes, ...groupedChildNodes.filter(child => !selectedNodeIds.has(child.id))];

    const allSelectedNodeIds = allSelectedNodes.map((n) => n.id);
    const selectedEdges = getSelectedEdgesByNodeIds(allSelectedNodeIds, edges);

    setCopiedElements({ nodes: allSelectedNodes, edges: selectedEdges });
    setPasteCount(1);

    const remainingNodes = nodes.filter((n) => !allSelectedNodeIds.includes(n.id));
    const remainingEdges = edges.filter(
      (e) => !allSelectedNodeIds.includes(e.source) && !allSelectedNodeIds.includes(e.target)
    );

    pushToHistory(remainingNodes, remainingEdges);
    setSortedNodes(() => remainingNodes);
    setEdges(remainingEdges);
    setSelectedNodes([]);
    setSelectedEdges([]);
  };

  const copy = () => {
    // If there are selected nodes/edges, copy only those
    if (selectedNodes.length > 0 || selectedEdges.length > 0) {
      const copiedData = { 
        nodes: selectedNodes,
        edges: selectedEdges.filter(edge => 
          selectedNodes.some(node => node.id === edge.source) && 
          selectedNodes.some(node => node.id === edge.target)
        )
      };
      setCopiedElements(copiedData);
      // Store in localStorage as backup
      try {
        localStorage.setItem('copiedElements', JSON.stringify(copiedData));
      } catch (e) {
        console.error('Failed to store copied elements in localStorage:', e);
      }
    } else {
      // If nothing is selected, copy all nodes and edges
      const copiedData = { 
        nodes: nodes,
        edges: edges
      };
      setCopiedElements(copiedData);
      // Store in localStorage as backup
      try {
        localStorage.setItem('copiedElements', JSON.stringify(copiedData));
      } catch (e) {
        console.error('Failed to store copied elements in localStorage:', e);
      }
    }
  };

  const handlePaste = useCallback((x: number, y: number) => {
    // Try to get copiedElements from state or localStorage
    let elementsToPaste = copiedElements;
    if (!elementsToPaste) {
      try {
        const stored = localStorage.getItem('copiedElements');
        if (stored) {
          elementsToPaste = JSON.parse(stored);
        }
      } catch (e) {
        console.error('Failed to retrieve copied elements from localStorage:', e);
      }
    }

    if (!elementsToPaste || !elementsToPaste.nodes.length) return;

    // Calculate the center position of copied nodes
    const nodesCenterX = elementsToPaste.nodes.reduce((sum, node) => sum + node.position.x, 0) / elementsToPaste.nodes.length;
    const nodesCenterY = elementsToPaste.nodes.reduce((sum, node) => sum + node.position.y, 0) / elementsToPaste.nodes.length;

    // Convert screen coordinates to flow coordinates
    const flowPosition = screenToFlowPosition({ x, y });
    const offsetX = flowPosition.x - nodesCenterX;
    const offsetY = flowPosition.y - nodesCenterY;

    // Create new nodes with updated positions and IDs
    const newNodes = elementsToPaste.nodes.map(node => ({
      ...node,
      id: `${node.id}-copy-${Math.random().toString(36).substr(2, 9)}`,
      position: {
        x: node.position.x + offsetX,
        y: node.position.y + offsetY
      },
      selected: true,
      data: { ...node.data }
    })) as ShapeNode[];

    // Create a mapping of old node IDs to new node IDs
    const nodeMapping = elementsToPaste.nodes.reduce((mapping, node, index) => {
      mapping[node.id] = newNodes[index].id;
      return mapping;
    }, {} as { [key: string]: string });

    // Create new edges with updated source/target IDs
    const newEdges = elementsToPaste.edges.map(edge => ({
      ...edge,
      id: `${edge.id}-copy-${Math.random().toString(36).substr(2, 9)}`,
      source: nodeMapping[edge.source] || edge.source,
      target: nodeMapping[edge.target] || edge.target,
      selected: true
    })) as Edge[];

    // Deselect all existing elements
    const deselectedNodes = nodes.map(n => ({ ...n, selected: false }));
    const deselectedEdges = edges.map(e => ({ ...e, selected: false }));

    // Add the new nodes and edges to the flow
    setSortedNodes([...deselectedNodes, ...newNodes]);
    setNodes([...deselectedNodes, ...newNodes]);
    setEdges([...deselectedEdges, ...newEdges]);
    
    // Update selection state
    setSelectedNodes(newNodes);
    setSelectedEdges(newEdges);

    // Push to history for undo/redo
    pushToHistory([...deselectedNodes, ...newNodes], [...deselectedEdges, ...newEdges]);
  }, [copiedElements, nodes, edges, pushToHistory, screenToFlowPosition]);

  const selectAllEdges = () => {
    const updatedEdges = edges.map(edge => ({ ...edge, selected: true }));
    setEdges(updatedEdges);
    setSelectedEdges(updatedEdges);
    // Clear node selection when selecting all edges
    const updatedNodes = nodes.map(node => ({ ...node, selected: false }));
    setSortedNodes(updatedNodes);
    setNodes(updatedNodes);
    setSelectedNodes([]);
    setSelectedNode(null);
  };

  const selectAllVertices = () => {
    const updatedNodes = nodes.map(node => ({ ...node, selected: true }));
    setSortedNodes(updatedNodes);
    setSelectedNodes(updatedNodes);
    // Clear edge selection when selecting all vertices
    setEdges(edges.map(edge => ({ ...edge, selected: false })));
    setSelectedEdges([]);
  };

  const selectAll = () => {
    // Update nodes
    const updatedNodes = nodes.map(node => ({ ...node, selected: true }));
    const updatedEdges = edges.map(edge => ({ ...edge, selected: true }));

    // Update React Flow's internal state
    setSortedNodes(updatedNodes);
    setNodes(updatedNodes);
    setSelectedNodes(updatedNodes);
    
    // Update edges state
    setEdges(updatedEdges);
    setSelectedEdges(updatedEdges);

    // Push to history for undo/redo
    pushToHistory(updatedNodes, updatedEdges);
  };
  
const deleteSelected = () => {
  const selectedNodeIds = selectedNodes.map((n) => n.id);
  const selectedEdgeIds = selectedEdges.map((e) => e.id);

  // Identify which selected nodes are containers
  const selectedContainerIds = selectedNodes
    .filter((n) => n.data?.group === true)
    .map((n) => n.id);

  // Include children of containers in the selectedNodeIds
  const childNodeIds = nodes
    .filter((n) => selectedContainerIds.includes(n.parentId as string))
    .map((n) => n.id);

  const allSelectedNodeIds = [...new Set([...selectedNodeIds, ...childNodeIds])];

  // Remove selected nodes and their children
  const remainingNodes = nodes.filter(
    (n) => !allSelectedNodeIds.includes(n.id)
  );

  // Remove selected edges
  const remainingEdges = edges.filter((e) => !selectedEdgeIds.includes(e.id));

  // Remove edges connected to deleted nodes
  const edgesWithoutConnectedNodes = remainingEdges.filter(
    (e) =>
      !allSelectedNodeIds.includes(e.source) &&
      !allSelectedNodeIds.includes(e.target)
  );

  // Save to history and update state
  pushToHistory(remainingNodes, edgesWithoutConnectedNodes);
  setSortedNodes(() => remainingNodes);
  setEdges(edgesWithoutConnectedNodes);
  setSelectedNodes([]);
  setSelectedEdges([]);
};
  
 // Reusable function for creating new nodes (icon or shape)
  const createNewNode = (
    icon: { iconSrc?: any; title: string },
    position: { x: number, y: number },
    size?: { width: number; height: number },
  ): any => {
    const isIcon = icon.iconSrc !== undefined;
    const shapeType = icon.title as ShapeType;

    const defaultWidth = shapeType === "dashed-rectangle" ? 300 : 100;
    const defaultHeight = shapeType === "dashed-rectangle" ? 300 : 100;

    return isIcon
      ? {
          id: uuidv4(),
          type: 'custom-shape',
          position,
          data: {
            iconSrc: icon.iconSrc,
            title: icon.title,
            hideLabel: isAwsIcon(icon.iconSrc ?? ""),
            group: false,
          },
          width: size?.width || 100,
          height: size?.height || 100,
        }
      : {
          id: uuidv4(),
          type: 'shape',
          position,
          width: size?.width || defaultWidth,
          height: size?.height || defaultHeight,
          data: {
            type: shapeType,
            color: shapeType === "dashed-rectangle" ? "#808080" : '#3F8AE2',
            title: shapeType,
            label: shapeType,
            group: shapeType === "dashed-rectangle",
          },
          selected: true,
        };
  };

  // Reusable function to update the nodes in the state
  const updateNodesState = (newNode: ShapeNode) => {
    setSortedNodes((prevNodes) => {
      let updatedNodes = prevNodes.map((n) => ({
        ...n,
        selected: n.id === newNode.id,
      }));
      const existingIndex = updatedNodes.findIndex((n) => n.id === newNode.id);
      if (existingIndex !== -1) {
        updatedNodes[existingIndex] = { ...newNode, selected: true };
      } else {
        updatedNodes = [...updatedNodes, { ...newNode, selected: true }];
      }
      const containerNodes = updatedNodes.filter((n) => n.data?.group === true);
      containerNodes.forEach((containerNode) => {
        attachNodesToContainer(containerNode, updatedNodes, (newNodes) => {
          updatedNodes = newNodes;
        });
      });
      pushToHistory(updatedNodes, edges);
      return updatedNodes;
    });
    setEdges((prevEdges) =>
      prevEdges.map((edge) => ({ ...edge, selected: false }))
    );  
    setSelectedNode(newNode);
    setSelectedNodes([newNode]);
    setSelectedEdges([]);
  };

  const onDrop: DragEventHandler = (evt: DragEvent<HTMLDivElement>) => {
    evt.preventDefault();
    const reactFlowBounds = evt.currentTarget.getBoundingClientRect();
    const rawData = evt.dataTransfer.getData('application/reactflow');
    if (!rawData) return;
    let parsedData: any = rawData;
    try {
      parsedData = JSON.parse(rawData);
    } catch (error) {
      console.log('Failed to parse, treating as plain text.');
    }
    const position = screenToFlowPosition({
      x: evt.clientX - reactFlowBounds.left,
      y: evt.clientY - reactFlowBounds.top,
    });
    const isIcon = typeof parsedData === 'object' && parsedData !== null && 'iconSrc' in parsedData;
    const isDashedRectangle = parsedData === 'dashed-rectangle';
    let finalPosition = position;
    let size = undefined;
    if (isDashedRectangle && selectedNodes.length > 0) {
      const tightBox = getTightBoundingBox(selectedNodes);
      if (tightBox) {
        finalPosition = { x: tightBox.x, y: tightBox.y };
        size = { width: tightBox.width, height: tightBox.height };
      }
    }
    const newNode = createNewNode(
      isIcon ? parsedData : { title: parsedData as ShapeType },
      finalPosition,
      size
    );
    updateNodesState(newNode);
    updateNodesState(newNode);
  };

  // Handle icon click placement for both <Sidebar> and <ShapeSidebar>
  const placeIconOnClick = (icon: { iconSrc?: ShapeNode; title: string }) => {
    const isDashedRectangle = icon.title === 'dashed-rectangle';
    let finalPosition = {
      x: 600 + Math.floor(Math.random() * 200) - 100,
      y: Math.floor(Math.random() * 600),
    };
    let size = undefined;
    if (isDashedRectangle && selectedNodes.length > 0) {
      const tightBox = getTightBoundingBox(selectedNodes);
      if (tightBox) {
        finalPosition = { x: tightBox.x, y: tightBox.y };
        size = { width: tightBox.width, height: tightBox.height };
      }
    }
    const newNode = createNewNode(icon, finalPosition, size);
    updateNodesState(newNode);
  };

  const customApplyNodeChanges = useCallback(
    (changes: NodeChange[], nodes: ShapeNode[]): any[] => {
      setHelperLineHorizontal(undefined);
      setHelperLineVertical(undefined);
      setHelperLineSpacingGuides([]);
      setHelperLineHorizontalEdges(undefined);
      setHelperLineVerticalEdges(undefined);

      if (changes.length === 1 && changes[0].type === 'position' && changes[0].position) {
        const isDragging = changes[0].dragging;

        if (isDragging) {
          const helperLines = getHelperLines(changes[0], nodes);
          setHelperLineHorizontal(helperLines.horizontal);
          setHelperLineVertical(helperLines.vertical);
          setHelperLineSpacingGuides(helperLines.spacingGuides || []);
          setHelperLineHorizontalEdges(helperLines.horizontalEdges);
          setHelperLineVerticalEdges(helperLines.verticalEdges);
        } else {
          const helperLines = getHelperLines(changes[0], nodes);
          changes[0].position.x = helperLines.snapPosition.x ?? changes[0].position.x;
          changes[0].position.y = helperLines.snapPosition.y ?? changes[0].position.y;

          const updated = applyNodeChanges(changes, nodes);
          pushToHistory(updated, edges);
          return updated;
        }
      }
      if (changes[0].type === 'select') {
        const change = changes[0];
        if ('id' in change) {
          const selected = nodes.find((n) => n.id === change.id);
          if (change.selected) {
            // Add this node to selectedNodes if not already there
            setSelectedNodes((prev) => {
              if (prev.some(n => n.id === change.id)) {
                return prev; // already selected
              }
              return [...prev, selected!];
            });
            setSelectedNode(selected || null);
          } else {
            // Remove from selectedNodes when deselected
            setSelectedNodes((prev) => prev.filter(n => n.id !== change.id));
            setSelectedNode(null);
          }
        }
      }
      return applyNodeChanges(changes, nodes);
    },
    [edges, nodes] // ensure up-to-date values
  );

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const key = e.key.toLowerCase();
  
      if ((e.ctrlKey || e.metaKey) && key === 'z') { e.preventDefault(); undo(); }
      else if ((e.ctrlKey || e.metaKey) && key === 'y') { e.preventDefault(); redo(); }
      else if ((e.ctrlKey || e.metaKey) && key === 'x') { e.preventDefault(); cut(); }
      else if ((e.ctrlKey || e.metaKey) && key === 'c') { e.preventDefault(); copy(); }
      else if ((e.ctrlKey || e.metaKey) && key === 'v' && copiedElements) { 
        e.preventDefault();
        // Get the center of the viewport for pasting
        const { x: viewportX, y: viewportY } = getViewport();
        const zoom = getZoom();
        handlePaste(viewportX + window.innerWidth / (2 * zoom), viewportY + window.innerHeight / (2 * zoom));
      }
      else if ((e.ctrlKey || e.metaKey) && key === 'a') { e.preventDefault(); selectAll(); }
      else if (key === 'delete') { deleteSelected(); }
    };
  
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [undo, redo, cut, copy, handlePaste, selectAll, deleteSelected, copiedElements, getViewport, getZoom]);
  
  const onConnect = useCallback((connection: any) => {
    const edge = {
      ...connection,
      id: uuidv4(),
      type: 'smoothstep',
      selected: true,
      data: { label: '' },
    };
    setEdges((eds) => addEdge(edge, eds));
  }, [setEdges]);

  // Track whether we finished restoring from localStorage
  const didLoad = useRef(false);
  // Load from localStorage on initial mount
  const areArraysEqual = (a: any[], b: any[]) => JSON.stringify(a) === JSON.stringify(b);

  useEffect(() => {
    const savedData = localStorage.getItem('autosave.arcio');
    if (savedData) {
      try {
        const { nodes: savedNodes, edges: savedEdges, title: savedTitle } = JSON.parse(savedData);

        if (savedNodes && !areArraysEqual(savedNodes, nodes)) {
          setSortedNodes(savedNodes);
        }

        if (savedEdges && !areArraysEqual(savedEdges, edges)) {
          setEdges(savedEdges);
        }

        if (savedTitle && savedTitle !== title) {
          setTitle(savedTitle);
        }
      } catch (err) {
        console.error('Failed to parse saved data:', err);
      }
    }
    didLoad.current = true;
  }, []);
  
  // Save to localStorage when nodes, edges, or title change
  useEffect(() => {
    if (!didLoad.current) return;
    const data = JSON.stringify({ nodes, edges, title });
    localStorage.setItem('autosave.arcio', data);
  }, [nodes, edges, title]);

  const handleEdgeStyleChange = (edgeId: string, type: string) => {
    setEdges((eds) =>
      eds.map((ed) => {
        if (ed.id === edgeId) {
          return {
            ...ed,
            type: type,
            data: {
              ...ed.data,
            },
          };
        }
        return ed;
      })
    );
  };

  // Add a handler for edge changes
  const handleEdgesChange = useCallback(
    (changes: any[]) => {
      setEdges((eds) => {
        const updatedEdges = eds.map((edge) => {
          const change = changes.find((c) => c.id === edge.id);
          if (change && change.type === 'select') {
            return { ...edge, selected: change.selected };
          }
          return edge;
        });
        
        // Update selected edges state
        const newSelectedEdges = updatedEdges.filter(e => e.selected);
        setSelectedEdges(newSelectedEdges);
        
        return updatedEdges;
      });
    },
    [setEdges, setSelectedEdges]
  );

  const handleSave = async () => {
    try {
      await ensureGraphReady();
      saveGraph(nodes, edges, title);
    } catch (error) {
      console.error("Error saving graph:", error);
    }
  };

  const handleLoad = async () => {
    try {
      await ensureGraphReady();
      loadGraph(setSortedNodes, setEdges, setTitle);
    } catch (error) {
      console.error("Error loading graph:", error);
    }
  };

  const handleCloseEdgePanel = () => {
    setSelectedEdges([]);
  };

  const onNodesChange: OnNodesChange = useCallback(
    (changes) => {
      setSortedNodes((nds) => {
        const updated = customApplyNodeChanges(changes, nds);
        setSelectedNodes(updated.filter((n) => n.selected));
        return updated;
      });
      setSelectedNodes([]);
      setSelectedNode(null);
    },
    [setSortedNodes, customApplyNodeChanges]
  );

  const onNodeDragStop = (_event: any, movedNode: ShapeNode) => {
    setSortedNodes((nds) => {
      let updatedNodes = nds;
      const containerNodes = updatedNodes.filter((n) => n.data?.group === true);
      if (movedNode.data?.group) {
        updatedNodes = updatedNodes.map((node) =>
        node.id === movedNode.id ? movedNode : node
        );
      }
      containerNodes.forEach((containerNode) => {
        attachNodesToContainer(containerNode, updatedNodes, (newNodes) => {
          updatedNodes = newNodes;
        });
      });

      return updatedNodes;
    });
  };

  const onDragOver = (evt: DragEvent<HTMLDivElement>) => {
    evt.preventDefault();
    evt.dataTransfer.dropEffect = 'move';
  };

  const getTightBoundingBox = (nodes: Node[]) => {
    if (nodes.length === 0) return null;
    const xValues = nodes.map(node => node.position.x);
    const yValues = nodes.map(node => node.position.y);
    const rightValues = nodes.map(node => node.position.x + (node.width || 0));
    const bottomValues = nodes.map(node => node.position.y + (node.height || 0));
    const minX = Math.min(...xValues);
    const minY = Math.min(...yValues);
    const maxX = Math.max(...rightValues);
    const maxY = Math.max(...bottomValues);
    return {
      x: minX - 10,
      y: minY - 10,
      width: (maxX - minX) + 20,
      height: (maxY - minY) + 20
    };
  };

  //convert from flow coords to screen coordinates
  const flowCoordsToScreen = (x: number, y: number, container: HTMLDivElement) => {
    const bounds = container.getBoundingClientRect();
    const { x: xOffset, y: yOffset } = getViewport();
    const zoom = getZoom();

    return {
      x: x * zoom + bounds.left + xOffset,
      y: y * zoom + bounds.top + yOffset,
    };
  };
  //convert from screen coords to flow coordinates
  const screenToFlowCoords = (
    clientX: number,
    clientY: number,
    container: HTMLDivElement
  ) => {
    const bounds = container.getBoundingClientRect();
    const { x: xOffset, y: yOffset } = getViewport();
    const zoom = getZoom();

    return {
      x: (clientX - bounds.left - xOffset) / zoom,
      y: (clientY - bounds.top - yOffset) / zoom,
    };
  };

  const handleDoubleClick = (e: React.MouseEvent) => {
    if (!flowRef.current) return;
    const target = e.target as HTMLElement;
    if (!target.classList.contains('react-flow__pane')) return;

    const point = screenToFlowCoords(e.clientX, e.clientY, flowRef.current);
    
    // Create text node at double-click position
    const newNode: ShapeNode = {
      id: `text-${uuidv4()}`,
      type: 'text',
      position: point,
      data: { 
        type: 'text',
        color: '#3b82f6',
        text: 'New Text',
        onTextChange: (newText: string) => {
          setSortedNodes((nds) =>
            nds.map((node) =>
              node.id === newNode.id
                ? { ...node, data: { ...node.data, text: newText } }
                : node
            )
          );
        }
      },
    };

    setSortedNodes((nds) => [...nds, newNode]);
    pushToHistory([...nodes, newNode], edges);
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button !== 0 || !flowRef.current) return;
    const target = e.target as HTMLElement;
    if (!target.classList.contains('react-flow__pane')) return;

    if (!selectionStart) {
      const point = screenToFlowCoords(e.clientX, e.clientY, flowRef.current);
      setSelectionStart(point);
    }
  };
  const handleMouseMove = (e: MouseEvent) => {
    if (!selectionStart || !flowRef.current) return;
    if (!isDragging) {
      setIsDragging(true);
      setSkipNextClick(true);
  }
    const current = screenToFlowCoords(e.clientX, e.clientY, flowRef.current);
    const x = Math.min(selectionStart.x, current.x);
    const y = Math.min(selectionStart.y, current.y);
    const width = Math.abs(selectionStart.x - current.x);
    const height = Math.abs(selectionStart.y - current.y);
    setSelectionBox(new DOMRect(x, y, width, height));
  };

  const handleMouseUp = () => {
    if (selectionBox) {
      lastSelectionBoxRef.current = selectionBox;
      const updatedNodes = nodes.map((node) => {
        const nodeBox = {
          x: node.position.x,
          y: node.position.y,
          width: node.width || 0,
          height: node.height || 0,
        };
        const isSelected =
          nodeBox.x >= selectionBox.x &&
          nodeBox.x + nodeBox.width <= selectionBox.x + selectionBox.width &&
          nodeBox.y >= selectionBox.y &&
          nodeBox.y + nodeBox.height <= selectionBox.y + selectionBox.height;
        return {
          ...node,
          selected: isSelected,
        };
      });
      const selectedNodeIds = updatedNodes.filter(n => n.selected).map(n => n.id);
      const updatedEdges = edges.map(edge => {
        const isSelected = selectedNodeIds.includes(edge.source) && selectedNodeIds.includes(edge.target);
        return {
          ...edge,
          selected: isSelected,
        };
      });
      const finalSelectedNodes = updatedNodes.filter((node) => node.selected);
      const finalSelectedEdges = updatedEdges.filter(edge => edge.selected);
      setNodes(updatedNodes);
      setEdges(updatedEdges);
      setSelectedNodes(finalSelectedNodes);
      setSelectedEdges(finalSelectedEdges);
    }
    setSelectionStart(null);
    setSelectionBox(null);
    setIsDragging(false);
    setTimeout(() => setSkipNextClick(false), 0);
  };

  useEffect(() => {
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [selectionStart, selectionBox]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Control') setCtrlPressed(true);
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.key === 'Control') setCtrlPressed(false);
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, []);

  const handleNodeClick = (event: React.MouseEvent, node: any) => {
    event.stopPropagation();

    if (ctrlPressed) {
      // Toggle selection
      const alreadySelected = selectedNodes.some(n => n.id === node.id);
      const newSelectedNodes = alreadySelected
        ? selectedNodes.filter(n => n.id !== node.id)
        : [...selectedNodes, node];

      setSelectedNodes(newSelectedNodes);
      setNodes(nodes.map(n => ({
        ...n,
        selected: newSelectedNodes.some(s => s.id === n.id),
      })));
    } else {
      // Select only this node, clear all edge selections too
      setSelectedNodes([node]);
      setSelectedEdges([]); // Clear edges
      setSelectedNode(node);
      setNodes(nodes.map(n => ({
        ...n,
        selected: n.id === node.id,
      })));
      setEdges(edges.map(e => ({
        ...e,
        selected: false,
      })));
    }
  };

  const handleEdgeClick = (event: React.MouseEvent, edge: Edge) => {
    event.stopPropagation();

    if (ctrlPressed) {
      const alreadySelected = selectedEdges.some(e => e.id === edge.id);
      const newSelectedEdges = alreadySelected
        ? selectedEdges.filter(e => e.id !== edge.id)
        : [...selectedEdges, edge];

      setSelectedEdges(newSelectedEdges);
      setEdges(edges.map(e => ({
        ...e,
        selected: newSelectedEdges.some(s => s.id === e.id),
      })));
    } else {
      // Select only this edge, clear all node selections too
      setSelectedEdges([edge]);
      setSelectedNodes([]); // Clear nodes
      setSelectedNode(null);
      setEdges(edges.map(e => ({
        ...e,
        selected: e.id === edge.id,
      })));
      setNodes(nodes.map(n => ({
        ...n,
        selected: false,
      })));
    }
  };

  const handleCanvasClick = () => {
    setSelectedNode(null);
    setSelectedNodes([]);
    setSelectedEdges([]);
    setNodes(nodes.map(n => ({ ...n, selected: false })));
    setEdges(edges.map(e => ({ ...e, selected: false })));
  };

  // Add context menu handler
  const onContextMenu = useCallback(
    (event: React.MouseEvent) => {
      event.preventDefault();
      event.stopPropagation();
      // Close any existing context menus first
      setNodeEdgeContextMenu(null);
      setContextMenu({
        x: event.clientX,
        y: event.clientY,
      });
    },
    []
  );

  // Close context menu
  const onPaneClick = useCallback((event: React.MouseEvent) => {
    event.stopPropagation();
    setContextMenu(null);
    setNodeEdgeContextMenu(null);
  }, []);

  const handleNodeContextMenu = useCallback((event: React.MouseEvent, node: Node) => {
    event.preventDefault();
    event.stopPropagation();
    
    // Close the regular context menu if it's open
    setContextMenu(null);
    setNodeEdgeContextMenu({
      x: event.clientX,
      y: event.clientY
    });
    
    if (!selectedNodes.find(n => n.id === node.id)) {
      setSelectedNodes([node as any]);
      setNodes(nodes.map(n => ({
        ...n,
        selected: n.id === node.id
      })));
    }
  }, [selectedNodes, setSelectedNodes, setNodes, nodes]);

  const handleEdgeContextMenu = useCallback((event: React.MouseEvent, edge: Edge) => {
    event.preventDefault();
    event.stopPropagation();
    
    // Close the regular context menu if it's open
    setContextMenu(null);
    setNodeEdgeContextMenu({
      x: event.clientX,
      y: event.clientY
    });
    
    if (!selectedEdges.find(e => e.id === edge.id)) {
      setSelectedEdges([edge as any]);
      setEdges(edges.map(e => ({
        ...e,
        selected: e.id === edge.id
      })));
    }
  }, [selectedEdges, setSelectedEdges, setEdges, edges]);

  const onPaneContextMenu = useCallback(
    (event: MouseEvent | React.MouseEvent<Element, MouseEvent>) => {
      event.preventDefault();
      setContextMenu({
        x: event.clientX,
        y: event.clientY
      });
    },
    []
  );

  const handleCopy = useCallback(() => {
    const selectedNodes = nodes.filter(node => node.selected);
    const selectedEdges = edges.filter(edge => edge.selected);
    setCopiedElements({ nodes: selectedNodes, edges: selectedEdges });
  }, [nodes, edges]);

  const handleSelectAll = useCallback(() => {
    setNodes(nodes => nodes.map(node => ({ ...node, selected: true })));
    setEdges(edges => edges.map(edge => ({ ...edge, selected: true })));
  }, [setNodes, setEdges]);

  const handleSelectAllVertices = useCallback(() => {
    setNodes(nodes => nodes.map(node => ({ ...node, selected: true })));
    setEdges(edges => edges.map(edge => ({ ...edge, selected: false })));
  }, [setNodes, setEdges]);

  const handleSelectAllEdges = useCallback(() => {
    setNodes(nodes => nodes.map(node => ({ ...node, selected: false })));
    setEdges(edges => edges.map(edge => ({ ...edge, selected: true })));
  }, [setNodes, setEdges]);

  const renderContextMenu = () => {
    if (!contextMenu) return null;
    return (
      <ContextMenu
        x={contextMenu.x}
        y={contextMenu.y}
        onClose={() => setContextMenu(null)}
        undo={undo}
        paste={() => handlePaste(contextMenu.x, contextMenu.y)}
        copy={copy}
        selectAll={selectAll}
        selectAllVertices={selectAllVertices}
        selectAllEdges={selectAllEdges}
        canUndo={history.length > 0}
        canPaste={!!copiedElements}
        canCopy={true}  // Always allow copying since we can copy all or selected elements
      />
    );
  };

  return (
    <NodeContext.Provider
      value={{
        selectedNode,
        setSelectedNode,
        selectedNodes,
        setSelectedNodes,
        selectedEdges,
        setSelectedEdges,
        setNodes,
        setSortedNodes,
        pushToHistory,
        nodes,
        edges,
        setEdges,
      }}
    >  
    {selectionBox && flowRef.current && (() => {
      const topLeft = flowCoordsToScreen(selectionBox.x, selectionBox.y, flowRef.current);
      const bottomRight = flowCoordsToScreen(selectionBox.x + selectionBox.width, selectionBox.y + selectionBox.height, flowRef.current);
      const left = Math.min(topLeft.x, bottomRight.x);
      const top = Math.min(topLeft.y, bottomRight.y);
      const width = Math.abs(bottomRight.x - topLeft.x);
      const height = Math.abs(bottomRight.y - topLeft.y);
      return (
        <div
          style={{
            position: 'absolute',
            left,
            top,
            width,
            height,
            border: '1px dashed #333',
            backgroundColor: 'rgba(0, 0, 255, 0.1)',
            pointerEvents: 'none',
            zIndex: 999,
          }}
        />
      );
    })()}
    <div ref={flowRef} 
      onMouseDown={(e) => {
        const target = e.target as HTMLElement;
        if (target.classList.contains('react-flow__pane')) {
          handleCanvasClick();
        }
        handleMouseDown(e);
      }}
      onContextMenu={onContextMenu}
      onDoubleClick={handleDoubleClick} 
      style={{ width: '100%', height: '100vh', position: "relative"  }}
    > 
        <Sidebar onClickPlaceIcon={placeIconOnClick}/>  
        <TopBar
          title={title}
          setTitle={setTitle}
          undo={undo}
          redo={redo}
          cut={cut}
          copy={copy}
          paste={() => handlePaste(contextMenu?.x || 0, contextMenu?.y || 0)}
          selectAll={selectAll}
          deleteSelected={deleteSelected}
          canUndo={history.length > 0}
          canRedo={future.length > 0}
          canCutOrCopy={selectedNodes.length > 0}
          canPaste={!!copiedElements}
          copiedObject={copiedElements}
          canDelete={selectedNodes.length > 0 || selectedEdges.length >0}
          isManySelected={selectedNodes.length > 0 || selectedEdges.length >0}
          onPreview={() => setIsPreviewOpen(true)}
          onSave={handleSave}
          onLoad={handleLoad}
        />
        <div>
          <RightsidePanel
            onColorChange={onColorChange}
            selectedEdge={selectedEdges}
            onEdgeStyleChange={handleEdgeStyleChange}
            onClose={handleCloseEdgePanel}
          />
        </div>
        <CenterBar />
        <BottomControls />
        <PreviewModal
          title={title}
          isOpen={isPreviewOpen}
          onClose={() => {
            setIsPreviewOpen(false);
            setTimeout(() => {
              setForceUpdate(prev => prev + 1);
            }, 100);
          }}
        />
        <MessageBox />
        <UserInfoBar />
        <RocketCounter />
        {renderContextMenu()}
        {nodeEdgeContextMenu && (
          <NodeEdgeContextMenu
            x={nodeEdgeContextMenu.x}
            y={nodeEdgeContextMenu.y}
            onClose={() => setNodeEdgeContextMenu(null)}
            onCopy={(elements) => {
              setCopiedElements(elements);
              // Store in localStorage as backup
              try {
                localStorage.setItem('copiedElements', JSON.stringify(elements));
              } catch (e) {
                console.error('Failed to store copied elements in localStorage:', e);
              }
            }}
            selectedNodes={nodes.filter(node => node.selected)}
            selectedEdges={edges.filter(edge => edge.selected)}
          />
        )}
    <ReactFlow
      ref={flowRef}
      className="react-flow__pane"
      key={`react-flow-${forceUpdate}`}
      colorMode={theme}
      proOptions={proOptions}
      nodeTypes={nodeTypes}
      edgeTypes={edgeTypes}
      nodes={nodes}
      edges={edges}
      onNodesChange={onNodesChange}
      onNodeDragStop={onNodeDragStop}
      onEdgesChange={handleEdgesChange}
      onConnect={onConnect}
      elevateEdgesOnSelect={true}
      elevateNodesOnSelect={true}
      defaultEdgeOptions={defaultEdgeOptions}
      connectionLineType={ConnectionLineType.SmoothStep}
      connectionMode={ConnectionMode.Loose}    
      panOnScroll={panOnScroll}
      onDrop={onDrop}
      snapToGrid={snapToGrid} 
      snapGrid={[10, 10]} 
      onDragOver={onDragOver}
      zoomOnDoubleClick={false}
      panOnDrag={false}
      selectNodesOnDrag={false}
      elementsSelectable={true}
      onNodeClick={handleNodeClick}
      onEdgeClick={handleEdgeClick}
      onNodeContextMenu={handleNodeContextMenu}
      onEdgeContextMenu={handleEdgeContextMenu}
      onPaneContextMenu={onPaneContextMenu}
      onSelectionChange={({ nodes, edges }) => {
        setSelectedNodes(nodes);
        setSelectedEdges(edges);
      }}
      multiSelectionKeyCode="Control"
    >
      <Background />
      <HelperLines
        horizontal={helperLineHorizontal}
        vertical={helperLineVertical}
        spacingGuides={helperLineSpacingGuides}
        horizontalEdges={helperLineHorizontalEdges}
        verticalEdges={helperLineVerticalEdges}
      />
      <MiniMap style={{ position: "absolute", bottom: "60px" }} />
    </ReactFlow>
  </div>
  </NodeContext.Provider>
  );
}

function ProExampleWrapper() {
  return (
    <ReactFlowProvider>
      <ShapesProExampleApp />
    </ReactFlowProvider>
  );
}

export default ProExampleWrapper;