import React from 'react';
import { useReactFlow, Node, Edge } from '@xyflow/react';
import { toPng } from 'html-to-image';

interface NodeEdgeContextMenuProps {
  x: number;
  y: number;
  onClose: () => void;
  onCopy: (elements: { nodes: Node[]; edges: Edge[] }) => void;
  selectedNodes: Node[];
  selectedEdges: Edge[];
}

const NodeEdgeContextMenu: React.FC<NodeEdgeContextMenuProps> = ({ 
  x, 
  y, 
  onClose,
  onCopy,
  selectedNodes,
  selectedEdges
}) => {
  const { getNode, getNodes, getEdges, setNodes, setEdges, deleteElements } = useReactFlow();

  const handleDelete = () => {
    deleteElements({ nodes: selectedNodes, edges: selectedEdges });
    onClose();
  };

  const handleCut = () => {
    const elements = { nodes: selectedNodes, edges: selectedEdges };
    onCopy(elements);
    deleteElements(elements);
    onClose();
  };

  const handleCopy = () => {
    const elements = { nodes: selectedNodes, edges: selectedEdges };
    onCopy(elements);
    onClose();
  };

  const handleCopyAsImage = async () => {
    if (selectedNodes.length === 0) return;

    try {
      // Find the node element in the DOM
      const nodeElement = document.querySelector(`[data-id="${selectedNodes[0].id}"]`);
      if (!nodeElement) return;

      // Convert the node to PNG
      const dataUrl = await toPng(nodeElement as HTMLElement, {
        backgroundColor: 'transparent',
        pixelRatio: 2
      });

      // Create a temporary link to download the image
      const link = document.createElement('a');
      link.download = `node-${selectedNodes[0].id}.png`;
      link.href = dataUrl;
      link.click();
    } catch (error) {
      console.error('Error copying as image:', error);
    }
    onClose();
  };

  const handleDuplicate = () => {
    // Create new nodes with unique IDs
    const newNodes = selectedNodes.map(node => ({
      ...node,
      id: `${node.id}-copy-${Math.random().toString(36).substr(2, 9)}`,
      position: {
        x: node.position.x + 20,
        y: node.position.y + 20
      },
      selected: false
    }));

    // Create a mapping of old node IDs to new node IDs
    const nodeMapping = selectedNodes.reduce((mapping, node, index) => {
      mapping[node.id] = newNodes[index].id;
      return mapping;
    }, {} as { [key: string]: string });

    // Create new edges with updated source/target IDs
    const newEdges = selectedEdges.map(edge => ({
      ...edge,
      id: `${edge.id}-copy-${Math.random().toString(36).substr(2, 9)}`,
      source: nodeMapping[edge.source] || edge.source,
      target: nodeMapping[edge.target] || edge.target,
      selected: false
    }));

    setNodes(prev => [...prev, ...newNodes]);
    setEdges(prev => [...prev, ...newEdges]);
    onClose();
  };

  const handleLockUnlock = () => {
    setNodes(prevNodes => 
      prevNodes.map(node => {
        if (selectedNodes.find(n => n.id === node.id)) {
          return {
            ...node,
            draggable: !node.draggable,
            connectable: !node.connectable,
            selectable: !node.selectable,
            data: {
              ...node.data,
              isLocked: !node.data?.isLocked
            }
          };
        }
        return node;
      })
    );

    setEdges(prevEdges =>
      prevEdges.map(edge => {
        if (selectedEdges.find(e => e.id === edge.id)) {
          return {
            ...edge,
            interactionWidth: edge.interactionWidth === 0 ? 20 : 0,
            data: {
              ...edge.data,
              isLocked: !edge.data?.isLocked
            }
          };
        }
        return edge;
      })
    );
    onClose();
  };

  const menuItems = [
    { label: 'Delete', action: handleDelete },
    { label: 'Cut', action: handleCut },
    { label: 'Copy', action: handleCopy },
    { label: 'Copy as Image', action: handleCopyAsImage },
    { label: 'Duplicate', action: handleDuplicate },
    { label: 'Lock/Unlock', action: handleLockUnlock },
    { label: 'Set as Default Style', action: () => console.log('Set as Default Style') },
    { label: 'To Front', action: () => console.log('To Front') },
    { label: 'To Back', action: () => console.log('To Back') },
    { label: 'Bring Forward', action: () => console.log('Bring Forward') },
    { label: 'Send Backward', action: () => console.log('Send Backward') },
    { label: 'Edit Style...', action: () => console.log('Edit Style') },
    { label: 'Edit Data...', action: () => console.log('Edit Data') },
    { label: 'Edit Link...', action: () => console.log('Edit Link') },
    { label: 'Edit Connection Points...', action: () => console.log('Edit Connection Points') },
    { label: 'Add to Scratchpad', action: () => console.log('Add to Scratchpad') },
  ];

  // Close menu when clicking outside
  React.useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      onClose();
    };
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, [onClose]);

  return (
    <div
      className="fixed bg-white shadow-lg rounded-md py-1 min-w-[200px] z-[9999]"
      style={{
        position: 'fixed',
        left: x,
        top: y,
        border: '1px solid #e2e8f0',
        boxShadow: '0 2px 5px rgba(0,0,0,0.1)',
      }}
      onClick={(e) => e.stopPropagation()}
    >
      {menuItems.map((item, index) => {
        // Add separators after specific items
        const addSeparator = [
          'Duplicate',
          'Lock/Unlock',
          'Set as Default Style',
          'Send Backward',
          'Edit Connection Points...'
        ].includes(item.label);

        return (
          <React.Fragment key={index}>
            <div
              className="px-4 py-1.5 hover:bg-gray-100 cursor-pointer text-sm select-none"
              onClick={(e) => {
                e.stopPropagation();
                item.action();
              }}
            >
              {item.label}
            </div>
            {addSeparator && <div className="border-t border-gray-200 my-1" />}
          </React.Fragment>
        );
      })}
    </div>
  );
};

export default NodeEdgeContextMenu; 