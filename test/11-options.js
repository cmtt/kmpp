'use strict';
var test = require('tape');
var kmpp = require('../lib');

function line (n) {
  var x = [];
  for (var i = 0; i < n; i++) x.push([Math.floor(i * 3 / n) * 1000 + (i % 7)]);
  return x;
}

test('default k is floor(sqrt(n / 2))', function (t) {
  t.equal(kmpp(line(200)).centroids.length, 10);
  t.end();
});

test('reuses provided counts, centroids and assignments', function (t) {
  var x = line(60);
  var counts = [0, 0, 0];
  var centroids = [[0], [1000], [2000]];
  var assignments = new Array(60);
  var out = kmpp(x, { k: 3, counts: counts, centroids: centroids, assignments: assignments });
  t.equal(out.counts, counts);
  t.equal(out.centroids, centroids);
  t.equal(out.assignments, assignments);
  t.equal(counts.reduce(function (a, b) { return a + b; }, 0), 60);
  t.end();
});

test('maxIterations limits work', function (t) {
  var x = line(60);
  t.equal(kmpp(x, { k: 3, maxIterations: 1 }).iterations, 1);
  t.equal(kmpp(x, { k: 3, maxIterations: 0 }).converged, false);
  t.end();
});

test('custom distance and norm are honoured', function (t) {
  var x = line(60);
  var calls = 0;
  kmpp(x, { k: 3, distance: function (a, b) { calls++; return Math.abs(a[0] - b[0]); } });
  t.ok(calls > 0, 'custom distance called');
  t.equal(kmpp(x, { k: 3, norm: 1 }).centroids.length, 3);
  t.end();
});

test('initialize false keeps provided centroids as the start', function (t) {
  var x = line(60);
  var out = kmpp(x, { k: 3, centroids: [[0], [1000], [2000]], initialize: false, maxIterations: 1 });
  t.equal(out.centroids.length, 3);
  t.end();
});
