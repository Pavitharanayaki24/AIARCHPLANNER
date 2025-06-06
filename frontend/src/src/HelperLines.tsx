import { CSSProperties, useEffect, useRef } from 'react';
import { ReactFlowState, useStore } from '@xyflow/react';

const canvasStyle: CSSProperties = {
  width: '100%',
  height: '100%',
  position: 'absolute',
  zIndex: 10,
  pointerEvents: 'none',
};

const storeSelector = (state: ReactFlowState) => ({
  width: state.width,
  height: state.height,
  transform: state.transform,
});

export type HelperLinesProps = {
  horizontal?: number;
  vertical?: number;
  spacingGuides?: {
    between: [{ x: number; y: number }, { x: number; y: number }];
    distance: number;
  }[];
  horizontalEdges?: { left: number; right: number };
  verticalEdges?: { top: number; bottom: number };
};

// a simple component to display the helper lines
// it puts a canvas on top of the React Flow pane and draws the lines using the canvas API
function HelperLines({ horizontal, vertical, spacingGuides, verticalEdges, horizontalEdges }: HelperLinesProps) {
  const { width, height, transform } = useStore(storeSelector);

  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');

    if (!ctx || !canvas) {
      return;
    }

    const dpi = window.devicePixelRatio;
    canvas.width = width * dpi;
    canvas.height = height * dpi;

    ctx.scale(dpi, dpi);
    ctx.clearRect(0, 0, width, height);
    const lineColor = spacingGuides?.length ? '#ea3473' : 'grey';
    ctx.strokeStyle = lineColor;
    ctx.setLineDash([5, 5]);
    ctx.lineWidth = 1;

    if (typeof vertical === 'number') {
      const x = vertical * transform[2] + transform[0];
      const top = verticalEdges?.top ?? 0;
      const bottom = verticalEdges?.bottom ?? height;
    
      ctx.beginPath();
      ctx.moveTo(x, top * transform[2] + transform[1]);
      ctx.lineTo(x, bottom * transform[2] + transform[1]);
      ctx.stroke();
    }
    
    if (typeof horizontal === 'number') {
      const y = horizontal * transform[2] + transform[1];
      const left = horizontalEdges?.left ?? 0;
      const right = horizontalEdges?.right ?? width;
    
      ctx.beginPath();
      ctx.moveTo(left * transform[2] + transform[0], y);
      ctx.lineTo(right * transform[2] + transform[0], y);
      ctx.stroke();
    }
    
    const drawPipeLines = (ctx: CanvasRenderingContext2D, x1: number, y1: number, x2: number, y2: number, isHorizontal: boolean, distance: number) => {
      // Draw main spacing line (dashed)
      ctx.beginPath();
      ctx.setLineDash([5, 5]);
      ctx.strokeStyle = '#ea3473';
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.stroke();
    
      // Draw pipe lines (solid) with increased width
      ctx.beginPath();
      ctx.setLineDash([]); // Solid line for pipes
      ctx.strokeStyle = '#ea3473';
      ctx.lineWidth = 2;
      
      if (isHorizontal) {
        ctx.moveTo(x1 + 3, y1 - 8);
        ctx.lineTo(x1 + 3, y1 + 8);
        ctx.moveTo(x2 - 3, y2 - 8);
        ctx.lineTo(x2 - 3, y2 + 8);
      } else {
        ctx.moveTo(x1 - 8, y1 + 3);
        ctx.lineTo(x1 + 8, y1 + 3);
        ctx.moveTo(x2 - 8, y2 - 3);
        ctx.lineTo(x2 + 8, y2 - 3);
      }
      ctx.stroke();
    };
    
    spacingGuides?.forEach(({ between, distance }) => {
      const [start, end] = between;
    
      // Convert start/end positions from logical coordinates to screen pixels
      const x1 = start.x * transform[2] + transform[0];
      const y1 = start.y * transform[2] + transform[1];
      const x2 = end.x * transform[2] + transform[0];
      const y2 = end.y * transform[2] + transform[1];
    
      const isHorizontal = Math.abs(y1 - y2) < 1;
      const isVertical = Math.abs(x1 - x2) < 1;
    
      if (isHorizontal) {
        drawPipeLines(ctx, x1, y1, x2, y2, true, distance);
      } else if (isVertical) {
        drawPipeLines(ctx, x1, y1, x2, y2, false, distance);
      }
    });    
    
  }, [width, height, transform, horizontal, vertical, spacingGuides]);

  return (
    <canvas
      ref={canvasRef}
      className="react-flow__canvas"
      style={canvasStyle}
    />
  );
}

export default HelperLines;