import React from 'react';

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
  canCopy,
}) => {
  const menuStyle: React.CSSProperties = {
    position: 'absolute',
    left: x,
    top: y,
    backgroundColor: 'white',
    boxShadow: '0 2px 4px rgba(0, 0, 0, 0.2)',
    borderRadius: '4px',
    padding: '8px 0',
    zIndex: 1000,
  };

  const menuItemStyle: React.CSSProperties = {
    padding: '8px 16px',
    cursor: 'pointer',
    fontSize: '14px',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    opacity: 1,
  };

  const disabledStyle: React.CSSProperties = {
    opacity: 0.5,
    cursor: 'not-allowed',
  };

  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (!target.closest('.context-menu')) {
        onClose();
      }
    };

    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, [onClose]);

  const MenuItem = ({ 
    label, 
    onClick, 
    disabled = false,
    shortcut
  }: { 
    label: string; 
    onClick: () => void; 
    disabled?: boolean;
    shortcut?: string;
  }) => (
    <div
      style={{
        ...menuItemStyle,
        ...(disabled ? disabledStyle : {}),
      }}
      onClick={() => !disabled && onClick()}
      onMouseEnter={(e) => {
        if (!disabled) {
          (e.target as HTMLElement).style.backgroundColor = '#f5f5f5';
        }
      }}
      onMouseLeave={(e) => {
        if (!disabled) {
          (e.target as HTMLElement).style.backgroundColor = 'transparent';
        }
      }}
    >
      <span style={{ flex: 1 }}>{label}</span>
      {shortcut && (
        <span style={{ color: '#666', fontSize: '12px' }}>{shortcut}</span>
      )}
    </div>
  );

  return (
    <div className="context-menu" style={menuStyle}>
      <MenuItem 
        label="Undo" 
        onClick={undo} 
        disabled={!canUndo} 
        shortcut="Ctrl+Z"
      />
      <div style={{ borderTop: '1px solid #eee', margin: '4px 0' }} />
      <MenuItem 
        label="Paste" 
        onClick={paste} 
        disabled={!canPaste} 
        shortcut="Ctrl+V"
      />
      <MenuItem 
        label="Copy" 
        onClick={copy} 
        disabled={!canCopy} 
        shortcut="Ctrl+C"
      />
      <div style={{ borderTop: '1px solid #eee', margin: '4px 0' }} />
      <MenuItem 
        label="Select All" 
        onClick={selectAll} 
        shortcut="Ctrl+A"
      />
      <MenuItem 
        label="Select All Vertices" 
        onClick={selectAllVertices}
      />
      <MenuItem 
        label="Select All Edges" 
        onClick={selectAllEdges}
      />
    </div>
  );
};

export default ContextMenu; 