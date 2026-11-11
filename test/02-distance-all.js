'use strict';
var test = require('tape');
var distanceMetric = require('../lib/distance');

test('L2 norm', function (t) {
  var d = distanceMetric(2);
  t.equal(d([0, 0], [3, 4]), 5);
  t.equal(d([1, 2], [1, 2]), 0);
  t.equal(d([1, 2], [4, 6]), d([4, 6], [1, 2]), 'symmetric');
  t.end();
});

test('L0.5 norm', function (t) {
  var d = distanceMetric(0.5);
  t.equal(d([0], [4]), 4);
  t.equal(d([0, 0], [1, 1]), 4);
  t.equal(d([2, 2], [2, 2]), 0);
  t.end();
});

test('arbitrary L norm', function (t) {
  var d = distanceMetric(3);
  t.ok(Math.abs(d([0, 0], [1, 1]) - Math.pow(2, 1 / 3)) < 1e-12);
  t.equal(d([5], [5]), 0);
  t.end();
});

test('dispatcher returns distinct implementations', function (t) {
  var fns = [0.5, 1, 2, 3].map(distanceMetric);
  t.equal(new Set(fns).size, 4);
  t.equal(distanceMetric(1), distanceMetric(1), 'cached builtins');
  t.end();
});
