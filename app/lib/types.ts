export type Stitch = {
  symbol: string;
  parents: number[];
  produces: number;
  consumes: number;
};
export type PositionedStitch =
  Stitch & {
    x: number;
    y: number;
  };