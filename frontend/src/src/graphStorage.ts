import { Edge, Node } from '@xyflow/react';
import { ShapeNode, ShapeType } from './components/shape/types';

  // Export Save Function
  export function saveGraph(nodes: Node[], edges: Edge[], title: string) {
    const graphData = {
      title,
      nodes,
      edges
    };
    localStorage.setItem("autosave.arcio", JSON.stringify(graphData));
    const blob = new Blob([JSON.stringify(graphData, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${title || "arch"}.arcio`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showMessage("Graph saved successfully!", "success");
  }  

  const DEFAULT_COLOR = 'gray';
  const DEFAULT_NODE_TYPE = 'rectangle';
  const DEFAULT_LABEL = '';

  export const loadGraph = (
    setSortedNodes: (valueOrFn: any[] | ((prev: any[]) => any[])) => void,
    setEdges: React.Dispatch<React.SetStateAction<Edge[]>>,
    setTitle: React.Dispatch<React.SetStateAction<string>>
  ) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.arcio';
    input.onchange = (event) => {
      const file = (event.target as HTMLInputElement)?.files?.[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = (e) => {
          try {
            const parsed = JSON.parse(e.target?.result as string);
            const { nodes, edges, title: loadedTitle } = parsed;
  
            const typedNodes: ShapeNode[] = nodes.map((node: any) => ({
              ...node,
              data: {
                color: node.data?.color || DEFAULT_COLOR,
                type: node.data?.type || DEFAULT_NODE_TYPE,
                label: node.data?.label || DEFAULT_LABEL,
              },
            }));
  
            setSortedNodes(typedNodes);
            setEdges(edges);
            setTitle(loadedTitle || "Untitled");
            showMessage('Graph loaded successfully!', 'success');
          } catch (error) {
            console.error('Error loading graph:', error);
            showMessage('Failed to load the graph. Please try again.', 'error');
          }
        };
        reader.readAsText(file);
      } else {
        showMessage('No file selected.', 'error');
      }
    };
    document.body.appendChild(input);
    input.style.display = 'none';
    input.click();
    setTimeout(() => document.body.removeChild(input), 1000);
  };  

export function showMessage(message: string, type: "info" | "success" | "error" = "info") {
    const messageBox = document.getElementById("message-box");
    const messageText = document.getElementById("message-text");
    const closeButton = document.getElementById("close-message");
    if (!messageBox || !messageText || !closeButton) {
        console.error("Message box elements not found!");
        return;
    }
    messageText.textContent = message;
    messageBox.classList.remove("hidden", "info", "success", "error");
    messageBox.classList.add(type);
    messageBox.style.visibility = "visible";
    messageBox.style.opacity = "1";
    const timeout = setTimeout(() => {
        hideMessage();
    }, 3000);
    closeButton.onclick = function () {
        clearTimeout(timeout);
        hideMessage();
    };
}

function hideMessage() {
    const messageBox = document.getElementById("message-box");
    if (messageBox) {
        messageBox.style.opacity = "0";
        messageBox.style.visibility = "hidden";
    }
}

export function ensureGraphReady() {
    return Promise.resolve(); // ReactFlow is always ready
}