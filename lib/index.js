'use strict';

module.exports = kmeans;

var initializeKmpp = require('./initialize-kmpp');
var initializeNaive = require('./initialize-naive');
var iterate = require('./iterate');
var emeans = require('emeans');
var distanceMetric = require('./distance');

function kmeans (points, opts) {
  var i, k, n, dim, iter, c, initializer, initialize;

  opts = opts || {};
  var kmpp = opts.kmpp === undefined ? true : !!opts.kmpp;
  var norm = opts.norm === undefined ? 2 : opts.norm;
  var distance = opts.distance === undefined ? distanceMetric(norm) : opts.distance;
  var maxIterations = opts.maxIterations === undefined ? 100 : opts.maxIterations;

  if (opts.algorithm !== undefined && opts.algorithm !== 'lloyd' && opts.algorithm !== 'emeans') {
    throw new Error('kmpp: unknown algorithm "' + opts.algorithm + '"');
  }
  if (opts.algorithm === 'emeans' && (opts.distance !== undefined || norm !== 2)) {
    throw new Error('kmpp: algorithm "emeans" only supports the Euclidean (L2) norm');
  }

  n = points.length;
  dim = points[0].length;

  if (opts.k === undefined) {
    k = ~~(Math.sqrt(n * 0.5));
  } else {
    k = opts.k;
  }

  var out = {};
  if (Array.isArray(opts.centroids) && opts.centroids.length === k) {
    initialize = opts.initialize === undefined ? false : opts.initialize;
    out.centroids = opts.centroids;
  } else {
    initialize = opts.initialize === undefined ? true : opts.initialize;
    out.centroids = new Array(k);
  }

  if (Array.isArray(opts.counts) && opts.counts.length === k) {
    out.counts = opts.counts;
  } else {
    out.counts = new Array(k);
  }

  if (Array.isArray(opts.assignments) && opts.assignments.length === n) {
    out.assignments = opts.assignments;
  } else {
    out.assignments = new Array(n);
  }

  // Initialize the components of the centroids if they don't look right:
  for (i = 0; i < k; i++) {
    c = out.centroids[i];
    if (!Array.isArray(c) || out.centroids[i].length !== dim) {
      out.centroids[i] = [];
    }
  }

  if (initialize) {
    initializer = kmpp ? initializeKmpp : initializeNaive;

    initializer(k, points, out, distance);
  }

  if (opts.algorithm === 'emeans') {
    var res = emeans(points, {
      k: k,
      epochs: opts.epochs,
      batchSize: opts.batchSize,
      alpha0: opts.alpha0,
      unusedThreshold: opts.unusedThreshold,
      random: opts.random,
      centroids: out.centroids
    });
    for (i = 0; i < n; i++) out.assignments[i] = res.assignments[i];
    for (i = 0; i < k; i++) out.counts[i] = res.counts[i];
    out.centroids = res.centroids;
    out.converged = true;
    out.iterations = res.steps;
    out.epochs = res.epochs;
    out.batchSize = res.batchSize;
    out.alpha0 = res.alpha0;
    return out;
  }

  out.converged = out.converged || false;
  iter = 0;

  while (!out.converged && ++iter <= maxIterations) {
    out.converged = iterate(k, points, out, distance);
  }

  out.iterations = Math.min(iter, maxIterations);

  return out;
}
