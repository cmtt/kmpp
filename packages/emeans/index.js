'use strict';

// e-means: mini-batch k-means with exponential-moving-average updates and
// scaling-law hyperparameters.
//
// Plain-JS port of the CPU path of faiss/contrib/e_means
// (MIT, Copyright (c) Meta Platforms, Inc. and affiliates),
// see https://e-means.github.io/ and arXiv:2611.09501.

module.exports = emeans;
emeans.emeans = emeans;
emeans.assign = assign;
emeans.mse = mse;
emeans.batchSize = batchSize;
emeans.alpha0 = alpha0;
emeans.epochRows = epochRows;
emeans.scheduledAlpha = scheduledAlpha;

var INITIAL_MASS = Math.pow(2, -16);
var ALPHA_MIN_FACTOR = 0.1;
var CHECK_UNUSED_EVERY = 5;
var UNUSED_THRESHOLD = 0.1;
var SPLIT_EPSILON = 1e-4;

function roundPow2 (x) {
  return Math.pow(2, Math.round(Math.log(Math.max(x, 1)) / Math.LN2));
}

function sqDist (a, b) {
  var s = 0;
  var i, t;
  for (i = a.length - 1; i >= 0; i--) {
    t = a[i] - b[i];
    s += t * t;
  }
  return s;
}

// Scaling law for the batch size B (n points, k clusters, d dimensions, T epochs).
function batchSize (n, k, dim, epochs) {
  var c = dim <= 16 ? 0.00439175 : 0.035134;
  var b = c * Math.pow(k, 0.134749) * Math.pow(n, 0.876473) * Math.pow(epochs, 0.813344);
  var cap = dim <= 16 ? Math.floor(n / 2) : roundPow2(n / 2);
  b = Math.min(roundPow2(b), cap);
  return Math.max(1, Math.min(n, b));
}

// Scaling law for the initial step size.
function alpha0 (n, k, b, epochs) {
  var a = 0.8244 * Math.pow(k, -0.4617) * Math.pow(b, 0.9003) *
    Math.pow(n, -0.4498) * Math.pow(epochs, -0.1057);
  return Math.max(1e-4, Math.min(1, a));
}

// Number of rows processed in each epoch; the last pass is always a full one.
function epochRows (n, epochs) {
  var whole = Math.floor(epochs);
  var rem = Math.round((epochs - whole) * n);
  var rows = [];
  var i;
  if (whole === 0) return [Math.max(rem, 1)];
  for (i = 0; i < whole - 1; i++) rows.push(n);
  if (rem !== 0) rows.push(rem);
  rows.push(n);
  return rows;
}

// Cosine decay from a0 to ALPHA_MIN_FACTOR * a0.
function scheduledAlpha (a0, step, totalSteps) {
  var frac = Math.min(step, totalSteps) / Math.max(1, totalSteps);
  return a0 * (ALPHA_MIN_FACTOR + (1 - ALPHA_MIN_FACTOR) * 0.5 * (1 + Math.cos(Math.PI * frac)));
}

// Nearest centroid for each point: { assignments, distances (squared) }.
function assign (points, centroids) {
  var n = points.length;
  var assignments = new Array(n);
  var distances = new Array(n);
  var i, c, d, best, bestD;
  for (i = 0; i < n; i++) {
    best = 0;
    bestD = sqDist(centroids[0], points[i]);
    for (c = 1; c < centroids.length; c++) {
      d = sqDist(centroids[c], points[i]);
      if (d < bestD) { bestD = d; best = c; }
    }
    assignments[i] = best;
    distances[i] = bestD;
  }
  return { assignments: assignments, distances: distances };
}

// Mean squared distance to the nearest centroid.
function mse (points, centroids) {
  var d = assign(points, centroids).distances;
  var s = 0;
  for (var i = 0; i < d.length; i++) s += d[i];
  return s / d.length;
}

function sampleCentroids (points, k, rng) {
  var n = points.length;
  var idx = new Array(n);
  var out = new Array(k);
  var i, j, t;
  for (i = 0; i < n; i++) idx[i] = i;
  for (i = 0; i < k; i++) {
    j = i + ~~(rng() * (n - i));
    t = idx[i]; idx[i] = idx[j]; idx[j] = t;
    out[i] = Array.prototype.slice.call(points[idx[i]]);
  }
  return out;
}

