module.exports = function (L) {
  return function LDistance (a, b) {
    var i, sum;
    for (i = a.length - 1, sum = 0; i >= 0; i--) {
      sum += Math.pow(Math.abs(a[i] - b[i]), L);
    }
    return Math.pow(sum, 1 / L);
  };
};
