/* global performance */
var regl = require('regl');
var failNicely = require('fail-nicely');
var panel = require('control-panel');
var hsl = require('float-hsl2rgb');
var css = require('insert-css');
var kmpp = require('../');

css(`
.control-panel {
  z-index: 100;
  position: relative;
}

.info {
  position: absolute;
  top: 70px;
  right: 10px;
  width: 340px;
  max-height: calc(100vh - 90px);
  overflow: auto;
  z-index: 2;
  background: rgba(255, 255, 255, 0.92);
  font: 13px/1.45 system-ui, sans-serif;
  color: #222;
  padding: 10px 14px;
  border-radius: 6px;
  box-shadow: 0 1px 6px rgba(0, 0, 0, 0.25);
}
.info summary { cursor: pointer; font-weight: 600; font-size: 14px; }
.info code, .info pre { font: 12px ui-monospace, monospace; background: #f1f1f1; padding: 1px 4px; border-radius: 3px; }
.info pre { padding: 6px 8px; white-space: pre-wrap; word-break: break-word; }
.info table { border-collapse: collapse; width: 100%; font-size: 12px; }
.info th, .info td { border-bottom: 1px solid #ddd; padding: 2px 4px; text-align: right; }
.info th:first-child, .info td:first-child { text-align: left; }
.info a { color: #0b57d0; }
.info small { color: #555; }
.progress {
  background: rgba(255, 255, 255, 0.8);
  position: absolute;
  bottom: 10px;
  left: 10px;
  z-index: 1;
}
`);

var progress = document.createElement('pre');
progress.className = 'progress';
progress.setAttribute('role', 'status');
progress.setAttribute('aria-live', 'polite');
document.body.appendChild(progress);

var info = document.createElement('details');
info.className = 'info';
info.open = window.innerWidth > 900;
info.innerHTML = `
<summary>kmpp + emeans</summary>
<p>k-means with k-means++ initialization, plus <b>e-means</b>: a mini-batch variant (EMA updates, scaling-law batch size and step size) that reaches similar or lower loss in a few epochs. Pick the algorithm in the panel and compare the readout at the bottom left.</p>
<pre>npm install kmpp emeans</pre>
<pre>kmpp(points, { k: 16, algorithm: 'emeans', epochs: 3 })</pre>
<table>
<tr><th>n, d, k</th><th>1 epoch</th><th>5 epochs</th></tr>
<tr><td>20k, 2, 64</td><td>1.055 / 10×</td><td>0.970 / 4.8×</td></tr>
<tr><td>50k, 16, 128</td><td>0.975 / 17.6×</td><td>0.945 / 4.7×</td></tr>
<tr><td>50k, 64, 128</td><td>0.900 / 21×</td><td>0.727 / 4.6×</td></tr>
<tr><td>200k, 16, 64</td><td>0.864 / 18×</td><td>0.843 / 4×</td></tr>
</table>
<p><small>MSE relative to Lloyd (lower is better) / speedup. Synthetic data, single-threaded JS, Lloyd capped at 25 iterations from the same start. Scaling-law constants come from the Faiss reference. <a href="https://github.com/cmtt/kmpp/tree/master/bench">Benchmark details</a>.</small></p>
<p>
<a href="https://github.com/cmtt/kmpp">kmpp on GitHub</a> ·
<a href="https://www.npmjs.com/package/kmpp">kmpp</a> ·
<a href="https://www.npmjs.com/package/emeans">emeans</a> ·
<a href="https://e-means.github.io/">e-means</a> ·
<a href="https://arxiv.org/abs/2611.09501">paper</a>
</p>
<p><small>emeans is an unofficial JavaScript port of e-means, not affiliated with its authors.</small></p>`;
document.body.appendChild(info);

