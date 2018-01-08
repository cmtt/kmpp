'use strict';

module.exports = initializeNaive;

function initializeNaive (k, points, state) {
  var i, j, l;
  var dim = points[0].length;
  for (i = 0; i < k; i++) {
    j = ~~(Math.random() * points.length);
    for (l = 0; l < dim; l++) {
      state.centroids[i][l] = points[j][l];
    }
    state.assignments[i] = j;
    state.counts[i] = 1;
  }
}
