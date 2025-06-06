import { useState, useEffect, useRef } from 'react';
import { useNodeContext } from '../../NodeContext';
import { FaSync } from 'react-icons/fa';

type NodeLabelProps = {
  placeholder: string;
  nodeId: string;
  type: string;
};

function NodeLabel({ placeholder, nodeId, type }: NodeLabelProps) {
  const { setSortedNodes, pushToHistory } = useNodeContext();
  const [isEditing, setIsEditing] = useState(false);
  const [editingLineCount, setEditingLineCount] = useState(1);
  const [label, setLabel] = useState(placeholder);
  const containerRef = useRef<HTMLDivElement>(null);
  const editableRef = useRef<HTMLDivElement>(null);
  const maxLength = type === 'group' ? 50 : 25;
  const [inputWidth, setInputWidth] = useState<number>(0);
  const [rotation, setRotation] = useState(0);
  const rotationDragRef = useRef<{ startX: number; startY: number; startAngle: number } | null>(null);
  const spanRef = useRef<HTMLInputElement | null>(null);
  
  useEffect(() => {
    if (label !== placeholder) {
      setLabel(placeholder);
    }
  }, [placeholder]);

  useEffect(() => {
    if (isEditing && editableRef.current) {
      const node = editableRef.current;
      node.innerText = label; // Set only once at beginning
      setCaretToEnd(node);
      node.focus();
    }
  }, [isEditing]);

  const handleLabelChange = (id: string, newLabel: string) => {
    setSortedNodes((prevNodes) => {
      const updatedNodes = prevNodes.map((node) =>
        node.id === id
          ? {
              ...node,
              data: {
                ...node.data,
                label: newLabel,
              },
            }
          : node
      );
      pushToHistory(updatedNodes, []);
      return updatedNodes;
    });
  };

  const handleBlur = () => {
    if (editableRef.current) {
      let text = editableRef.current.innerText.trim().slice(0, maxLength);
      const lines = text.split('\n').slice(0, 2); // allow only 2 lines
      text = lines.join('\n');
      setLabel(text);
      setEditingLineCount(lines.length);
      handleLabelChange(nodeId, text);
    }
    setIsEditing(false);
  };  

  const handleInput = () => {
    if (!editableRef.current) return;

    // Use innerHTML to retain <br> (empty lines)
    const html = editableRef.current.innerHTML;

    // Convert <div> and <br> tags to newline-safe format
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = html;
    const lines: string[] = [];
    tempDiv.childNodes.forEach((node) => {
      if (node.nodeName === 'BR' || node.textContent?.trim() === '') {
        lines.push('');
      } else {
        lines.push(node.textContent || '');
      }
    });

    if (lines.length > 2) {
      editableRef.current.innerHTML = lines.slice(0, 2).join('<br>');
      setCaretToEnd(editableRef.current);
    }

    const updatedText = lines.slice(0, 2).join('\n');
    setEditingLineCount(lines.length);
    setLabel(updatedText);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    // Prevent deletion from affecting parent
    if (e.key === 'Delete') {
      e.stopPropagation();
    }

    const text = editableRef.current?.innerText || '';
    const lines = text.split('\n');

    if (e.key === 'Enter' && lines.length >= 2) {
      e.preventDefault(); // block 3rd line
    }
  };

  const setCaretToEnd = (el: HTMLElement) => {
    const range = document.createRange();
    const sel = window.getSelection();
    range.selectNodeContents(el);
    range.collapse(false);
    sel?.removeAllRanges();
    sel?.addRange(range);
  };

  const activeLineCount = isEditing ? editingLineCount : (label.split('\n').length || 1);
  const topOffset =
    type === 'dashed-rectangle'
      ? activeLineCount > 1
        ? '-40px'
        : '-20px'
      : activeLineCount > 1
      ? '0px'
      : '0px';

  const containerStyle: React.CSSProperties =
    type === 'dashed-rectangle'
      ? {
          position: 'absolute',
          top: topOffset,
          left: '50%',
          transform: 'translateX(-50%)',
          minWidth: '150px',
          textAlign: 'center',
          transition: 'top 0.2s ease',
        }
      : {
          position: 'absolute',
          top: topOffset,
          inset: '0',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          textAlign: 'center',
          transition: 'top 0.2s ease',
        };

  const onRotationMouseDown = (e: React.MouseEvent) => {
    e.stopPropagation();

    if (!containerRef.current) return;

    const rect = containerRef.current.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;

    rotationDragRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      startAngle: rotation,
    };

    const onMouseMove = (moveEvent: MouseEvent) => {
      if (!rotationDragRef.current) return;

      const dx = moveEvent.clientX - centerX;
      const dy = moveEvent.clientY - centerY;

      const startDx = rotationDragRef.current.startX - centerX;
      const startDy = rotationDragRef.current.startY - centerY;

      const startAngleRad = Math.atan2(startDy, startDx);
      const currentAngleRad = Math.atan2(dy, dx);

      const deltaAngle = currentAngleRad - startAngleRad;
      const newRotation = rotationDragRef.current.startAngle + (deltaAngle * 180) / Math.PI;

      setRotation(newRotation);
    };

    const onMouseUp = () => {
      rotationDragRef.current = null;
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
  };

  useEffect(() => {
    if (spanRef.current) {
      const width = spanRef.current.offsetWidth;
      setInputWidth(width + 10); // add some padding for caret
    }
  }, [label]);
  
return (
    <div
      ref={containerRef}
      onDoubleClick={() => setIsEditing(true)}
      style={{
        position: "relative",
        transform: `rotate(${rotation}deg)`,
        transition: "transform 0.2s",
        userSelect: "none", // prevent text selection outside editable
      }}
      onPointerDown={(e) => e.stopPropagation()} // Prevent node drag on label container
    >
      {/* Rotation Handle */}
      {isEditing && (
        <div
          style={{
            position: "absolute",
            top: "-30px",
            left: "50%",
            transform: "translateX(-50%)",
            cursor: "grab",
            userSelect: "none",
            pointerEvents: "auto",
          }}
          onPointerDown={(e) => {
            e.stopPropagation(); // Prevent node drag start
            onRotationMouseDown(e);
          }}
          draggable={false}
        >
          <FaSync size={14} />
        </div>
      )}

      {/* Label: Editable or Display */}
      {isEditing ? (
        <div
          ref={editableRef}
          contentEditable
          suppressContentEditableWarning
          onBlur={handleBlur}
          onInput={handleInput}
          onKeyDown={handleKeyDown}
          className="outline-none text-black text-xs bg-transparent px-1 min-w-[100px] text-center"
          style={{
            whiteSpace: "pre-wrap",
            overflow: "hidden",
            resize: "none",
            cursor: "text",
          }}
          onPointerDown={(e) => e.stopPropagation()} // prevent node drag when editing
        />
      ) : (
        <div
          className="text-xs bg-transparent px-1 rounded cursor-pointer flex items-center justify-center text-center"
          style={{
            color: type === "dashed-rectangle" ? "#808080" : "black",
            minHeight: "16px",
            whiteSpace: "pre-wrap",
          }}
          onPointerDown={(e) => e.stopPropagation()} // prevent node drag on label click
        >
          {label}
        </div>
      )}
    </div>
  );
}

export default NodeLabel;