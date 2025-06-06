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
  | 'dashed-rectangle'
  | 'text';

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

export interface TextNodeData extends BaseNodeData {
  type: 'text';
  text: string;
  onTextChange: (text: string) => void;
}

export type NodeData = BaseNodeData | TextNodeData;

export type ShapeNode = Node<NodeData>;

export function isTextNodeData(data: NodeData): data is TextNodeData {
  return data.type === 'text';
}

export interface ShapeComponentProps extends SVGAttributes<SVGElement> {
  width: number;
  height: number;
  type: ShapeType;
} 