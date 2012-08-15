kmeans-js
=========

When dealing with lots of data points, clustering algorithms may be needed for paritioning them into groups. The k-means algorithm partitions n data points into k clusters and finds the centroids of these clusters incrementally.

The basic k-means algorithm is initialized with k centroids at a random position. This implementation addresses some disadvantages of this initialization method with the k-means++ algorithm.

The main algorithm assigns nearby data points to the corresponding cluster, then the centroids of each cluster are re-calculated. These assignment/recalculating steps are repeated until the centroids aren't changing anymore.

Currently, this script depends on Lo-Dash, but unnecessary depedencies are likely to be removed in future versions.

## Setting up

  var k = new KMeans();

## Attributes

### kmpp [Boolean]

Enables or disables the k-means++ initialization. If disabled, the inital centroids are selected randomly.

### maxWidth and maxHeight [number]

When you decide to initialize the centroids randomly, you should set the maxWidth/maxHeight attributes according to your data set.

### k [number]

This value defines the amount of clusters. You can let the module guess the amount by the rule of thumb with the guessK() function. It is crucial to select an appropriate value of clusters in order to find a good solution.

### maxIterations [number]

Defines the maximum amount of iterations which might be useful when performance is more important than accuracy. Disabled by default with the value -1.

### converged

Returns true when the clustering is finished, false otherwise.

### iterations

Returns the amount of iterations.

## Functions

### reset ()

Clears data points and calculated results.

### setPoints (points)

setPoints assigns an array of data points which should be clustered and calls reset(). Use the the format [{ x : x0, y : y0 }, ... , { x : xn, y: yn }].  

### guessK ()

This lets kmeans-js guess the amount of clusters by the rule of thumb. (k = Math.sqrt( n * 0.5)). See below for advice when choosing the right value for k.

### initCentroids ()

The initial centroids are selected by the k-means++ algorithm or randomly. The latter behaviour is disabled by default. k-means++ finds initial values close to the final result, therefore, less iterations are required for the final result usually.

### iterate ()

As k-means is an incremental algorithm, the iterate function should be called until the centroids do not change anymore. 

### cluster (callback)

Convenience function which calls the iterate() function until the algorithm has finished. 

## Tests

At the moment, you could open index.html or index-animated.html in your browser.

## Changes

tbi

## Todo

* improve testing and visualizations
* remove dependency on [Lo-Dash](http://lodash.com/)

Further reading
---------------

* [Wikipedia: k-means clustering](https://en.wikipedia.org/wiki/K-means_clustering)
* [Wikipedia: Determining the number of clusters in a data set](https://en.wikipedia.org/wiki/Determining_the_number_of_clusters_in_a_data_set)
* [k-means++: the advantages of careful seeding, Presentation by Arthur, Vassilvitskii](http://theory.stanford.edu/~sergei/slides/BATS-Means.pdf)

License
-------

MIT License.
