import React from 'react';
import { ShapeComponentProps, ShapeType } from './types';

// Shape components
const Circle = ({ width, height, ...attributes }: ShapeComponentProps) => (
  <circle cx={width / 2} cy={height / 2} r={Math.min(width, height) / 2} {...attributes} />
);

const Rectangle = ({ width, height, ...attributes }: ShapeComponentProps) => (
  <rect width={width} height={height} {...attributes} />
);

const Triangle = ({ width, height, ...attributes }: ShapeComponentProps) => {
  const points = `${width / 2},0 ${width},${height} 0,${height}`;
  return <polygon points={points} {...attributes} />;
};

export const ShapeComponents: Record<ShapeType, React.ComponentType<ShapeComponentProps>> = {
  circle: Circle,
  rectangle: Rectangle,
  'round-rectangle': Rectangle,
  hexagon: Rectangle,
  diamond: Rectangle,
  'arrow-rectangle': Rectangle,
  cylinder: Rectangle,
  triangle: Triangle,
  parallelogram: Rectangle,
  plus: Rectangle,
  'dashed-rectangle': Rectangle,
  text: Rectangle,
}; 