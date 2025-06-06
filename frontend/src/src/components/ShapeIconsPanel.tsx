"use client";

import React, { useState, ChangeEvent, MouseEvent, useEffect } from "react";
import {
  SHAPE_ICON_CATEGORY_KEYS,
  SHAPE_ICON_PATHS,
  shapeIcons,
} from "./Icons";

const styles = Object.keys(SHAPE_ICON_PATHS) as (keyof typeof SHAPE_ICON_PATHS)[];

interface TooltipState {
  show: boolean;
  name: string;
  x: number;
  y: number;
}

function ShapeIconsPanel({
  onClose,
  onClickPlaceIcon,
}: {
  onClose: () => void;
  onClickPlaceIcon: (icon: { iconSrc: any; title: string }) => void;
}) {
  const [search, setSearch] = useState<string>("");
  const [selectedStyle, setSelectedStyle] = useState<keyof typeof SHAPE_ICON_PATHS>("sharp_thin");
  const [visibleCount, setVisibleCount] = useState<number>(16);
  const [tooltip, setTooltip] = useState<TooltipState>({ show: false, name: "", x: 0, y: 0 });

  const shapeGroups = Object.entries(shapeIcons).map(([categoryKey, stylesObj]) => {
    const category = SHAPE_ICON_CATEGORY_KEYS[categoryKey as keyof typeof SHAPE_ICON_CATEGORY_KEYS] || categoryKey;
    const shapes =
      stylesObj[selectedStyle]
        ?.filter((shape) => shape.title.toLowerCase().includes(search.toLowerCase()))
        .map((shape) => ({
          ...shape,
          category,
          src: `${SHAPE_ICON_PATHS[selectedStyle]}${categoryKey}${shape.src}`,
        })) || [];

    return { category, shapes };
  }).filter((group) => group.shapes.length > 0);

  const categories = shapeGroups.map((g) => g.category);
  const [selectedCategory, setSelectedCategory] = useState<string>(categories[0] || "");

  useEffect(() => {
    if (!selectedCategory && categories.length) {
      setSelectedCategory(categories[0]);
    }
  }, [categories, selectedCategory]);

  const handleSearchChange = (e: ChangeEvent<HTMLInputElement>) => {
    setSearch(e.target.value);
    setVisibleCount(16);
  };

  const handleStyleChange = (style: keyof typeof SHAPE_ICON_PATHS) => {
    setSelectedStyle(style);
    setVisibleCount(16);
  };

  const handleCategoryChange = (category: string) => {
    setSelectedCategory(category);
    setVisibleCount(16);
  };

  const handleMouseEnter = (e: MouseEvent<HTMLImageElement>, name: string) => {
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

  const loadMore = () => setVisibleCount((prev) => prev + 20);

  // Handle drag start event (GeneralShapes & AWS)
  const handleDragStart = (event: { dataTransfer: { setData: (arg0: string, arg1: any) => void; setDragImage: (arg0: SVGSVGElement, arg1: number, arg2: number) => void; }; }, src: string) => {
    event.dataTransfer.setData("src", src);
    const existingDragImage = document.getElementById("drag-image");
    if (existingDragImage) {
      existingDragImage.remove();
    }
    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.setAttribute("id", "drag-image");
    svg.setAttribute("width", "80");
    svg.setAttribute("height", "80");
    const image = document.createElementNS("http://www.w3.org/2000/svg", "image");
    image.setAttribute("href", src);
    image.setAttribute("width", "80");
    image.setAttribute("height", "80");
    svg.appendChild(image);
    const div = document.createElement("div");
    div.style.position = "absolute";
    div.style.left = "-9999px"; 
    div.appendChild(svg);
    document.body.appendChild(div);
    event.dataTransfer.setDragImage(svg, 50, 50);
  };

  return (
    <div className="fixed top-20 left-[100px] p-4 bg-white border border-gray-200 rounded-lg w-[250px] space-y-4 h-[75vh] overflow-y-auto z-10 shadow-lg">
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
          placeholder="Search icons..."
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

      {/* Category Buttons */}
      {!search && (
        <div className="flex space-x-2 overflow-x-auto">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => handleCategoryChange(cat)}
              className={`px-3 py-1 rounded-full text-sm whitespace-nowrap ${
                selectedCategory === cat ? "bg-blue-500 text-white" : "bg-gray-200 text-gray-700"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      )}

      {/* Style Switcher */}
      <div className="flex gap-2 overflow-x-auto pb-2">
        {styles.map((style) => (
          <label
            key={style}
            className={`flex flex-col items-center cursor-pointer rounded-lg p-2 border ${
              selectedStyle === style ? "border-blue-500 bg-blue-100" : "border-gray-300"
            }`}
            onClick={() => handleStyleChange(style)}
          >
            {shapeIcons.shapes?.[style]?.[95] ? (
              <img
                src={`${SHAPE_ICON_PATHS[style]}shapes${shapeIcons.shapes[style][95].src}`}
                alt="Style"
                className="w-8 h-8 mb-1"
              />
            ) : (
              <span className="text-xs">{style.replace("sharp_", "").toUpperCase()}</span>
            )}
          </label>
        ))}
      </div>

      {/* Icon Grid */}
      {search ? (
        <div className="space-y-6 max-h-[272px] overflow-y-auto">
          {(() => {
            const allIcons = shapeGroups.flatMap((group) => group.shapes);
            if (allIcons.length === 0) {
              return (
                <div className="col-span-4 text-black text-center font-bold">
                  No results found!
                </div>
              );
            }
            const limitedIcons = allIcons.slice(0, visibleCount);
            const grouped = limitedIcons.reduce<Record<string, typeof limitedIcons>>((acc, icon) => {
              const cat = icon.category as string;
              if (!acc[cat]) acc[cat] = [];
              acc[cat].push(icon);
              return acc;
            }, {});
            return Object.entries(grouped).map(([category, icons]) => (
              <div key={category}>
                <div className="font-semibold mb-2">{category}</div>
                <div className="grid grid-cols-4 gap-3 mb-2">
                  {icons.map((icon, i) => (
                    <img
                      key={i}
                      src={icon.src}
                      alt={icon.title}
                      className="w-10 h-10 cursor-pointer"
                      draggable
                      onClick={() => onClickPlaceIcon({ iconSrc: icon.src, title: icon.title })}
                      onDragStart={(e) => {
                        handleDragStart(e, icon.src);
                        e.dataTransfer.setData(
                          "application/reactflow",
                          JSON.stringify({
                            type: "custom-shape",
                            iconSrc: icon.src,
                            title: icon.title,
                          })
                        );
                      }}                  
                      onMouseEnter={(e) => handleMouseEnter(e, icon.title)}
                      onMouseLeave={handleMouseLeave}
                    />
                  ))}
                </div>
                <hr className="my-2 border-gray-300" />
              </div>
            ));
          })()}
        </div>
      ) : (
        <>
          {shapeGroups.find((g) => g.category === selectedCategory)?.shapes && (
            <div>
              <div className="font-semibold mb-2">{selectedCategory}</div>
              <div className="grid grid-cols-4 gap-3 max-h-[200px] overflow-y-auto">
                {shapeGroups
                  .find((g) => g.category === selectedCategory)!
                  .shapes.slice(0, visibleCount)
                  .map((shape, i) => (
                    <img
                      key={i}
                      src={shape.src}
                      alt={shape.title}
                      className="w-10 h-10 cursor-pointer"
                      draggable
                      onClick={() => onClickPlaceIcon({ iconSrc: shape.src, title: shape.title })}
                      onDragStart={(e) => {
                        handleDragStart(e, shape.src);
                        e.dataTransfer.setData(
                          "application/reactflow",
                          JSON.stringify({
                            type: "custom-shape",
                            iconSrc: shape.src,
                            title: shape.title,
                          })
                        );
                      }}                          
                      onMouseEnter={(e) => handleMouseEnter(e, shape.title)}
                      onMouseLeave={handleMouseLeave}
                    />
                  ))}
              </div>
            </div>
          )}
        </>
      )}

      {tooltip.show && (
        <div
          className="fixed bg-gray-800 text-white text-xs px-2 py-1 rounded shadow-md pointer-events-none z-20"
          style={{ top: tooltip.y, left: tooltip.x }}
        >
          {tooltip.name}
        </div>
      )}

      {/* Load More */}
      {(search
        ? shapeGroups.flatMap((group) => group.shapes).length > visibleCount
        : shapeGroups.find((g) => g.category === selectedCategory)?.shapes?.length! > visibleCount) && (
        <div className="flex justify-center mt-4">
          <button
            onClick={loadMore}
            className="px-3 py-1 bg-blue-600 text-white rounded-lg shadow hover:bg-blue-700 transition duration-200"
          >
            Load more icons +
          </button>
        </div>
      )}
    </div>
  );
}

export default ShapeIconsPanel;