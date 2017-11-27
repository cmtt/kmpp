'use strict';

module.exports = Lnorm;

function Lnorm (L) {
  switch (L) {
    case 0.5:
      return function LSqrtDistance (a, b) {
        var i, sum;
        for (i = a.length - 1, sum = 0; i >= 0; i--) {
          sum += Math.sqrt(Math.abs(a[i] - b[i]));
        }
        return sum * sum;
      };
    case 1:
      return function L1Distance (a, b) {
        var i, sum;
        for (i = a.length - 1, sum = 0; i >= 0; i--) {
          sum += Math.abs(a[i] - b[i]);
        }
        return sum;
      };
    case 2:
      return function L2Distance (a, b) {
        var i, sum, dx;
        for (i = a.length - 1, sum = 0; i >= 0; i--) {
          dx = a[i] - b[i];
          sum += dx * dx;
        }
        return Math.sqrt(sum);
      };
    default:
      return function LDistance (a, b) {
        var i, sum;
        for (i = a.length - 1, sum = 0; i >= 0; i--) {
          sum += Math.pow(Math.abs(a[i] - b[i]), L);
        }
        return Math.pow(sum, 1 / L);
      };
  }
}
