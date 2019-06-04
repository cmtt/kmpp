module.exports = function LSqrtDistance (a, b) {
  var i, sum;
  for (i = a.length - 1, sum = 0; i >= 0; i--) {
    sum += Math.sqrt(Math.abs(a[i] - b[i]));
  }
  return sum * sum;
};
