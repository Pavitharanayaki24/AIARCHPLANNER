import React, { useState, useEffect, useRef } from 'react';
import { NodeProps } from '@xyflow/react';
import { ShapeNode } from './shape/types';

interface TextNodeData {
  label: string;
  isSelected?: boolean;
  type: string;
  color?: string;
}

export type TextNodeType = ShapeNode & {
  type: 'text';
  data: TextNodeData;
};

const TextNode = ({ data, selected }: NodeProps<TextNodeData>) => {
  const [isEditing, setIsEditing] = useState(false);
  const [text, setText] = useState<string>(data.label || 'Text');
  const inputRef = useRef<HTMLInputElement>(null);

  // Start editing on creation
  useEffect(() => {
    if (data.isSelected) {
      setIsEditing(true);
      inputRef.current?.focus();
    }
  }, [data.isSelected]);

  // Handle text input change
  const handleTextChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setText(e.target.value);
  };

  // Handle key press events
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      setIsEditing(false);
    }
  };

  // Handle double click to edit
  const handleDoubleClick = () => {
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