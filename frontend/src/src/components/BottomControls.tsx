import React, { useEffect, useState } from "react";
import {
  FaHandPaper,
  FaMinus,
  FaPlus,
  FaMapMarkerAlt,
  FaExpandArrowsAlt,
} from "react-icons/fa";
import { useReactFlow } from "@xyflow/react";

export const BottomControls: React.FC = () => {
  const { zoomIn, zoomOut, getZoom } = useReactFlow();
  const [zoom, setZoom] = useState(1);

  useEffect(() => {
    // Get initial zoom
    setZoom(getZoom());
  }, [getZoom]);

  const handleZoomIn = () => {
    zoomIn();
    setZoom(getZoom());
  };

  const handleZoomOut = () => {
    zoomOut();
    setZoom(getZoom());
  };

  return (
    <div className="absolute bottom-4 right-4 bg-white border border-gray-300 px-4 py-2 rounded-lg flex items-center space-x-4 shadow-md z-10">
      <FaHandPaper size={18} className="text-gray-700 cursor-pointer hover:bg-gray-100 rounded" />
      <div className="w-px h-6 bg-gray-300" />
      <FaMapMarkerAlt size={18} className="text-gray-700 cursor-pointer hover:bg-gray-100 rounded" />
      <div className="w-px h-6 bg-gray-300" />
      <FaMinus size={14} className="text-gray-700 cursor-pointer hover:bg-gray-100 rounded" onClick={handleZoomOut} />
      <span className="text-sm font-small w-10 text-center">{Math.round(zoom * 100)}%</span>
      <FaPlus size={14} className="text-gray-700 cursor-pointer hover:bg-gray-100 rounded" onClick={handleZoomIn} />
      <div className="w-px h-6 bg-gray-300" />
      <FaExpandArrowsAlt size={18} className="text-gray-700 cursor-pointer hover:bg-gray-100 rounded" />
    </div>
  );
};