import React, { useState, useEffect, useRef } from 'react';
import { NodeProps, useReactFlow } from '@xyflow/react';

interface TextNodeData {
  label: string;
  isSelected?: boolean;
  type: string;
  color?: string;
}

const TextNode: React.FC<NodeProps> = ({ data, selected, id }) => {
  const nodeData = data as unknown as TextNodeData;
  const [isEditing, setIsEditing] = useState(false);
  const [text, setText] = useState<string>(nodeData.label || 'Text');
  const inputRef = useRef<HTMLInputElement>(null);
  const { setNodes } = useReactFlow();

  // Start editing on creation
  useEffect(() => {
    if (nodeData.isSelected) {
      setIsEditing(true);
      inputRef.current?.focus();
    }
  }, [nodeData.isSelected]);

  // Handle text input change
  const handleTextChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newText = e.target.value;
    setText(newText);
    
    // Update the node data
    setNodes((nodes) =>
      nodes.map((node) =>
        node.id === id
          ? {
              ...node,
              data: {
                ...node.data,
                label: newText,
              },
            }
          : node
      )
    );
  };

  // Handle key press events
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      setIsEditing(false);
    }
  };

  // Handle double click to edit
  const handleDoubleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsEditing(true);
    setTimeout(() => {
      inputRef.current?.focus();
    }, 0);
  };

  // Handle blur event (clicking outside)
  const handleBlur = () => {
    setIsEditing(false);
  };

  return (
    <div
      style={{
        border: selected ? '1px dashed #1a192b' : 'none',
        padding: '2px 5px',
        borderRadius: '3px',
        minWidth: '50px',
        cursor: 'move',
      }}
      onDoubleClick={handleDoubleClick}
      data-id={id}
    >
      {isEditing ? (
        <input
          ref={inputRef}
          type="text"
          value={text}
          onChange={handleTextChange}
          onKeyDown={handleKeyDown}
          onBlur={handleBlur}
          style={{
            background: 'transparent',
            border: 'none',
            outline: 'none',
            width: '100%',
            fontSize: '14px',
            fontFamily: 'inherit',
          }}
          autoFocus
        />
      ) : (
        <div style={{ fontSize: '14px' }}>{text}</div>
      )}
    </div>
  );
};

export default TextNode; 