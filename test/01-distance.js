var test = require('tape');
var distanceMetric = require('../lib/distance');

test('is a function', function (t) {
  t.equal(typeof distanceMetric, 'function');
  t.end();
});

test('L1 norm', function (t) {
  var distance = distanceMetric(1);
  t.equal(distance([2], [5]), 3);
  t.equal(distance([-2], [-5]), 3);
  t.end();
});
