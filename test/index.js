'use strict';

var kmpp = require('../kmpp');
var test = require('tape');

test('effectively never fails given km++ initilaization', function (t) {
  var i, run, k, n, x, clusterOffset,
    runs;

  k = 3;
  n = 20;
  clusterOffset = 1e6;
  runs = 10000;

  // Fill with points, roughly speaking:
  //
  //   0, 1, 2, 3, 100000, 100001, 100002, 100003, 200001, 200002, 200003
  //
  // so we can easily sanity-check the output.
  //
  for (i = 0, x = []; i < n; i++) {
    x[i] = [Math.floor(i * k / n) * 1e6 + i];
  }

  for (run = 0; run < runs; run++) {
    var out = kmpp(x, {k: k, kmpp: true});

    for (i = 0; i < k; i++) {
      t.assert(out.centroids[i][0] % clusterOffset < n, 'mean ' + i + ' % ' + clusterOffset + ' < ' + n + ' (got ' + (out.centroids[i] % clusterOffset) + ')');
    }

    var sum = 0;
    for (i = 0; i < k; i++) {
      sum += out.counts[i];
    }

    t.equal(sum, n, 'All points are assigned');
  }

  t.end();
});

test('runs successfully without km++ initialization', function (t) {
  var i, k, n, x, run;
  var runs = 2;

  k = 3;
  n = 20;

  for (i = 0, x = []; i < n; i++) {
    x[i] = [Math.floor(i * k / n) * 1e6 + i];
  }

  for (run = 0; run < runs; run++) {
    var out = kmpp(x, {k: k, kmpp: false});

    var sum = 0;
    for (i = 0; i < k; i++) {
      sum += out.counts[i];
    }

    t.equal(sum, n, 'All points are assigned');
  }

  t.end();
});

test('continues iteration', function (t) {
  var i, x;

  var n = 30;
  var k = 3;

  for (i = 0, x = []; i < n; i++) {
    x[i] = [i];
  }

  var out1 = kmpp(x, {k: k});

  t.equal(out1.centroids.length, k, 'has the right number of centroids');
  t.equal(out1.assignments.length, n, 'assignments is the right length');
  t.ok(out1.iterations >= 1, 'iterated');

  // So basically just deep clone
  var c1 = JSON.stringify(out1.centroids);
  var a1 = out1.assignments.slice();

  var out2 = kmpp(x, {assignments: out1.assignments, centroids: out1.centroids, k: k});

  t.deepEqual(out2.assignments, a1, 'assignments unchanged on subsequent runs');
  t.equal(JSON.stringify(out2.centroids), c1, 'assignments unchanged on subsequent runs');
  t.equal(out2.iterations, 1, 'Only one iteration on subsequent runs');

  var out3 = kmpp(x, {assignments: out1.assignments, centroids: out1.centroids, k: k});
  t.ok(out3.iterations >= 1, 'Restarts');

  t.end();
});
