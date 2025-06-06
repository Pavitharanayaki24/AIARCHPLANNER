import { useEffect, useRef, useState } from 'react';
import { Edge, useReactFlow, useStore } from '@xyflow/react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faGripHorizontal } from '@fortawesome/free-solid-svg-icons';

type RightsidePanelProps = {
  onColorChange?: (nodeId: string, color: string) => void;
  selectedEdge: Edge[];
  onEdgeStyleChange: (edgeId: string, algorithm: string) => void;
  onClose: () => void;
};

const edgeStyles = [
  { label: 'Orthogonal', value: 'smoothstep' },
  { label: 'Curved', value: 'curved' },
  { label: 'Linear', value: 'linear' },
];

const colorOptions = ['#CF4C2C', '#EA9C41', '#EBC347', '#438D57', '#3F8AE2', '#803DEC', '#808080'];

function RightsidePanel({ onColorChange = () => {}, selectedEdge, onEdgeStyleChange, onClose }: RightsidePanelProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const { getNodes } = useReactFlow();
  const [isExpanded, setIsExpanded] = useState(true);
  const [isColorPickerVisible, setIsColorPickerVisible] = useState(false);
  const [isEdgeDropdownVisible, setIsEdgeDropdownVisible] = useState(false);
  const [currentAlgorithm, setCurrentAlgorithm] = useState('smoothstep');
  const [color, setColor] = useState('#3F8AE2');

  const selectedNode = useStore((state) => state.nodes.find((node) => node.selected));
  const isShapeNode = selectedNode?.type === 'shape';
  const isEditableEdge = selectedEdge.length > 0;

  useEffect(() => {
    if (selectedEdge.length > 0) {
      const firstEdge = selectedEdge[0];
      const algorithm = (firstEdge?.data?.algorithm as string) || 'smoothstep';
      setCurrentAlgorithm(algorithm);
    }
  }, [selectedEdge]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(event.target as Node)) {
        setIsColorPickerVisible(false);
        setIsEdgeDropdownVisible(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    const selectedNodes = getNodes().filter(node => node.selected);
    if (selectedNodes.length === 1) {
      const nodeColor = (selectedNodes[0].data as { color?: string }).color;
      setColor(nodeColor || '#CF4C2C'); 
    } else if (selectedNodes.length > 1) {
      const nodeColor = (selectedNodes[0].data as { color?: string }).color;
      setColor(nodeColor || '#CF4C2C'); 
    }
  }, [selectedNode]);

  const handleColorCircleClick = () => {
    if (isShapeNode) {
      setIsColorPickerVisible((prev) => !prev);
    }
  };

  const handleEdgeStyleClick = () => {
    if (isEditableEdge) {
      setIsEdgeDropdownVisible((prev) => !prev);
    }
  };

  const handleColorSelect = (selectedColor: string) => {
    setColor(selectedColor);
    if (selectedNode) {
      onColorChange(selectedNode.id, selectedColor);
    }
  };

  const handlePathSelect = (algorithm: string) => {
    selectedEdge.forEach((edge) => {
      onEdgeStyleChange(edge.id, algorithm);
    });
    setCurrentAlgorithm(algorithm);
  };

  const toggleExpand = () => setIsExpanded(!isExpanded);

  return (
    <div style={{ position: 'absolute', top: 70, right: 20, width: '270px', zIndex: 10 }}>
      {/* Toggle Header */}
      <div
        onClick={toggleExpand}
        style={{
          width: '100%',
          height: '40px',
          background: '#eee',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'flex-start',
          paddingLeft: '10px',
          cursor: 'pointer',
          borderRadius: '8px 8px 0 0',
          boxShadow: '0 2px 5px rgba(0,0,0,0.1)',
        }}
      >
        <span style={{ fontSize: '16px', transform: isExpanded ? 'rotate(180deg)' : 'rotate(0)', transition: 'transform 0.3s ease' }}>
          ▼
        </span>
        <FontAwesomeIcon
          icon={faGripHorizontal}
          style={{
            position: 'absolute',
            left: '50%',
            transform: 'translateX(-50%)',
            fontSize: '16px',
            color: '#333',
          }}
        />
      </div>

      {/* Panel Content */}
      {isExpanded && (
        <div
          ref={panelRef}
          style={{
            width: '100%',
            background: '#fff',
            borderRadius: '0 0 8px 8px',
            boxShadow: '0 2px 10px rgba(0,0,0,0.15)',
            padding: '15px',
          }}
        >
          {/* Color Selection */}
          <div style={{ marginBottom: '10px', opacity: isShapeNode ? 1 : 0.5 }}>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                cursor: isShapeNode ? 'pointer' : 'default',
              }}
              onClick={handleColorCircleClick}
            >
              <span style={{marginRight: '10px' }}>Color : </span> {/* Keeping the label to the left */}
              <div
                style={{
                  width: '24px',
                  height: '24px',
                  borderRadius: '50%',
                  backgroundColor: color,
                  border: '2px solid black',
                  marginLeft: '100px',
                }}
              />
            </div>
            {isColorPickerVisible && isShapeNode && (
              <div style={{ marginTop: '10px', display: 'flex', justifyContent: 'space-between' }}>
                {colorOptions.map((clr) => (
                  <div
                    key={clr}
                    onClick={() => handleColorSelect(clr)}
                    style={{
                      width: '24px',
                      height: '24px',
                      borderRadius: '50%',
                      backgroundColor: clr,
                      cursor: 'pointer',
                      border: clr === color ? '3px solid black' : '1px solid #ccc',
                    }}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Edge Style Selection */}
          <div style={{ opacity: isEditableEdge ? 1 : 0.5 }}>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                cursor: isEditableEdge ? 'pointer' : 'default',
                gap: '10px',
              }}
              onClick={handleEdgeStyleClick}
            >
              <span>Edge Style : </span>
              <div
                style={{
                  textAlign: 'center',
                  border: '1px solid #ccc',
                  padding: '5px 10px',
                  marginLeft: '10px',
                  backgroundColor: 'white',
                  width: '130px',
                }}
              >
                {edgeStyles.find((style) => style.value === currentAlgorithm)?.label}
              </div>
            </div>
            {isEdgeDropdownVisible && isEditableEdge && (
              <div
                style={{
                  border: '1px solid #ccc',
                  overflow: 'hidden',
                  width: '130px',
                  textAlign: 'center',
                  backgroundColor: 'white',
                  marginLeft: '107px',
                }}
              >
                {edgeStyles.map((style) => (
                  <div
                    key={style.value}
                    onClick={() => handlePathSelect(style.value)}
                    style={{
                      padding: '8px',
                      cursor: 'pointer',
                      backgroundColor: currentAlgorithm === style.value ? '#eee' : '#fff',
                      textAlign: 'center',
                      width: '100%',
                    }}
                  >
                    {style.label}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default RightsidePanel;