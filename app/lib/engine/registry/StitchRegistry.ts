import { StitchDefinition } from "../model/StitchDefinition";

export const StitchRegistry: Record<string, StitchDefinition> = {

  mr: {
    type: "mr",
    consumes: 0,
    produces: 1,
    isChain: false,
  },

  ch: {
    type: "ch",
    consumes: 0,
    produces: 1,
    isChain: true,
  },

  slst: {
    type: "slst",
    consumes: 1,
    produces: 1,
    isChain: false,
  },

  sc: {
    type: "sc",
    consumes: 1,
    produces: 1,
    isChain: false,
  },

  hdc: {
    type: "hdc",
    consumes: 1,
    produces: 1,
    isChain: false,
  },

  dc: {
    type: "dc",
    consumes: 1,
    produces: 1,
    isChain: false,
  },

  fpdc: {
    type: "fpdc",
    consumes: 1,
    produces: 1,
    isChain: false,
  },

  bpdc: {
    type: "bpdc",
    consumes: 1,
    produces: 1,
    isChain: false,
  },

  tr: {
    type: "tr",
    consumes: 1,
    produces: 1,
    isChain: false,
  },

};
