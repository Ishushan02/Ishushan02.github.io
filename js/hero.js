/* Hero: the name is sampled out of Gaussian noise.
   Each particle sits at  x_t = sqrt(abar) * x_0 + sqrt(1 - abar) * eps
   with a cosine schedule, so sqrt(abar) = cos(t*pi/2) and sqrt(1-abar) = sin(t*pi/2). */
(() => {
  const hero = document.querySelector('.hero');
  const canvas = document.getElementById('heroCanvas');
  if (!hero || !canvas) return;

  const ctx = canvas.getContext('2d');
  const stage = hero.querySelector('.hero__stage');
  const form = document.getElementById('promptForm');
  const input = document.getElementById('promptInput');
  const slider = document.getElementById('tSlider');
  const hudStep = document.getElementById('hudStep');
  const hudAlpha = document.getElementById('hudAlpha');
  const hudSeed = document.getElementById('hudSeed');
  const btn = document.getElementById('resample');

  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const DEFAULT = 'Ishan Kumar Anand';
  const FONT = '"Instrument Serif", "Iowan Old Style", "Palatino Linotype", Georgia, serif';
  const CAP = 24000;
  const LH = 0.9;
  const INK = '#ece8de';
  const ACC = '#c9f24b';

  const x0 = new Float32Array(CAP), y0 = new Float32Array(CAP);
  const ex = new Float32Array(CAP), ey = new Float32Array(CAP);
  const ox = new Float32Array(CAP), oy = new Float32Array(CAP);
  const vx = new Float32Array(CAP), vy = new Float32Array(CAP);
  const ph = new Float32Array(CAP);

  let N = 0, W = 0, H = 0, DPR = 1;
  let t = 1;
  let seed = 1000 + Math.floor(Math.random() * 9000);
  let text = DEFAULT;
  let tween = null;
  let dragging = false;
  let holdTimer = 0;
  let visible = true;
  let raf = 0;
  let anyMoving = false;
  const mouse = { x: -9999, y: -9999, on: false };

  function mulberry(a) {
    return () => {
      a |= 0; a = (a + 0x6d2b79f5) | 0;
      let r = Math.imul(a ^ (a >>> 15), 1 | a);
      r = (r + Math.imul(r ^ (r >>> 7), 61 | r)) ^ r;
      return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
    };
  }

  function drawNoise() {
    const r = mulberry(seed);
    for (let i = 0; i < CAP; i += 2) {
      let u, v, g1, g2;
      do {
        u = Math.max(r(), 1e-6); v = r();
        const m = Math.sqrt(-2 * Math.log(u));
        g1 = m * Math.cos(6.2831853 * v); g2 = m * Math.sin(6.2831853 * v);
      } while (Math.abs(g1) > 2.6 || Math.abs(g2) > 2.6);
      ex[i] = g1; ey[i] = g2;
      ex[i + 1] = g2 * 0.7 + r() - 0.5; ey[i + 1] = g1 * 0.7 + r() - 0.5;
      ph[i] = r() * 6.2831853; ph[i + 1] = r() * 6.2831853;
    }
    hudSeed.textContent = String(seed);
  }

  /* Split words into n lines so the widest line is as narrow as possible. */
  function bestSplit(words, n, measure) {
    let best = null;
    const walk = (start, left, acc) => {
      if (left === 1) {
        const lines = acc.concat(words.slice(start).join(' '));
        const w = Math.max(...lines.map(measure));
        if (!best || w < best.w) best = { lines, w };
        return;
      }
      for (let end = start + 1; end <= words.length - (left - 1); end++) {
        walk(end, left - 1, acc.concat(words.slice(start, end).join(' ')));
      }
    };
    walk(0, n, []);
    return best;
  }

  function layout(str, bw, bh) {
    const words = str.trim().split(/\s+/).filter(Boolean);
    const m = document.createElement('canvas').getContext('2d');
    m.font = `400 100px ${FONT}`;
    const measure = (s) => m.measureText(s).width;
    let best = null;
    for (let n = 1; n <= Math.min(words.length, 4); n++) {
      const s = bestSplit(words, n, measure);
      const size = Math.min(bw / (s.w / 100), bh / (n * LH + 0.14));
      if (!best || size > best.size) best = { lines: s.lines, size };
    }
    return best;
  }

  function retarget() {
    const hr = hero.getBoundingClientRect();
    const sr = stage.getBoundingClientRect();
    const bw = Math.max(40, Math.floor(sr.width));
    const bh = Math.max(40, Math.floor(sr.height));
    const bx = sr.left - hr.left, by = sr.top - hr.top;
    const L = layout(text, bw, bh);
    if (!L) return;

    const oc = document.createElement('canvas');
    oc.width = bw; oc.height = bh;
    const o = oc.getContext('2d', { willReadFrequently: true });
    o.font = `400 ${L.size}px ${FONT}`;
    o.textBaseline = 'alphabetic';
    o.fillStyle = '#fff';
    const n = L.lines.length;
    L.lines.forEach((line, i) => {
      o.fillText(line, 0, bh - (n - 1 - i) * L.size * LH - L.size * 0.19);
    });

    const data = o.getImageData(0, 0, bw, bh).data;
    const pts = [];
    for (let y = 0; y < bh; y += 2) {
      for (let x = 0; x < bw; x += 2) {
        if (data[(y * bw + x) * 4 + 3] > 110) pts.push(x, y);
      }
    }
    const M = pts.length / 2;
    if (!M) return;
    const cap = W < 720 ? 7000 : CAP;
    N = Math.max(2500, Math.min(cap, Math.round(M * 4 * 0.24)));
    const r = mulberry(seed ^ 0x9e3779);
    for (let i = 0; i < N; i++) {
      const j = Math.floor(r() * M) * 2;
      x0[i] = bx + pts[j] + r() * 2;
      y0[i] = by + pts[j + 1] + r() * 2;
    }
  }

  function resize() {
    const r = hero.getBoundingClientRect();
    W = Math.round(r.width); H = Math.round(r.height);
    DPR = Math.max(0.8, Math.min(window.devicePixelRatio || 1, 1.5, Math.sqrt(1.9e6 / Math.max(1, W * H))));
    canvas.width = Math.round(W * DPR); canvas.height = Math.round(H * DPR);
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    retarget();
    kick();
  }

  const easeInOut = (p) => (p < 0.5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2);
  const easeIn = (p) => p * p;

  function go(to, dur, ease, done) {
    if (reduce) dur = 0;
    tween = { a: t, b: to, s: performance.now(), d: dur, e: ease, done };
    kick();
  }
  const denoise = (dur = 2600) => go(0, dur * (0.35 + 0.65 * t), easeInOut);

  function regenerate(newSeed) {
    clearTimeout(holdTimer);
    go(1, 620 * (1 - t) + 120, easeIn, () => {
      if (newSeed) { seed = 1000 + Math.floor(Math.random() * 9000); drawNoise(); }
      retarget();
      denoise(2800);
    });
  }

  function syncHud() {
    const a = Math.cos(t * Math.PI / 2);
    const step = Math.round((1 - t) * 50);
    hudStep.textContent = String(step).padStart(2, '0') + '/50';
    hudAlpha.textContent = (a * a).toFixed(3);
    if (!dragging) slider.value = String(Math.round((1 - t) * 1000));
  }

  let lastDraw = 0;
  function frame(now) {
    raf = 0;
    // when nothing is happening, the gentle drift only needs ~30 fps
    if (!tween && !mouse.on && !dragging && !anyMoving && now - lastDraw < 32) { if (visible) kick(); return; }
    lastDraw = now;
    if (tween) {
      const p = tween.d <= 0 ? 1 : Math.min(1, (now - tween.s) / tween.d);
      t = tween.a + (tween.b - tween.a) * tween.e(p);
      if (p >= 1) { const f = tween.done; tween = null; if (f) f(); }
      syncHud();
    }

    const a = Math.cos(t * Math.PI / 2), b = Math.sin(t * Math.PI / 2);
    const cx = W * 0.5, cy = H * 0.44, sx = W * 0.3, sy = H * 0.26;
    const boil = reduce ? 0 : b * 5;
    const breathe = reduce ? 0 : 0.4;
    const time = now * 0.001;
    const mx = mouse.x, my = mouse.y, R = 130, R2 = R * R, mon = mouse.on;

    ctx.clearRect(0, 0, W, H);
    const cut1 = Math.floor(N * 0.68), cut2 = Math.floor(N * 0.93);
    let moving = false;

    for (let pass = 0; pass < 3; pass++) {
      const from = pass === 0 ? 0 : pass === 1 ? cut1 : cut2;
      const to = pass === 0 ? cut1 : pass === 1 ? cut2 : N;
      const s = pass === 1 ? 1 : 1.3;
      ctx.fillStyle = pass === 2 ? ACC : INK;
      ctx.globalAlpha = pass === 1 ? 0.5 : 0.95;
      for (let i = from; i < to; i++) {
        let px = cx + a * (x0[i] - cx) + b * ex[i] * sx + ox[i];
        let py = cy + a * (y0[i] - cy) + b * ey[i] * sy + oy[i];
        if (mon) {
          const dx = px - mx, dy = py - my, d2 = dx * dx + dy * dy;
          if (d2 < R2) {
            const d = Math.sqrt(d2) || 1;
            let f = 1 - d / R; f = f * f * 2.4;
            vx[i] += (dx / d) * f; vy[i] += (dy / d) * f;
          }
        }
        if (vx[i] !== 0 || vy[i] !== 0 || ox[i] !== 0 || oy[i] !== 0) {
          vx[i] = (vx[i] - ox[i] * 0.045) * 0.87; vy[i] = (vy[i] - oy[i] * 0.045) * 0.87;
          ox[i] += vx[i]; oy[i] += vy[i];
          if (Math.abs(vx[i]) + Math.abs(vy[i]) + Math.abs(ox[i]) + Math.abs(oy[i]) < 0.02) {
            vx[i] = vy[i] = ox[i] = oy[i] = 0;
          } else moving = true;
        }
        px += Math.sin(time * 1.1 + ph[i]) * breathe;
        py += Math.cos(time * 0.9 + ph[i] * 1.7) * breathe;
        if (boil) { px += Math.sin(time * 37 + ph[i] * 9) * boil * 0.5; py += Math.cos(time * 41 + ph[i] * 7) * boil * 0.5; }
        ctx.fillRect(px, py, s, s);
      }
    }
    ctx.globalAlpha = 1;

    anyMoving = moving;
    if (visible && (!reduce || tween || moving || mon)) kick();
  }

  function kick() { if (!raf) raf = requestAnimationFrame(frame); }

  /* controls */
  slider.addEventListener('input', () => {
    dragging = true; tween = null; clearTimeout(holdTimer);
    t = 1 - slider.value / 1000;
    syncHud(); kick();
  });
  const release = () => {
    if (!dragging) return;
    dragging = false;
    clearTimeout(holdTimer);
    if (t > 0.01) holdTimer = setTimeout(() => denoise(2600), 1500);
  };
  slider.addEventListener('change', release);
  slider.addEventListener('pointerup', release);

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    text = input.value.trim() || DEFAULT;
    if (!input.value.trim()) input.value = DEFAULT;
    regenerate(false);
  });
  btn.addEventListener('click', () => regenerate(true));

  hero.addEventListener('pointermove', (e) => {
    if (e.pointerType === 'touch') return;
    const r = hero.getBoundingClientRect();
    mouse.x = e.clientX - r.left; mouse.y = e.clientY - r.top; mouse.on = true;
    kick();
  });
  hero.addEventListener('pointerleave', () => { mouse.on = false; });

  new IntersectionObserver((en) => {
    visible = en[0].isIntersecting;
    if (visible) kick();
  }).observe(hero);

  let rz = 0;
  new ResizeObserver(() => { clearTimeout(rz); rz = setTimeout(resize, 120); }).observe(hero);

  /* boot */
  drawNoise();
  const start = () => {
    resize();
    if (reduce) { t = 0; syncHud(); kick(); return; }
    t = 1; syncHud();
    setTimeout(() => denoise(3600), 450);
  };
  const fontReady = document.fonts && document.fonts.load
    ? Promise.race([document.fonts.load('400 100px "Instrument Serif"'), new Promise((r) => setTimeout(r, 1800))])
    : Promise.resolve();
  fontReady.then(start, start);
})();
