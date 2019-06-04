module.exports = function L1Distance (a, b) {
  var i, sum;
  for (i = a.length - 1, sum = 0; i >= 0; i--) {
    sum += Math.abs(a[i] - b[i]);
  }
  return sum;
};
