'use strict';
var kmpp = require('../lib');
var test = require('tape');

function mixture (n, k, dim, spread) {
  var i; var j; var c; var x = [];
  for (i = 0; i < n; i++) {
    c = i % k;
    x[i] = [];
    for (j = 0; j < dim; j++) x[i][j] = c * 100 + (j % 2 ? 1 : -1) * c * 7 + (Math.random() - 0.5) * spread;
  }
  return x;
}

function mse (x, out) {
  var i; var j; var s = 0; var d; var c;
  for (i = 0; i < x.length; i++) {
    c = out.centroids[out.assignments[i]];
    for (j = 0; j < x[i].length; j++) { d = x[i][j] - c[j]; s += d * d; }
  }
  return s / x.length;
}

test('emeans assigns all points and finds well-separated clusters', function (t) {
  var x = mixture(3000, 3, 4, 2);
  var out = kmpp(x, { k: 3, algorithm: 'emeans' });
  var sum = 0;
  out.counts.forEach(function (c) { sum += c; });
  t.equal(sum, x.length, 'all points counted');
  t.equal(out.assignments.length, x.length, 'assignments length');
  t.ok(out.converged, 'reports converged');
  t.ok(mse(x, out) < 2, 'low MSE on separated clusters (got ' + mse(x, out) + ')');
  t.end();
});

test('emeans is competitive with Lloyd from the same start', function (t) {
  var x = mixture(5000, 20, 8, 30);
  // One initial centroid per true cluster, so both runs are deterministic in outcome:
  var init = function () { return x.slice(0, 20).map(function (p) { return p.slice(); }); };
  var a = mse(x, kmpp(x, { k: 20, centroids: init() }));
  var b = mse(x, kmpp(x, { k: 20, centroids: init(), algorithm: 'emeans', epochs: 3 }));
  t.ok(b < a * 1.1, 'emeans MSE ' + b + ' vs lloyd ' + a);
  t.end();
});

test('emeans option validation', function (t) {
  var x = mixture(100, 2, 2, 1);
  t.throws(function () { kmpp(x, { k: 2, algorithm: 'nope' }); }, /unknown algorithm/);
  t.throws(function () { kmpp(x, { k: 2, algorithm: 'emeans', norm: 1 }); }, /L2/);
  t.throws(function () { kmpp(x, { k: 2, algorithm: 'emeans', distance: function () { return 0; } }); }, /L2/);
  t.end();
});

test('provided assignments array of the wrong length is replaced', function (t) {
  var x = mixture(100, 2, 2, 1);
  var out = kmpp(x, { k: 2, assignments: [] });
  t.equal(out.assignments.length, 100);
  t.end();
});

test('lloyd stays the default algorithm', function (t) {
  var x = mixture(300, 3, 2, 2);
  var out = kmpp(x, { k: 3 });
  t.equal(out.batchSize, undefined, 'no e-means info');
  t.end();
});

test('dead clusters are revived', function (t) {
  var x = mixture(4000, 4, 4, 2);
  var cents = [[0, 0, 0, 0], [100, 93, 100, 93], [1e9, 1e9, 1e9, 1e9], [1e9, 1e9, 1e9, 2e9]];
  var out = kmpp(x, { k: 4, algorithm: 'emeans', centroids: cents, assignments: [], epochs: 3 });
  t.ok(out.counts.every(function (c) { return c > 0; }), 'every cluster used: ' + out.counts);
  t.end();
});