regl({
  onDone: failNicely((regl) => {
    var pointBuf = regl.buffer();
    var pointColorBuf = regl.buffer();
    var centroidBuf = regl.buffer();
    var centroidColorBuf = regl.buffer();

    var x, iteration;
    var km = {};
    var settings = {
      norm: 2,
      points: 5000,
      k: 0,
      kmpp: true,
      algorithm: 'lloyd',
      epochs: 3,
      uniformity: 0.5,
      periodicity: 4
    };

    function distribution (x, y) {
      var w = Math.PI * settings.periodicity;
      return Math.abs(
        Math.cos(x * w) *
        Math.sin((y - x / 2) * w) *
        Math.sin((y + x / 2) * w)
      );
    }

    var elapsed = 0;

    function mse () {
      var i, c, j, d, dx, best;
      var sum = 0;
      var cs = km.centroids;
      for (i = 0; i < x.length; i++) {
        best = Infinity;
        for (c = 0; c < cs.length; c++) {
          d = 0;
          for (j = 0; j < 2; j++) { dx = x[i][j] - cs[c][j]; d += dx * dx; }
          if (d < best) best = d;
        }
        sum += best;
      }
      return sum / x.length;
    }

    function restart () {
      elapsed = 0;
      iteration = 0;
      progress.textContent = '';
      delete km.assignments;
      delete km.centroids;
      km.converged = false;
    }

    function initialize () {
      var ar = window.innerWidth / window.innerHeight;
      var i = 0;
      x = [];
      while (i < settings.points) {
        // Random points; we'll scale these to the viewport:
        var xp = 2.0 * (Math.random() - 0.5) * (ar > 1 ? ar : 1);
        var yp = 2.0 * (Math.random() - 0.5) * (ar > 1 ? 1 : 1 / ar);

        if (Math.pow(distribution(xp, yp), (1.0 - settings.uniformity) * 2.0) > Math.random()) {
          x[i++] = [xp, yp];
        }
      }
      restart();
    }

    var drawPoints = regl({
      vert: `
        precision mediump float;
        attribute vec2 xy;
        attribute vec3 color;
        uniform float size;
        uniform vec2 aspect;
        varying vec3 col;
        void main () {
          col = color;
          gl_Position = vec4(xy * aspect, 0, 1);
          gl_PointSize = size;
        }
      `,
      frag: `
        precision mediump float;
        uniform float alpha;
        varying vec3 col;
        uniform float size;
        void main () {
          vec2 uv = gl_PointCoord - 0.5;
          float r = length(uv) * size * 2.0;

          gl_FragColor = vec4(col, alpha * smoothstep(size, size - 2.0, r));
        }
      `,
      depth: { enable: false },
      blend: {
        enable: true,
        func: { srcRGB: 'src alpha', srcAlpha: 1, dstRGB: 1, dstAlpha: 1 },
        equation: { rgb: 'reverse subtract', alpha: 'add' }
      },
      attributes: {
        xy: regl.prop('xy'),
        color: regl.prop('color')
      },
      uniforms: {
        size: (ctx, props) => ctx.pixelRatio * props.size,
        alpha: regl.prop('alpha'),
        aspect: ctx => {
          var w = ctx.viewportWidth;
          var h = ctx.viewportHeight;
          return w / h > 1 ? [h / w, 1] : [1, w / h];
        }
      },
      primitive: 'points',
      count: (ctx, props) => props.xy._buffer.byteLength / 8
    });

    panel([
      { label: 'norm', type: 'range', min: 0.5, max: 4, step: 0.5, initial: settings.norm },
      { label: 'k', type: 'range', min: 0, max: 100, step: 1, initial: settings.k },
      { label: 'points', type: 'range', min: 1000, max: 20000, step: 100, initial: settings.points },
      { label: 'uniformity', type: 'range', min: 0, max: 1, step: 0.1, initial: settings.uniformity },
      { label: 'periodicity', type: 'range', min: 1, max: 10, step: 0.5, initial: settings.periodicity },
      { label: 'kmpp', type: 'checkbox', initial: settings.kmpp },
      { label: 'algorithm', type: 'select', options: ['lloyd', 'emeans'], initial: settings.algorithm },
      { label: 'epochs', type: 'range', min: 1, max: 10, step: 0.5, initial: settings.epochs },
      { label: 'restart', type: 'button', action: restart }
    ], { position: 'top-left', width: 350 }).on('input', (data) => {
      var needsInitialize = false;
      var needsRestart = false;
      if ((data.points !== settings.points) || (data.uniformity !== settings.uniformity) || (data.periodicity !== settings.periodicity)) {
        needsInitialize = true;
      } else if ((data.k !== settings.k) || (data.kmpp !== settings.kmpp) || (data.algorithm !== settings.algorithm) || (data.epochs !== settings.epochs)) {
        needsRestart = true;
      } else if (data.norm !== settings.norm) {
        km.converged = false;
      }
      Object.assign(settings, data);
      if (needsRestart) restart();
      if (needsInitialize) initialize();
    });

    initialize();

    window.addEventListener('resize', initialize, false);

    var canvas = document.querySelector('canvas');
    if (canvas) {
      canvas.setAttribute('role', 'img');
      canvas.setAttribute('aria-label', 'Scatter plot of 2-D points colored by cluster, with larger dots marking the centroids found by k-means or e-means. Current progress is shown in the status text at the bottom left.');
    }

    iteration = 0;
    regl.frame(({ tick }) => {
      if (km.converged) return;

      iteration++;

      var t0 = performance.now();
      var isEmeans = settings.algorithm === 'emeans';
      km = kmpp(x, Object.assign({
        maxIterations: 1,
        norm: isEmeans ? 2 : settings.norm,
        k: settings.k === 0 ? undefined : settings.k,
        kmpp: settings.kmpp,
        algorithm: settings.algorithm,
        epochs: settings.epochs
      }, km));
      elapsed += performance.now() - t0;

      var loss = mse().toFixed(5);
      if (isEmeans) {
        progress.textContent = 'emeans: ' + km.epochs + ' epochs, batch ' + km.batchSize + ', ' + elapsed.toFixed(0) + ' ms, MSE ' + loss;
      } else {
        progress.textContent = (km.converged ? ('lloyd: converged after ' + iteration + ' iterations') : ('lloyd: iteration ' + iteration)) + ', ' + elapsed.toFixed(0) + ' ms, MSE ' + loss;
      }

      var colorList = new Array(km.centroids.length).fill(0).map((d, i) => hsl([i / km.centroids.length, 0.5, 0.5]));

      pointColorBuf({ data: km.assignments.map(i => colorList[i]) });
      centroidColorBuf({ data: colorList });
      pointBuf({ data: x });
      centroidBuf({ data: km.centroids });

      regl.clear({ color: [1, 1, 1, 1] });

      drawPoints({
        xy: pointBuf,
        size: 5,
        color: pointColorBuf,
        alpha: 0.25 * Math.sqrt(5000 / settings.points * window.innerWidth * window.innerHeight / 600 / 600)
      });

      drawPoints({
        xy: centroidBuf,
        size: 15,
        color: centroidColorBuf,
        alpha: 1.0
      });
    });
  })
});
