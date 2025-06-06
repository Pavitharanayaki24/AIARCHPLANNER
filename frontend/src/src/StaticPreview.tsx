import { useLayoutEffect, useMemo, useRef, useState, useEffect } from "react";
import { useStore, useFlow } from "./store";
import { FaDownload, FaEye } from "react-icons/fa";

type PreviewType = 'html' | 'png' | 'jpg';

// Extended node type to allow for flexible data
interface ExtendedNode {
  id: string;
  width: number;
  height: number;
  position: {
    x: number;
    y: number;
  };
  data?: {
    iconSrc?: string;
    title?: string;
    hideLabel?: boolean;
    [key: string]: any;
  };
  [key: string]: any;
}

export default function Preview() {
  const type = useStore((state) => state.type as PreviewType);
  const flow = useFlow();
  const [isLoading, setIsLoading] = useState(true);
  const [serverStatus, setServerStatus] = useState<'connecting'|'connected'|'error'>('connecting');
  const [connectionError, setConnectionError] = useState<string | null>(null);

  const htmlPreviewKey = useMemo(() => window.crypto.randomUUID(), [flow]);

  const htmlPreviewUrl = useMemo(() => {
    setIsLoading(true);
    
    if (!flow || !flow.nodes) {
      console.error("Flow data is undefined or missing nodes");
      setIsLoading(false);
      return "";
    }
    
    // Debug the current flow data
    console.log("Current flow data:", JSON.stringify(flow, null, 2));
    
    // Don't skip rendering when there are no nodes, still show an empty canvas
    // if (flow.nodes.length === 0) {
    //   console.log("Architecture diagram has no nodes");
    //   setIsLoading(false);
    //   return "";
    // }
    
    try {
      // Create a simplified data structure for the server
      const previewData = {
        type,
        width: flow.width || 800,
        height: flow.height || 600,
        position: flow.position || 'top-left',
        font: flow.font || 'Arial',
        title: flow.title || "Architecture Diagram",
        subtitle: flow.subtitle || "",
        nodes: (flow.nodes as unknown as ExtendedNode[]).map(node => {
          // Create a base node with position data
          const nodeData: any = {
            id: node.id,
            width: typeof node.width === 'number' ? node.width : 125,
            height: typeof node.height === 'number' ? node.height : 125,
            position: {
              x: node.position.x,
              y: node.position.y
            }
          };
          
          // Include icon data if available
          if (node.data) {
            nodeData.data = node.data;
          }
          
          return nodeData;
        }),
        edges: flow.edges || []
      };
      
      const json = JSON.stringify(previewData, null, 0);
      console.log("Sending preview data:", json);
      
      const query = new URLSearchParams({ json }).toString();
      setIsLoading(false);
      return `http://localhost:8080?${query}`;
    } catch (err) {
      console.error("Error creating preview URL:", err);
      setIsLoading(false);
      return "";
    }
  }, [type, flow]);

  const containerRef = useRef<HTMLDivElement>(null);
  const [previewScale, setPreviewScale] = useState(1);
  const [isDownloading, setIsDownloading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [imageLoadError, setImageLoadError] = useState<string | null>(null);

  const containerStyle = useMemo(() => ({
    width: (flow?.width || 800) * previewScale,
    height: (flow?.height || 600) * previewScale,
  }), [flow?.width, flow?.height, previewScale]);

  useLayoutEffect(() => {
    if (!containerRef.current) return;

    const observer = new ResizeObserver((entries) => {
      const { width, height } = entries[0].contentRect;
      const scaleX = width / (flow?.width || 800);
      const scaleY = height / (flow?.height || 600);
      const scale = Math.min(scaleX, scaleY, 1);

      setPreviewScale(scale);
    });

    observer.observe(containerRef.current);

    return () => observer.disconnect();
  }, [flow?.width, flow?.height]);

  const downloadImage = async () => {
    if (isDownloading || !htmlPreviewUrl) return;
    
    try {
      setIsDownloading(true);
      setError(null);
      
      const response = await fetch(htmlPreviewUrl);
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.msg || `Failed to fetch image: ${response.statusText}`);
      }
      
      const imageBlob = await response.blob();
      const imageURL = URL.createObjectURL(imageBlob);

      const link = document.createElement('a');
      link.href = imageURL;
      link.download = `react-flow-output.${type}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      URL.revokeObjectURL(imageURL);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to download image');
      console.error('Error downloading image:', err);
    } finally {
      setIsDownloading(false);
    }
  };

  const handleImageError = (event: React.SyntheticEvent<HTMLImageElement, Event>) => {
    const target = event.target as HTMLImageElement;
    const errorMessage = `Failed to load preview image. URL: ${target.src}`;
    setImageLoadError(errorMessage);
    console.error('Image load error:', {
      src: target.src,
      naturalWidth: target.naturalWidth,
      naturalHeight: target.naturalHeight,
      complete: target.complete
    });
  };

  // Check if preview server is running
  useEffect(() => {
    const checkServer = async () => {
      try {
        setServerStatus('connecting');
        // Use a simple ping endpoint or the root endpoint with no-cors mode
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 3000);
        
        const response = await fetch('http://localhost:8080', { 
          method: 'HEAD',
          signal: controller.signal
        });
        
        clearTimeout(timeoutId);
        setServerStatus('connected');
        setConnectionError(null);
      } catch (err) {
        console.error("Cannot connect to preview server:", err);
        setServerStatus('error');
        setConnectionError("Cannot connect to preview server. Make sure it's running on http://localhost:8080");
      }
    };
    
    checkServer();
  }, []);

  // Render a placeholder when data is not available
  if (serverStatus === 'error' && connectionError) {
    return (
      <div ref={containerRef} className="w-full h-full flex justify-center items-center p-4 bg-gray-50">
        <div className="text-center p-6 bg-white rounded-lg shadow-md">
          <svg className="h-12 w-12 text-red-500 mx-auto mb-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <h3 className="font-semibold text-lg mb-2">Server Connection Error</h3>
          <p className="text-gray-600 text-sm mb-4">{connectionError}</p>
          <button 
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (!flow || !flow.nodes || isLoading || !htmlPreviewUrl) {
    return (
      <div ref={containerRef} className="w-full h-full flex justify-center items-center p-4 bg-gray-50">
        <div className="text-center p-6 bg-white rounded-lg shadow-md">
          {isLoading ? (
            <>
              <svg className="animate-spin h-8 w-8 text-indigo-500 mx-auto mb-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              <h3 className="font-semibold text-lg mb-2">Loading Architecture Diagram</h3>
              <p className="text-gray-600 text-sm">Please wait while we prepare your diagram preview...</p>
            </>
          ) : (
            <>
              <svg className="h-12 w-12 text-indigo-400 mx-auto mb-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 13h6m-3-3v6m5 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <h3 className="font-semibold text-lg mb-2">No Diagram Available</h3>
              <p className="text-gray-600 text-sm">Your architecture diagram appears to be empty. Go back to the editor and add some components.</p>
            </>
          )}
        </div>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className="w-full h-full flex justify-center items-center p-4"
      role="region"
      aria-label="Preview area"
    >
      <div
        className="relative overflow-hidden m-auto outline outline-1 outline-gray-300 rounded-lg shadow-lg"
        style={containerStyle}
      >
        {(error || imageLoadError) && (
          <div
            className="absolute top-0 left-0 right-0 bg-red-100 text-red-700 p-2 text-sm"
            role="alert"
          >
            {error || imageLoadError}
          </div>
        )}

        {(() => {
          switch (type) {
            case 'html':
              return (
                <iframe
                  key={htmlPreviewKey}
                  className="origin-top-left"
                  src={htmlPreviewUrl}
                  width={flow.width || 800}
                  height={flow.height || 600}
                  style={{
                    transform: `scale(${previewScale})`,
                    transformOrigin: 'top left',
                    border: 'none'
                  }}
                  title="Flow preview"
                  sandbox="allow-same-origin allow-scripts"
                  onLoad={() => {
                    console.log("Preview iframe loaded successfully");
                    setError(null);
                  }}
                  onError={(e) => {
                    console.error("Error loading preview iframe:", e);
                    setError("Failed to load the preview. Please check if the preview server is running.");
                  }}
                />
              );

            case 'jpg':
            case 'png':
              return (
                <>
                  <button
                    className="absolute top-2 right-2 text-xs bg-blue-600 text-white px-3 py-1.5 rounded-md shadow-md hover:bg-blue-700 transition ease-in-out duration-300 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                    onClick={downloadImage}
                    disabled={isDownloading}
                    aria-label="Download image"
                  >
                    <FaDownload size={14} />
                    {isDownloading ? 'Downloading...' : 'Download'}
                  </button>
                  <img
                    className="w-full h-full object-contain"
                    key={htmlPreviewKey}
                    src={htmlPreviewUrl}
                    alt="Flow preview"
                    onError={handleImageError}
                    onLoad={() => setImageLoadError(null)}
                  />
                </>
              );
            default:
              return null;
          }
        })()}
      </div>
    </div>
  );
}
