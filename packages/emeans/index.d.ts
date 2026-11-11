export type Point = ArrayLike<number>;

export interface Options {
  /** Number of clusters. Default: floor(sqrt(n / 2)). */
  k?: number;
  /** Passes over the data (may be fractional). Default: 5. */
  epochs?: number;
  /** Override the scaling-law batch size. */
  batchSize?: number;
  /** Override the scaling-law initial step size (0..1]. */
  alpha0?: number;
  /** A cluster is revived when its mass is below this fraction of the mean. Default 0.1 (0 when d <= 2). */
  unusedThreshold?: number;
  /** Random number generator returning [0, 1). Default: Math.random. */
  random?: () => number;
  /** Initial centroids (k entries). Modified in place. Default: k random points. */
  centroids?: number[][];
}

export interface Result {
  centroids: number[][];
  assignments: number[];
  counts: number[];
  epochs: number;
  batchSize: number;
  alpha0: number;
  steps: number;
}

export function emeans(points: Point[], opts?: Options): Result;
export function assign(points: Point[], centroids: Point[]): { assignments: number[]; distances: number[] };
export function mse(points: Point[], centroids: Point[]): number;
export function batchSize(n: number, k: number, dim: number, epochs: number): number;
export function alpha0(n: number, k: number, batchSize: number, epochs: number): number;
export default emeans;
