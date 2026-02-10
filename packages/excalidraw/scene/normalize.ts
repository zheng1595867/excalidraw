import { MAX_ZOOM, MIN_ZOOM } from "@excalidraw-modify/common";

import { clamp, round } from "@excalidraw-modify/math";

import type { NormalizedZoomValue } from "../types";

export const getNormalizedZoom = (
  zoom: number,
  minZoom?: number,
  maxZoom?: number,
): NormalizedZoomValue => {
  const min = minZoom ?? MIN_ZOOM;
  const max = maxZoom ?? MAX_ZOOM;
  return clamp(round(zoom, 6), min, max) as NormalizedZoomValue;
};

export const getNormalizedGridSize = (gridStep: number) => {
  return clamp(Math.round(gridStep), 1, 100);
};

export const getNormalizedGridStep = (gridStep: number) => {
  return clamp(Math.round(gridStep), 1, 100);
};
