import { Node } from '@xyflow/react';
import { SVGAttributes } from 'react';

export type ShapeType = 
  | 'circle'
  | 'round-rectangle'
  | 'rectangle'
  | 'hexagon'
  | 'diamond'
  | 'arrow-rectangle'
  | 'cylinder'
  | 'triangle'
  | 'parallelogram'
  | 'plus'
  | 'dashed-rectangle';

export interface BaseNodeData {
  type: ShapeType;
  color: string;
  text?: string;
  onTextChange?: (text: string) => void;
  group?: boolean;
  title?: string;
  iconSrc?: string;
  label?: string;
  [key: string]: unknown;
}

export type NodeData = BaseNodeData;

export type ShapeNode = Node<NodeData>;

export interface ShapeComponentProps extends SVGAttributes<SVGElement> {
  width: number;
  height: number;
  type: ShapeType;
} 