function emeans (points, opts) {
  var i, j, e, s, c, p, best, d, dist, a, b, pos, end, step, totalSteps, nj, w;
  opts = opts || {};

  var n = points.length;
  if (!n) throw new Error('emeans: points must not be empty');
  var dim = points[0].length;
  var k = opts.k === undefined ? ~~Math.sqrt(n * 0.5) : opts.k;
  if (!(k >= 1) || k !== Math.floor(k)) throw new Error('emeans: k must be a positive integer');
  if (k > n) throw new Error('emeans: k must not exceed the number of points');
  var epochs = opts.epochs === undefined ? 5 : opts.epochs;
  if (!(epochs > 0)) throw new Error('emeans: epochs must be positive');
  var rng = opts.random || Math.random;

  var centroids;
  if (Array.isArray(opts.centroids) && opts.centroids.length === k) {
    centroids = opts.centroids;
    for (i = 0; i < k; i++) {
      if (!centroids[i] || centroids[i].length !== dim) {
        throw new Error('emeans: centroids must have ' + k + ' entries of length ' + dim);
      }
    }
  } else {
    centroids = sampleCentroids(points, k, rng);
  }

  b = opts.batchSize || batchSize(n, k, dim, epochs);
  b = Math.max(1, Math.min(n, Math.round(b)));
  var a0 = opts.alpha0 || alpha0(n, k, b, epochs);
  var threshold = dim <= 2 ? 0 : UNUSED_THRESHOLD;
  if (opts.unusedThreshold !== undefined) threshold = opts.unusedThreshold;

  var rows = epochRows(n, epochs);
  for (e = 0, totalSteps = 0; e < rows.length; e++) totalSteps += Math.ceil(rows[e] / b);

  var mass = new Array(k);
  var bSum = new Array(k);
  var bCnt = new Array(k);
  var pSum = new Array(k);
  var pCnt = new Array(k);
  var assignments = new Array(n);
  var counts = new Array(k);
  for (i = 0; i < k; i++) {
    mass[i] = INITIAL_MASS;
    bSum[i] = new Array(dim);
    pSum[i] = new Array(dim);
  }

  var perm = new Array(n);
  for (i = 0; i < n; i++) perm[i] = i;

  step = 0;
  for (e = 0; e < rows.length; e++) {
    var isLast = e === rows.length - 1;

    // Fresh permutation each epoch (Fisher-Yates):
    for (i = n - 1; i > 0; i--) {
      j = ~~(rng() * (i + 1));
      s = perm[i]; perm[i] = perm[j]; perm[j] = s;
    }

    if (isLast) {
      for (i = 0; i < k; i++) {
        pCnt[i] = 0;
        for (j = 0; j < dim; j++) pSum[i][j] = 0;
      }
    }

    for (pos = 0; pos < rows[e]; pos += b, step++) {
      end = Math.min(pos + b, rows[e]);

      for (i = 0; i < k; i++) {
        bCnt[i] = 0;
        for (j = 0; j < dim; j++) bSum[i][j] = 0;
      }

      // Assign against the centroids as they were before this update:
      for (i = pos; i < end; i++) {
        p = points[perm[i]];
        best = 0;
        dist = sqDist(centroids[0], p);
        for (c = 1; c < k; c++) {
          d = sqDist(centroids[c], p);
          if (d < dist) { dist = d; best = c; }
        }
        bCnt[best]++;
        for (j = 0; j < dim; j++) bSum[best][j] += p[j];
        if (isLast) {
          assignments[perm[i]] = best;
          pCnt[best]++;
          for (j = 0; j < dim; j++) pSum[best][j] += p[j];
        }
      }

      // EMA update with cosine-decayed step size:
      a = scheduledAlpha(a0, step, totalSteps);

      for (c = 0; c < k; c++) {
        nj = bCnt[c];
        var newMass = a >= 1 ? nj : (1 - a) * mass[c] + a * nj;
        if (nj > 0 && newMass > 0) {
          w = a * nj / newMass;
          var cc = centroids[c];
          var sum = bSum[c];
          for (j = 0; j < dim; j++) cc[j] += w * (sum[j] / nj - cc[j]);
        }
        mass[c] = newMass;
      }

      if (threshold > 0 && (step + 1) % CHECK_UNUSED_EVERY === 0) {
        revive(k, dim, centroids, mass, threshold, rng);
      }
    }
  }

  // Finalize: centroids are the means of the last full pass.
  for (i = 0; i < k; i++) {
    counts[i] = pCnt[i];
    if (pCnt[i] > 0) {
      for (j = 0; j < dim; j++) centroids[i][j] = pSum[i][j] / pCnt[i];
    }
  }

  return {
    centroids: centroids,
    assignments: assignments,
    counts: counts,
    epochs: epochs,
    batchSize: b,
    alpha0: a0,
    steps: totalSteps
  };
}

// Split heavy clusters into dead ones. Donors are drawn proportionally to
// mass without replacement (Gumbel top-k). Returns the number of splits.
function revive (k, dim, centroids, mass, threshold, rng) {
  var i; var j; var total = 0;
  for (i = 0; i < k; i++) total += mass[i];
  var cut = threshold * total / k;

  var dead = [];
  var donors = [];
  for (i = 0; i < k; i++) {
    if (mass[i] < cut) dead.push(i);
    else if (mass[i] > 0) donors.push({ i: i, key: Math.log(mass[i]) - Math.log(-Math.log(rng() || 1e-300)) });
  }
  var nsplit = Math.min(dead.length, donors.length);
  if (!nsplit) return 0;
  donors.sort(function (x, y) { return y.key - x.key; });

  for (i = 0; i < nsplit; i++) {
    var src = donors[i].i;
    var dst = dead[i];
    var c = centroids[src];
    var child = new Array(dim);
    for (j = 0; j < dim; j++) {
      var sign = j % 2 === 0 ? 1 : -1;
      child[j] = c[j] * (1 + SPLIT_EPSILON * sign);
      c[j] = c[j] * (1 - SPLIT_EPSILON * sign);
    }
    // A zero centroid would yield an identical child: nudge it apart.
    if (child[0] === c[0]) child[0] = c[0] + SPLIT_EPSILON;
    centroids[dst] = child;
    mass[src] /= 2;
    mass[dst] = mass[src];
  }
  return nsplit;
}

emeans.revive = revive;
