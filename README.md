kmpp
====

When dealing with lots of data points, clustering algorithms may be needed in
order to group them. The k-means algorithm partitions _n_ data points into
_k_ clusters and finds the centroids of these clusters incrementally.

The basic k-means algorithm is initialized with _k_ centroids at random
positions.

It assigns data points to the closest cluster, the centroids of each
cluster are re-calculated afterwards. These assignment/recalculating steps are
repeated until the centroids are not changing anymore.

This implementation addresses some disadvantages of the arbitrary
initialization method with the k-means++ algorithm (see "Further reading" at the
end).

## Installing via npm

Install kmpp as Node.js module via NPM:
````bash
$ npm install kmpp
````

## Setting up a new instance

````js
  // var kmpp = require('kmpp'); /* When running in Node.js */
  var k = new kmpp();
````

## Attributes

### kmpp [Boolean]

Enables or disables k-means++ initialization. If disabled, the initial
centroids are selected randomly. It is recommended to leave this setting
enabled, as it reduces the amount of the actual algorithm's iteration steps.

### k [number]

This value defines the amount of clusters. You can let the module guess the
amount by the rule of thumb with the guessK() function. It is crucial to select
an appropriate value of clusters in order to find a good solution.

### maxIterations [number]

Defines the maximum amount of iterations which might be useful when performance
is more important than accuracy. Disabled by default with the value -1.

### converged

Returns true when the clustering is finished, false otherwise.

### iterations

Returns the amount of iterations.

## Methods

### reset ()

Clears data points and calculated results.

### setPoints (points)

setPoints assigns an array of data points which should be clustered and calls
reset(). Use the format [{ x : x0, y : y0 }, ... , { x : xn, y: yn }].

### guessK ()

Guess the amount of clusters by the rule of thumb. (k = Math.sqrt( n * 0.5)).
See below for advice for choosing the right value for k.

### initCentroids ()

The initial centroids are selected by the k-means++ algorithm or randomly. The
latter behavior is disabled by default. k-means++ finds initial values close to
the final result, therefore, less iterations are required for the final result
usually.

### iterate ()

As k-means is an incremental algorithm, the iterate function should be called
until the centroids do not change anymore.

### cluster (callback)

Convenience function which calls the iterate() function until the algorithm has
finished.

# Tests

For the moment, you could open index.html or index-animated.html in your
browser.

# Todo

  * remove the dependency on jQuery
  * add build tools
  * better testing and visualization

# Credits

* [Jared Harkins](https://github.com/hDeraj) improved the performance by
  reducing the amount of function calls, reverting to Manhattan distance
  for measurements and improved the random initialization by choosing from
  points

# Further reading

* [Wikipedia: k-means clustering](https://en.wikipedia.org/wiki/K-means_clustering)
* [Wikipedia: Determining the number of clusters in a data set](https://en.wikipedia.org/wiki/Determining_the_number_of_clusters_in_a_data_set)
* [k-means++: The advantages of careful seeding, Arthur Vassilvitskii](http://ilpubs.stanford.edu:8090/778/1/2006-13.pdf)
* [k-means++: The advantages of careful seeding, Presentation by Arthur Vassilvitskii (Presentation)](http://theory.stanford.edu/~sergei/slides/BATS-Means.pdf)

# License

MIT License
