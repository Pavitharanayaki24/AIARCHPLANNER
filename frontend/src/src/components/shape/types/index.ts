import { SVGAttributes } from 'react';
import type { Edge, Node } from '@xyflow/react';

import Circle from './circle';
import RoundRectangle from './round-rectangle';
import Rectangle from './rectangle';
import Hexagon from './hexagon';
import Diamond from './diamond';
import ArrowRectangle from './arrow-rectangle';
import Cylinder from './cylinder';
import Triangle from './triangle';
import Parallelogram from './parallelogram';
import Plus from './plus';
import DashedRectangle from './dashed-rectangle';

// here we register all the shapes that are available
// you can add your own here
export const ShapeComponents = {
  circle: Circle,
  'round-rectangle': RoundRectangle,
  rectangle: Rectangle,
  hexagon: Hexagon,
  diamond: Diamond,
  'arrow-rectangle': ArrowRectangle,
  cylinder: Cylinder,
  triangle: Triangle,
  parallelogram: Parallelogram,
  plus: Plus,
  'dashed-rectangle': DashedRectangle,
};

export type ShapeType = keyof typeof ShapeComponents;

export type ShapeProps = {
  width: number;
  height: number;
} & SVGAttributes<SVGElement>;

export type ShapeComponentProps = {
} & Partial<ShapeProps> & { type: ShapeType };

export type ShapeNode = Node<{
  group: boolean;
  title: any;
  iconSrc: string;
  color: string;
  type: ShapeType;
  label: string;
}>;
