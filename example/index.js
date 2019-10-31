var regl = require('regl');
var failNicely = require('fail-nicely');
var panel = require('control-panel');
var hsl = require('float-hsl2rgb');
var css = require('insert-css');
var kmpp = require('../');
var h = require('h');

css(`
.control-panel {
  z-index: 100;
  position: relative;
}

.progress {
  background: rgba(255, 255, 255, 0.8);
  position: absolute;
  bottom: 10px;
  left: 10px;
  z-index: 1;
}
`);

var progress = h('pre.progress');
document.body.appendChild(progress);

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

    function restart () {
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
      { label: 'restart', type: 'button', action: restart }
    ], { position: 'top-left', width: 350 }).on('input', (data) => {
      var needsInitialize = false;
      var needsRestart = false;
      if ((data.points !== settings.points) || (data.uniformity !== settings.uniformity) || (data.periodicity !== settings.periodicity)) {
        needsInitialize = true;
      } else if ((data.k !== settings.k) || (data.kmpp !== settings.kmpp)) {
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

    iteration = 0;
    regl.frame(({ tick }) => {
      if (km.converged) return;

      iteration++;

      km = kmpp(x, Object.assign({ maxIterations: 1,
        norm: settings.norm,
        k: settings.k === 0 ? undefined : settings.k,
        kmpp: settings.kmpp
      }, km));

      progress.textContent = km.converged ? ('converged after ' + iteration + ' iterations') : ('iteration: ' + iteration);

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
