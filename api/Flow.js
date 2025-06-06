import fs from 'node:fs/promises';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { Background, ReactFlow, Handle } from 'reactflow';
import puppeteer from 'puppeteer';

// Custom node components using React.createElement
const CustomShapeNode = ({ data }) => {
  const isTriangle = data.iconSrc?.includes('triangle') || data.shape === 'triangle';
  const isCircle = data.iconSrc?.includes('circle') || data.shape === 'circle';
  const isDiamond = data.iconSrc?.includes('diamond') || data.shape === 'diamond';
  const hideLabel = data.hideLabel === true;

  const containerStyle = {
    width: '100%',
    height: '100%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative'
  };

  const shapeStyle = {
    width: '100%',
    height: '100%',
    background: '#fff',
    border: '2px solid #1a192b',
    display: 'flex',
    alignItems: isTriangle ? 'flex-end' : 'center',
    justifyContent: 'center',
    padding: '10px',
    position: 'absolute',
    top: 0,
    left: 0,
    ...(isTriangle && {
      clipPath: 'polygon(50% 0%, 0% 100%, 100% 100%)',
      paddingBottom: '30px'
    }),
    ...(isCircle && {
      borderRadius: '50%'
    }),
    ...(isDiamond && {
      clipPath: 'polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%)'
    })
  };

  const textStyle = {
    position: 'relative',
    zIndex: 2,
    fontWeight: 'bold',
    color: '#000',
    textAlign: 'center',
    width: '100%',
    wordBreak: 'break-word',
    display: hideLabel ? 'none' : 'block'
  };

  return React.createElement('div', {
    style: containerStyle,
    className: 'custom-shape-node',
    'data-shape': isTriangle ? 'triangle' : isCircle ? 'circle' : isDiamond ? 'diamond' : 'default',
    'data-hide-label': hideLabel ? 'true' : 'false'
  }, [
    React.createElement(Handle, { 
      type: 'target', 
      position: 'top',
      style: { zIndex: 3 }
    }),
    React.createElement('div', {
      style: shapeStyle,
    }, React.createElement('div', {
      style: textStyle
    }, !hideLabel ? (data.label || data.title || 'Node') : '')),
    React.createElement(Handle, { 
      type: 'source', 
      position: 'bottom',
      style: { zIndex: 3 }
    })
  ]);
};

const nodeTypes = {
  'custom-shape': CustomShapeNode,
  default: CustomShapeNode
};

export function Flow({ flowId, nodes, edges, width, height }) {
  return React.createElement(
    ReactFlow,
    {
      id: flowId,
      nodes: nodes,
      edges: edges,
      fitView: true,
      width: width,
      height: height,
      nodeTypes: nodeTypes,
      defaultEdgeOptions: {
        type: 'smoothstep',
        animated: true,
      },
      style: {
        width: '100%',
        height: '100%',
        background: 'white'
      }
    },
    React.createElement(Background, { color: '#aaa', gap: 16 })
  );
}

// Inline ReactFlow styles
const styles = `
  .react-flow {
    width: 100%;
    height: 100%;
    position: relative;
    overflow: hidden;
  }
  .react-flow__renderer {
    width: 100%;
    height: 100%;
  }
  .react-flow__node {
    position: absolute;
    user-select: none;
    pointer-events: all;
    transform-origin: 0 0;
    box-sizing: border-box;
    cursor: grab;
  }
  .react-flow__edge {
    pointer-events: all;
  }
  .react-flow__handle {
    position: absolute;
    width: 6px;
    height: 6px;
    background: #1a192b;
    border-radius: 100%;
    cursor: crosshair;
  }
  .react-flow__handle-top {
    top: -4px;
    left: 50%;
    transform: translate(-50%, 0);
  }
  .react-flow__handle-bottom {
    bottom: -4px;
    left: 50%;
    transform: translate(-50%, 0);
  }
  .react-flow__background {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    pointer-events: none;
    user-select: none;
    z-index: -1;
  }
`;

const absolute = {
  ['top-left']: 'top: 20px; left: 20px',
  ['top-right']: 'top: 20px; right: 20px',
  ['bottom-left']: 'bottom: 20px; left: 20px',
  ['bottom-right']: 'bottom: 20px; right: 20px',
};

