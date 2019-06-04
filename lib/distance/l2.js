module.exports = function L2Distance (a, b) {
  var i, sum, dx;
  for (i = a.length - 1, sum = 0; i >= 0; i--) {
    dx = a[i] - b[i];
    sum += dx * dx;
  }
  return Math.sqrt(sum);
};
