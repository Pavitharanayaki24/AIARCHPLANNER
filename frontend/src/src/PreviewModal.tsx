 import React, { useState, useEffect, useRef } from 'react';
import {
  ReactFlow,
  Background,
  ReactFlowProvider,
  ConnectionLineType,
  ConnectionMode,
  NodeTypes,
  Edge,
  useReactFlow,
  BezierEdge, StraightEdge, StepEdge, SmoothStepEdge, 
} from '@xyflow/react';
import ReactDOM from 'react-dom';
import { toPng, toJpeg } from 'html-to-image';
import { PDFDocument } from 'pdf-lib';
import IconNode from './components/IconNode';
import ShapeNodeComponent from './components/shape-node';
import { useNodeContext } from './NodeContext';

const nodeTypes: NodeTypes = {
  'custom-shape': IconNode,
  shape: ShapeNodeComponent,
  square: IconNode,
  triangle: IconNode,
  circle: IconNode,
  diamond: IconNode,
};

const edgeTypes = {
  bezier: BezierEdge,
  straight: StraightEdge,
  step: StepEdge,
  smoothstep: SmoothStepEdge,
};

const margin = 5;

interface PreviewModalProps {
  title: string;
  isOpen: boolean;
  onClose: () => void;
}

const PreviewModal: React.FC<PreviewModalProps> = ({ title, isOpen, onClose }) => {
  const { nodes, edges, setSortedNodes, setEdges } = useNodeContext();
  const [bgOption, setBgOption] = useState<'white' | 'transparent'>('white');
  const [gridOption, setGridOption] = useState<'with' | 'without'>('without');
  const [downloadFormat, setDownloadFormat] = useState<'png' | 'jpg' | 'pdf'>('png');
  const [isDownloading, setIsDownloading] = useState(false);
  const previewRef = useRef<HTMLDivElement>(null);
  const { fitView } = useReactFlow();
  const { width, height } = getBoundingBoxOfNodes(nodes);
  const bbox = getBoundingBoxOfNodes(nodes);

  useEffect(() => {
    if (!isOpen || nodes.length === 0) return;
    fitView();
  }, [isOpen, fitView, nodes]);

  function getBoundingBoxOfNodes(nodes: any[]) {
    const minX = Math.min(...nodes.map((n) => n.position.x));
    const minY = Math.min(...nodes.map((n) => n.position.y));
    const maxX = Math.max(...nodes.map((n) => n.position.x + (n.width || 0)));
    const maxY = Math.max(...nodes.map((n) => n.position.y + (n.height || 0)));

    return {
      x: minX - margin,
      y: minY - margin,
      width: maxX - minX + 2 * margin,
      height: maxY - minY + 2 * margin,
    };
  }

  const handleDownload = async () => {
    if (!previewRef.current) return;

    setIsDownloading(true);

    const bbox = getBoundingBoxOfNodes(nodes);
    const canvasWidth = bbox.width;
    const canvasHeight = bbox.height;

    const exportOptions = {
      backgroundColor: bgOption === 'white' ? '#ffffff' : 'transparent',
      style: {
        width: `${canvasWidth}px`,
        height: `${canvasHeight}px`,
        padding: '0px',
        margin: '0px',
        backgroundColor: bgOption === 'white' ? '#ffffff' : 'transparent',
      },
    };
    try {
      let dataUrl: string;
      if (downloadFormat === 'jpg') {
        dataUrl = await toJpeg(previewRef.current, exportOptions);
      } else {
        dataUrl = await toPng(previewRef.current, exportOptions);
      }
      if (downloadFormat === 'pdf') {
        const pdfDoc = await PDFDocument.create();
        const imgBytes = await fetch(dataUrl).then((res) => res.arrayBuffer());
        const pngImage = await pdfDoc.embedPng(imgBytes);
        const { width: imgWidth, height: imgHeight } = pngImage;

        // A4 size in points (portrait)
        const A4_WIDTH = 595.28;
        const A4_HEIGHT = 841.89;
        const MARGIN = 40;

        // Max drawable area
        const maxWidth = A4_WIDTH - MARGIN * 2;
        const maxHeight = A4_HEIGHT - MARGIN * 2;

        // Scale image to fit within margins
        const widthRatio = maxWidth / imgWidth;
        const heightRatio = maxHeight / imgHeight;
        const scale = Math.min(widthRatio, heightRatio);

        const scaledWidth = imgWidth * scale;
        const scaledHeight = imgHeight * scale;

        // Centered coordinates
        const x = (A4_WIDTH - scaledWidth) / 2;
        const y = (A4_HEIGHT - scaledHeight) / 2;

        const page = pdfDoc.addPage([A4_WIDTH, A4_HEIGHT]);
        page.drawImage(pngImage, {
          x,
          y,
          width: scaledWidth,
          height: scaledHeight,
        });

        const pdfBytes = await pdfDoc.save();
        const blob = new Blob([pdfBytes], { type: 'application/pdf' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `${title}.pdf`;
        link.click();
      } else {
        const link = document.createElement('a');
        link.href = dataUrl;
        link.download = `${title}.${downloadFormat}`;
        link.click();
      }
    } catch (err) {
      console.error('Download failed', err);
    }

    setIsDownloading(false);
  };

  if (!isOpen) return null;

return ReactDOM.createPortal(
    <div
      className="fixed inset-0 backdrop-blur-lg bg-white/30 flex items-center justify-center z-20"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      >
      <div className="bg-white shadow-xl rounded-xl p-6 w-3/4 h-[75%] flex flex-col relative border border-gray-300">

        {/* X Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-500 hover:text-red-500 text-4xl font-bold focus:outline-none cursor-pointer"
        >
          &times;
        </button>

        <div className="flex-1 grid md:grid-cols-[2fr_1fr] gap-6 overflow-hidden mt-4">

          {/* Preview Panel */}
          <div className="bg-gray-100 rounded-xl overflow-auto p-4 shadow-inner">
            <div
              ref={previewRef}
              className="h-full w-full pointer-events-none rounded-md"
              style={{
                backgroundColor: bgOption === 'white' ? '#ffffff' : 'transparent',
                width: `${width}px`,
                height: `${height}px`,
                padding: '0px',
                margin: '0px',
              }}
              >
              <ReactFlow
                nodes={nodes}
                edges={edges}
                nodeTypes={nodeTypes}
                edgeTypes={edgeTypes}
                connectionLineType={ConnectionLineType.SmoothStep}
                connectionMode={ConnectionMode.Loose}
                fitView
                nodesDraggable={false}
                nodesConnectable={false}
                elementsSelectable={false}
                zoomOnScroll={false}
                panOnScroll={false}
                panOnDrag={false}
                style={{ backgroundColor: 'transparent', transform: 'none', padding: '0px', margin: '0px'}}
              >
                {gridOption === 'with' && <Background />}
              </ReactFlow>
            </div>
          </div>

          {/* Controls Panel */}
          <div className="bg-white rounded-xl p-10 shadow-lg flex flex-col justify-between">
            <div className="space-y-6 flex flex-col items-center">
              <h2 className="text-2xl font-semibold text-center text-gray-800">Export Options</h2>
              {/* Grid Buttons */}
              <div>
                <button
                  onClick={() => setGridOption(gridOption === 'with' ? 'without' : 'with')}
                  className={`px-4 py-2 rounded-lg border ${gridOption === 'with' ? 'bg-blue-500 text-white' : 'bg-gray-100 text-gray-700'} transition`}
                >
                  Grid
                </button>
              </div>
              {/* Background Buttons */}
              <div>
                <button
                  onClick={() => setBgOption(bgOption === 'transparent' ? 'white' : 'transparent')}
                  className={`px-4 py-2 rounded-lg border ${bgOption === 'transparent' ? 'bg-blue-500 text-white' : 'bg-gray-100 text-gray-700'} transition`}
                >
                  Transparent
                </button>
              </div>
              {/* File Format Dropdown */}
              <div>
                <label className="block font-medium text-gray-700 mb-2">File Format</label>
                <select
                  value={downloadFormat}
                  onChange={(e) => setDownloadFormat(e.target.value as 'png' | 'jpg' | 'pdf')}
                  className="w-40 border px-4 py-2 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-gray-700"
                >
                  <option value="png">PNG</option>
                  <option value="jpg">JPG</option>
                  <option value="pdf">PDF</option>
                </select>
              </div>
            </div>
            {/* Bottom Buttons */}
            <div className="flex justify-center items-center mt-8 space-x-4">
              <button
                onClick={onClose}
                className="text-gray-600 px-6 py-2 rounded-lg hover:text-gray-800 hover:bg-gray-300 text-lg transition"
              >
                Cancel
              </button>
              <button
                onClick={handleDownload}
                disabled={isDownloading}
                className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 disabled:bg-gray-400 transition"
              >
                {isDownloading ? 'Exporting...' : 'Export'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
};

export default PreviewModal;