import React from 'react';
import { useReactFlow } from '@xyflow/react';

interface ContextMenuProps {
  x: number;
  y: number;
  onClose: () => void;
  undo: () => void;
  paste: () => void;
  copy: () => void;
  selectAll: () => void;
  selectAllVertices: () => void;
  selectAllEdges: () => void;
  canUndo: boolean;
  canPaste: boolean;
  canCopy: boolean;
}

const ContextMenu: React.FC<ContextMenuProps> = ({ 
  x, 
  y, 
  onClose,
  undo,
  paste,
  copy,
  selectAll,
  selectAllVertices,
  selectAllEdges,
  canUndo,
  canPaste,
  canCopy
}) => {
  const menuItems = [
    { label: 'Undo', action: undo, disabled: !canUndo },
    { label: 'Copy', action: copy, disabled: !canCopy },
    { label: 'Paste Here', action: paste, disabled: !canPaste },
    { label: 'Select All', action: selectAll, disabled: false },
    { label: 'Select Vertices', action: selectAllVertices, disabled: false },
    { label: 'Select Edges', action: selectAllEdges, disabled: false },
  ];

  return (
    <div
      className="fixed bg-white shadow-lg rounded-md py-2 min-w-[180px] z-50"
      style={{
        left: x,
        top: y,
      }}
      onClick={(e) => e.stopPropagation()}
    >
      {menuItems.map((item, index) => (
        <div
          key={index}
          className={`px-4 py-2 hover:bg-gray-100 cursor-pointer text-sm ${
            item.disabled ? 'opacity-50 cursor-not-allowed' : ''
          }`}
          onClick={() => {
            if (!item.disabled) {
              item.action();
              onClose();
            }
          }}
        >
          {item.label}
        </div>
      ))}
    </div>
  );
};

export default ContextMenu; 