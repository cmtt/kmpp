var KMeans = (function () {

  var ERR_K_IS_ZERO = 'k cannot be zero';

  if (typeof _ === 'function') {
    var sortBy = _.sortBy, reduce = _.reduce;
  } else {
    /* Thanks to madrobby and Karnash */
    var sortBy = function(a,b,c){c=a.slice();return c.sort(function(d,e){d=b(d),e=b(e);return(d<e?-1:d>e?1:0)})}, reduce = function(t,c) {var u; for (var i = (v=t[0],1); i < t.length;) v = c(v,t[i],i++,t); i<2 & u && u(); return v;};
  }

  /** Constructor */

  var kmeans = function () {
    this.kmpp = true;
    this.maxWidth = 640;
    this.maxHeight = 480;
    this.iterations = 0;
    this.converged = false;
    this.maxIterations = -1;
    this.k = 0;
  };

  /** Resets k-means. */

  kmeans.prototype.reset = function () {
    this.iterations = 0;
    this.converged = false;
    this.points = [];
    this.centroids = [];
  };

  /** Measures the Manhattan distance between two points. */

  kmeans.prototype.distance =  function(a, b) {
    return Math.sqrt( Math.pow(a.x - b.x, 2) +  Math.pow(a.y - b.y, 2) );
  };

  /** Resets k-means and sets initial points*/

  kmeans.prototype.setPoints = function (points) {
    this.reset();
    this.points = points;
  };

  /** Guess the amount of centroids to be found by the rule of thumb */

  kmeans.prototype.guessK = function () {
    this.k = ~~(Math.sqrt(this.points.length*0.5));
  };

  /** Chooses random centroids */

  kmeans.prototype.chooseRandomCentroids = function () {
    for (var i = 0; i < this.k; ++i) {
      var centroid = {
        centroid : i,
        x : ~~(Math.random()*this.maxWidth),
        y : ~~(Math.random()*this.maxHeight),
        items : 0
      };
      this.centroids[i] = centroid;
    }
  };

  /** Clusters the provided set of points. */

  kmeans.prototype.cluster = function (callback) {

    if (this.k === 0) {
      if (typeof callback === 'function') {
        callback(new Error(ERR_K_IS_ZERO));
      } else {
        throw new Error(ERR_K_IS_ZERO);
      }
      return;
    }

    /** Iterate until converged or the maximum amount of iterations is reached. */

    while (!this.converged || (this.maxIterations > 0 && this.iterations > this.maxIterations)) {
      this.iterate();
    }

    if (typeof callback === 'function') callback(null, this.centroids);
  };

  /** Measure the distance to a point, specified by its index. */

  kmeans.prototype.measureDistance =   function (i) {
    var self = this;
    return function ( centroid ) {
      return self.distance(centroid, self.points[i]);
    };
  };

  /** Iterates over the provided points one time */

  kmeans.prototype.iterate = function () {
    var i;

    /** When the result doesn't change anymore, the final result has been found. */
    if (this.converged === true) {
      return;
    }

    this.converged = true;

    ++this.iterations;

    /** Prepares the array of the  */

    var sums = new Array(this.k);

    for (i = 0; i < this.k; ++i) {
      sums[i] = { x : 0, y : 0, items : 0 };
    }

    /** Find the closest centroid for each point */

    for (i = 0, l = this.points.length; i < l; ++i) {

      var distances = sortBy(this.centroids, this.measureDistance(i));
      var closestItem = distances[0];
      var centroid = closestItem.centroid;

      /**
       * When the point is not attached to a centroid or the point was
       * attached to some other centroid before, the result differs from the
       * previous iteration.
       */

      if (typeof this.points[i].centroid  !== 'number' || this.points[i].centroid !== centroid) {
        this.converged = false;
      }

      /** Attach the point to the centroid */

      this.points[i].centroid = centroid;

      /** Add the points' coordinates to the sum of its centroid */

      sums[centroid].x += this.points[i].x;
      sums[centroid].y += this.points[i].y;

      ++sums[centroid].items;
    }

    /** Re-calculate the center of the centroid. */

    for (i = 0; i < this.k; ++i) {
      if (sums[i].items > 0) {
        this.centroids[i].x = sums[i].x / sums[i].items;
        this.centroids[i].y = sums[i].y / sums[i].items;
      }
      this.centroids[i].items = sums[i].items;
    }

  };

  kmeans.prototype.initCentroids = function () {
    var i, k,cmp1, cmp2;

    var addIterator = function (x,y) { return x+y; };

    /**
     * When k-means++ is disabled, choose random centroids.
     */

    if (this.kmpp !== true) {
      this.chooseRandomCentroids();
      return;
    }

    /** K-Means++ initialization */

    /** determine the amount of tries */
    var D = [], ntries = 2 + Math.round(Math.log(this.k));

    /** 1. Choose one center uniformly at random from the data points. */

    var l = this.points.length;

    var p0 = this.points[ ~~(Math.random() * l) ];

    p0.centroid = 0;
    this.centroids = [ p0 ];

    /**
     * 2. For each data point x, compute D(x), the distance between x and
     * the nearest center that has already been chosen.
     */

    for (i = 0; i < l; ++i) {
      D[i] = Math.pow(this.distance(p0, this.points[i]), 2);
    }

    var Dsum = reduce(D, addIterator);
    // var Dsum = D.reduce(addIterator);

    /**
     * 3. Choose one new data point at random as a new center, using a
     * weighted probability distribution where a point x is chosen with
     * probability proportional to D(x)2.
     * (Repeated until k centers have been chosen.)
     */

    for (k = 1; k < this.k; ++k) {

      var bestDsum = -1, bestIdx = -1;

      for (i = 0; i < ntries; ++i) {
        var rndVal = ~~(Math.random() * Dsum);

        for (var n = 0; n < l; ++n) {
          if (rndVal <= D[n]) {
            break;
          } else {
            rndVal -= D[n];
          }
        }

        var tmpD = [];
        for (var m = 0; m < l; ++m) {
          cmp1 = D[m];
          cmp2 = Math.pow(this.distance(this.points[m],this.points[n]),2);
          tmpD[m] = cmp1 > cmp2 ? cmp2 : cmp1;
        }

        var tmpDsum = reduce(tmpD, addIterator);
        // var tmpDsum = tmpD.reduce(addIterator);

        if (bestDsum < 0 || tmpDsum < bestDsum) {
          bestDsum = tmpDsum, bestIdx = n;
        }
      }

      Dsum = bestDsum;

      var centroid = {
        x : this.points[bestIdx].x,
        y : this.points[bestIdx].y,
        centroid : k,
        items : 0
      };

      this.centroids.push(centroid);

      for (i = 0; i < l; ++i) {
        cmp1 = D[i];
        cmp2 = Math.pow(this.distance(this.points[bestIdx],this.points[i]), 2);
        D[i] = cmp1 > cmp2 ? cmp2 : cmp1;
      }
    }

  };
  return kmeans;
})();

if (typeof module === 'object') {
  module.exports = KMeans;
}
