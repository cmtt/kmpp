# kmpp

When dealing with lots of data points, clustering algorithms may be used to group them. The k-means algorithm partitions _n_ data points into _k_ clusters and finds the centroids of these clusters incrementally.

The algorithm assigns data points to the closest cluster, and the centroids of each cluster are re-calculated. These steps are repeated until the centroids do not changing anymore.

The basic k-means algorithm is initialized with _k_ centroids at random positions. This implementation addresses some disadvantages of the arbitrary initialization method with the k-means++ algorithm (see "Further reading" at the end).

## Installation

````bash
$ npm install kmpp
````

## Example

```javascript
var kmpp = require('kmpp');

kmpp([
  [x1, y1, ...],
  [x2, y2, ...],
  [x3, y3, ...],
  ...
], {
  k: 4
});

// =>
// { converged: true,
//   centroids: [[xm1, ym1, ...], [xm2, ym2, ...], [xm3, ym3, ...]],
//   counts: [ 7, 6, 7 ],
//   assignments: [ 2, 2, 2, 2, 2, 2, 2, 0, 0, 0, 0, 0, 0, 0, 1, 1, 1, 1, 1, 1 ]
// }
```

## API

### `kmpp(points[, opts)`

Exectes the k-means++ algorithm on `points`.

Arguments:
- `points` (`Array`): An array-of-arrays containing the points in format `[[x1, y1, ...], [x2, y2, ...], [x3, y3, ...], ...]`
- `opts`: object containing configuration parameters. Parameters are
  - `distance` (`function`): Optional function that takes two points and returns the distance between them.
  - `initialize` (`Boolean`): Perform initialization. If false, uses the initial state provided in `centroids` and `assignments`. Otherwise discards any initial state and performs initialization.
  - `k` (`Number`): number of centroids. If not provided, `sqrt(n / 2)` is used, where `n` is the number of points.
  - `kmpp` (`Boolean`, default: `true`): If true, uses k-means++ initialization. Otherwise uses naive random assignment.
  - `maxIterations` (`Number`, default: `100`): Maximum allowed number of iterations.
  - `norm` (`Number`, default: `2`): L-norm used for distance computation. `1` is Manhattan norm, `2` is Euclidean norm. Ignored if `distance` function is provided.
  - `centroids` (`Array`): An array of centroids. If `initialize` is false, used as initialization for the algorithm, otherwise overwritten in-place if of the correct size.
  - `assignments` (`Array`): An array of assignments. Used for initialization, otherwise overwritten.
  - `counts` (`Array`): An output array used to avoid extra allocation. Values are discarded and overwritten.

Returns an object containing information about the centroids and point assignments. Values are:
- `converged`: `true` if the algorithm converged successfully
- `centroids`: a list of centroids
- `counts`: the number of points assigned to each respective centroid
- `assignments`: a list of integer assignments of each point to the respective centroid
- `iterations`: number of iterations used

# Credits

* [Jared Harkins](https://github.com/hDeraj) improved the performance by
  reducing the amount of function calls, reverting to Manhattan distance
  for measurements and improved the random initialization by choosing from
  points

* [Ricky Reusser](https://github.com/rreusser) refactored API

# Further reading

* [Wikipedia: k-means clustering](https://en.wikipedia.org/wiki/K-means_clustering)
* [Wikipedia: Determining the number of clusters in a data set](https://en.wikipedia.org/wiki/Determining_the_number_of_clusters_in_a_data_set)
* [k-means++: The advantages of careful seeding, Arthur Vassilvitskii](http://ilpubs.stanford.edu:8090/778/1/2006-13.pdf)
* [k-means++: The advantages of careful seeding, Presentation by Arthur Vassilvitskii (Presentation)](http://theory.stanford.edu/~sergei/slides/BATS-Means.pdf)

# License

&copy; 2017. MIT License.
