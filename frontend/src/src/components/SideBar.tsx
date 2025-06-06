import React, { useState, useRef, type DragEvent } from "react";
import { FaAws, FaShapes, FaObjectGroup } from "react-icons/fa";
import { MdImage, MdEdit, MdSave, MdTextFields } from "react-icons/md";
import ShapeIconsPanel from "./ShapeIconsPanel";
import AwsIconsPanel from "./AwsIconsPanel";
import GeneralShapesPanel from "./sidebar/GeneralShapesPanel";
import { ShapeType } from "./shape/types";
import Shape from "./shape";

const iconList = [
  { id: 1, type: "rectangle", title: "Rectangle" },
  { id: 2, type: "triangle", title: "Triangle" },
  { id: 3, type: "circle", title: "Circle" },
  { id: 4, icon: <FaShapes size={24} />, title: "General Shapes" },
  { id: 5, icon: <FaAws size={24} />, title: "AWS Icons" },
  { id: 6, icon: <MdImage size={24} />, title: "Image" },
  { id: 7, type: "dashed-rectangle", title: "Group", },
  { id: 8, icon: <MdEdit size={24} />, title: "Edit" },
  { id: 9, icon: <MdSave size={24} />, title: "Save" },
  { id: 10, icon: <MdTextFields size={24} />, title: "Text" },
];

const Sidebar = ({
  onClickPlaceIcon,
}: {
  onClickPlaceIcon: (icon: { iconSrc: any; title: string }) => void;
}) => {
  const [selectedIconId, setSelectedIconId] = useState<number | null>(null);
  
  const handleIconClick = (id: number) => {
    setSelectedIconId((prev) => (prev === id ? null : id));
  };

  const handleMouseEnter = (e: React.MouseEvent<HTMLDivElement>, title: string) => {
    e.currentTarget.title = title;
  };

  const handleMouseLeave = (e: React.MouseEvent<HTMLDivElement>) => {
    e.currentTarget.title = "";
  };

  const dragImageRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const onDragStart = (event: DragEvent<HTMLDivElement>, type: any) => {
    event.dataTransfer?.setData("application/reactflow", type);
  
    const dragImage = dragImageRefs.current[type];
    if (dragImage) {
      event.dataTransfer.setDragImage(dragImage, 0, 0);
    }
  };

  return (
    <div className="flex">
      <div className="fixed top-1/2 left-5 transform -translate-y-1/2 bg-white border border-gray-200 flex flex-col py-3 space-y-2 shadow-lg rounded-lg p-3 z-10 w-14">
        {iconList.map((iconObj) => (
          <div key={iconObj.id} className="flex justify-center items-center">
            {iconObj.icon ? (
                <div
                  onClick={() => handleIconClick(iconObj.id)}
                  title={iconObj.title}
                  className={`p-2 rounded-md transition-all duration-200 cursor-pointer hover:shadow-md ${
                    selectedIconId === iconObj.id 
                      ? "bg-blue-500 text-white shadow-inner" 
                      : "hover:bg-gray-100"
                  }`}
                >
                  {iconObj.icon}
                </div>
            ) : (
              <div
                className={`left-sidebar-item cursor-pointer p-2 rounded-md transition-all duration-200 hover:shadow-md ${
                  selectedIconId === iconObj.id 
                    ? "bg-blue-500 text-white shadow-inner" 
                    : "hover:bg-gray-100"
                }`}
                draggable
                onDragStart={(event) => onDragStart(event, iconObj.type)}
                onClick={() =>
                  onClickPlaceIcon({
                    title: iconObj.type,
                    iconSrc: undefined,
                  })
                }
                onMouseEnter={(e) => handleMouseEnter(e, iconObj.title)}
                onMouseLeave={handleMouseLeave}
              >
               {iconObj.type === "dashed-rectangle" ? (<FaObjectGroup size={24}/>) : 
                (<Shape
                  type={iconObj.type as ShapeType}
                  width={24}
                  height={24}
                  fill={"currentColor"}
                  stroke={"currentColor"}
                  strokeDasharray={iconObj.type === "dashed-rectangle" ? "4 2" : undefined}
                  strokeWidth={1}
                />
                )}
                <div 
                  className="sidebar-item-drag-image absolute opacity-0 pointer-events-none" 
                  ref={(el) => { dragImageRefs.current[iconObj.type] = el }}
                  style={{ top: '-9999px', left: '-9999px' }}
                >
                  <Shape
                    type={iconObj.type as ShapeType}
                    width={100}
                    height={100}
                    fill={iconObj.type === "dashed-rectangle" ? "transparent" : "#3F8AE2"}
                    stroke={iconObj.type === "dashed-rectangle" ? "#808080" : "#3F8AE2"}
                    strokeDasharray={iconObj.type === "dashed-rectangle" ? "6 3" : undefined}
                    fillOpacity={1}
                    strokeWidth={1}
                  />
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
  
      {/* Panels */}
      {selectedIconId === 4 && (
        <GeneralShapesPanel onClose={() => setSelectedIconId(null)} onClickPlaceIcon={onClickPlaceIcon} />
      )}
      {selectedIconId === 5 && (
        <AwsIconsPanel onClose={() => setSelectedIconId(null)} onClickPlaceIcon={onClickPlaceIcon} />
      )}
      {selectedIconId === 6 && (
        <ShapeIconsPanel onClose={() => setSelectedIconId(null)} onClickPlaceIcon={onClickPlaceIcon} />
      )}
    </div>
  );  
};

export default Sidebar;