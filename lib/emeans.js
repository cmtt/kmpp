'use strict';

// e-means: mini-batch k-means with exponential-moving-average updates and
// scaling-law hyperparameters. Plain-JS port of the CPU path of
// faiss/contrib/e_means (MIT, Meta Platforms), see https://e-means.github.io/
// and arXiv:2611.09501.

module.exports = emeans;
emeans.batchSize = batchSize;
emeans.alpha0 = alpha0;

var INITIAL_MASS = Math.pow(2, -16);
var ALPHA_MIN_FACTOR = 0.1;
var CHECK_UNUSED_EVERY = 5;
var UNUSED_THRESHOLD = 0.1;
var SPLIT_EPSILON = 1e-4;

function roundPow2 (x) {
  return Math.pow(2, Math.round(Math.log(Math.max(x, 1)) / Math.LN2));
}

function batchSize (n, k, dim, epochs) {
  var c = dim <= 16 ? 0.00439175 : 0.035134;
  var b = c * Math.pow(k, 0.134749) * Math.pow(n, 0.876473) * Math.pow(epochs, 0.813344);
  var cap = dim <= 16 ? Math.floor(n / 2) : roundPow2(n / 2);
  b = Math.min(roundPow2(b), cap);
  return Math.max(1, Math.min(n, b));
}

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

function emeans (k, points, state, distance, opts) {
  var i, j, e, s, c, p, best, d, dist, a, b, pos, end, step, totalSteps;
  var n = points.length;
  var dim = points[0].length;
  var rng = (opts && opts.random) || Math.random;
  var epochs = (opts && opts.epochs) || 5;

  var centroids = state.centroids;
  var counts = state.counts;
  var assignments = state.assignments;

  b = (opts && opts.batchSize) || batchSize(n, k, dim, epochs);
  b = Math.max(1, Math.min(n, Math.round(b)));
  var a0 = (opts && opts.alpha0) || alpha0(n, k, b, epochs);
  var threshold = dim <= 2 ? 0 : UNUSED_THRESHOLD;
  if (opts && opts.unusedThreshold !== undefined) threshold = opts.unusedThreshold;

  var rows = epochRows(n, epochs);
  for (e = 0, totalSteps = 0; e < rows.length; e++) totalSteps += Math.ceil(rows[e] / b);

  var mass = new Array(k);
  var bSum = new Array(k);
  var bCnt = new Array(k);
  var pSum = new Array(k);
  var pCnt = new Array(k);
  var batchAssign = new Array(b);
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
        dist = distance(centroids[0], p);
        for (c = 1; c < k; c++) {
          d = distance(centroids[c], p);
          if (d < dist) { dist = d; best = c; }
        }
        batchAssign[i - pos] = best;
        bCnt[best]++;
        for (j = 0; j < dim; j++) bSum[best][j] += p[j];
        if (isLast) {
          assignments[perm[i]] = best;
          pCnt[best]++;
          for (j = 0; j < dim; j++) pSum[best][j] += p[j];
        }
      }

      // EMA update with cosine-decayed step size:
      var frac = Math.min(step, totalSteps) / Math.max(1, totalSteps);
      a = a0 * (ALPHA_MIN_FACTOR + (1 - ALPHA_MIN_FACTOR) * 0.5 * (1 + Math.cos(Math.PI * frac)));

      for (c = 0; c < k; c++) {
        var nj = bCnt[c];
        var newMass = a >= 1 ? nj : (1 - a) * mass[c] + a * nj;
        if (nj > 0 && newMass > 0) {
          var w = a * nj / newMass;
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

  return { epochs: epochs, batchSize: b, alpha0: a0, steps: totalSteps };
}

// Split heavy clusters into dead ones. Donors are drawn proportionally to
// mass without replacement (Gumbel top-k).
function revive (k, dim, centroids, mass, threshold, rng) {
  var i, j, total = 0;
  for (i = 0; i < k; i++) total += mass[i];
  var cut = threshold * total / k;

  var dead = [];
  var donors = [];
  for (i = 0; i < k; i++) {
    if (mass[i] < cut) dead.push(i);
    else if (mass[i] > 0) donors.push({ i: i, key: Math.log(mass[i]) - Math.log(-Math.log(rng() || 1e-300)) });
  }
  var nsplit = Math.min(dead.length, donors.length);
  if (!nsplit) return;
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
    centroids[dst] = child;
    mass[src] /= 2;
    mass[dst] = mass[src];
  }
}
