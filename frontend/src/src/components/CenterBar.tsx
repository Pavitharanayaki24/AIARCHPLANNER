import React, { useState, useRef, useEffect } from "react";
import { useReactFlow } from "@xyflow/react";
import { FaSmile, FaUser, FaRobot } from "react-icons/fa";
import { fetchOpenRouterSuggestions } from "../openai";
import { useNodeContext } from "../NodeContext";
import dagre from 'dagre';

export const CenterBar = () => {
  const [prompt, setPrompt] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [filteredSuggestions, setFilteredSuggestions] = useState<string[]>([]);
  const [showPromptInput, setShowPromptInput] = useState(false);
  const isLoadingRef = useRef(isLoading);
  const [selectedIcon, setSelectedIcon] = useState<string | null>(null);
  const { setSortedNodes, setEdges } = useNodeContext();
  const inputContainerRef = useRef<HTMLDivElement>(null);
  const iconContainerRef = useRef<HTMLDivElement>(null);
  const { zoomOut } = useReactFlow();
  // Common style classes
  const iconBase = "cursor-pointer rounded-full p-1 transition-colors";
  const highlightStyle = "bg-gray-300";

  useEffect(() => {
    isLoadingRef.current = isLoading;
  }, [isLoading]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      if (
        inputContainerRef.current &&
        !inputContainerRef.current.contains(target) &&
        iconContainerRef.current &&
        !iconContainerRef.current.contains(target)
      ) {
        if (!isLoadingRef.current) {
          setShowPromptInput(false);
          setFilteredSuggestions([]);
          setSelectedIcon(null);
        }
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  function getEdgeHandles(sourceNode: { position: { x: number; y: number; }; }, targetNode: { position: { x: number; y: number; }; }) {
    // Determine horizontal and vertical difference
    const dx = targetNode.position.x - sourceNode.position.x;
    const dy = targetNode.position.y - sourceNode.position.y;

    // Horizontal or vertical dominant?
    if (Math.abs(dx) > Math.abs(dy)) {
      // Edge flows left → right or right → left
      return {
        sourceHandle: dx > 0 ? 'right' : 'left',
        targetHandle: dx > 0 ? 'left' : 'right',
      };
    } else {
      // Edge flows top → bottom or bottom → top
      return {
        sourceHandle: dy > 0 ? 'bottom' : 'top',
        targetHandle: dy > 0 ? 'top' : 'bottom',
      };
    }
  }

  function layoutNodesAndEdges(nodes: any[], edges: any[]) {
    const g = new dagre.graphlib.Graph();

    g.setGraph({ rankdir: 'TB', nodesep: 300, ranksep: 120, marginx: 50, marginy: 50 });
    g.setDefaultEdgeLabel(() => ({}));

    // Add nodes
    nodes.forEach(node => {
      g.setNode(node.id, { width: node.width || 100, height: node.height || 50 });
    });

    // Add edges
    edges.forEach(edge => {
      g.setEdge(edge.source, edge.target);
    });

    // Run layout
    dagre.layout(g);

    // Map nodes with position
    const laidOutNodes = nodes.map(node => {
      const nodeWithPos = g.node(node.id);
      return {
        ...node,
        position: {
          x: nodeWithPos.x - (node.width || 100) / 2,
          y: nodeWithPos.y - (node.height || 50) / 2,
        },
      };
    });

    // Enhance edges with handles and types
    const laidOutEdges = edges.map(edge => {
      const sourceNode = laidOutNodes.find(n => n.id === edge.source);
      const targetNode = laidOutNodes.find(n => n.id === edge.target);
      if (!sourceNode || !targetNode) return edge;

      const { sourceHandle, targetHandle } = getEdgeHandles(sourceNode, targetNode);

      // Decide edge type based on your custom logic or edge data (simplified here)
      let edgeType = 'smoothstep'; // default
      if (edge.data?.condition) edgeType = 'step'; // e.g., for decision edges
      if (edge.data?.backward) edgeType = 'bezier';
      if (edge.data?.technical) edgeType = 'straight';

      // Label for decision edges example
      let label = '';
      if (edge.data?.condition) {
        label = edge.data.condition === true ? 'Yes' : 'No';
      }

      return {
        ...edge,
        sourceHandle,
        targetHandle,
        type: edgeType,
        label,
        arrowHeadType: 'arrowclosed',
      };
    });

    return { nodes: laidOutNodes, edges: laidOutEdges };
  }

  const generateDiagram = async () => {
    if (!prompt.trim() || isLoading) return;
    setIsLoading(true);
    try {
      const response = await fetch('http://localhost:8000/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt }),
      });
      const rawText = await response.text();
      try {
        const json = JSON.parse(rawText);
        if (json.nodes && json.edges) {
          const processedNodes = json.nodes.map((node: { data: { type: string; label: any; }; style: { width: any; height: any; }; }) => {
            const shapeType = node.data?.type ?? "rectangle";
            return {
              ...node,
              type: 'shape',
              width: node.style?.width || (shapeType === "dashed-rectangle" ? 300 : 100),
              height: node.style?.height || (shapeType === "dashed-rectangle" ? 300 : 100),
              data: {
                ...node.data,
                title: shapeType,
                label: node.data?.label ?? shapeType,
                group: shapeType === "dashed-rectangle",
              },
              selected: false,
            };
          });

          const { nodes: laidOutNodes, edges: laidOutEdges } = layoutNodesAndEdges(processedNodes, json.edges);

          setSortedNodes(laidOutNodes);
          setEdges(laidOutEdges);
          setPrompt('');
          setFilteredSuggestions([]);
          zoomOut(); zoomOut();
        }
      } catch (err) {
        console.error('Invalid JSON from backend:', err);
      }
    } catch (err) {
      console.error('Failed to fetch diagram:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handlePromptChange = async (value: string) => {
    setPrompt(value);
    if (value.trim().length === 0) {
      setFilteredSuggestions([]);
      return;
    }
    try {
      const suggestions = await fetchOpenRouterSuggestions(value);
      const cleanedSuggestions = suggestions
        .map(s => s.replace(/^["'\s]+|["'\s]+$/g, ''))
        .filter(s => s.length > 0);
      setFilteredSuggestions(cleanedSuggestions.slice(0, 5));
    } catch (error) {
      console.error('OpenRouter suggestion fetch error:', error);
      setFilteredSuggestions([]);
    }
  };

  const highlightMatch = (suggestion: string, keyword: string) => {
    const parts = suggestion.split(new RegExp(`(${keyword})`, 'gi'));
    return parts.map((part, i) =>
      part.toLowerCase() === keyword.toLowerCase() ? (
        <strong key={i} style={{ color: '#007bff', fontWeight: 'bold' }}>{part}</strong>
      ) : (
        <span key={i}>{part}</span>
      )
    );
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      generateDiagram();
      setFilteredSuggestions([]);
    }
  };

  return (
    <div ref={iconContainerRef} className="absolute bottom-4 left-1/2 transform -translate-x-1/2 bg-white border border-gray-300 px-2 py-1 rounded-lg flex items-center space-x-4 shadow-md z-10">
      <FaSmile
        size={32}
        className={`${iconBase} ${selectedIcon === "smile" ? highlightStyle : "hover:bg-gray-200"}`}
        onClick={() => setSelectedIcon(prev => prev === "smile" ? null : "smile")}
      />
      <div className="w-px h-6 bg-gray-300" />
      <FaUser
        size={24}
        className={`${iconBase} ${selectedIcon === "user" ? highlightStyle : "hover:bg-gray-200"} bg-green-500 text-white`}
        onClick={() => setSelectedIcon(prev => prev === "user" ? null : "user")}
      />
      <div className="w-px h-6 bg-gray-300" />
      <FaRobot
        size={32}
        className={`${iconBase} ${selectedIcon === "robot" ? highlightStyle : "hover:bg-gray-200"}`}
        onClick={() => {
          setSelectedIcon(prev => {
            const newIcon = prev === "robot" ? null : "robot";
            setShowPromptInput(newIcon === "robot");
            return newIcon;
          });
        }}
      />
      {/* Prompt Input */}
      {showPromptInput && (
        <div
          ref={inputContainerRef}
          style={{
            position: 'absolute',
            bottom: '55px',
            minWidth: '600px',
            maxWidth: '900px',
            left: '50%',
            transform: 'translateX(-50%)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '10px',
            zIndex: 1000,
          }}
        >
          {/* Suggestions (now on top of input) */}
          {!isLoading && filteredSuggestions.length > 0 && (
            <div
              style={{
                position: 'absolute',
                bottom: '100%',
                left: 0,
                right: 0,
                backgroundColor: '#ffffff',
                border: '1px solid #ccc',
                borderRadius: '10px',
                zIndex: 9999,
                boxShadow: '0 2px 6px rgba(0,0,0,0.15)',
                marginBottom: '3px',
                overflowY: 'auto',
                fontSize: '13px',
              }}
            >
              {filteredSuggestions.map((suggestion, index) => (
                <div
                  key={index}
                  onClick={() => {
                    setPrompt(suggestion);
                    setFilteredSuggestions([]);
                  }}
                  style={{
                    padding: '8px',
                    cursor: 'pointer',
                    borderBottom: index < filteredSuggestions.length - 1 ? '1px solid #eee' : 'none',
                    color: '#000',
                  }}
                  onMouseDown={(e) => e.preventDefault()}
                >
                  {highlightMatch(suggestion, prompt)}
                </div>
              ))}
            </div>
          )}

          <div style={{ width: '100%', position: 'relative', display: 'flex', alignItems: 'center' }}>
            <input
              type="text"
              value={prompt}
              onChange={(e) => handlePromptChange(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Describe a flow or system..."
              disabled={isLoading}
              style={{
                width: '100%',
                fontSize: '14px',
                backgroundColor: '#fff',
                border: '1px solid #ccc',
                padding: '8px 12px',
                borderRadius: '10px',
              }}
            />
            {isLoading ? (
            <div
              style={{
                position: 'absolute',
                right: '10px',
                transform: 'translateY(-50%)',
                border: '3px solid #f3f3f3',
                borderTop: '3px solid #007bff',
                borderRadius: '50%',
                width: '25px',
                height: '25px',
                animation: 'spin 1s linear infinite',
              }}
            />
            ) : (
              <button
                onClick={() => {
                  generateDiagram();
                  setFilteredSuggestions([]);
                }}
                style={{
                  position: 'absolute',
                  right: '6px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  padding: '6px 12px',
                  fontSize: '12px',
                  borderRadius: '6px',
                  backgroundColor: '#007bff',
                  color: '#fff',
                  border: 'none',
                  cursor: 'pointer',
                }}
              >
                Generate
              </button>
            )}

          </div>
        </div>
      )}

      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};