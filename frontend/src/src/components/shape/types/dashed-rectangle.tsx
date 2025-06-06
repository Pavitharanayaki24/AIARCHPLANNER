import { type ShapeProps } from '.';

function DashedRectangle({ width, height, ...svgAttributes }: ShapeProps) {
  return <rect x={0} y={0} width={width} strokeDasharray="5,5" height={height} {...svgAttributes} />;
}

export default DashedRectangle;