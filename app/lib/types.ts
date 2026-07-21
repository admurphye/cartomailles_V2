export type Stitch = {
  symbol: string;

  parents: number[];

  produces: number;
  consumes: number;

  childIndex?: number;
  childCount?: number;

  /**
   * Nombre de symboles représentés.
   * Par défaut = 1
   */
  count?: number;

  /**
   * Type particulier de la maille.
   */
  kind?: "normal" | "turningChain";
};

export type PositionedStitch = Stitch & {
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