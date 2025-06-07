import React, { useState, ReactNode } from "react";
import { Edge } from "@xyflow/react";
import { ShapeNode } from "./components/shape/types";

type NodeContextType = {
  selectedNode: ShapeNode | null;
  setSelectedNode: React.Dispatch<React.SetStateAction<ShapeNode | null>>;
  selectedNodes: ShapeNode[];
  setSelectedNodes: React.Dispatch<React.SetStateAction<ShapeNode[]>>;
  selectedEdges: Edge[];
  setSelectedEdges: React.Dispatch<React.SetStateAction<Edge[]>>;
  nodes: ShapeNode[];
  setNodes: React.Dispatch<React.SetStateAction<ShapeNode[]>>;
  setSortedNodes: (valueOrFn: any[] | ((prev: any[]) => any[])) => void;
  edges: Edge[];
  setEdges: React.Dispatch<React.SetStateAction<Edge[]>>;
  pushToHistory: (newNodes: ShapeNode[], newEdges: Edge[]) => void;
};

const defaultContext: NodeContextType = {
  selectedNode: null,
  setSelectedNode: () => {},
  selectedNodes: [],
  setSelectedNodes: () => {},
  selectedEdges: [],
  setSelectedEdges: () => {},
  nodes: [],
  setNodes: () => {},
  setSortedNodes: () => {},
  edges: [],
  setEdges: () => {},
  pushToHistory: () => {}
};

export const NodeContext = React.createContext<NodeContextType>(defaultContext);

type NodeProviderProps = {
  children: ReactNode;
  value: NodeContextType;
};

export const NodeProvider = ({ children, value }: NodeProviderProps) => {
  return (
    <NodeContext.Provider value={value}>
      {children}
    </NodeContext.Provider>
  );
};

export const useNodeContext = () => {
  const context = React.useContext(NodeContext);
  if (!context) {
    throw new Error("useNodeContext must be used within a NodeProvider");
  }
  return context;
};