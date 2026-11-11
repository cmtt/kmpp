# emeans

Fast mini-batch k-means for JavaScript. A zero-dependency port of **e-means**, which replaces Lloyd's update with exponential-moving-average updates and sets batch size and step size from scaling laws, so there is nothing to tune except the epoch budget.

- Project page: https://e-means.github.io/
- Paper: https://arxiv.org/abs/2611.09501
- Reference implementation: [`faiss/contrib/e_means`](https://github.com/facebookresearch/faiss/tree/main/contrib/e_means)

This is an independent JavaScript port, not an official release from the authors.

## Install

```bash
npm install emeans
```

## Usage

```javascript
const { emeans, mse } = require('emeans');

const points = [[0, 0], [0, 1], [10, 10], [10, 11] /* ... */];
const { centroids, assignments, counts } = emeans(points, { k: 2, epochs: 5 });

console.log(mse(points, centroids));
```

## API

### `emeans(points[, opts])`
`points` is an array of equal-length numeric arrays. Options:
- `k` (default `floor(sqrt(n / 2))`): number of clusters.
- `epochs` (default `5`): passes over the data. May be fractional. The last pass is always a full one.
- `batchSize`, `alpha0`: override the scaling laws.
- `unusedThreshold`: dead-cluster revival threshold (default `0.1`, off for `d <= 2`).
- `random`: RNG returning `[0, 1)`, for reproducible runs.
- `centroids`: initial centroids (`k` arrays). Default: `k` random data points.

Returns `{ centroids, assignments, counts, epochs, batchSize, alpha0, steps }`. Assignments come from the final full pass.

### Helpers
`assign(points, centroids)`, `mse(points, centroids)`, `batchSize(n, k, d, epochs)` and `alpha0(n, k, batchSize, epochs)`.

The loss is squared Euclidean distance. Constants for the scaling laws are taken from the Faiss reference code, which notes that they differ from the paper's Table 2.

## License
MIT. Contains a port of Faiss `contrib/e_means` (MIT, Meta Platforms). See `LICENSE`.
