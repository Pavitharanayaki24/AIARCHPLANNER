import React, { useEffect, useRef } from 'react';
import { useReactFlow } from '@xyflow/react';
import {
  ArrowUturnLeftIcon,
  DocumentDuplicateIcon,
  ClipboardIcon,
  CheckIcon,
  Square2StackIcon,
  ArrowsRightLeftIcon
} from '@heroicons/react/24/outline';

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

interface MenuItem {
  label: string;
  action: () => void;
  disabled: boolean;
  icon: any; // Using any type for now to avoid TypeScript issues
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
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        onClose();
      }
    };

    // Add click and contextmenu event listeners
    document.addEventListener('click', handleClickOutside);
    document.addEventListener('contextmenu', handleClickOutside);

    return () => {
      // Clean up event listeners
      document.removeEventListener('click', handleClickOutside);
      document.removeEventListener('contextmenu', handleClickOutside);
    };
  }, [onClose]);

  const menuItems: MenuItem[] = [
    { label: 'Undo', action: undo, disabled: !canUndo, icon: ArrowUturnLeftIcon },
    { label: 'Copy', action: copy, disabled: !canCopy, icon: DocumentDuplicateIcon },
    { label: 'Paste Here', action: paste, disabled: !canPaste, icon: ClipboardIcon },
    { label: 'Select All', action: selectAll, disabled: false, icon: CheckIcon },
    { label: 'Select Vertices', action: selectAllVertices, disabled: false, icon: Square2StackIcon },
    { label: 'Select Edges', action: selectAllEdges, disabled: false, icon: ArrowsRightLeftIcon },
  ];

  return (
    <div
      ref={menuRef}
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
          className={`px-4 py-2 hover:bg-gray-100 cursor-pointer text-sm flex items-center gap-2 ${
            item.disabled ? 'opacity-50 cursor-not-allowed' : ''
          }`}
          onClick={() => {
            if (!item.disabled) {
              item.action();
              onClose();
            }
          }}
        >
          <item.icon className="w-4 h-4 text-gray-500" />
          {item.label}
        </div>
      ))}
    </div>
  );
};

export default ContextMenu; 