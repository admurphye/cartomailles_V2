export type Stitch = {
  symbol: string;
  parents: number[];
  produces: number;
  consumes: number;
  childIndex?: number;
  childCount?: number;
};
export type PositionedStitch =
  Stitch & {
    x: number;
    y: number;
  };
  export type PositionedCircularStitch = Stitch & {
  x: number;
  y: number;

  radius: number;

  startAngle: number;
  endAngle: number;

  rotation: number;
};