'use strict';
// Usage: node bench/run.js [--quick]
// Compares Lloyd (25 epochs) with e-means at several epoch budgets on seeded
// synthetic Gaussian mixtures. All methods start from the same random centroids.
var fs = require('fs');
var path = require('path');
var kmpp = require('../lib');

var quick = process.argv.indexOf('--quick') !== -1;
var SEEDS = quick ? 1 : 3;
var CONFIGS = quick
  ? [{ n: 10000, d: 16, k: 64 }]
  : [
    { n: 20000, d: 2, k: 64 },
    { n: 50000, d: 16, k: 128 },
    { n: 50000, d: 64, k: 128 },
    { n: 200000, d: 16, k: 64 }
  ];
var EPOCHS = [1, 2, 3, 5];
var LLOYD_EPOCHS = 25;

function prng (seed) {
  var a = seed >>> 0;
  return function () {
    a = (a + 0x6D2B79F5) >>> 0;
    var t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function gauss (rng) {
  return Math.sqrt(-2 * Math.log(rng() || 1e-12)) * Math.cos(2 * Math.PI * rng());
}

function makeData (n, d, k, seed) {
  var rng = prng(seed);
  var centers = [];
  var i; var j; var c; var x = [];
  for (c = 0; c < k; c++) {
    centers[c] = [];
    for (j = 0; j < d; j++) centers[c][j] = gauss(rng) * 3;
  }
  for (i = 0; i < n; i++) {
    c = ~~(rng() * k);
    x[i] = new Array(d);
    for (j = 0; j < d; j++) x[i][j] = centers[c][j] + gauss(rng);
  }
  return x;
}

function sqdist (a, b) {
  var s = 0; var i; var t;
  for (i = a.length - 1; i >= 0; i--) { t = a[i] - b[i]; s += t * t; }
  return s;
}

// True MSE against the nearest final centroid (fresh assignment pass).
function mse (x, centroids) {
  var i; var c; var best; var d; var s = 0;
  for (i = 0; i < x.length; i++) {
    best = Infinity;
    for (c = 0; c < centroids.length; c++) {
      d = sqdist(x[i], centroids[c]);
      if (d < best) best = d;
    }
    s += best;
  }
  return s / x.length;
}

function median (a) {
  var s = a.slice().sort(function (p, q) { return p - q; });
  return s[~~(s.length / 2)];
}

function time (fn) {
  var t = process.hrtime.bigint();
  var r = fn();
  return { ms: Number(process.hrtime.bigint() - t) / 1e6, r: r };
}

function randomInit (x, k, seed) {
  var rng = prng(seed ^ 0xabcdef);
  var c = [];
  while (c.length < k) c.push(x[~~(rng() * x.length)].slice());
  return c;
}

var rows = [];

CONFIGS.forEach(function (cfg) {
  var runs = { lloyd: [], kmppInit: [] };
  EPOCHS.forEach(function (e) { runs['emeans' + e] = []; });
  var s;
  for (s = 1; s <= SEEDS; s++) {
    var x = makeData(cfg.n, cfg.d, cfg.k, s);
    var init = randomInit(x, cfg.k, s);
    var copy = function () { return init.map(function (c) { return c.slice(); }); };

    var l = time(function () {
      return kmpp(x, { k: cfg.k, centroids: copy(), assignments: new Array(cfg.n), maxIterations: LLOYD_EPOCHS });
    });
    runs.lloyd.push({ ms: l.ms, mse: mse(x, l.r.centroids), epochs: l.r.iterations });

    var kp = time(function () { return kmpp(x, { k: cfg.k, maxIterations: 0 }); });
    runs.kmppInit.push({ ms: kp.ms, mse: mse(x, kp.r.centroids), epochs: 0 });

    EPOCHS.forEach(function (e) {
      var r = time(function () {
        return kmpp(x, { k: cfg.k, algorithm: 'emeans', epochs: e, centroids: copy(), assignments: new Array(cfg.n) });
      });
      runs['emeans' + e].push({ ms: r.ms, mse: mse(x, r.r.centroids), epochs: e, batch: r.r.batchSize });
    });
    process.stderr.write('.');
  }

  var ref = median(runs.lloyd.map(function (r) { return r.mse; }));
  var refMs = median(runs.lloyd.map(function (r) { return r.ms; }));
  Object.keys(runs).forEach(function (name) {
    var rs = runs[name];
    rows.push({
      n: cfg.n,
      d: cfg.d,
      k: cfg.k,
      method: name,
      epochs: median(rs.map(function (r) { return r.epochs; })),
      batch: rs[0].batch,
      ms: Math.round(median(rs.map(function (r) { return r.ms; }))),
      mse: median(rs.map(function (r) { return r.mse; })),
      mseRatio: median(rs.map(function (r) { return r.mse; })) / ref,
      speedup: refMs / median(rs.map(function (r) { return r.ms; }))
    });
  });
});
process.stderr.write('\n');

console.log('method        n       d    k    epochs batch   ms        mse/lloyd  speedup-vs-lloyd');
rows.forEach(function (r) {
  console.log([
    r.method.padEnd(13), String(r.n).padEnd(7), String(r.d).padEnd(4), String(r.k).padEnd(4),
    String(r.epochs).padEnd(6), String(r.batch || '-').padEnd(7), String(r.ms).padEnd(9),
    r.mseRatio.toFixed(4).padEnd(10), r.speedup.toFixed(1) + 'x'
  ].join(' '));
});
fs.writeFileSync(path.join(__dirname, 'results.json'), JSON.stringify(rows, null, 2));
