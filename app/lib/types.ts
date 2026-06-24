export type Stitch = {
  symbol: string;
  parents: number[];
  produces: number;
  index?: number;
};
export type PositionedStitch =
  Stitch & {
    x: number;
    y: number;
  };