export async function toHtml(flow) {
  const edges = flow.edges || [];
  const nodes = flow.nodes;
  const { width, height, title, subtitle, position, font } = flow;
  const content = toStaticMarkup({
    edges,
    nodes,
    width,
    height,
  });

  // Set up absolute positioning based on the requested position
  const absolute = {
    'top-left': 'top: 20px; left: 20px',
    'top-right': 'top: 20px; right: 20px',
    'bottom-left': 'bottom: 20px; left: 20px',
    'bottom-right': 'bottom: 20px; right: 20px',
  };

  return `
    <!DOCTYPE html>
    <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${title || 'Architecture Diagram'}</title>
        <style>
          * {
            box-sizing: border-box;
            margin: 0; 
            padding: 0;
          }
          
          body, html {
            width: 100%;
            height: 100%;
            font-family: ${font || 'Arial, sans-serif'};
            overflow: hidden;
            background-color: white;
          }
          
          .header {
            position: absolute;
            ${absolute[position || 'top-left']};
            z-index: 10;
            background-color: transparent;
            max-width: 70%;
          }
          
          h1 {
            font-size: 24px;
            margin-bottom: 8px;
            color: #333;
          }
          
          p {
            font-size: 14px;
            color: #666;
            margin-bottom: 5px;
          }

          /* ReactFlow Styles */
          .react-flow {
            position: relative;
            width: 100%;
            height: 100%;
            overflow: hidden;
          }
          
          .react-flow__renderer {
            z-index: 0;
            position: absolute;
            width: 100%;
            height: 100%;
          }
          
          .react-flow__node {
            position: absolute;
            user-select: none;
            pointer-events: all;
            transform-origin: 0 0;
            transition: none !important;
            z-index: 1;
            opacity: 1 !important;
            visibility: visible !important;
          }
          
          .react-flow__edge {
            position: absolute;
            pointer-events: all;
            z-index: 0;
            opacity: 1 !important;
            visibility: visible !important;
          }
          
          .react-flow__edge-path {
            stroke: #555555;
            stroke-width: 2px;
            fill: none;
            opacity: 1 !important;
            visibility: visible !important;
          }
          
          .custom-shape-node {
            display: flex;
            justify-content: center;
            align-items: center;
            width: 100%;
            height: 100%;
            position: relative;
            opacity: 1 !important;
            visibility: visible !important;
          }
          
          .custom-shape-node[data-shape="circle"] > div {
            border-radius: 50%;
          }
          
          .custom-shape-node[data-shape="triangle"] > div {
            clip-path: polygon(50% 0%, 0% 100%, 100% 100%);
          }
          
          .custom-shape-node[data-shape="diamond"] > div {
            clip-path: polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%);
          }
          
          .react-flow__edge.animated path {
            stroke-dasharray: 5;
            animation: dashdraw 0.5s linear infinite;
          }
          
          @keyframes dashdraw {
            from {
              stroke-dashoffset: 10;
            }
          }
        </style>
      </head>
      <body>
        <header class="header">
          <h1>${title || 'Architecture Diagram'}</h1>
          ${subtitle ? `<p>${subtitle}</p>` : ''}
        </header>
        <div style="width: 100%; height: 100%; position: relative;">
          ${content}
        </div>
      </body>
    </html>`;
}

// Add this function instead
async function getBrowser() {
  try {
    return await puppeteer.launch({
  args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
  ignoreHTTPSErrors: true,
  headless: 'new',
  protocolTimeout: 60000,
});
  } catch (err) {
    console.error('Failed to launch browser:', err);
    throw new Error('Failed to initialize browser for image generation');
  }
}

