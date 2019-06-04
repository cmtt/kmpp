'use strict';

module.exports = iterate;

function iterate (k, points, state, distance) {
  var i, j, p, c, cnt, minDist, dist;
  var converged = true;

  // Unpack the state:
  var centroids = state.centroids;
  var counts = state.counts;
  var assignments = state.assignments;

  var n = points.length;
  var dim = points[0].length - 1;

  // Zero the arrays of sums and counts for this iteration
  for (i = 0; i < k; i++) {
    counts[i] = 0;
  }

  // Find the closest centroid for each point
  for (i = 0; i < n; i++) {
    // Finds the centroid with the closest distance to the current point
    c = 0;
    minDist = distance(centroids[0], points[i]);

    for (j = 1; j < k; j++) {
      dist = distance(centroids[j], points[i]);
      if (dist < minDist) {
        minDist = dist;
        c = j;
      }
    }

    // If the result has changed, then has not converged:
    if (assignments[i] === undefined || assignments[i] !== c) {
      converged = false;
    }

    // Assign the point to the centroid
    assignments[i] = c;
    counts[c]++;
  }

  // Zero out the centroids:
  for (i = 0; i < k; i++) {
    for (j = dim; j >= 0; j--) {
      centroids[i][j] = 0;
    }
  }

  // Add the contribution of each centroid member:
  for (i = 0; i < n; i++) {
    c = centroids[assignments[i]];
    p = points[i];
    for (j = dim; j >= 0; j--) {
      c[j] += p[j];
    }
  }

  // Once accumulated, average
  for (i = 0; i < k; i++) {
    c = centroids[i];
    cnt = counts[i];
    for (j = dim; j >= 0; j--) {
      c[j] /= cnt;
    }
  }

  return converged;
}
