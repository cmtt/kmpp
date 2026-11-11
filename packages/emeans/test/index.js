'use strict';
var test = require('tape');
var emeans = require('../');

function prng (seed) {
  var a = seed >>> 0;
  return function () {
    a = (a + 0x6D2B79F5) >>> 0;
    var t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function mixture (n, k, dim, spread, rng) {
  var i; var j; var c; var x = [];
  for (i = 0; i < n; i++) {
    c = i % k;
    x[i] = [];
    for (j = 0; j < dim; j++) x[i][j] = c * 100 + (j % 2 ? 1 : -1) * c * 7 + (rng() - 0.5) * spread;
  }
  return x;
}

test('exports', function (t) {
  t.equal(typeof emeans, 'function');
  t.equal(emeans.emeans, emeans);
  ['assign', 'mse', 'batchSize', 'alpha0', 'epochRows', 'scheduledAlpha', 'revive'].forEach(function (f) {
    t.equal(typeof emeans[f], 'function', f);
  });
  t.end();
});

test('clusters separated data', function (t) {
  var rng = prng(1);
  var x = mixture(3000, 3, 4, 2, rng);
  // x[0..2] belong to three different clusters, so the start is a good one:
  var init = x.slice(0, 3).map(function (p) { return p.slice(); });
  var out = emeans(x, { k: 3, centroids: init, random: rng });
  t.equal(out.counts.reduce(function (a, b) { return a + b; }, 0), x.length, 'counts sum to n');
  t.equal(out.assignments.length, x.length);
  t.ok(emeans.mse(x, out.centroids) < 2, 'low mse');
  t.end();
});

test('deterministic with seeded random', function (t) {
  var x = mixture(500, 4, 3, 20, prng(2));
  var a = emeans(x, { k: 4, random: prng(7) });
  var b = emeans(x, { k: 4, random: prng(7) });
  t.deepEqual(a.centroids, b.centroids);
  t.deepEqual(a.assignments, b.assignments);
  t.end();
});

test('default k and typed-array rows', function (t) {
  var x = [];
  for (var i = 0; i < 200; i++) x.push(new Float32Array([i % 2 ? 10 : 0, i % 5]));
  var out = emeans(x, { random: prng(3) });
  t.equal(out.centroids.length, 10, 'floor(sqrt(n/2))');
  t.end();
});

test('validation', function (t) {
  t.throws(function () { emeans([]); }, /empty/);
  t.throws(function () { emeans([[1]], { k: 0 }); }, /positive integer/);
  t.throws(function () { emeans([[1]], { k: 1.5 }); }, /positive integer/);
  t.throws(function () { emeans([[1]], { k: 2 }); }, /exceed/);
  t.throws(function () { emeans([[1], [2]], { k: 1, epochs: 0 }); }, /epochs/);
  t.throws(function () { emeans([[1], [2]], { k: 2, centroids: [[1, 2], [3, 4]] }); }, /centroids/);
  t.end();
});

test('uses provided centroids in place', function (t) {
  var x = mixture(400, 2, 2, 1, prng(4));
  var init = [[0, 0], [100, 93]];
  var out = emeans(x, { k: 2, centroids: init, random: prng(5) });
  t.equal(out.centroids, init, 'same array');
  t.ok(emeans.mse(x, out.centroids) < 1);
  t.end();
});

test('scaling laws', function (t) {
  var n = 100000;
  var bq = emeans.batchSize(n, 64, 8, 1);
  var bt = emeans.batchSize(n, 64, 64, 1);
  t.ok(Math.log2(bq) % 1 === 0 || bq === n / 2, 'power of two (quality law)');
  t.ok(Math.log2(bt) % 1 === 0, 'power of two (throughput law)');
  t.ok(bt > bq, 'throughput law gives larger batches');
  t.equal(emeans.batchSize(10, 2, 2, 1), 1, 'clamped to >= 1');
  t.ok(emeans.batchSize(100, 2, 64, 1000) <= 64, 'capped near n/2');
  t.equal(emeans.alpha0(10, 2, 1e9, 1), 1, 'alpha upper clamp');
  t.equal(emeans.alpha0(1e9, 1e5, 1, 1000), 1e-4, 'alpha lower clamp');
  t.ok(emeans.batchSize(n, 64, 8, 5) > bq, 'more epochs, larger batch');
  t.end();
});

test('epoch rows', function (t) {
  t.deepEqual(emeans.epochRows(100, 1), [100]);
  t.deepEqual(emeans.epochRows(100, 3), [100, 100, 100]);
  t.deepEqual(emeans.epochRows(100, 2.5), [100, 50, 100]);
  t.deepEqual(emeans.epochRows(100, 0.5), [50]);
  t.deepEqual(emeans.epochRows(100, 0.001), [1]);
  t.end();
});

test('cosine schedule', function (t) {
  t.equal(emeans.scheduledAlpha(0.5, 0, 10), 0.5);
  t.ok(Math.abs(emeans.scheduledAlpha(0.5, 10, 10) - 0.05) < 1e-12, 'ends at 10%');
  t.ok(Math.abs(emeans.scheduledAlpha(0.5, 5, 10) - 0.275) < 1e-12, 'midpoint');
  t.equal(emeans.scheduledAlpha(0.5, 99, 10), emeans.scheduledAlpha(0.5, 10, 10), 'clamped past end');
  t.end();
});

test('revive splits heavy clusters into dead ones', function (t) {
  var centroids = [[1, 2], [3, 4], [5, 6]];
  var mass = [10, 0, 10];
  var total = 20;
  var n = emeans.revive(3, 2, centroids, mass, 0.1, prng(1));
  t.equal(n, 1, 'one split');
  t.equal(mass.reduce(function (a, b) { return a + b; }, 0), total, 'mass conserved');
  t.equal(mass[1], 5, 'dead cluster gets half the donor mass');
  var d = Math.abs(centroids[1][0] - 1) < 1e-2 || Math.abs(centroids[1][0] - 5) < 1e-2;
  t.ok(d, 'child sits at donor position: ' + centroids[1]);
  t.equal(emeans.revive(2, 2, [[0, 0], [1, 1]], [5, 5], 0.1, prng(1)), 0, 'nothing dead');
  t.equal(emeans.revive(2, 2, [[0, 0], [1, 1]], [0, 0], 0.1, prng(1)), 0, 'no donors');
  t.end();
});

test('revive separates a zero centroid from its child', function (t) {
  var centroids = [[0, 0], [9, 9]];
  var mass = [10, 0];
  emeans.revive(2, 2, centroids, mass, 0.1, prng(1));
  t.notEqual(centroids[0][0], centroids[1][0]);
  t.end();
});

test('dead clusters are revived end to end', function (t) {
  var x = mixture(4000, 4, 4, 2, prng(6));
  var cents = [[0, 0, 0, 0], [100, 93, 100, 93], [1e9, 1e9, 1e9, 1e9], [1e9, 1e9, 1e9, 2e9]];
  var out = emeans(x, { k: 4, centroids: cents, epochs: 3, random: prng(8) });
  t.ok(out.counts.every(function (c) { return c > 0; }), 'every cluster used: ' + out.counts);
  t.end();
});

test('revival is off for d <= 2 and when threshold is 0', function (t) {
  var x = mixture(2000, 4, 2, 2, prng(9));
  var cents = [[0, 0], [100, 93], [1e9, 1e9], [1e9, 2e9]];
  var out = emeans(x, { k: 4, centroids: cents, epochs: 3, random: prng(8) });
  t.ok(out.counts.some(function (c) { return c === 0; }), 'dead clusters stay dead in 2-D');
  t.end();
});

test('explicit overrides', function (t) {
  var x = mixture(500, 3, 3, 5, prng(10));
  var out = emeans(x, { k: 3, batchSize: 64, alpha0: 0.3, unusedThreshold: 0.2, epochs: 2, random: prng(1) });
  t.equal(out.batchSize, 64);
  t.equal(out.alpha0, 0.3);
  t.equal(out.steps, 2 * Math.ceil(500 / 64));
  t.end();
});

test('full batch with alpha 1 behaves like Lloyd steps', function (t) {
  var x = mixture(600, 3, 2, 1, prng(11));
  var out = emeans(x, { k: 3, batchSize: 600, alpha0: 1, epochs: 3, random: prng(2) });
  t.ok(emeans.mse(x, out.centroids) < 1, 'converges on easy data');
  t.end();
});

test('fractional epochs', function (t) {
  var x = mixture(400, 2, 2, 1, prng(12));
  var out = emeans(x, { k: 2, epochs: 2.5, random: prng(3) });
  t.equal(out.counts[0] + out.counts[1], 400);
  t.end();
});

test('assign and mse', function (t) {
  var a = emeans.assign([[0], [10], [4]], [[0], [10]]);
  t.deepEqual(a.assignments, [0, 1, 0]);
  t.deepEqual(a.distances, [0, 0, 16]);
  t.equal(emeans.mse([[0], [4]], [[0]]), 8);
  t.end();
});