export async function toImage(flow, type) {
  let browser;
  let page;
  try {
    // Create a browser instance
    browser = await getBrowser();
    
    // Open a new page
    page = await browser.newPage();
    
    // Enable console logging from the page
    page.on('console', msg => console.log(`PAGE LOG: ${msg.text()}`));
    
    // Set viewport to match flow dimensions with higher resolution
    await page.setViewport({ 
      width: flow.width, 
      height: flow.height,
      deviceScaleFactor: 2 // Higher resolution for sharper image
    });
    
    // Generate HTML content
    const html = await toHtml(flow);
    
    // Set the page content with long timeout
    await page.setContent(html, {
      waitUntil: 'networkidle0',
      timeout: 30000
    });

    // Hide the header to match the Flow Data Editor view
    await page.evaluate(() => {
      // Hide the header
      const header = document.querySelector('.header');
      if (header) {
        header.style.display = 'none';
      }

      // Set the background to match the Flow Data Editor's dotted pattern
      document.body.style.backgroundColor = 'white';
      document.body.style.backgroundImage = 'radial-gradient(#ddd 1px, transparent 1px)';
      document.body.style.backgroundSize = '20px 20px';
      document.body.style.backgroundPosition = '0 0';
      
      // Ensure ReactFlow container is properly sized
      const reactFlowNode = document.querySelector('.react-flow');
      if (reactFlowNode) {
        reactFlowNode.style.transform = 'translate(0px, 0px) scale(1)';
        reactFlowNode.style.width = '100%';
        reactFlowNode.style.height = '100%';
        console.log('ReactFlow container dimensions:', 
          reactFlowNode.offsetWidth, 'x', reactFlowNode.offsetHeight);
      }
      
      // Apply styles that match the Flow Data Editor
      document.querySelectorAll('.react-flow__node').forEach(node => {
        node.style.opacity = '1';
        node.style.visibility = 'visible';
        node.style.transform = node.style.transform || 'translate(0px, 0px)';
        
        // Match the Flow Data Editor node styling
        const shapeNode = node.querySelector('.custom-shape-node');
        if (shapeNode) {
          const shape = shapeNode.getAttribute('data-shape');
          const innerDiv = shapeNode.querySelector('div');
          
          if (innerDiv) {
            // Apply exact styling from Flow Data Editor
            innerDiv.style.backgroundColor = 'white';
            innerDiv.style.border = '2px solid #1a192b';
            
            // Style specific shapes to match editor view
            if (shape === 'circle') {
              innerDiv.style.borderRadius = '50%';
            } else if (shape === 'triangle') {
              innerDiv.style.clipPath = 'polygon(50% 0%, 0% 100%, 100% 100%)';
            } else if (shape === 'diamond') {
              innerDiv.style.clipPath = 'polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%)';
            }
          }
        }
      });
      
      // Ensure edges have the right appearance
      document.querySelectorAll('.react-flow__edge-path').forEach(path => {
        path.setAttribute('stroke-width', '2');
        path.setAttribute('stroke', '#555');
        path.setAttribute('stroke-linecap', 'round');
      });
    });
    
    // Wait for everything to render correctly
    await page.waitForTimeout(1000);
    
    // Take a screenshot that matches the Flow Data Editor view
    console.log('[SERVER] Taking screenshot...');
    const image = await page.screenshot({ 
      type: type === 'jpeg' ? 'jpeg' : 'png',
      quality: type === 'jpeg' ? 95 : undefined,
      omitBackground: false,
    });
    
    console.log(`[SERVER] Screenshot successful, size: ${image.length} bytes`);
    return image;
  } catch (error) {
    console.error('Error generating image:', error);
    throw error;
  } finally {
    if (page) await page.close().catch(console.error);
    if (browser) await browser.close().catch(console.error);
  }
}

export default Flow;

function toStaticMarkup({ width, height, edges, ...flow }) {
  const nodes = flow.nodes.map((node) => {
    // Detect shape from multiple sources
    const isTriangle = 
      node.data?.iconSrc?.includes('triangle') || 
      node.data?.shape === 'triangle' || 
      node.type === 'triangle';
    
    const isCircle = 
      node.data?.iconSrc?.includes('circle') || 
      node.data?.shape === 'circle' || 
      node.type === 'circle';
    
    const isDiamond = 
      node.data?.iconSrc?.includes('diamond') || 
      node.data?.shape === 'diamond' || 
      node.type === 'diamond';
    
    let shape = 'default';
    if (isTriangle) shape = 'triangle';
    else if (isCircle) shape = 'circle';
    else if (isDiamond) shape = 'diamond';

    // Process the node data to match Flow Data Editor view
    return {
      ...node,
      type: 'custom-shape',
      data: {
        ...node.data,
        label: node.data?.label || node.data?.title || node.id,
        shape: shape,
        hideLabel: node.data?.hideLabel === true
      },
      style: {
        ...(node.style || {}),
        width: node.width || 150,
        height: node.height || 150
      }
    };
  });

  console.log(`Processed ${nodes.length} nodes and ${edges.length} edges for rendering`);

  return renderToStaticMarkup(
    React.createElement(Flow, {
      flowId: 'flow-preview',
      nodes,
      edges: edges.map(edge => ({
        ...edge,
        id: edge.id || `${edge.source}-${edge.target}`,
        source: edge.source,
        target: edge.target,
        type: 'smoothstep',
        animated: false,  // Disable animation for export
        style: {
          ...(edge.style || {}),
          stroke: edge.data?.color || '#555',
          strokeWidth: 2
        }
      })),
      width,
      height,
    })
  );
} 