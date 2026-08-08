export type LinkType =
  | "normal"
  | "increase"
  | "decrease"
  | "chain";

export interface Link {

  id: string;

  from: string;

  to: string;

  type: LinkType;

}