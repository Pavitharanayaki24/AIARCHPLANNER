import React, { useState, ReactNode } from "react";
import { Edge } from "@xyflow/react";
import ShapeNode from "./components/shape-node";

type NodeContextType = {
  selectedNode: ShapeNode | null;
  setSelectedNode: React.Dispatch<React.SetStateAction<ShapeNode | null>>;
  selectedNodes: ShapeNode[];
  setSelectedNodes: React.Dispatch<React.SetStateAction<ShapeNode[]>>;
  selectedEdges: Edge[];
  setSelectedEdges: React.Dispatch<React.SetStateAction<Edge[]>>;
  nodes: ShapeNode[];
  setNodes: React.Dispatch<React.SetStateAction<ShapeNode[]>>;
  setSortedNodes: (valueOrFn: any[] | ((prev: any[]) => any[])) => void;  edges: Edge[];
  setEdges: React.Dispatch<React.SetStateAction<Edge[]>>;
  pushToHistory: (newNodes: ShapeNode[], newEdges: Edge[]) => void;
};

export const NodeContext = React.createContext<NodeContextType | null>(null);

export const useNodeContext = () => {
  const context = React.useContext(NodeContext);
  if (!context) {
    throw new Error("useNodeContext must be used within a NodeProvider");
  }
  return context;
};