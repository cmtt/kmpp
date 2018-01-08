'use strict';

var LSqrtDistance = require('./sqrt');
var L1Distance = require('./l1');
var L2Distance = require('./l2');
var LDistance = require('./l');

module.exports = function (L) {
  if (L === 0.5) {
    return LSqrtDistance;
  }
  if (L === 1) {
    return L1Distance;
  }
  if (L === 2) {
    return L2Distance;
  }
  return LDistance(L);
};
