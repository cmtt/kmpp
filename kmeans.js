var KMeans = (function () {
  var kmeans = function () {
    this.kmpp = true;
    this.maxWidth = 640;
    this.maxHeight = 480;
    this.iterations = 0;
    this.converged = false;
    this.maxIterations = -1;
    this.k = 0;
  };

  kmeans.prototype.reset = function () {
    var self = this;
    self.iterations = 0;
    self.converged = false;
    self.points = [];
    self.centroids = [];
  };

  kmeans.prototype.distance =  function(a, b) {
    return Math.pow(a.x - b.x, 2) +  Math.pow(a.y - b.y, 2);
  };

  kmeans.prototype.setPoints = function (points) {
    var self = this;
    self.reset();
    self.points = points;
  };

  kmeans.prototype.guessK = function () {
    var self = this;
    self.k = ~~(Math.sqrt(self.points.length*0.5));
  };

  kmeans.prototype.chooseRandomCentroids = function () {
    var self = this;
    for (var i = 0; i < self.k; ++i) {
      var centroid = {
        centroid : i,
        x : ~~(Math.random()*self.maxWidth),
        y : ~~(Math.random()*self.maxHeight),
        items : 0
      }
      self.centroids[i] = centroid;
    }
  };

  kmeans.prototype.cluster = function (callback) {
    var self = this;
    if (self.k === 0) {
      if (typeof callback === 'function') callback(new Error('k cannot be zero'));
      else throw new Error('k cannot be zero');
      return;
    } 

    while (!self.converged || (self.maxIterations > 0 && self.iterations > self.maxIterations)) {
      self.iterate();
    }
    if (typeof callback === 'function') callback(null, self.centroids);
  }

  kmeans.prototype.iterate = function () {
    var self = this;
    if (self.k === 0) return;
    if (self.converged === true) return;

    self.converged = true;
    ++self.iterations;

    var sums = new Array(self.k);
    for (var i = 0; i < self.k;++i) {
      sums[i] = { x : 0, y : 0, items : 0 };
    }

    for (var i = 0; i < self.points.length; ++i) {
      var distances = _.sortBy(self.centroids, function ( centroid ) {
        return self.distance(centroid, self.points[i]);
      });
      var closestItem = distances[0];
      var centroid = closestItem.centroid;
      if (typeof self.points[i].centroid  !== 'number' || self.points[i].centroid !== centroid) self.converged = false;
      self.points[i].centroid = centroid;
      sums[centroid].x += self.points[i].x;
      sums[centroid].y += self.points[i].y;
      ++sums[centroid].items;
    }

    for (var i = 0; i < self.k; ++i) {
      if (sums[i].items > 0) {
        self.centroids[i].x = sums[i].x / sums[i].items;
        self.centroids[i].y = sums[i].y / sums[i].items;
      }
      self.centroids[i].items = sums[i].items;
    }
  };

  kmeans.prototype.initCentroids = function () {
    var self = this;
    if (self.kmpp !== true) {
      self.chooseRandomCentroids();
      return;
    }

    // K-Means++ initialization

    var D = []
      , ntries = 2 + Math.round(Math.log(self.k));

    // 1. Choose one center uniformly at random from among the data points.

    var p0 = self.points[ ~~(Math.random() * self.points.length) ];
    p0.centroid = 0;
    self.centroids = [ p0 ];

    // 2. For each data point x, compute D(x), the distance between x and the nearest center that has already been chosen.

    for (var i = 0;  i < self.points.length; ++i) {
      var distances = _.sortBy(self.centroids, function ( centroid ) {
        return self.distance(centroid, self.points[i]);
      });
      var closestItem = distances[0];
      D[i] = Math.pow( self.distance(distances[0], self.points[i]) , 2);
    }

    var Dsum = _.reduce(D, function (x,y) { return x+y; });

    // 3. Choose one new data point at random as a new center, using a weighted probability distribution where a point x is chosen with probability proportional to D(x)2.

    // 4. (Repeated until k centers have been chosen.)

    for (var k = 1; k < self.k; ++k) {
      var bestDsum = -1
        , bestIdx = -1;

      for (var i = 0; i < ntries; ++i) {
        var rndVal = ~~(Math.random() * Dsum);

        for (var n = 0; n < self.points.length; ++n) {
          if (rndVal <= D[n]) {
            break;
          } else {
            rndVal -= D[n];
          }
        }

        var tmpD = [];
        for (var m = 0; m < self.points.length; ++m) {
          var cmp1 = D[m]
            , cmp2 = Math.pow(self.distance(self.points[m],self.points[n]),2);
          tmpD[m] = cmp1 > cmp2 ? cmp2 : cmp1;
        }

        var tmpDsum = _.reduce(tmpD, function (x,y ) { return x+y; });

        if (bestDsum < 0 || tmpDsum < bestDsum) {
          bestDsum = tmpDsum, bestIdx = n;
        }
      }

      Dsum = bestDsum;

      var centroid = {
        x : self.points[bestIdx].x,
        y : self.points[bestIdx].y,
        centroid : k,
        items : 0
      }

      self.centroids.push(centroid);

      for (var i = 0; i < self.points.length; ++i) {
        var cmp1 = D[i]
          , cmp2 = Math.pow(self.distance(self.points[bestIdx],self.points[i]), 2);
        D[i] = cmp1 > cmp2 ? cmp2 : cmp1;
      }
    }
  };
  return kmeans;
})();