var kmpp = (function () {

  var ABS = Math.abs;
  var POW = Math.pow;
  var SQRT = Math.sqrt;
  var RANDOM = Math.random;
  var ROUND = Math.round;
  var LOG = Math.log;

  var ERR_K_IS_ZERO = 'k cannot be zero';
  var reduce = null;

  if (typeof Array.prototype.reduce === 'function') {
    reduce = function (arr) {
      var args = [].slice.apply(arguments);
      arr = args.shift();
      return Array.prototype.reduce.apply(arr, args);
    };
  } else if (typeof _ === 'function') {
    reduce = _.reduce;
  } else {
    /* Thanks to madrobby and Karnash */
    reduce = function(t,c) {
        var u;
        for (var i = (v=t[0],1); i < t.length;)
            v = c(v,t[i],i++,t);
        i<2 & u && u();
        return v;
    };
  }

  /**
   * @method kmpp
   * @constructor
   */

  function kmpp() {
    this.kmpp = true;
    this.iterations = 0;
    this.converged = false;
    this.maxIterations = -1;
    this.k = 0;
  }

  /**
   * Resets k-means.
   * @method reset
   */

  kmpp.prototype.reset = function () {
    this.iterations = 0;
    this.converged = false;
    this.points = [];
    this.centroids = [];
  };

  /**
   * Measures the Manhattan distance between two points.
   * @method distance
   * @param {object} a
   * @param {object} b
   * @returns {number} distance
   */

  kmpp.prototype.distance =  function(a, b) {
    return ABS(a.x - b.x) + ABS(a.y - b.y);
  };

  /**
   * Resets k-means and sets initial points.
   * @method setPoints
   * @param {object[]} points
   */

  kmpp.prototype.setPoints = function (points) {
    this.reset();
    this.points = points;
  };

  /**
   * Guess the amount of centroids to be found by the rule of thumb
   * @method guessK
   */

  kmpp.prototype.guessK = function () {
    this.k = ~~(SQRT(this.points.length*0.5));
  };

  /**
   * Chooses random centroids.
   * @method chooseRandomCentroids
   */

  kmpp.prototype.chooseRandomCentroids = function () {
    for (var i = 0; i < this.k; ++i) {
      var point = ~~(RANDOM() * this.points.length);
      var centroid = {
        centroid : i,
        x : this.points[point].x,
        y : this.points[point].y,
        items : 0
      };
      this.centroids[i] = centroid;
    }
  };

  /**
   * Clusters the current set of points.
   * @method cluster
   * @param {function} callback
   */

  kmpp.prototype.cluster = function (callback) {

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

  /**
   * Iterates over the provided points one time.
   * @method iterate
   */

  kmpp.prototype.iterate = function () {
    var i, j;

    /** When the result doesn't change anymore, the final result has been found. */

    if (this.converged === true) return;

    this.converged = true;

    ++this.iterations;

    /** Prepares the array of the  */

    var sums = new Array(this.k);

    for (i = 0; i < this.k; ++i) sums[i] = [0, 0, 0]; // x, y, item count

    /** Find the closest centroid for each point */

    for (i = 0, l = this.points.length; i < l; ++i) {

      /** Finds the centroid with the closest distance to the current point */
      var centroid = 0;
      var minDist = this.distance(this.centroids[0], this.points[i]);
      for(j = 1; j < this.centroids.length; j++){
        var dist = this.distance(this.centroids[j], this.points[i]);
        if(dist < minDist){
          minDist = dist;
          centroid = j;
        }
      }

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

      sums[centroid][0] += this.points[i].x;
      sums[centroid][1] += this.points[i].y;

      ++sums[centroid][2];
    }

    /** Re-calculate the center of the centroid. */

    for (i = 0; i < this.k; ++i) {
      if (sums[i][2] > 0) {
        this.centroids[i].x = sums[i][0] / sums[i][2];
        this.centroids[i].y = sums[i][1] / sums[i][2];
      }
      this.centroids[i].items = sums[i][2];
    }

  };

  /**
   * Initializes the cendroids using k-means++.
   * @method initCentroids
   */

  kmpp.prototype.initCentroids = function () {
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
    var D = [];
    var ntries = 2 + ROUND(LOG(this.k));

    /** 1. Choose one center uniformly at random from the data points. */

    var l = this.points.length;
    var p0 = this.points[ ~~(RANDOM() * l) ];

    p0.centroid = 0;
    this.centroids = [ p0 ];

    /**
     * 2. For each data point x, compute D(x), the distance between x and
     * the nearest center that has already been chosen.
     */

    for (i = 0; i < l; ++i) D[i] = this.distance(p0, this.points[i]);

    var Dsum = reduce(D, addIterator);

    /**
     * 3. Choose one new data point at random as a new center, using a
     * weighted probability distribution where a point x is chosen with
     * probability proportional to D(x)2.
     * (Repeated until k centers have been chosen.)
     */

    for (k = 1; k < this.k; ++k) {
      var bestDsum = -1, bestIdx = -1;

      for (i = 0; i < ntries; ++i) {
        var rndVal = ~~(RANDOM() * Dsum);
        var n = 0;
        for (; n < l; ++n) {
          if (rndVal <= D[n]) {
            break;
          } else {
            rndVal -= D[n];
          }
        }

        var tmpD = [];
        for (var m = 0; m < l; ++m) {
          cmp1 = D[m];
          cmp2 = this.distance(this.points[m],this.points[n]);
          tmpD[m] = cmp1 > cmp2 ? cmp2 : cmp1;
        }

        var tmpDsum = reduce(tmpD, addIterator);

        if (bestDsum < 0 || tmpDsum < bestDsum) {
          bestDsum = tmpDsum;
          bestIdx = n;
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
        cmp2 = this.distance(this.points[bestIdx],this.points[i]);
        D[i] = cmp1 > cmp2 ? cmp2 : cmp1;
      }
    }

  };

  return kmpp;

})();

if (typeof module === 'object') module.exports = kmpp;
