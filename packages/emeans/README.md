# emeans

[![npm](https://img.shields.io/npm/v/emeans.svg)](https://www.npmjs.com/package/emeans)
[![CI](https://github.com/cmtt/kmpp/actions/workflows/ci.yml/badge.svg)](https://github.com/cmtt/kmpp/actions/workflows/ci.yml)
[![license](https://img.shields.io/npm/l/emeans.svg)](https://github.com/cmtt/kmpp/blob/master/packages/emeans/LICENSE)
![types](https://img.shields.io/npm/types/emeans.svg)

Fast mini-batch k-means for JavaScript and TypeScript. A zero-dependency port of **e-means**, which replaces Lloyd's update with exponential-moving-average updates and sets batch size and step size from scaling laws, so the only knob is the epoch budget.

> Unofficial port. Not affiliated with or endorsed by the e-means authors.

- Project page: <https://e-means.github.io/>
- Paper: <https://arxiv.org/abs/2611.09501>
- Reference implementation: [`faiss/contrib/e_means`](https://github.com/facebookresearch/faiss/tree/main/contrib/e_means)
- Live demo and docs: <https://cmtt.github.io/kmpp/>
- Related: [`kmpp`](https://www.npmjs.com/package/kmpp), k-means++ with an `algorithm: 'emeans'` option

## Install

```bash
npm install emeans
```

## Usage

```javascript
// ESM
import { emeans, mse } from 'emeans';
// CommonJS
// const { emeans, mse } = require('emeans');

const points = [[0, 0], [0, 1], [10, 10], [10, 11] /* ... */];
const { centroids, assignments, counts } = emeans(points, { k: 2, epochs: 5 });

console.log(mse(points, centroids));
```

Types are included. For reproducible runs, pass a seeded generator as `random`.

## Options

| Option | Default | Description |
|---|---|---|
| `k` | `floor(sqrt(n / 2))` | Number of clusters. |
| `epochs` | `5` | Passes over the data. May be fractional. The last pass is always a full one. |
| `batchSize` | scaling law | Override the batch size. |
| `alpha0` | scaling law | Override the initial step size, in (0, 1]. |
| `unusedThreshold` | `0.1` (`0` when d ≤ 2) | Dead clusters below this fraction of the mean mass are revived by splitting heavy ones. |
| `random` | `Math.random` | RNG returning `[0, 1)`. |
| `centroids` | `k` random points | Initial centroids (`k` arrays, modified in place). |

Returns `{ centroids, assignments, counts, epochs, batchSize, alpha0, steps }`. Assignments come from the final full pass. Helpers: `assign(points, centroids)`, `mse(points, centroids)`, `batchSize(n, k, d, epochs)`, `alpha0(n, k, batchSize, epochs)`.

## How it works

Each epoch walks a fresh random permutation in mini-batches. Cluster sums and counts are blended into running statistics with an exponential moving average, with a step size that decays on a cosine schedule. Batch size and initial step size come from fitted scaling laws in `n`, `k` and the epoch budget. Clusters that stop attracting points are revived by splitting heavy ones. The loss is squared Euclidean distance.

## Benchmark

Synthetic Gaussian mixtures, plain JavaScript on one thread, median of 3 seeds. The baseline is Lloyd capped at 25 iterations from the same random start (it had not converged). The ratio is e-means MSE divided by Lloyd's MSE, so lower is better.

| n, d, k | e-means 1 epoch | e-means 5 epochs |
|---|---|---|
| 20k, 2, 64 | 1.055 MSE ratio, 10× faster | 0.970, 4.8× |
| 50k, 16, 128 | 0.975, 17.6× | 0.945, 4.7× |
| 50k, 64, 128 | 0.900, 21× | 0.727, 4.6× |
| 200k, 16, 64 | 0.864, 18× | 0.843, 4× |

Caveats: the data is synthetic, the speedups are against a capped single-threaded JS Lloyd and not against Faiss or GPU baselines, and part of the quality gap comes from Lloyd stalling in local minima. The scaling-law constants come from the Faiss reference code, which notes that they differ from the paper's Table 2. Reproduce with `npm run bench` in the [repository](https://github.com/cmtt/kmpp).

## License

MIT. Contains a port of Faiss `contrib/e_means` (MIT, Meta Platforms). See [LICENSE](https://github.com/cmtt/kmpp/blob/master/packages/emeans/LICENSE).
