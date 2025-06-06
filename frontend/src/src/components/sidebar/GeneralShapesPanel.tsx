import React, { useState, ChangeEvent, MouseEvent } from "react";
import { ShapeComponents, ShapeNode, ShapeType } from "../shape/types";
import SidebarItem from "./sidebar-item";

interface TooltipState {
  show: boolean;
  name: string;
  x: number;
  y: number;
}

function GeneralShapesPanel({
  onClose,
  onClickPlaceIcon,
}: {
  onClose: () => void;
  onClickPlaceIcon: (icon: { iconSrc: any; title: string }) => void;
}) {
  const [search, setSearch] = useState<string>("");
  const [visibleCount, setVisibleCount] = useState<number>(16);
  const [tooltip, setTooltip] = useState<TooltipState>({ show: false, name: "", x: 0, y: 0 });

  const handleSearchChange = (e: ChangeEvent<HTMLInputElement>) => {
    setSearch(e.target.value);
    setVisibleCount(16);
  };

  const allFilteredShapes = Object.keys(ShapeComponents)
  .filter((type) => type !== 'dashed-rectangle')
  .filter((type) => type.toLowerCase().includes(search.toLowerCase()));

  const visibleShapes = allFilteredShapes.slice(0, visibleCount);

  const handleLoadMore = () => {
    setVisibleCount((prev) => prev + 16);
  };

  const handleMouseEnter = (e: MouseEvent<HTMLDivElement>, name: string) => {
    setTooltip({
      show: true,
      name,
      x: e.pageX + 10,
      y: e.pageY + 15,
    });
  };

  const handleMouseLeave = () => {
    setTooltip({ show: false, name: "", x: 0, y: 0 });
  };

  return (
    <div className="flex">
      <div className="fixed top-40 left-[100px] p-4 bg-white border border-gray-200 rounded-lg w-[250px] space-y-4 h-[50vh] overflow-y-auto z-10 shadow-lg">
        <button
          onClick={onClose}
          className="absolute top-1 right-2 text-gray-500 hover:text-red-600 text-3xl font-bold cursor-pointer"
        >
          ×
        </button>

        {/* Search */}
        <div className="relative w-full mt-6">
          <input
            type="text"
            placeholder="Search shapes..."
            value={search}
            onChange={handleSearchChange}
            className="w-full border rounded px-3 py-2 pr-10"
          />
          {search && (
            <button
              onClick={() => setSearch("")}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500 hover:text-black text-xl"
            >
              ×
            </button>
          )}
        </div>

        {/* Grid of icons with tooltips */}
        <div className="grid grid-cols-4 gap-3">
          {visibleShapes.length > 0 ? (
            visibleShapes.map((type) => (
              <div
                key={type}
                className="relative group"
                onMouseEnter={(e) => handleMouseEnter(e, type)}
                onMouseLeave={handleMouseLeave}
              >
                <SidebarItem
                  type={type as ShapeType}
                  onClickPlaceIcon={onClickPlaceIcon}
                />
              </div>
            ))
          ) : (
            <div className="col-span-4 text-black text-center font-bold">
              No results found !
            </div>
          )}
        </div>

        {/* Tooltip */}
        {tooltip.show && (
          <div
            className="fixed bg-gray-800 text-white text-xs px-2 py-1 rounded shadow-md pointer-events-none z-20"
            style={{ top: tooltip.y, left: tooltip.x }}
          >
            {tooltip.name}
          </div>
        )}

        {/* Load More Button */}
        {visibleCount < allFilteredShapes.length && (
          <div className="flex justify-center mt-4">
            <button
              onClick={handleLoadMore}
              className="px-3 py-1 bg-blue-600 text-white rounded-lg shadow hover:bg-blue-700 transition duration-200"
            >
              Load more +
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default GeneralShapesPanel;