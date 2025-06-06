import { type DragEvent, useRef } from 'react';
import Shape from '../shape';
import { ShapeNode, type ShapeType } from '../shape/types';

type SidebarItemProps = {
  type: ShapeType;
  onClickPlaceIcon: (icon: { iconSrc: any; title: string }) => void;
};

function SidebarItem({ type, onClickPlaceIcon }: SidebarItemProps) {
  const dragImageRef = useRef<HTMLDivElement>(null);
  const onDragStart = (event: DragEvent<HTMLDivElement>) => {
    event.dataTransfer?.setData('application/reactflow', type);

    if (dragImageRef.current) {
      event.dataTransfer.setDragImage(dragImageRef.current, 0, 0);
    }
  };
  
  const handleClick = () => {
    const icon = { iconSrc: undefined, title: type };
    onClickPlaceIcon(icon);
  };

  return (
    <div className="sidebar-item" draggable onDragStart={onDragStart} onClick={handleClick} >
      <Shape
        type={type}
        width={40}
        height={40}
        fill="#3F8AE2"
        fillOpacity={0.7}
        stroke="#3F8AE2"
        strokeWidth={2} 
      />
      <div className="sidebar-item-drag-image" ref={dragImageRef}>
        <Shape
          type={type}
          width={100}
          height={100}
          fill="#3F8AE2"
          fillOpacity={0.7}
          stroke="#3F8AE2"
          strokeWidth={2}
        />
      </div>
    </div>
  );
}

export default SidebarItem;