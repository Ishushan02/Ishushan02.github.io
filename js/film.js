/* The reels: experience and projects told as scroll-driven scenes.
   Each .act is a tall section with a sticky stage. Scroll position is the playhead (p in 0..1),
   and every scene is drawn procedurally on a canvas from p and the clock. No images, no video. */
(() => {
  const filmEls = Array.from(document.querySelectorAll('.film'));
  if (!filmEls.length) return;
  const nav = document.getElementById('nav');
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;

  const INK = '236,232,222', ACC = '201,242,75', RED = '255,106,77';
  const TINTS = ['201,242,75', '255,138,76', '111,214,255', '255,122,184', '183,155,255', '255,210,76'];
  const MONO = '"JetBrains Mono", ui-monospace, monospace';
  const SERIF = '"Instrument Serif", Georgia, serif';
  const TAU = Math.PI * 2;
  const BG = '#050505';

  const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
  const seg = (p, a, b) => clamp((p - a) / (b - a));
  const ease = (x) => x * x * (3 - 2 * x);
  const lerp = (a, b, t) => a + (b - a) * t;
  const rnd = (i) => { const x = Math.sin(i * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };
  const ink = (a) => `rgba(${INK},${a})`;
  const acc = (a) => `rgba(${ACC},${a})`;
  const tint = (i, a) => `rgba(${TINTS[i % TINTS.length]},${a})`;
  const label = (c, s, x, y, col = ink(0.55), size = 10, align = 'left') => {
    c.font = `500 ${size}px ${MONO}`; c.fillStyle = col; c.textAlign = align; c.textBaseline = 'alphabetic';
    c.fillText(s, x, y);
  };
  const line = (c, x1, y1, x2, y2) => { c.beginPath(); c.moveTo(x1, y1); c.lineTo(x2, y2); c.stroke(); };

  /* picture area on a face, clear of the stats column and the caption card */
  function region(w, h) {
    return w > 900
      ? { x: w * 0.06, y: h * 0.08, w: w * 0.6, h: h * 0.6, wide: true }
      : { x: w * 0.06, y: h * 0.37, w: w * 0.88, h: h * 0.34, wide: false };
  }

  /* a small procedural "generated image": dusk over hills, used by the generative scenes */
  function sky(u, v) {
    const hill = 0.62 + 0.05 * Math.sin(u * 7 + 1) + 0.025 * Math.sin(u * 19);
    if (v > hill) { const k = (v - hill) / (1 - hill); return [lerp(34, 14, k), lerp(78, 40, k), lerp(64, 40, k)]; }
    const sun = Math.hypot(u - 0.68, (v - 0.42) * 1.1);
    if (sun < 0.11) return [255, 222, 150];
    const k = v / hill, glow = Math.max(0, 1 - sun / 0.36) * 0.55;
    return [lerp(lerp(34, 250, k * k), 255, glow), lerp(lerp(34, 120, k * k), 190, glow), lerp(lerp(88, 110, k), 130, glow)];
  }
  const grid = (n) => { const out = []; for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) out.push(sky((i + 0.5) / n, (j + 0.5) / n)); return out; };
  const SKY24 = grid(24), SKY12 = grid(12);
  const CODEBOOK = [];
  for (let k = 0; k < 16; k++) CODEBOOK.push(sky(rnd(k * 3.1) * 0.95 + 0.02, (k / 16) * 0.96 + 0.02));
  const nearest = (q) => {
    let best = 0, bd = Infinity;
    CODEBOOK.forEach((b, k) => { const d = (b[0] - q[0]) ** 2 + (b[1] - q[1]) ** 2 + (b[2] - q[2]) ** 2; if (d < bd) { bd = d; best = k; } });
    return best;
  };
  const CODE12 = SKY12.map(nearest);
  const rgb = (a, al = 1) => `rgba(${a[0] | 0},${a[1] | 0},${a[2] | 0},${al})`;
  const mix = (a, b, k) => [lerp(a[0], b[0], k), lerp(a[1], b[1], k), lerp(a[2], b[2], k)];

  const SKY24S = SKY24.map((q) => rgb(q));
  function denoised(c, x, y, s, k, t) {
    const n = 24, cs = s / n, f = Math.floor(t * 9);
    for (let i = 0; i < n * n; i++) {
      if (k >= 1) c.fillStyle = SKY24S[i];
      else {
        const q = SKY24[i];
        c.fillStyle = `rgb(${lerp(rnd(i * 7.1 + f) * 255, q[0], k) | 0},${lerp(rnd(i * 3.7 + f + 9) * 255, q[1], k) | 0},${lerp(rnd(i * 5.3 + f + 21) * 255, q[2], k) | 0})`;
      }
      c.fillRect(x + (i % n) * cs, y + Math.floor(i / n) * cs, cs + 0.6, cs + 0.6);
    }
  }

  /* ═══════════ EXPERIENCE ═══════════ */

  /* Act I · infrastructure */
  const IDLE = new Set([1, 4, 6, 10, 11, 14, 17, 20, 22]);
  const DRIFT = [1, 3, 4, 6];
  function infra(c, R, p, t) {
    const b1 = ease(seg(p, 0.14, 0.38)), b2 = ease(seg(p, 0.42, 0.66)), b3 = ease(seg(p, 0.68, 0.94));
    const fh = R.h * 0.4;
    const cell = Math.min(R.w / 13, fh / 4.4, 34);
    const fx = R.x + R.w * 0.2;

    label(c, b1 < 0.5 ? 'FLEET · 24 INSTANCES' : 'FLEET · 15 INSTANCES, 3 TIERS', R.x, R.y - 12);
    let k = 0;
    for (let i = 0; i < 24; i++) {
      const sx = R.x + rnd(i) * (R.w - cell), sy = R.y + rnd(i + 50) * (fh - cell);
      const idle = IDLE.has(i);
      let x = sx, y = sy, a = 1;
      if (idle) {
        a = 1 - seg(b1, 0.1 + rnd(i + 9) * 0.3, 0.6 + rnd(i + 9) * 0.3);
      } else {
        x = lerp(sx, fx + (k % 5) * cell * 1.55, b1);
        y = lerp(sy, R.y + Math.floor(k / 5) * cell * 1.42, b1);
        k++;
      }
      if (a <= 0.01) continue;
      const s = cell * (idle ? lerp(1, 0.6, 1 - a) : 1);
      c.globalAlpha = a;
      if (idle) {
        c.setLineDash([3, 3]); c.strokeStyle = ink(0.35); c.lineWidth = 1; c.strokeRect(x, y, s, s); c.setLineDash([]);
        if (Math.sin(t * 3 + i) > 0) label(c, 'idle', x + s / 2, y + s / 2 + 3, `rgba(${RED},0.9)`, 9, 'center');
      } else {
        c.fillStyle = ink(0.07); c.fillRect(x, y, s, s);
        c.strokeStyle = ink(0.75); c.lineWidth = 1; c.strokeRect(x, y, s, s);
        c.fillStyle = acc(0.5 + 0.5 * Math.sin(t * 4 + i * 1.7)); c.fillRect(x + 4, y + 4, 3, 3);
        c.fillStyle = ink(0.25); c.fillRect(x + 4, y + s - 7, s - 8, 1); c.fillRect(x + 4, y + s - 11, (s - 8) * (0.4 + 0.6 * rnd(i + 3)), 1);
      }
    }
    c.globalAlpha = seg(b1, 0.7, 1);
    for (let r = 0; r < 3; r++) label(c, 'TIER ' + (r + 1), R.x, R.y + r * cell * 1.42 + cell * 0.62);
    c.globalAlpha = 1;

    const la = 0.22 + 0.78 * seg(p, 0.38, 0.44);
    const y1 = R.y + R.h * 0.66, y2 = R.y + R.h * 0.94;
    const x0 = R.x + (R.wide ? R.w * 0.16 : R.w * 0.02), x1 = R.x + R.w;
    c.globalAlpha = la;
    label(c, 'STAGING', R.x, y1 - (R.wide ? -3 : 16));
    label(c, 'PRODUCTION', R.x, y2 - (R.wide ? -3 : 16));
    c.strokeStyle = ink(0.3); c.lineWidth = 1;
    line(c, x0, y1, x1, y1); line(c, x0, y2, x1, y2);
    for (let i = 0; i < 7; i++) {
      const x = lerp(x0, x1, (i + 0.5) / 7);
      const d = DRIFT.indexOf(i);
      const fixed = d < 0 || b2 > (d + 1) / 4.6;
      if (d >= 0 && !fixed) { c.setLineDash([4, 5]); c.strokeStyle = `rgba(${RED},0.9)`; }
      else { c.setLineDash([]); c.strokeStyle = d >= 0 ? acc(0.9) : ink(0.28); }
      line(c, x, y1 + 9, x, y2 - 9); c.setLineDash([]);
      if (d >= 0) label(c, fixed ? '=' : '≠', x + 8, (y1 + y2) / 2 + 4, fixed ? acc(1) : `rgba(${RED},1)`, 12);
      for (const y of [y1, y2]) {
        c.fillStyle = BG; c.fillRect(x - 7, y - 7, 14, 14);
        c.strokeStyle = ink(0.8); c.strokeRect(x - 7, y - 7, 14, 14);
      }
    }
    const count = Math.round(5 + 16 * b3), speed = 0.07 + 0.15 * b3;
    for (let lane = 0; lane < 2; lane++) {
      for (let i = 0; i < count; i++) {
        const u = (t * speed + i / count + lane * 0.37) % 1;
        c.fillStyle = lane ? acc(1) : ink(0.9);
        c.beginPath(); c.arc(lerp(x0, x1, u), lane ? y2 : y1, 2.4, 0, TAU); c.fill();
      }
    }
    c.globalAlpha = 1;
  }

  /* Act II · voice */
  function voice(c, R, p, t) {
    const b2 = ease(seg(p, 0.32, 0.54)), b3 = ease(seg(p, 0.57, 0.74)), b4 = ease(seg(p, 0.78, 0.93));
    const nLang = 1 + Math.round(15 * b2);
    const step = 7, bars = Math.floor(R.w / step), segLen = 11;
    const scroll = t * 13, base = Math.floor(scroll), frac = scroll - base;
    const head = Math.floor(bars * 0.64);
    const wy = R.y + R.h * 0.2, wh = R.h * 0.3;
    const langOf = (gi) => Math.floor(rnd(Math.floor(gi / segLen) * 3.1) * nLang);
    const colOf = (l) => (l === 0 ? INK : TINTS[(l - 1) % TINTS.length]);

    label(c, 'LIVE CALL', R.x, R.y - 12);
    for (let i = 0; i < bars; i++) {
      const gi = i + base, l = langOf(gi);
      let amp = (0.25 + 0.75 * rnd(gi * 1.7)) * (0.55 + 0.45 * Math.sin(gi * 0.35));
      if (gi % segLen === 0) amp *= 0.12;
      const x = R.x + (i - frac) * step, hgt = Math.max(2, amp * wh);
      c.fillStyle = `rgba(${colOf(l)},${i <= head ? 0.95 : 0.22})`;
      c.fillRect(x, wy - hgt / 2, step - 3, hgt);
      if (gi % segLen === 1 && i <= head && i > 1) label(c, 'L' + String(l + 1).padStart(2, '0'), x, wy - wh / 2 - 8, `rgba(${colOf(l)},0.9)`);
    }
    const hx = R.x + (head + 1 - frac) * step - 2;
    c.strokeStyle = ink(0.6); c.lineWidth = 1; line(c, hx, wy - wh * 0.62, hx, wy + wh * 0.62);

    const cy = R.y + R.h * 0.5, gap = 5, cw = Math.min(30, (R.w - 15 * gap) / 16);
    const cur = langOf(head + base);
    label(c, `LANGUAGES HANDLED · ${nLang}${nLang === 16 ? '+' : ''}`, R.x, cy - 10);
    for (let i = 0; i < 16; i++) {
      const x = R.x + i * (cw + gap), lit = i < nLang;
      c.strokeStyle = lit ? `rgba(${colOf(i)},0.9)` : ink(0.18); c.lineWidth = 1; c.strokeRect(x, cy, cw, cw);
      if (lit && i === cur) { c.fillStyle = `rgba(${colOf(i)},0.9)`; c.fillRect(x + 3, cy + 3, cw - 6, cw - 6); }
      else if (lit) { c.fillStyle = `rgba(${colOf(i)},0.18)`; c.fillRect(x, cy, cw, cw); }
    }

    const py = R.y + R.h * 0.72, ph = R.h * 0.28;
    const aA = 1 - seg(p, 0.55, 0.58), aB = seg(p, 0.56, 0.6) * (1 - seg(p, 0.755, 0.785)), aC = seg(p, 0.775, 0.805);
    if (aA > 0) {
      c.globalAlpha = aA;
      const names = ['INTENT', 'SLOT · WHO', 'SLOT · WHAT', 'ACTION'];
      const loop = (t * 0.42) % 1, done = Math.floor(loop * 5.2), turn = 1 + (Math.floor(t * 0.42) % 9);
      label(c, `DIALOGUE STATE · TURN ${turn}`, R.x, py);
      const bw = (R.w - 3 * 10) / 4;
      names.forEach((n, i) => {
        const x = R.x + i * (bw + 10), y = py + 14, on = i < done;
        c.strokeStyle = on ? acc(0.9) : ink(0.3); c.strokeRect(x, y, bw, ph * 0.5);
        if (on) { c.fillStyle = acc(0.12); c.fillRect(x, y, bw, ph * 0.5); c.fillStyle = acc(1); c.fillRect(x + 8, y + 8, 6, 6); }
        label(c, n, x + 8, y + ph * 0.5 - 9, on ? ink(0.95) : ink(0.4), R.wide ? 10 : 8);
      });
    }
    if (aB > 0) {
      c.globalAlpha = aB;
      label(c, b3 < 0.5 ? 'ENCODER · 12 LAYERS' : 'DISTILLED · 6 LAYERS', R.x, py);
      const full = (R.w * 0.62 - 11 * 6) / 12;
      let x = R.x;
      for (let i = 0; i < 12; i++) {
        const drop = i % 2 === 1, wd = drop ? full * (1 - b3) : full;
        if (wd > 0.5) {
          c.fillStyle = drop ? ink(0.25 * (1 - b3)) : acc(0.25 + 0.6 * b3);
          c.fillRect(x, py + 14, wd, ph * 0.42);
          c.strokeStyle = drop ? ink(0.5 * (1 - b3)) : acc(0.9); c.strokeRect(x, py + 14, wd, ph * 0.42);
        }
        x += wd + (drop ? 6 * (1 - b3) : 6);
      }
      const ly = py + 14 + ph * 0.42 + 22;
      c.fillStyle = ink(0.15); c.fillRect(R.x, ly, R.w, 3);
      c.fillStyle = ink(0.9); c.fillRect(R.x, ly, R.w * lerp(1, 0.45, b3), 3);
      label(c, `RESPONSE LATENCY · ${Math.round(100 - 55 * b3)}%`, R.x, ly + 18);
    }
    if (aC > 0) {
      c.globalAlpha = aC;
      label(c, 'TIME TO DEPLOY', R.x, py);
      c.fillStyle = ink(0.16); c.fillRect(R.x, py + 14, R.w, 12);
      label(c, 'before · 120 min', R.x + R.w, py, ink(0.4), 10, 'right');
      const wd = R.w * lerp(1, 0.125, b4);
      c.fillStyle = acc(1); c.fillRect(R.x, py + 38, wd, 12);
      label(c, `${Math.round(lerp(120, 15, b4))} min`, R.x + wd + 10, py + 48, acc(1), 11);
      label(c, 'validate → canary → auto-rollback', R.x, py + 74, ink(0.5));
    }
    c.globalAlpha = 1;
  }

  /* Act III · picture */
  function joints(phi, L) {
    const leg = (ph) => {
      const a = 0.55 * Math.sin(ph), k = 0.95 * Math.max(0, Math.sin(ph + 1.25));
      const kx = Math.sin(a) * L * 0.5, ky = Math.cos(a) * L * 0.5;
      return [[0, 0], [kx, ky], [kx + Math.sin(a - k) * L * 0.5, ky + Math.cos(a - k) * L * 0.5]];
    };
    const neck = [L * 0.05, -L * 0.72];
    const arm = (ph) => {
      const a = -0.62 * Math.sin(ph), ex = neck[0] + Math.sin(a) * L * 0.36, ey = neck[1] + Math.cos(a) * L * 0.36, f = a + 0.55;
      return [neck, [ex, ey], [ex + Math.sin(f) * L * 0.3, ey + Math.cos(f) * L * 0.3]];
    };
    return { bob: Math.abs(Math.cos(phi)) * L * 0.05, neck, head: [L * 0.09, -L * 0.96], legN: leg(phi), legF: leg(phi + Math.PI), armN: arm(phi), armF: arm(phi + Math.PI) };
  }
  function limb(c, cx, cy, pts, col, wd) {
    c.strokeStyle = col; c.lineWidth = wd; c.lineCap = 'round'; c.lineJoin = 'round';
    c.beginPath(); c.moveTo(cx + pts[0][0], cy + pts[0][1]);
    for (let i = 1; i < pts.length; i++) c.lineTo(cx + pts[i][0], cy + pts[i][1]);
    c.stroke();
  }
  function figure(c, cx, cy, L, phi, mode, jit = 0, fr = 0) {
    const J = joints(phi, L); cy -= J.bob;
    const torso = [[0, 0], J.neck];
    const head = (fill, stroke) => {
      c.beginPath(); c.arc(cx + J.head[0], cy + J.head[1], L * 0.17, 0, TAU);
      if (fill) { c.fillStyle = fill; c.fill(); }
      if (stroke) { c.strokeStyle = stroke; c.lineWidth = 2; c.stroke(); }
    };
    if (mode === 'pose') {
      const parts = [[J.armF, TINTS[4]], [J.legF, TINTS[2]], [torso, INK], [J.legN, TINTS[1]], [J.armN, TINTS[0]]];
      for (const [pts, col] of parts) {
        limb(c, cx, cy, pts, `rgba(${col},0.95)`, 3);
        for (const q of pts) { c.fillStyle = `rgb(${INK})`; c.beginPath(); c.arc(cx + q[0], cy + q[1], 3, 0, TAU); c.fill(); }
      }
      head(null, `rgba(${TINTS[5]},0.95)`);
    } else if (mode === 'depth') {
      const wd = L * 0.2;
      limb(c, cx, cy, J.armF, 'rgb(70,70,70)', wd * 0.8); limb(c, cx, cy, J.legF, 'rgb(84,84,84)', wd);
      limb(c, cx, cy, torso, 'rgb(150,150,150)', wd * 1.5); head('rgb(165,165,165)');
      limb(c, cx, cy, J.legN, 'rgb(205,205,205)', wd); limb(c, cx, cy, J.armN, 'rgb(235,235,235)', wd * 0.8);
    } else if (mode === 'matte') {
      const wd = L * 0.2;
      for (const pts of [J.armF, J.legF, J.legN, J.armN]) limb(c, cx, cy, pts, '#fff', wd);
      limb(c, cx, cy, torso, '#fff', wd * 1.5); head('#fff');
    } else {
      const j = (n) => 1 + (rnd(fr * 7.3 + n) - 0.5) * jit;
      const hue = Math.round(18 + (rnd(fr * 3.7) - 0.5) * 150 * jit);
      const jacket = `hsl(${hue},${Math.round(92 * j(1))}%,${Math.round(62 * j(2))}%)`;
      const jacketD = `hsl(${hue},70%,${Math.round(40 * j(3))}%)`;
      const wd = L * 0.2;
      limb(c, cx, cy, J.armF, jacketD, wd * 0.8 * j(4)); limb(c, cx, cy, J.legF, 'rgb(74,72,68)', wd * j(5));
      limb(c, cx, cy, torso, jacket, wd * 1.55 * j(6)); head(`rgb(${INK})`);
      limb(c, cx, cy, J.legN, 'rgb(118,114,106)', wd * j(7)); limb(c, cx, cy, J.armN, jacket, wd * 0.8 * j(8));
    }
  }
  function picture(c, R, p, t) {
    const b1 = ease(seg(p, 0.14, 0.34)), b2 = seg(p, 0.37, 0.6);
    const mA = seg(p, 0.62, 0.655) * (1 - seg(p, 0.845, 0.875));
    const wipe = ease(seg(p, 0.66, 0.82));
    const fr = Math.floor(t * (reduce ? 4 : 11));
    const phi = fr * 0.42;
    const stripH = Math.min(46, R.h * 0.13), areaH = R.h - stripH - 26;

    if (mA < 1) {
      c.globalAlpha = 1 - mA;
      const gap = R.wide ? 16 : 8, pw = (R.w - 2 * gap) / 3, ph = areaH - 18;
      const titles = ['POSE', 'DEPTH', b1 < 0.98 ? 'DENOISING' : 'OUTPUT'];
      for (let i = 0; i < 3; i++) {
        const x = R.x + i * (pw + gap), y = R.y + 6;
        label(c, titles[i], x, R.y - 6, i === 2 ? acc(0.95) : ink(0.55));
        c.save(); c.beginPath(); c.rect(x, y, pw, ph); c.clip();
        const L = Math.min(ph * 0.34, pw * 0.42), cx = x + pw / 2, cy = y + ph * 0.56, gy = cy + L * 1.02;
        if (i === 0) {
          c.fillStyle = '#0b0b0a'; c.fillRect(x, y, pw, ph);
          figure(c, cx, cy, L, phi, 'pose');
        } else if (i === 1) {
          const g = c.createLinearGradient(0, y, 0, y + ph); g.addColorStop(0, '#060606'); g.addColorStop(0.72, '#1c1c1c'); g.addColorStop(1, '#3a3a3a');
          c.fillStyle = g; c.fillRect(x, y, pw, ph);
          figure(c, cx, cy, L, phi, 'depth');
        } else {
          const g = c.createLinearGradient(0, y, 0, gy); g.addColorStop(0, '#141a22'); g.addColorStop(1, '#3b2f33');
          c.fillStyle = g; c.fillRect(x, y, pw, ph);
          c.fillStyle = 'rgba(255,196,140,0.85)'; c.beginPath(); c.arc(x + pw * 0.76, y + ph * 0.2, L * 0.2, 0, TAU); c.fill();
          c.fillStyle = '#17150f'; c.fillRect(x, gy, pw, y + ph - gy);
          c.fillStyle = 'rgba(236,232,222,0.16)';
          for (let k = 0; k < 6; k++) { const gx = x + ((k / 6 + 1 - ((t * 0.16) % 1)) % 1) * pw; c.fillRect(gx, gy + 8, pw * 0.07, 2); }
          figure(c, cx, cy, L, phi, 'out', (1 - b2) * (b1 > 0.6 ? 0.9 : 0), fr);
          const dots = Math.min(1600, Math.round((pw * ph) / 40 * (1 - b1)));
          for (let k = 0; k < dots; k++) {
            const v = Math.random();
            c.fillStyle = v > 0.92 ? acc(0.9) : `rgba(${INK},${0.25 + v * 0.7})`;
            c.fillRect(x + Math.random() * pw, y + Math.random() * ph, 2.2, 2.2);
          }
        }
        c.restore();
        c.strokeStyle = i === 2 ? acc(0.7) : ink(0.3); c.lineWidth = 1; c.strokeRect(x, y, pw, ph);
        if (i < 2) label(c, i === 0 ? '+' : '→', x + pw + gap / 2, y + ph / 2 + 4, ink(0.6), 12, 'center');
      }
    }
    if (mA > 0) {
      c.globalAlpha = mA;
      const x = R.x, y = R.y + 6, w = R.w, h = areaH - 18;
      const L = Math.min(h * 0.34, w * 0.2), cx = x + w / 2, cy = y + h * 0.56, wx = lerp(x + w, x, wipe);
      c.fillStyle = '#000'; c.fillRect(x, y, w, h);
      c.save(); c.beginPath(); c.rect(x, y, wx - x, h); c.clip();
      c.globalAlpha = mA * 0.18; figure(c, cx + 4, cy + 2, L * 1.16, phi, 'matte');
      c.globalAlpha = mA * 0.32; figure(c, cx + 2, cy + 1, L * 1.08, phi, 'matte');
      c.globalAlpha = mA; figure(c, cx, cy, L, phi, 'matte');
      c.restore();
      c.save(); c.beginPath(); c.rect(wx, y, x + w - wx, h); c.clip(); figure(c, cx, cy, L, phi, 'matte'); c.restore();
      c.strokeStyle = acc(1); c.lineWidth = 1.5; line(c, wx, y, wx, y + h);
      c.strokeStyle = ink(0.3); c.lineWidth = 1; c.strokeRect(x, y, w, h);
      label(c, 'RAW MASK', x, R.y - 6); label(c, 'REFINED EDGE', x + w, R.y - 6, acc(0.95), 10, 'right');
    }
    c.globalAlpha = 1;

    const sy = R.y + R.h - stripH, fw = stripH * 1.45, off = (t * 26) % fw;
    c.save(); c.beginPath(); c.rect(R.x, sy, R.w, stripH); c.clip();
    c.fillStyle = '#0d0d0c'; c.fillRect(R.x, sy, R.w, stripH);
    for (let x = R.x - off; x < R.x + R.w; x += fw) {
      c.strokeStyle = ink(0.22); c.lineWidth = 1; c.strokeRect(x + 4, sy + 9, fw - 8, stripH - 18);
      c.fillStyle = ink(0.3);
      for (let k = 0; k < 4; k++) { c.fillRect(x + 6 + k * (fw / 4), sy + 2.5, 5, 3.5); c.fillRect(x + 6 + k * (fw / 4), sy + stripH - 6, 5, 3.5); }
    }
    c.restore();
    c.strokeStyle = ink(0.3); c.strokeRect(R.x, sy, R.w, stripH);
    const shown = 1 + Math.round(b2 * 239);
    label(c, `FRAME ${String(shown).padStart(3, '0')} / 240`, R.x + R.w, sy - 8, b2 > 0 ? acc(0.95) : ink(0.5), 10, 'right');
    label(c, '24 FPS', R.x, sy - 8);
  }

  /* ═══════════ PROJECTS ═══════════ */

  /* 01 · Tiny Recursive Model: 700 dots, 1 dot = 1M parameters */
  function trm(c, R, p, t) {
    const s = ease(seg(p, 0.14, 0.42)), loop = ease(seg(p, 0.44, 0.62)), refine = seg(p, 0.5, 0.7), clock = ease(seg(p, 0.72, 0.92));
    const cols = R.wide ? 35 : 25, rows = 700 / cols;
    const cell = Math.min(R.w / cols, (R.h * 0.92) / rows);
    const gx = R.x + (R.w - cols * cell) / 2, gy = R.y + (R.h - rows * cell) / 2;
    const ccx = R.x + R.w / 2, ccy = R.y + R.h / 2, rad = Math.min(R.w, R.h) * 0.4;
    label(c, `${Math.round(lerp(700, 27, s))}M PARAMETERS · 1 DOT = 1M`, R.x, R.y - 12, s > 0.9 ? acc(0.95) : ink(0.55));

    if (loop > 0.3) {
      // the shared latent, refined once per trip around the loop
      c.globalAlpha = seg(loop, 0.3, 1);
      const iters = 1 + Math.floor(refine * 7.99), side = rad * 1.05;
      denoised(c, ccx - side / 2, ccy - side / 2, side, Math.min(1, iters / 8), refine < 1 ? t : 0);
      c.strokeStyle = ink(0.35); c.lineWidth = 1; c.strokeRect(ccx - side / 2, ccy - side / 2, side, side);
      label(c, `PASS ${iters} OF 8 · SAME BLOCK`, ccx, ccy + side / 2 + 18, ink(0.75), R.wide ? 10 : 8, 'center');
      c.strokeStyle = acc(0.3); c.beginPath(); c.arc(ccx, ccy, rad, 0, TAU); c.stroke();
      c.globalAlpha = 1;
    }
    const hot = Math.floor(((t * 0.5) % 1) * 27);
    for (let i = 0; i < 700; i++) {
      const x = gx + (i % cols) * cell + cell / 2, y = gy + Math.floor(i / cols) * cell + cell / 2;
      if (i % 26 === 0) {
        const k = i / 26, a = (k / 27) * TAU - Math.PI / 2;
        const px = lerp(x, ccx + Math.cos(a) * rad, loop), py = lerp(y, ccy + Math.sin(a) * rad, loop);
        c.fillStyle = s > 0.05 ? acc(1) : ink(0.8);
        c.beginPath(); c.arc(px, py, loop > 0.9 && k === hot ? 6 : lerp(1.6, 3.4, loop), 0, TAU); c.fill();
      } else {
        const d = rnd(i) * 0.7, f = seg(s, d, d + 0.3);
        if (f >= 1) continue;
        c.fillStyle = ink(0.8 * (1 - f));
        c.beginPath(); c.arc(x, y + f * f * 40, 1.6, 0, TAU); c.fill();
      }
    }
    if (clock > 0) {
      const r2 = rad + 16;
      c.strokeStyle = ink(0.14); c.lineWidth = 3; c.beginPath(); c.arc(ccx, ccy, r2, 0, TAU); c.stroke();
      c.strokeStyle = `rgb(${INK})`; c.beginPath(); c.arc(ccx, ccy, r2, -Math.PI / 2, -Math.PI / 2 + TAU * 0.75 * clock); c.stroke();
      c.lineWidth = 1;
      label(c, `${Math.round(18 * clock)} H · 1 × A100`, ccx, ccy - r2 - 10, ink(0.8), 10, 'center');
    }
  }

  /* 02 · Diffusion Transformer: three text encoders steer a stack of blocks */
  const PROMPT = 'a quiet sunset over the hills';
  function dit(c, R, p, t) {
    const b1 = ease(seg(p, 0.13, 0.4)), b2 = ease(seg(p, 0.42, 0.66)), b3 = ease(seg(p, 0.69, 0.92));
    const topH = R.h * 0.6;
    const encW = R.w * 0.2, bx = R.x + R.w * 0.32, bw = R.w * 0.17;
    const s = Math.min(R.w * 0.34, topH), ix = R.x + R.w - s, iy = R.y + (topH - s) / 2;
    const names = ['T5', 'GPT-NEO', 'CLIP'], cols = [1, 2, 4];

    label(c, 'TEXT ENCODERS', R.x, R.y - 12);
    const nb = 6, gap = 6, bh = (topH - (nb - 1) * gap) / nb;
    const hot = nb - 1 - (Math.floor(t * 4) % nb);
    for (let k = 0; k < nb; k++) {
      const y = R.y + k * (bh + gap), on = k === hot;
      if (on) { c.fillStyle = acc(0.12); c.fillRect(bx, y, bw, bh); }
      c.strokeStyle = on ? acc(0.95) : ink(0.4); c.lineWidth = 1; c.strokeRect(bx, y, bw, bh);
      label(c, (R.wide ? 'DiT BLOCK ' : 'B') + (nb - k), bx + 8, y + bh / 2 + 4, on ? acc(1) : ink(0.5), R.wide ? 10 : 8);
      if (b2 > 0) {
        c.globalAlpha = b2;
        c.strokeStyle = acc(0.8); line(c, bx + bw, y + bh / 2, bx + bw + 14, y + bh / 2);
        if (R.wide) label(c, 'γ β', bx + bw + 18, y + bh / 2 + 4, acc(0.9), 10);
        c.globalAlpha = 1;
      }
    }
    if (b2 > 0) {
      // the sinusoidal timestep embedding that feeds every block
      c.globalAlpha = b2;
      const wx = bx + bw + (R.wide ? 56 : 22);
      c.strokeStyle = acc(0.9); c.lineWidth = 1.5; c.beginPath();
      for (let k = 0; k <= 60; k++) { const v = k / 60; const x = wx + Math.sin(v * 14 + t * 3) * 5 + Math.sin(v * 5) * 4; k ? c.lineTo(x, R.y + v * topH) : c.moveTo(x, R.y + v * topH); }
      c.stroke(); c.lineWidth = 1;
      label(c, 't', wx - 3, R.y - 10, acc(1), 11);
      c.globalAlpha = 1;
    }
    names.forEach((n, i) => {
      const ey = R.y + topH * (0.18 + i * 0.32), eh = Math.min(34, topH * 0.16);
      c.fillStyle = tint(cols[i], 0.14); c.fillRect(R.x, ey - eh / 2, encW, eh);
      c.strokeStyle = tint(cols[i], 0.9); c.strokeRect(R.x, ey - eh / 2, encW, eh);
      label(c, n, R.x + 8, ey + 4, tint(cols[i], 1), R.wide ? 11 : 8);
      for (let k = 0; k < 7; k++) {
        const u = (t * 0.45 + k / 7 + i * 0.11) % 1;
        const ty = R.y + topH * ((k * 0.37 + i * 0.21) % 1);
        c.fillStyle = tint(cols[i], 0.95 * (1 - u * 0.5));
        c.fillRect(lerp(R.x + encW, bx, u) - 2, lerp(ey, ty, u * u) - 2, 4, 4);
      }
    });
    c.strokeStyle = ink(0.3); line(c, bx + bw + (R.wide ? 72 : 32), R.y + topH / 2, ix - 8, R.y + topH / 2);
    label(c, b1 < 0.98 ? `STEP ${String(Math.round(b1 * 50)).padStart(2, '0')} / 50` : 'DECODED · DC-AE', ix, iy - 8, b1 >= 0.98 ? acc(0.95) : ink(0.55), R.wide ? 10 : 8);
    denoised(c, ix, iy, s, b1, b1 < 1 ? t : 0);
    c.strokeStyle = acc(0.6); c.strokeRect(ix, iy, s, s);

    const py = R.y + topH + 34;
    const aA = 1 - seg(p, 0.4, 0.43), aB = seg(p, 0.42, 0.45) * (1 - seg(p, 0.67, 0.7)), aC = seg(p, 0.69, 0.72);
    if (aA > 0) {
      c.globalAlpha = aA;
      label(c, 'PROMPT', R.x, py);
      const n = Math.round(seg(p, 0.12, 0.26) * PROMPT.length);
      c.font = `italic 400 ${R.wide ? 28 : 19}px ${SERIF}`; c.fillStyle = ink(0.95); c.textAlign = 'left';
      c.fillText('“' + PROMPT.slice(0, n) + (n >= PROMPT.length ? '”' : Math.sin(t * 8) > 0 ? '|' : ''), R.x, py + 36);
    }
    if (aB > 0) {
      c.globalAlpha = aB;
      label(c, 'TIME CONDITIONING · COMPUTE', R.x, py);
      c.fillStyle = ink(0.3); c.fillRect(R.x, py + 14, R.w, 12);
      label(c, 'CROSS-ATTENTION · 100%', R.x, py + 42, ink(0.55));
      c.fillStyle = acc(1); c.fillRect(R.x, py + 56, R.w * lerp(1, 0.3, b2), 12);
      label(c, `FiLM · SCALE & SHIFT · ${Math.round(lerp(100, 30, b2))}%`, R.x, py + 84, acc(1));
    }
    if (aC > 0) {
      c.globalAlpha = aC;
      label(c, b3 < 0.9 ? 'LOSS TERMS' : 'HYBRID LOSS', R.x, py, b3 < 0.9 ? ink(0.55) : acc(1));
      const terms = ['DENOISING', 'PERCEPTUAL', 'INCEPTION'], ws = [0.5, 0.3, 0.2];
      let cum = 0;
      terms.forEach((n, i) => {
        const x = lerp(R.x + i * (R.w / 3), R.x + cum * R.w, b3), w = lerp(R.w / 3 - 12, ws[i] * R.w - 2, b3);
        c.fillStyle = tint(cols[i], 0.85); c.fillRect(x, py + 14, w, 16);
        c.globalAlpha = aC * (1 - b3 * 0.6);
        label(c, n, x, py + 48, tint(cols[i], 1), R.wide ? 10 : 8);
        c.globalAlpha = aC;
        cum += ws[i];
      });
    }
    c.globalAlpha = 1;
  }

  /* 03 · Hybrid VQ-VAE: an image becomes tokens, then tokens are written straight from text */
  function vq(c, R, p, t) {
    const b1 = ease(seg(p, 0.13, 0.38)), b2 = seg(p, 0.45, 0.66), b3 = ease(seg(p, 0.72, 0.92));
    const topH = R.h * 0.58;
    const s = Math.min((R.w - (R.wide ? 120 : 40)) / 3, topH * 0.86);
    const gap = (R.w - 3 * s) / 2, y = R.y + (topH - s) / 2, n = 12, cs = s / n;
    const X = [R.x, R.x + s + gap, R.x + 2 * (s + gap)];
    const genA = seg(p, 0.4, 0.44);
    const written = Math.floor(b2 * 144);
    const cur = genA > 0.5 ? Math.min(143, written) : Math.floor(t * 3) % 144;

    c.globalAlpha = 1 - genA;
    label(c, 'IMAGE', X[0], y - 8);
    if (genA < 1) denoised(c, X[0], y, s, 1, 0);
    c.globalAlpha = genA;
    if (genA > 0) {
      label(c, 'PROMPT', X[0], y - 8, acc(0.95));
      c.strokeStyle = ink(0.3); c.strokeRect(X[0], y, s, s);
      c.font = `italic 400 ${Math.max(15, s * 0.12)}px ${SERIF}`; c.fillStyle = ink(0.95); c.textAlign = 'left';
      ['a quiet', 'sunset over', 'the hills'].forEach((w, i) => c.fillText(w, X[0] + 12, y + s * 0.28 + i * s * 0.16));
      for (let k = 0; k < 8; k++) { c.fillStyle = acc(0.25 + 0.6 * rnd(k)); c.fillRect(X[0] + 12 + k * (s - 24) / 8, y + s * 0.82, (s - 24) / 8 - 3, 6); }
    }
    c.globalAlpha = 1;

    label(c, genA < 0.5 ? 'TOKENS' : `WRITING · ${Math.min(144, written)} / 144`, X[1], y - 8, genA < 0.5 ? ink(0.55) : acc(0.95));
    for (let i = 0; i < n * n; i++) {
      const x = X[1] + (i % n) * cs, yy = y + Math.floor(i / n) * cs;
      let col = null;
      if (genA < 0.5) col = mix(SKY12[i], CODEBOOK[CODE12[i]], b1);
      else if (i < written) col = CODEBOOK[CODE12[i]];
      if (col) { c.fillStyle = rgb(col); c.fillRect(x, yy, cs - 1, cs - 1); }
      else { c.strokeStyle = ink(0.14); c.strokeRect(x + 0.5, yy + 0.5, cs - 2, cs - 2); }
      if (cs > 17 && col && (genA > 0.5 || b1 > 0.6)) label(c, String(CODE12[i]), x + cs / 2, yy + cs / 2 + 3, 'rgba(0,0,0,0.55)', 8, 'center');
    }
    const cx = X[1] + (cur % n) * cs, cyy = y + Math.floor(cur / n) * cs;
    if (b1 > 0.2 || genA > 0.5) { c.strokeStyle = acc(Math.sin(t * 10) > 0 ? 1 : 0.45); c.lineWidth = 2; c.strokeRect(cx, cyy, cs - 1, cs - 1); c.lineWidth = 1; }

    label(c, 'DECODED', X[2], y - 8);
    c.strokeStyle = ink(0.3); c.strokeRect(X[2], y, s, s);
    const rowsDone = genA < 0.5 ? (b1 > 0.5 ? 12 : 0) : Math.floor(written / 12);
    if (rowsDone) {
      c.save(); c.beginPath(); c.rect(X[2], y, s, rowsDone * cs); c.clip();
      c.globalAlpha = genA < 0.5 ? seg(b1, 0.5, 1) : 1;
      denoised(c, X[2], y, s, 1, 0);
      c.restore(); c.globalAlpha = 1;
    }
    const mid = y + s / 2;
    label(c, genA < 0.5 ? 'ENC →' : 'GPT →', X[0] + s + gap / 2, mid + 4, ink(0.65), R.wide ? 10 : 7, 'center');
    label(c, 'DEC →', X[1] + s + gap / 2, mid + 4, ink(0.65), R.wide ? 10 : 7, 'center');

    const py = R.y + topH + 30, ph = R.h - topH - 30;
    const aC = seg(p, 0.69, 0.72);
    if (aC < 1) {
      c.globalAlpha = 1 - aC;
      label(c, 'CODEBOOK · SIMPLIFIED', R.x, py);
      const sw = Math.min(30, (R.w - 15 * 5) / 16), code = CODE12[cur];
      CODEBOOK.forEach((q, k) => {
        const x = R.x + k * (sw + 5);
        c.fillStyle = rgb(q); c.fillRect(x, py + 14, sw, sw);
        if (k === code) { c.strokeStyle = acc(1); c.lineWidth = 2; c.strokeRect(x - 2, py + 12, sw + 4, sw + 4); c.lineWidth = 1; }
      });
      const sx = R.x + code * (sw + 5) + sw / 2;
      c.strokeStyle = acc(0.5); c.setLineDash([3, 4]); line(c, cx + cs / 2, cyy + cs, sx, py + 10); c.setLineDash([]);
      if (genA > 0.5) label(c, 'ONE PASS · NO DENOISING LOOP', R.x, py + sw + 36, acc(0.9));
    }
    if (aC > 0) {
      c.globalAlpha = aC;
      label(c, 'GATED ATTENTION · CAUSAL', R.x, py);
      const m = 12, ms = Math.min((ph - 20) / m, 13), mx = R.x + 54;
      for (let i = 0; i < m; i++) {
        const g = lerp(1, 0.12 + 0.88 * (0.5 + 0.5 * Math.sin(t * 1.4 + i * 0.9)), b3);
        c.fillStyle = ink(0.15); c.fillRect(R.x, py + 14 + i * ms, 40, ms - 2);
        c.fillStyle = acc(0.9); c.fillRect(R.x, py + 14 + i * ms, 40 * g, ms - 2);
        for (let j = 0; j <= i; j++) {
          const w = Math.exp(-(i - j) * 0.35) * (0.35 + 0.65 * rnd(i * 12 + j));
          c.fillStyle = acc(clamp(w * g)); c.fillRect(mx + j * ms, py + 14 + i * ms, ms - 2, ms - 2);
        }
      }
      label(c, '← gates', mx + m * ms + 10, py + 14 + ms * 2, ink(0.5), 9);
    }
    c.globalAlpha = 1;
  }

  /* 04 · Self-driving motion prediction: a top-down intersection */
  const bez = (a, m, b, u) => { const v = 1 - u; return [v * v * a[0] + 2 * v * u * m[0] + u * u * b[0], v * v * a[1] + 2 * v * u * m[1] + u * u * b[1]]; };
  const AGENTS = [
    { at: [0.27, 0.545], from: [-0.02, 0.545], focal: true,
      modes: [
        { m: [0.53, 0.55], e: [0.555, 0.22], p: 0.41 }, { m: [0.45, 0.545], e: [0.7, 0.545], p: 0.22 },
        { m: [0.55, 0.545], e: [0.86, 0.545], p: 0.13 }, { m: [0.31, 0.545], e: [0.37, 0.545], p: 0.11 },
        { m: [0.455, 0.55], e: [0.455, 0.84], p: 0.09 }, { m: [0.5, 0.545], e: [0.74, 0.5], p: 0.04 },
      ],
      base: { m: [0.47, 0.62], e: [0.62, 0.32] }, gt: { m: [0.545, 0.545], e: [0.545, 0.16] } },
    { at: [0.455, 0.2], from: [0.455, -0.02], modes: [{ m: [0.455, 0.45], e: [0.455, 0.72], p: 0.6 }, { m: [0.455, 0.3], e: [0.455, 0.34], p: 0.4 }] },
    { at: [0.8, 0.455], from: [1.02, 0.455], modes: [{ m: [0.6, 0.455], e: [0.36, 0.455], p: 0.55 }, { m: [0.545, 0.455], e: [0.545, 0.2], p: 0.45 }] },
    { at: [0.545, 0.83], from: [0.545, 1.02], modes: [{ m: [0.545, 0.68], e: [0.545, 0.5], p: 0.7 }, { m: [0.545, 0.76], e: [0.545, 0.74], p: 0.3 }] },
  ];
  function drive(c, R, p, t) {
    const h1 = ease(seg(p, 0.12, 0.3)), b2 = ease(seg(p, 0.4, 0.6)), attn = seg(p, 0.42, 0.5) * (1 - seg(p, 0.64, 0.7));
    const b3 = ease(seg(p, 0.68, 0.8)), fix = ease(seg(p, 0.8, 0.94));
    const ms = Math.min(R.w, R.h), mx = R.x + (R.w - ms) / 2, my = R.y + (R.h - ms) / 2;
    const P = (q) => [mx + q[0] * ms, my + q[1] * ms];
    const lerpMode = (a, b, k) => ({ m: [lerp(a.m[0], b.m[0], k), lerp(a.m[1], b.m[1], k)], e: [lerp(a.e[0], b.e[0], k), lerp(a.e[1], b.e[1], k)] });

    c.save(); c.beginPath(); c.rect(mx, my, ms, ms); c.clip();
    c.fillStyle = 'rgba(236,232,222,0.025)'; c.fillRect(mx, my, ms, ms);
    c.fillStyle = ink(0.07);
    c.fillRect(mx, my + 0.42 * ms, ms, 0.16 * ms); c.fillRect(mx + 0.42 * ms, my, 0.16 * ms, ms);
    c.strokeStyle = ink(0.2); c.lineWidth = 1;
    for (const v of [0.42, 0.58]) {
      line(c, mx, my + v * ms, mx + 0.42 * ms, my + v * ms); line(c, mx + 0.58 * ms, my + v * ms, mx + ms, my + v * ms);
      line(c, mx + v * ms, my, mx + v * ms, my + 0.42 * ms); line(c, mx + v * ms, my + 0.58 * ms, mx + v * ms, my + ms);
    }
    c.setLineDash([8, 9]); c.strokeStyle = ink(0.3);
    line(c, mx, my + 0.5 * ms, mx + 0.4 * ms, my + 0.5 * ms); line(c, mx + 0.6 * ms, my + 0.5 * ms, mx + ms, my + 0.5 * ms);
    line(c, mx + 0.5 * ms, my, mx + 0.5 * ms, my + 0.4 * ms); line(c, mx + 0.5 * ms, my + 0.6 * ms, mx + 0.5 * ms, my + ms);
    c.setLineDash([]);
    c.fillStyle = ink(0.16);
    for (let k = 0; k < 6; k++) {
      const o = 0.43 + k * 0.026;
      c.fillRect(mx + 0.37 * ms, my + o * ms, 0.03 * ms, 0.012 * ms); c.fillRect(mx + 0.6 * ms, my + o * ms, 0.03 * ms, 0.012 * ms);
      c.fillRect(mx + o * ms, my + 0.37 * ms, 0.012 * ms, 0.03 * ms); c.fillRect(mx + o * ms, my + 0.6 * ms, 0.012 * ms, 0.03 * ms);
    }

    const curve = (a, md, col, wd, frac, dash) => {
      c.strokeStyle = col; c.lineWidth = wd; c.setLineDash(dash || []); c.lineDashOffset = -t * 24;
      c.beginPath();
      const steps = Math.max(1, Math.round(24 * frac));
      for (let k = 0; k <= steps; k++) { const q = P(bez(a, md.m, md.e, (k / steps) * frac)); k ? c.lineTo(q[0], q[1]) : c.moveTo(q[0], q[1]); }
      c.stroke(); c.setLineDash([]); c.lineWidth = 1;
    };

    for (const a of AGENTS) {
      if (h1 > 0) {
        for (let k = 0; k < 14; k++) {
          const u = k / 13; if (u > h1) break;
          const q = P([lerp(a.from[0], a.at[0], u), lerp(a.from[1], a.at[1], u)]);
          c.fillStyle = a.focal ? acc(0.15 + 0.6 * u) : ink(0.1 + 0.5 * u);
          c.beginPath(); c.arc(q[0], q[1], 2, 0, TAU); c.fill();
        }
      }
      if (b2 > 0) {
        a.modes.forEach((md, k) => {
          const top = a.focal && k === 0;
          const mm = top ? lerpMode(a.base, md, fix) : md;
          curve(a.at, mm, top ? acc(0.95) : a.focal ? ink(0.25 + md.p) : ink(0.22), top ? 2.5 : 1.2, b2, top ? [] : [4, 5]);
          if (b2 > 0.95) {
            const e = P(mm.e);
            c.fillStyle = top ? acc(1) : ink(a.focal ? 0.6 : 0.3); c.beginPath(); c.arc(e[0], e[1], top ? 3.5 : 2, 0, TAU); c.fill();
            if (a.focal && R.wide && k < 3) label(c, `p=${md.p.toFixed(2)}`, e[0] + 8, e[1] - 6, top ? acc(1) : ink(0.55), 9);
          }
        });
      }
      const q = P(a.at), dir = Math.atan2(a.at[1] - a.from[1], a.at[0] - a.from[0]);
      c.save(); c.translate(q[0], q[1]); c.rotate(dir);
      c.fillStyle = a.focal ? acc(1) : ink(0.85);
      c.fillRect(-ms * 0.028, -ms * 0.014, ms * 0.056, ms * 0.028);
      c.fillStyle = BG; c.fillRect(ms * 0.006, -ms * 0.01, ms * 0.012, ms * 0.02);
      c.restore();
    }

    if (attn > 0) {
      const f = P(AGENTS[0].at);
      c.globalAlpha = attn * (0.6 + 0.4 * Math.sin(t * 5));
      AGENTS.slice(1).forEach((a, i) => { const q = P(a.at); c.strokeStyle = tint(2 + i, 0.9); c.setLineDash([2, 4]); line(c, f[0], f[1], q[0], q[1]); });
      for (const node of [[0.42, 0.545], [0.545, 0.42], [0.545, 0.3], [0.62, 0.545]]) {
        const q = P(node); c.setLineDash([]); c.strokeStyle = acc(0.9); c.beginPath(); c.arc(q[0], q[1], 5, 0, TAU); c.stroke();
        c.setLineDash([1, 3]); line(c, f[0], f[1], q[0], q[1]);
      }
      c.setLineDash([]); c.globalAlpha = 1;
    }
    if (b3 > 0) {
      const A = AGENTS[0], mm = lerpMode(A.base, A.modes[0], fix);
      curve(A.at, A.gt, ink(0.95), 2, b3);
      c.strokeStyle = `rgba(${RED},0.9)`;
      for (let k = 1; k <= 8; k++) {
        const u = k / 8; if (u > b3) break;
        const g = P(bez(A.at, A.gt.m, A.gt.e, u)), q = P(bez(A.at, mm.m, mm.e, u));
        line(c, g[0], g[1], q[0], q[1]);
      }
    }
    c.restore();
    c.strokeStyle = ink(0.25); c.strokeRect(mx, my, ms, ms);
    label(c, 'SCENE · TOP-DOWN', mx, my - 12);
    if (b3 > 0) {
      c.globalAlpha = b3;
      label(c, '— ground truth', mx + ms, my - 26, ink(0.9), 10, 'right');
      label(c, '— error to best guess', mx + ms, my - 12, `rgba(${RED},1)`, 10, 'right');
      c.globalAlpha = 1;
    } else if (b2 > 0.5) label(c, attn > 0.3 ? 'ATTENDING TO AGENTS + MAP' : 'MULTIMODAL FUTURES', mx + ms, my - 12, acc(0.9), 10, 'right');
    else label(c, 'OBSERVED PAST', mx + ms, my - 12, ink(0.55), 10, 'right');
  }

  /* 05 · Video generation on Flowing MNIST */
  const VC = document.createElement('canvas'); VC.width = VC.height = 32;
  const vctx = VC.getContext('2d');
  const LO = document.createElement('canvas'); LO.width = LO.height = 32;
  const lctx = LO.getContext('2d');
  const bounce = (v, span) => { const m = ((v % (2 * span)) + 2 * span) % (2 * span); return m < span ? m : 2 * span - m; };
  function digits(f) {
    vctx.fillStyle = '#000'; vctx.fillRect(0, 0, 32, 32);
    vctx.fillStyle = '#fff'; vctx.font = `700 15px ${MONO}`; vctx.textBaseline = 'top'; vctx.textAlign = 'left';
    vctx.fillText('7', bounce(3 + f * 1.4, 22), bounce(2 + f * 0.9, 16));
    vctx.fillText('3', bounce(60 - f * 1.1, 22), bounce(12 + f * 0.7, 16));
  }
  function vframe(c, f, x, y, s, method, k) {
    digits(f);
    c.save();
    if (method === 0 && k > 0) {
      const q = Math.round(lerp(32, 9, k));
      lctx.clearRect(0, 0, 32, 32); lctx.imageSmoothingEnabled = true; lctx.drawImage(VC, 0, 0, q, q);
      c.fillStyle = '#000'; c.fillRect(x, y, s, s);
      c.imageSmoothingEnabled = true; c.globalAlpha *= lerp(1, 0.6, k);
      c.drawImage(LO, 0, 0, q, q, x, y, s, s);
    } else if (method === 1) {
      c.imageSmoothingEnabled = false;
      const pn = 4, ps = s / pn, src = 32 / pn;
      for (let i = 0; i < pn * pn; i++) {
        const px = i % pn, pyy = Math.floor(i / pn);
        const j = (rnd(f * 16 + i) - 0.5) * s * 0.035 * k;
        c.drawImage(VC, px * src, pyy * src, src, src, x + px * ps + j, y + pyy * ps - j, ps, ps);
      }
      c.strokeStyle = acc(0.3); c.lineWidth = 1;
      for (let i = 1; i < pn; i++) { line(c, x + i * ps, y, x + i * ps, y + s); line(c, x, y + i * ps, x + s, y + i * ps); }
    } else {
      c.imageSmoothingEnabled = false; c.drawImage(VC, x, y, s, s);
      if (method === 2) { c.fillStyle = acc(0.55); for (let i = 0; i < 64; i++) c.fillRect(x + (i % 8 + 0.5) * s / 8 - 1, y + (Math.floor(i / 8) + 0.5) * s / 8 - 1, 2, 2); }
    }
    c.restore();
    c.strokeStyle = ink(0.25); c.lineWidth = 1; c.strokeRect(x, y, s, s);
  }
  function video(c, R, p, t) {
    const method = p < 0.415 ? 0 : p < 0.675 ? 1 : 2;
    const reveal = seg(p, 0.12, 0.3);
    const gap = R.wide ? 8 : 4, fs = Math.min((R.w - 7 * gap) / 8, R.h * 0.24);
    const f0 = Math.floor(t * 5);
    label(c, 'OBSERVED', R.x, R.y - 10);
    label(c, 'PREDICTED', R.x + 4 * (fs + gap), R.y - 10, acc(0.95));
    for (let i = 0; i < 8; i++) {
      const pred = i >= 4;
      c.globalAlpha = pred ? reveal : 1;
      vframe(c, f0 + i, R.x + i * (fs + gap), R.y, fs, pred ? method : -1, pred ? (i - 3) / 4 : 0);
    }
    c.globalAlpha = 1;
    const by = R.y + fs + 44, bs = Math.min(R.h - fs - 44, R.w * 0.42);
    label(c, 'PLAYBACK · PREDICTED', R.x, by - 10);
    vframe(c, Math.floor(t * 8), R.x, by, bs, method, 0.75);
    const lx = R.x + bs + (R.wide ? 40 : 16), names = ['CONVLSTM', 'VIT + VGG LOSS', 'VQ-VAE'], sharp = [0.35, 0.68, 0.95];
    const notes = ['baseline · blurs as it goes', 'patches · sharper edges', 'discrete latents · consistent'];
    const w = (R.x + R.w - lx) * 0.9;
    names.forEach((n, i) => {
      const y = by + 10 + i * (bs / 3), on = i === method, done = i < method;
      c.globalAlpha = on ? 1 : done ? 0.55 : 0.22;
      label(c, (done ? '✓ ' : on ? '▸ ' : '  ') + n, lx, y + 6, on ? acc(1) : ink(0.9), R.wide ? 12 : 9);
      if (R.wide) label(c, notes[i], lx, y + 24, ink(0.55), 10);
      const by2 = y + (R.wide ? 34 : 14);
      c.fillStyle = ink(0.15); c.fillRect(lx, by2, w, 4);
      c.fillStyle = on ? acc(1) : ink(0.7); c.fillRect(lx, by2, w * sharp[i], 4);
    });
    c.globalAlpha = 1;
    if (R.wide) label(c, 'sharpness ↑', lx + w, by - 10, ink(0.4), 9, 'right');
  }

  /* 06 · AWS EC2 benchmarking */
  const TESTS = Array.from({ length: 12 }, (_, i) => 0.5 + rnd(i * 4.3));
  const LANES = (() => {
    const lanes = [[], [], [], []], ends = [0, 0, 0, 0];
    TESTS.forEach((d, i) => { const l = ends.indexOf(Math.min(...ends)); lanes[l].push([ends[l], d, i]); ends[l] += d; });
    return { lanes, max: Math.max(...ends) };
  })();
  const TOTAL = TESTS.reduce((a, b) => a + b, 0);
  function bench(c, R, p, t) {
    const b1 = ease(seg(p, 0.13, 0.38)), b2 = seg(p, 0.44, 0.66), b3 = ease(seg(p, 0.71, 0.92));
    const topH = R.h * 0.46, types = ['TYPE A', 'TYPE B', 'TYPE C', 'TYPE D'], metrics = ['CPU', 'MEMORY', 'I/O'], mc = [0, 2, 1];
    const gw = R.w / 4, bw = gw * 0.18;
    label(c, 'PROFILE PER INSTANCE TYPE', R.x, R.y - 12);
    metrics.forEach((m, k) => label(c, '■ ' + m, R.x + R.w - (3 - k) * (R.wide ? 82 : 58), R.y - 12, tint(mc[k], 1), R.wide ? 10 : 8));
    c.strokeStyle = ink(0.25); c.lineWidth = 1; line(c, R.x, R.y + topH, R.x + R.w, R.y + topH);
    types.forEach((ty, g) => {
      for (let k = 0; k < 3; k++) {
        const v = (0.3 + 0.62 * rnd(g * 3 + k + 1)) * (1 + 0.025 * Math.sin(t * 6 + g + k));
        const h = v * (topH - 10) * seg(b1, k * 0.15, 0.7 + k * 0.15);
        c.fillStyle = tint(mc[k], 0.85);
        c.fillRect(R.x + g * gw + gw * 0.2 + k * (bw + 4), R.y + topH - h, bw, h);
      }
      label(c, ty, R.x + g * gw + gw * 0.2, R.y + topH + 16, ink(0.6), R.wide ? 10 : 8);
    });

    const py = R.y + topH + 46, ph = R.h - topH - 46;
    const aC = seg(p, 0.69, 0.72);
    if (aC < 1) {
      c.globalAlpha = (1 - aC) * (0.25 + 0.75 * seg(p, 0.4, 0.46));
      label(c, 'TEST SCHEDULE', R.x, py);
      const sc = R.w / TOTAL, rowH = Math.min(12, (ph - 40) / 6);
      let x = R.x;
      label(c, 'SERIAL · 100%', R.x + R.w, py, ink(0.55), 9, 'right');
      TESTS.forEach((d, i) => { c.fillStyle = ink(0.2 + 0.25 * (i % 2)); c.fillRect(x, py + 10, d * sc - 2, rowH); x += d * sc; });
      const scale = (R.w * 0.75) / LANES.max;
      LANES.lanes.forEach((lane, l) => lane.forEach(([s0, d, i]) => {
        c.fillStyle = acc(0.35 + 0.4 * (i % 2)); c.fillRect(R.x + s0 * scale, py + 10 + (l + 1.6) * (rowH + 3), d * scale - 2, rowH);
      }));
      const end = R.x + R.w * 0.75, bottom = py + 10 + 5.6 * (rowH + 3);
      c.strokeStyle = acc(0.9); c.setLineDash([3, 3]); line(c, end, py + 6, end, bottom); c.setLineDash([]);
      label(c, 'PARALLEL · −25%', end + 8, py + 10 + 4 * (rowH + 3), acc(1), R.wide ? 10 : 8);
      const head = R.x + R.w * b2;
      c.strokeStyle = ink(0.9); line(c, head, py + 6, head, bottom);
    }
    if (aC > 0) {
      c.globalAlpha = aC;
      label(c, 'CONTEXT-SWITCH LATENCY →', R.x, py);
      const base = py + ph - 6, hgt = ph - 30;
      c.strokeStyle = ink(0.25); line(c, R.x, base, R.x + R.w, base);
      types.forEach((ty, g) => {
        const mu = 0.2 + g * 0.18 + 0.03 * Math.sin(g * 5), sg = 0.06 + 0.02 * g, amp = hgt * b3 * (0.6 + 0.4 * (1 - g / 4));
        c.beginPath(); c.moveTo(R.x, base);
        for (let k = 0; k <= 80; k++) { const u = k / 80; c.lineTo(R.x + u * R.w, base - Math.exp(-((u - mu) ** 2) / (2 * sg * sg)) * amp); }
        c.lineTo(R.x + R.w, base); c.closePath();
        c.fillStyle = tint(g + 2, 0.15); c.fill(); c.strokeStyle = tint(g + 2, 0.9); c.stroke();
        if (b3 > 0.3) label(c, ty, R.x + mu * R.w, base - amp - 8, tint(g + 2, 1), 9, 'center');
      });
    }
    c.globalAlpha = 1;
  }

  /* Act I · Tiposi: detecting stroke from the radio signals of an antenna helmet */
  const MRI_N = 28;
  const MRIG = [];
  for (let j = 0; j < MRI_N; j++) for (let i = 0; i < MRI_N; i++) {
    const u = (i + 0.5) / MRI_N, v = (j + 0.5) / MRI_N;
    const d = ((u - 0.5) / 0.4) ** 2 + ((v - 0.5) / 0.46) ** 2;
    let g = 0;
    if (d <= 1.18 && d > 1) g = 70;
    else if (d <= 1) {
      g = 108 + 36 * Math.sin(u * 34 + Math.sin(v * 13) * 2.2) * Math.sin(v * 27 + u * 3);
      const vent = Math.min(((u - 0.45) / 0.05) ** 2 + ((v - 0.48) / 0.12) ** 2, ((u - 0.55) / 0.05) ** 2 + ((v - 0.48) / 0.12) ** 2);
      if (vent < 1) g = 26;
      if (Math.hypot(u - 0.66, v - 0.4) < 0.075) g = 240;
    }
    MRIG.push(g);
  }
  const MRIS = MRIG.map((g) => `rgb(${g | 0},${g | 0},${g | 0})`);
  const MRI_IMG = new Image();
  MRI_IMG.src = (window.CANVAS_IMG && CANVAS_IMG['img/brain-mri.jpg']) || 'img/brain-mri.jpg';
  const MQ = document.createElement('canvas'), mq = MQ.getContext('2d');
  const NOISE = document.createElement('canvas'); NOISE.width = NOISE.height = 96;
  (() => { const n = NOISE.getContext('2d'), d = n.createImageData(96, 96); for (let i = 0; i < d.data.length; i += 4) { const g = Math.random() * 255; d.data[i] = d.data[i + 1] = d.data[i + 2] = g; d.data[i + 3] = 255; } n.putImageData(d, 0, 0); })();
  function mriSlice(c, x, y, s, k, t) {
    if (!MRI_IMG.complete || !MRI_IMG.naturalWidth) {
      const n = MRI_N, cs = s / n;
      for (let i = 0; i < n * n; i++) { c.fillStyle = MRIS[i]; c.fillRect(x + (i % n) * cs, y + Math.floor(i / n) * cs, cs + 0.6, cs + 0.6); }
      return;
    }
    // the slice resolves the way a decoder would: noise, then coarse blocks, then full detail
    const q = Math.max(6, Math.round(lerp(6, 260, k * k)));
    if (MQ.width !== q) { MQ.width = MQ.height = q; }
    mq.imageSmoothingEnabled = true; mq.drawImage(MRI_IMG, 0, 0, q, q);
    c.save();
    c.imageSmoothingEnabled = k > 0.96;
    c.drawImage(MQ, 0, 0, q, q, x, y, s, s);
    if (k < 1) {
      c.globalAlpha *= (1 - k) * 0.9;
      c.imageSmoothingEnabled = false;
      const ox = (Math.floor(t * 12) * 37) % 48, oy = (Math.floor(t * 12) * 53) % 48;
      c.drawImage(NOISE, ox, oy, 48, 48, x, y, s, s);
    }
    c.restore();
  }
  const segDist = (px, py, ax, ay, bx, by) => {
    const dx = bx - ax, dy = by - ay, u = clamp(((px - ax) * dx + (py - ay) * dy) / (dx * dx + dy * dy));
    return Math.hypot(px - ax - u * dx, py - ay - u * dy);
  };
  function rf(c, R, p, t) {
    const b2 = ease(seg(p, 0.33, 0.5)), b3 = ease(seg(p, 0.56, 0.66)), b3b = ease(seg(p, 0.64, 0.74)), b4 = ease(seg(p, 0.79, 0.93));
    const r = Math.min(R.w * 0.22, R.h * 0.4), hx = R.x + r * 1.35, hy = R.y + R.h * 0.47;
    const rx = r * 0.8, ry = r;
    const mriA = seg(p, 0.75, 0.79);
    const small = R.wide ? 10 : 8;
    label(c, mriA > 0.5 ? 'GOAL: A BRAIN MRI FROM RF' : 'HELMET · TOP VIEW', R.x, R.y - 12, mriA > 0.5 ? acc(0.95) : ink(0.55), small);

    const ants = [];
    for (let i = 0; i < 16; i++) { const a = (i / 16) * TAU - Math.PI / 2; ants.push([hx + Math.cos(a) * rx * 1.25, hy + Math.sin(a) * ry * 1.17]); }
    const lx = hx + rx * 0.36, ly = hy - ry * 0.18, lr = r * 0.17;
    if (mriA < 1) {
      c.globalAlpha = 1 - mriA;
      c.fillStyle = ink(0.05); c.strokeStyle = ink(0.45); c.lineWidth = 1.5;
      c.beginPath(); c.ellipse(hx, hy, rx, ry, 0, 0, TAU); c.fill(); c.stroke();
      c.beginPath(); c.moveTo(hx - r * 0.1, hy - ry * 0.98); c.lineTo(hx, hy - ry * 1.12); c.lineTo(hx + r * 0.1, hy - ry * 0.98); c.stroke();
      c.lineWidth = 1; c.strokeStyle = ink(0.12); line(c, hx, hy - ry * 0.9, hx, hy + ry * 0.9);
      if (b2 > 0) {
        const g = c.createRadialGradient(lx, ly, 0, lx, ly, lr * 1.4);
        g.addColorStop(0, `rgba(${RED},${0.85 * b2})`); g.addColorStop(1, `rgba(${RED},0)`);
        c.fillStyle = g; c.beginPath(); c.arc(lx, ly, lr * 1.4, 0, TAU); c.fill();
        label(c, 'STROKE', lx, ly - lr * 1.5, `rgba(${RED},${b2})`, small, 'center');
      }
      const tx = Math.floor(t * 1.4) % 16, ph = (t * 1.4) % 1;
      for (let k = 0; k < 16; k++) {
        if (k === tx) continue;
        const [ax, ay] = ants[tx], [bx, by] = ants[k];
        const hit = b2 > 0 && segDist(lx, ly, ax, ay, bx, by) < lr;
        c.strokeStyle = hit ? `rgba(${RED},${0.2 + 0.6 * b2})` : ink(0.13);
        line(c, ax, ay, bx, by);
        c.fillStyle = hit ? `rgba(${RED},1)` : acc(0.9);
        c.beginPath(); c.arc(lerp(ax, bx, ph), lerp(ay, by, ph), 2.2, 0, TAU); c.fill();
      }
      ants.forEach(([x, y], k) => {
        c.fillStyle = k === tx ? acc(1) : BG; c.strokeStyle = k === tx ? acc(1) : ink(0.8);
        c.beginPath(); c.arc(x, y, R.wide ? 5 : 3.5, 0, TAU); c.fill(); c.stroke();
      });
      c.globalAlpha = 1;
    }
    if (mriA > 0) {
      c.globalAlpha = mriA;
      const s = ry * 2.15;
      mriSlice(c, hx - s / 2, hy - s / 2, s, b4, t);
      c.strokeStyle = ink(0.3); c.strokeRect(hx - s / 2, hy - s / 2, s, s);
      label(c, b4 < 0.98 ? `DECODING · ${Math.round(b4 * 100)}%` : (R.wide ? 'EXAMPLE FLAIR SLICE · IMAGE: 511KEV, CC BY-SA' : 'EXAMPLE FLAIR SLICE'), hx, hy + s / 2 + 16, ink(0.7), small, 'center');
      c.globalAlpha = 1;
    }

    // right-hand panel, one shot per beat
    const px = R.x + r * 2.95, pw = R.x + R.w - px, py = R.y;
    const aA = 1 - seg(p, 0.31, 0.34), aB = seg(p, 0.32, 0.35) * (1 - seg(p, 0.545, 0.575)), aC = seg(p, 0.555, 0.585) * (1 - seg(p, 0.75, 0.78)), aD = seg(p, 0.765, 0.795);
    if (aA > 0) {
      c.globalAlpha = aA;
      label(c, R.wide ? 'WHAT ONE ANTENNA HEARS' : 'ONE ANTENNA', px, py, ink(0.55), small);
      c.strokeStyle = acc(0.9); c.lineWidth = 1.5; c.beginPath();
      for (let k = 0; k <= 80; k++) {
        const u = k / 80, x = px + u * pw, e = Math.exp(-u * 2.2);
        const y = py + 50 + (Math.sin(u * 46 - t * 6) * 0.7 + Math.sin(u * 17 + t * 2) * 0.3) * 30 * e;
        k ? c.lineTo(x, y) : c.moveTo(x, y);
      }
      c.stroke(); c.lineWidth = 1;
      c.globalAlpha = aA * (0.3 + 0.7 * seg(p, 0.17, 0.25));
      label(c, R.wide ? '→ TURNED INTO A SPECTRUM' : '→ SPECTRUM', px, py + 112, ink(0.55), small);
      const n = 22, bw = pw / n;
      for (let k = 0; k < n; k++) {
        const h = (0.25 + 0.75 * Math.abs(Math.sin(k * 0.7 + 1))) * (0.85 + 0.15 * Math.sin(t * 3 + k)) * 60;
        c.fillStyle = tint(k % 3 === 0 ? 2 : 0, 0.75); c.fillRect(px + k * bw, py + 190 - h, bw - 2, h);
      }
    }
    if (aB > 0) {
      c.globalAlpha = aB;
      label(c, 'MODEL VERDICT', px, py, ink(0.55), small);
      c.font = `italic 400 ${R.wide ? 44 : 26}px ${SERIF}`; c.fillStyle = `rgba(${RED},1)`; c.textAlign = 'left';
      c.fillText(b2 > 0.5 ? 'Stroke' : '…', px, py + (R.wide ? 50 : 34));
      const prob = lerp(0.5, 0.94, b2);
      c.fillStyle = ink(0.15); c.fillRect(px, py + 68, pw, 6);
      c.fillStyle = `rgba(${RED},0.9)`; c.fillRect(px, py + 68, pw * prob, 6);
      label(c, `confidence ${prob.toFixed(2)}`, px, py + 92, ink(0.6), small);
      label(c, R.wide ? 'EACH SCAN, SEEN 11 WAYS' : '11 VIEWS', px, py + 132, ink(0.55), small);
      const vs = Math.min(22, (pw - 10 * 4) / 11), lit = Math.floor(seg(p, 0.36, 0.5) * 11.99);
      for (let k = 0; k < 11; k++) {
        const x = px + k * (vs + 4), y = py + 144, on = k < lit;
        c.strokeStyle = on ? tint(k % 6, 0.9) : ink(0.25); c.strokeRect(x, y, vs, vs * 1.4);
        if (on) for (let q = 0; q < 4; q++) { const h = (0.3 + 0.7 * rnd(k * 7 + q)) * vs * 1.2; c.fillStyle = tint(k % 6, 0.8); c.fillRect(x + 2 + q * (vs - 4) / 4, y + vs * 1.4 - 2 - h, (vs - 4) / 4 - 1, h); }
      }
      if (lit >= 11) {
        const by = py + 150 + vs * 1.4, mx = px + 5.5 * (vs + 4) - 2;
        c.strokeStyle = acc(0.8); line(c, px, by, mx, by + 16); line(c, px + 11 * (vs + 4) - 4, by, mx, by + 16);
        label(c, R.wide ? 'combined into one verdict' : 'one verdict', mx, by + 34, acc(1), small, 'center');
      }
    }
    if (aC > 0) {
      c.globalAlpha = aC;
      label(c, R.wide ? 'HELMETS IT NEVER TRAINED ON' : 'NEW HELMETS', px, py, ink(0.55), small);
      const hs = Math.min(26, pw / 8);
      for (let k = 0; k < 3; k++) {
        const cx = px + hs + k * hs * 2.8, cy = py + 18 + hs;
        c.strokeStyle = tint(2 + k, 0.9); c.beginPath(); c.ellipse(cx, cy, hs * 0.7, hs * 0.85, 0, 0, TAU); c.stroke();
        for (let q = 0; q < 8; q++) { const a = (q / 8) * TAU; c.fillStyle = tint(2 + k, 0.9); c.fillRect(cx + Math.cos(a) * hs - 1.5, cy + Math.sin(a) * hs * 1.15 - 1.5, 3, 3); }
      }
      const auc = lerp(0.82, 0.91, b3), sc = (v) => pw * clamp((v - 0.5) / 0.5);
      c.fillStyle = ink(0.15); c.fillRect(px, py + 92, pw, 8);
      c.fillStyle = acc(0.95); c.fillRect(px, py + 92, sc(auc), 8);
      label(c, `${R.wide ? 'accuracy score ' : ''}AUC ${auc.toFixed(2)}`, px, py + 116, acc(1), small);
      label(c, R.wide ? 'TIME PER SCAN, IN PRODUCTION' : 'PER SCAN', px, py + 160, ink(0.55), small);
      const sec = lerp(11.5, 3.5, b3b);
      c.fillStyle = ink(0.15); c.fillRect(px, py + 172, pw, 8);
      c.fillStyle = ink(0.9); c.fillRect(px, py + 172, pw * (sec / 11.5), 8);
      label(c, R.wide ? `${sec.toFixed(1)} s · model 70% smaller` : `${sec.toFixed(1)} s`, px, py + 196, ink(0.8), small);
    }
    if (aD > 0) {
      c.globalAlpha = aD;
      const steps = R.wide ? ['RADIO SIGNALS', 'SHARED MRI "LATENT" CODE', '3D BRAIN VOLUME'] : ['RF', 'LATENT', '3D MRI'];
      const bh = 30;
      steps.forEach((s, k) => {
        const y = py + k * (bh + 22), on = b4 > k / 3;
        c.strokeStyle = on ? acc(0.9) : ink(0.3); c.strokeRect(px, y, pw, bh);
        if (on) { c.fillStyle = acc(0.1); c.fillRect(px, y, pw, bh); }
        label(c, s, px + 10, y + bh / 2 + 4, on ? ink(0.95) : ink(0.45), small);
        if (k < 2) label(c, '↓', px + pw / 2, y + bh + 16, ink(0.5), 11, 'center');
      });
      const m = R.wide ? ['brain shape (Dice) 0.906 → 0.923', 'size error 6.7 → 3.5 mm', 'MRI autoencoder 42.7 dB PSNR'] : ['Dice 0.923', '3.5 mm error', 'AE 42.7 dB'];
      m.forEach((s, k) => { c.globalAlpha = aD * seg(b4, 0.4 + k * 0.15, 0.6 + k * 0.15); label(c, s, px, py + 3 * (bh + 22) + 14 + k * 20, k ? ink(0.75) : acc(1), small); });
    }
    c.globalAlpha = 1;
  }

  const SCENES = { rf, infra, voice, picture, trm, dit, vq, drive, video, bench };

  /* ───────────── playback: one round cylinder per company / project ─────────────
     Each company's story (title + beats) is printed around a real cylinder, drawn with WebGL.
     Scrolling turns it continuously; the beats go all the way round, so after the last one it
     comes back to the title before the page moves on. Each beat is drawn into its own texture,
     and only the beats near the front are redrawn. Without WebGL it falls back to the CSS drum. */
  const TS = 1.2;                                 // texture supersampling
  const slatSize = (viewW) => (viewW < 700 ? { LW: 470, LH: 600, narrow: true } : { LW: 920, LH: 580, narrow: false });
  const EASE_AMP = 0.15;                          // slows the turn as each beat passes the front
  const rotOf = (u) => u - EASE_AMP * Math.sin(u * TAU);
  const STEP = 40, DWELL = 0.76, CREEP = 0.16;    // CSS fallback drum
  const turnOf = (f) => (f < DWELL ? CREEP * (f / DWELL) : CREEP + (1 - CREEP) * ease((f - DWELL) / (1 - DWELL)));
  const slatRegion = (w, h) => ({ x: w * 0.05, y: h * 0.1, w: w * 0.9, h: h * 0.56, wide: w > 640 });
  const SANS = '"Geist", "Helvetica Neue", Arial, sans-serif';

  function wrapText(c, text, x, y, maxW, lh, maxLines = 99) {
    const words = text.split(/\s+/).filter(Boolean);
    let line = '', n = 0;
    for (const w of words) {
      const test = line ? `${line} ${w}` : w;
      if (c.measureText(test).width > maxW && line) {
        if (n === maxLines - 1) { c.fillText(`${line}…`, x, y); return y + lh; }
        c.fillText(line, x, y); y += lh; n++; line = w;
      } else line = test;
    }
    if (line) { c.fillText(line, x, y); y += lh; }
    return y;
  }
  const fitText = (c, text, maxW) => { if (c.measureText(text).width <= maxW) return text; let s = text; while (s.length > 4 && c.measureText(`${s}…`).width > maxW) s = s.slice(0, -1); return `${s}…`; };

  // canvases for the CSS fallback
  function size(F) {
    const w = F.el.offsetWidth, h = F.el.offsetHeight;
    const dpr = Math.max(0.8, Math.min(window.devicePixelRatio || 1, 1.5, Math.sqrt(1.4e6 / Math.max(1, w * h))));
    F.w = w; F.h = h; F.dpr = dpr; F.lastP = -1;
    F.canvas.width = Math.round(w * dpr); F.canvas.height = Math.round(h * dpr);
  }
  function release(F) { F.canvas.width = F.canvas.height = 0; F.w = 0; F.lastP = -1; }

  const text = (el, sel) => { const n = el.querySelector(sel); return n ? n.textContent.replace(/\s+/g, ' ').trim() : ''; };

  const rings = [];
  filmEls.forEach((film) => {
    const list = Array.from(film.querySelectorAll('.ring'));
    const unit = film.dataset.unit || 'Act';
    list.forEach((el, ri) => {
      const q = (s) => el.querySelector(s);
      const draw = SCENES[el.dataset.scene];
      const faces = Array.from(el.querySelectorAll('.rface')).map((f, k) => {
        f.style.setProperty('--k', k);
        const canvas = f.querySelector('canvas');
        const roleEl = f.querySelector('.act__role');
        const roleB = roleEl ? text(roleEl, 'b') : '';
        return {
          el: f, k, canvas, ctx: canvas ? canvas.getContext('2d') : null, shade: f.querySelector('.face__shade'),
          a: +(f.dataset.a || 0), b: +(f.dataset.b || 0.1), label: f.dataset.label || '',
          title: !canvas && !f.classList.contains('rface--sum'), sum: f.classList.contains('rface--sum'),
          items: Array.from(f.querySelectorAll('.rsum li')).map((li) => ({ v: text(li, '.rsum__v'), l: text(li, '.rsum__l') })),
          // words painted onto the cylinder
          kicker: text(f, '.act__kicker'), name: text(f, '.act__title'),
          roleB, roleRest: roleEl ? roleEl.textContent.replace(/\s+/g, ' ').trim().slice(roleB.length).trim() : '',
          capT: text(f, '.cap__t'), capTech: text(f, '.cap__tech'),
          capBody: (() => { const r = f.querySelector('.rcap'); if (!r) return ''; const cl = r.cloneNode(true); cl.querySelectorAll('.cap__t, .cap__tech').forEach((n) => n.remove()); return cl.textContent.replace(/\s+/g, ' ').trim(); })(),
          w: 0, h: 0, dpr: 1, lastP: -1, lastDraw: 0, last: {},
        };
      });
      const R = {
        el, film, list, ri, unit, draw, faces, n: faces.length, cur: -1, rad: 0, last: {}, visible: false, near: false, gl: null,
        view: q('.ring__view'), cyl: q('.ring__cyl'), prog: q('.act__prog'), next: q('.act__next'), beatsEl: q('.act__beats'),
        stats: Array.from(el.querySelectorAll('.act__stats li')).map((li) => {
          const n = li.querySelector('[data-to]');
          return { li, n, a: +li.dataset.a, b: +li.dataset.b, from: n ? +(n.dataset.from || 0) : 0, to: n ? +n.dataset.to : 0, on: false, last: '' };
        }),
        chips: [],
        off: 0, offT: 0, dir: 0, drag: null, lastU: 0, lastT: 0,
      };
      q('.act__count').textContent = `${unit} ${ri + 1} of ${list.length}`;
      if (ri % 2 === 1) el.classList.add('flip');
      faces.forEach((F) => {
        const btn = document.createElement('button');
        btn.type = 'button'; btn.className = 'beat';
        btn.innerHTML = F.sum ? `<i>✓</i><span>Recap</span>` : F.k ? `<i>${F.k}</i><span>${F.label}</span>` : `<i>●</i><span>Intro</span>`;
        btn.setAttribute('aria-label', F.k ? `Jump to part ${F.k}: ${F.label}` : 'Jump to the start');
        btn.addEventListener('click', () => jump(R, F.k));
        R.beatsEl.appendChild(btn); R.chips.push(btn);
      });
      const ticks = document.createElement('div');
      ticks.className = 'ring__ticks';
      let html = '';
      for (let k = 0; k < 72; k++) { const c = k % 6 === 0 ? ' class="big"' : ''; html += `<i${c} style="--a:${k * 5}deg"></i><b${c} style="--a:${k * 5}deg"></b>`; }
      ticks.innerHTML = html;
      R.cyl.appendChild(ticks);
      R.next.addEventListener('click', () => {
        const front = R.cur < 0 ? 0 : R.cur;
        if (front < R.n - 1) jump(R, front + 1);
        else if (list[ri + 1]) jump(rings.find((x) => x.el === list[ri + 1]), 0);
        else film.querySelector('.film__end').scrollIntoView({ behavior: reduce ? 'auto' : 'smooth' });
      });
      rings.push(R);
    });
  });
  rings.forEach((R) => {
    const rail = R.el.querySelector('.ring__rail');
    R.list.forEach((other, k) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = k === R.ri ? 'on' : '';
      b.innerHTML = `<i>${other.dataset.rail}</i><span>${other.dataset.name}</span>`;
      b.setAttribute('aria-label', `Go to ${other.dataset.name}`);
      b.addEventListener('click', () => jump(rings.find((x) => x.el === other), 0));
      rail.appendChild(b);
    });
  });

  /* ── scroll mapping: u runs 0 → n across the section; u = k puts beat k at the front, u = n is the title again ── */
  function posOf(R, k) {
    const top = R.el.getBoundingClientRect().top + scrollY, span = R.el.offsetHeight - innerHeight;
    return top + span * (R.gl ? k / R.n : (k + 0.03 * DWELL) / R.n);
  }
  function jump(R, k) { window.scrollTo({ top: posOf(R, k), behavior: reduce ? 'auto' : 'smooth' }); }
  function progress(R) {
    const r = R.el.getBoundingClientRect(), span = R.el.offsetHeight - innerHeight;
    return { P: clamp(-r.top / span), pinned: r.top <= 1 && r.bottom >= innerHeight - 1 };
  }

  /* ── painting one beat onto its texture ── */
  function paintSlat(R, S, p, t) {
    const c = S.tctx, { LW, LH, narrow } = R.gl.dims;
    c.setTransform(TS, 0, 0, TS, 0, 0);
    c.fillStyle = '#0a0a09'; c.fillRect(0, 0, LW, LH);
    c.fillStyle = 'rgba(236,232,222,0.12)';
    c.fillRect(0, 0, 1.5, LH); c.fillRect(LW - 1.5, 0, 1.5, LH);
    if (S.sum) {
      const x = LW * (narrow ? 0.08 : 0.1), mw = LW * (narrow ? 0.84 : 0.8);
      label(c, 'IN SHORT', x, LH * 0.14, acc(1), 12);
      c.font = `italic 400 ${narrow ? 30 : 40}px ${SERIF}`; c.fillStyle = `rgb(${INK})`; c.textAlign = 'left'; c.textBaseline = 'alphabetic';
      c.fillText(R.el.dataset.name, x, LH * 0.14 + (narrow ? 40 : 52));
      const cols = narrow ? 1 : 2, gap = 28, cw = (mw - gap * (cols - 1)) / cols;
      const top = LH * 0.14 + (narrow ? 66 : 86), rh = narrow ? 82 : Math.min(118, (LH * 0.82 - top) / Math.ceil(S.items.length / cols));
      S.items.forEach((it, k) => {
        const cx = x + (k % cols) * (cw + gap), cy = top + Math.floor(k / cols) * rh;
        c.fillStyle = ink(0.14); c.fillRect(cx, cy, cw, 1);
        const big = /^[\d−+\-#.×%K/ ]+$/.test(it.v) || it.v.length < 7;
        c.font = `${big ? '' : 'italic '}400 ${big ? (narrow ? 36 : 46) : (narrow ? 26 : 32)}px ${SERIF}`; c.fillStyle = `rgb(${INK})`;
        c.fillText(it.v, cx, cy + (narrow ? 38 : 48));
        c.font = `400 ${narrow ? 11 : 12}px ${MONO}`; c.fillStyle = ink(0.62);
        wrapText(c, it.l, cx, cy + (narrow ? 56 : 70), cw, 16, 2);
      });
    } else if (S.title) {
      const x = LW * 0.1, mw = LW * 0.8;
      c.fillStyle = `rgb(${INK})`;
      for (let k = 0; k < 8; k++) { const sx = x + k * 28; c.beginPath(); c.moveTo(sx + 6, LH * 0.25); c.lineTo(sx + 22, LH * 0.25); c.lineTo(sx + 16, LH * 0.25 + 11); c.lineTo(sx, LH * 0.25 + 11); c.closePath(); c.fill(); }
      label(c, S.kicker.toUpperCase(), x, LH * 0.25 + 40, acc(1), 12);
      let fs = narrow ? 64 : 104;
      c.font = `400 ${fs}px ${SERIF}`;
      while (c.measureText(S.name).width > mw && fs > 40) { fs -= 4; c.font = `400 ${fs}px ${SERIF}`; }
      c.fillStyle = `rgb(${INK})`; c.textAlign = 'left'; c.textBaseline = 'alphabetic';
      c.fillText(S.name, x, LH * 0.25 + 46 + fs * 0.92);
      let y = LH * 0.25 + 46 + fs * 0.92 + 44;
      c.font = `500 18px ${SANS}`; c.fillStyle = `rgb(${INK})`; c.fillText(S.roleB, x, y); y += 28;
      c.font = `300 17px ${SANS}`; c.fillStyle = ink(0.68);
      y = wrapText(c, S.roleRest, x, y, narrow ? mw : mw * 0.78, 25, narrow ? 7 : 4);
      label(c, 'SCROLL TO TURN ↓', x, Math.min(LH - 34, y + 26), acc(1), 11);
    } else {
      c.save(); R.draw(c, { x: LW * 0.08, y: LH * 0.06, w: LW * 0.84, h: LH * (narrow ? 0.44 : 0.56), wide: !narrow }, p, t); c.restore();
      const x0 = LW * 0.06, w0 = LW * 0.88, y0 = LH * (narrow ? 0.53 : 0.69), h0 = LH * (narrow ? 0.44 : 0.27);
      c.globalAlpha = 1;
      c.fillStyle = 'rgba(14,14,13,0.96)'; c.fillRect(x0, y0, w0, h0);
      c.strokeStyle = ink(0.16); c.lineWidth = 1; c.strokeRect(x0 + 0.5, y0 + 0.5, w0 - 1, h0 - 1);
      c.fillStyle = acc(1); c.fillRect(x0, y0, w0, 2);
      c.font = `italic 400 25px ${SERIF}`; c.fillStyle = `rgb(${INK})`; c.textAlign = 'left'; c.textBaseline = 'alphabetic';
      c.fillText(S.capT, x0 + 20, y0 + 34);
      c.font = `300 15.5px ${SANS}`; c.fillStyle = ink(0.92);
      const yb = wrapText(c, S.capBody, x0 + 20, y0 + 60, w0 - 40, 21, narrow ? 6 : 3);
      if (narrow) {
        // phones: the technical line gets its own block and wraps instead of being cut off
        const ys = Math.max(yb - 6, y0 + h0 - 82);
        c.fillStyle = ink(0.12); c.fillRect(x0 + 20, ys, w0 - 40, 1);
        c.font = `500 10.5px ${MONO}`; c.fillStyle = ink(0.4);
        c.fillText('UNDER THE HOOD', x0 + 20, ys + 20);
        c.fillStyle = acc(1);
        wrapText(c, S.capTech, x0 + 20, ys + 38, w0 - 40, 16, 3);
      } else {
        c.fillStyle = ink(0.12); c.fillRect(x0 + 20, y0 + h0 - 30, w0 - 40, 1);
        c.font = `500 10.5px ${MONO}`; c.fillStyle = ink(0.4);
        const lead = 'UNDER THE HOOD · ';
        c.fillText(lead, x0 + 20, y0 + h0 - 12);
        const lw = c.measureText(lead).width;
        c.fillStyle = acc(1); c.fillText(fitText(c, S.capTech, w0 - 40 - lw), x0 + 20 + lw, y0 + h0 - 12);
      }
    }
    S.tex.needsUpdate = true;
  }

  /* ── WebGL cylinder ── */
  function initGL(R) {
    if (R.gl || R.glFailed || !window.THREE) return false;
    try {
      const T = window.THREE;
      const canvas = document.createElement('canvas');
      canvas.className = 'ring__gl';
      const renderer = new T.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'high-performance' });
      const scene = new T.Scene();
      const camera = new T.PerspectiveCamera(30, 1, 0.05, 50);
      const group = new T.Group();
      scene.add(group);
      scene.add(new T.AmbientLight(0xffffff, 0.42));
      const light = new T.DirectionalLight(0xffffff, 0.72);
      light.position.set(0, 0.25, 1);
      scene.add(light);
      const dims = slatSize(R.view.clientWidth || innerWidth), { LW, LH } = dims;
      const n = R.n, seg = TAU / n, h = seg * (LH / LW);
      const slats = R.faces.map((F, k) => {
        const tcan = document.createElement('canvas');
        tcan.width = Math.round(LW * TS); tcan.height = Math.round(LH * TS);
        const tex = new T.CanvasTexture(tcan);
        tex.minFilter = T.LinearFilter; tex.generateMipmaps = false;
        tex.anisotropy = Math.min(4, renderer.capabilities.getMaxAnisotropy());
        const geo = new T.CylinderGeometry(1, 1, h, 48, 1, true, k * seg, seg);
        const mesh = new T.Mesh(geo, new T.MeshLambertMaterial({ map: tex }));
        group.add(mesh);
        return Object.assign(F, { tcan, tctx: tcan.getContext('2d'), tex, mesh, glP: -1, glDraw: 0 });
      });
      // rims: a thin ring and tick marks on the top and bottom edges, turning with the cylinder
      const pts = [], tk = [], tkA = [];
      const rr = 1.004;
      for (const s of [1, -1]) {
        const y = s * (h / 2 + 0.012);
        for (let k = 0; k < 240; k++) {
          const a0 = (k / 240) * TAU, a1 = ((k + 1) / 240) * TAU;
          pts.push(rr * Math.sin(a0), y, rr * Math.cos(a0), rr * Math.sin(a1), y, rr * Math.cos(a1));
        }
        for (let k = 0; k < 72; k++) {
          const a = (k / 72) * TAU, big = k % 6 === 0, len = big ? 0.05 : 0.025;
          const arr = big ? tkA : tk;
          arr.push(rr * Math.sin(a), y, rr * Math.cos(a), rr * Math.sin(a), y + s * len, rr * Math.cos(a));
        }
      }
      const mk = (arr, color, opacity) => {
        const g = new T.BufferGeometry();
        g.setAttribute('position', new T.Float32BufferAttribute(arr, 3));
        return new T.LineSegments(g, new T.LineBasicMaterial({ color, transparent: true, opacity }));
      };
      group.add(mk(pts, 0xece8de, 0.18), mk(tk, 0xece8de, 0.35), mk(tkA, 0xc9f24b, 0.95));
      R.view.appendChild(canvas);
      R.el.classList.add('gl');
      R.gl = { T, renderer, scene, camera, group, canvas, slats, seg, h, dims, w: 0, hgt: 0, ready: false };
      sizeGL(R);
      // only the title and recap are painted now; beat sides are painted the first time they near the front
      const t0 = performance.now() / 1000;
      slats.forEach((S) => { S.glP = -1; S.painted = false; S.mesh.visible = false; if (S.title || S.sum) { paintSlat(R, S, 0, t0); S.painted = true; } });
      slats[0].mesh.visible = true;
      // compile the shaders in a later idle moment, then mark the cylinder ready
      idle(() => { if (!R.gl) return; try { R.gl.renderer.compile(R.gl.scene, R.gl.camera); } catch (e) {} R.gl.ready = true; kick(); });
      return true;
    } catch (err) {
      R.glFailed = true;
      return false;
    }
  }
  function sizeGL(R) {
    const G = R.gl, w = R.view.clientWidth, hgt = R.view.clientHeight;
    if (!w || !hgt) return;
    G.w = w; G.hgt = hgt;
    const dpr = Math.max(0.8, Math.min(window.devicePixelRatio || 1, 1.5, Math.sqrt(2.2e6 / (w * hgt))));
    G.renderer.setPixelRatio(dpr);
    G.renderer.setSize(w, hgt, false);
    const cam = G.camera, aspect = w / hgt, tanH = Math.tan((cam.fov / 2) * Math.PI / 180);
    cam.aspect = aspect;
    const chord = 2 * Math.sin(G.seg / 2), cosE = Math.cos(G.seg / 2);
    const dV = 1 + G.h / (2 * 0.8 * tanH);
    const dW = cosE + chord / (2 * (G.dims.narrow ? 0.98 : 0.86) * tanH * aspect);
    cam.position.set(0, 0, Math.max(dV, dW));
    cam.lookAt(0, 0, 0);
    cam.updateProjectionMatrix();
  }
  function destroyGL(R) {
    const G = R.gl;
    if (!G) return;
    G.slats.forEach((S) => { S.mesh.geometry.dispose(); S.mesh.material.dispose(); S.tex.dispose(); S.tcan.width = S.tcan.height = 0; });
    G.renderer.dispose();
    if (G.renderer.forceContextLoss) G.renderer.forceContextLoss();
    G.canvas.remove();
    R.gl = null;
    R.el.classList.remove('gl');
  }

  function frameGL(R, now, t) {
    const G = R.gl, { P, pinned } = progress(R);
    const u = P * R.n;
    const dt = R.lastT ? Math.min(0.05, (now - R.lastT) / 1000) : 0;
    R.lastT = now;
    // hovering an edge keeps rolling that way; dragging moves it directly; scrolling hands control back
    if (R.dir) R.offT += R.dir * dt * 0.95;
    else if (!R.drag) {
      const du = Math.abs(u - R.lastU);
      if (du > 0.0005) { R.offT *= Math.exp(-du * 7); if (Math.abs(R.offT) < 0.01) R.offT = 0; }
      else { const base = rotOf(u), want = Math.round(base + R.offT) - base; R.offT += (want - R.offT) * Math.min(1, dt * 3); }
    }
    R.lastU = u;
    R.off += (R.offT - R.off) * Math.min(1, dt * 9 || 1);
    const rot = rotOf(u) + R.off;
    G.group.rotation.y = -(rot + 0.5) * G.seg;
    const front = ((Math.round(rot) % R.n) + R.n) % R.n;
    if (front !== R.cur) { R.cur = front; R.chips.forEach((c, k) => c.classList.toggle('on', k === front)); R.next.textContent = front < R.n - 1 ? 'Next ↓' : 'Next one ↓'; }
    const prog = `scaleX(${P.toFixed(3)})`;
    if (R.last.prog !== prog) { R.last.prog = prog; R.prog.style.transform = prog; }
    let sceneP = 0.05, painted = 0;
    for (const S of G.slats) {
      let d = (((S.k - rot) % R.n) + R.n) % R.n;
      if (d > R.n / 2) d -= R.n;
      S.mesh.visible = Math.abs(d) < 1.6;
      if (S.k === front && S.sum) sceneP = 1;
      if (Math.abs(d) > 1.35 || S.title || S.sum) continue;
      // start as the side swings in, finish just after it reaches the front, so it is complete while you read it
      const q = clamp((0.6 - d) / 0.66), p = S.a + (S.b - S.a) * q;
      if (S.k === front) sceneP = p;
      const isFront = S.k === front;
      // the front side redraws freely; a side still turning in or out redraws at most ~10 times a second
      const due = isFront ? (Math.abs(p - S.glP) > 1e-4 || now - S.glDraw > 33) : (!S.painted || (Math.abs(p - S.glP) > 0.004 && now - S.glDraw > 100));
      if (due && (isFront || painted < 1)) {
        if (!isFront) painted++;
        S.glP = p; S.glDraw = now; S.painted = true;
        paintSlat(R, S, p, t);
      }
    }
    for (const sx of R.stats) {
      const on = sceneP >= sx.a;
      if (on !== sx.on) { sx.on = on; sx.li.classList.toggle('on', on); }
      if (sx.n) {
        const v = String(Math.round(lerp(sx.from, sx.to, ease(seg(sceneP, sx.a, sx.b)))));
        if (v !== sx.last) { sx.last = v; sx.n.textContent = v; }
      }
    }
    if (R.view.clientWidth !== G.w || R.view.clientHeight !== G.hgt) sizeGL(R);
    G.renderer.render(G.scene, G.camera);
    return pinned;
  }

  /* ── CSS fallback drum (no WebGL) ── */
  function geometry(R) {
    const w = R.faces[0].el.offsetWidth;
    R.rad = (w / 2) / Math.tan((STEP / 2) * Math.PI / 180) * 1.05;
    R.cyl.style.setProperty('--R', `${R.rad.toFixed(1)}px`);
    R.last.tr = null;
    R.faces.forEach((F) => { if (F.ctx && F.w) size(F); });
  }
  function frameCSS(R, now, t) {
    if (!R.rad) geometry(R);
    const r = R.el.getBoundingClientRect(), span = R.el.offsetHeight - innerHeight;
    const P = clamp(-r.top / span), u = P * R.n;
    let i = Math.min(R.n - 1, Math.floor(u)), f = u - i;
    if (u >= R.n) { i = R.n - 1; f = 1; }
    const last = i === R.n - 1, qq = last ? f : clamp(f / DWELL), rot = i + (last ? CREEP * f : turnOf(f));
    const sceneP = i === 0 ? 0.05 : R.faces[i].a + (R.faces[i].b - R.faces[i].a) * qq;
    if (i !== R.cur) { R.cur = i; R.chips.forEach((c, k) => c.classList.toggle('on', k === i)); }
    const tr = `translateZ(${(-R.rad).toFixed(1)}px) rotateY(${(-rot * STEP).toFixed(3)}deg)`;
    if (R.last.tr !== tr) { R.last.tr = tr; R.cyl.style.transform = tr; }
    R.prog.style.transform = `scaleX(${P.toFixed(3)})`;
    for (const sx of R.stats) {
      const on = sceneP >= sx.a;
      if (on !== sx.on) { sx.on = on; sx.li.classList.toggle('on', on); }
      if (sx.n) { const v = String(Math.round(lerp(sx.from, sx.to, ease(seg(sceneP, sx.a, sx.b))))); if (v !== sx.last) { sx.last = v; sx.n.textContent = v; } }
    }
    for (const F of R.faces) {
      const ad = Math.abs(F.k - rot), vis = ad < 2.3;
      if (F.last.vis !== vis) { F.last.vis = vis; F.el.style.visibility = vis ? 'visible' : 'hidden'; }
      if (!vis) continue;
      const sh = Math.min(0.9, ad * 0.7).toFixed(2);
      if (F.last.sh !== sh) { F.last.sh = sh; F.shade.style.opacity = sh; }
      if (!F.ctx) continue;
      if (!F.w) size(F);
      const p = F.k < i ? F.b - 0.002 : F.k > i ? F.a + 0.002 : sceneP;
      if (Math.abs(p - F.lastP) > 1e-4 || (F.k === i && now - F.lastDraw > 32)) {
        F.lastP = p; F.lastDraw = now;
        const c = F.ctx;
        c.setTransform(F.dpr, 0, 0, F.dpr, 0, 0); c.clearRect(0, 0, F.w, F.h);
        c.save(); R.draw(c, slatRegion(F.w, F.h), p, t); c.restore();
      }
    }
    return r.top <= 1 && r.bottom >= innerHeight - 1;
  }

  let raf = 0;
  function frame(now) {
    raf = 0;
    const t = now / 1000;
    let inFilm = false, any = false;
    for (const R of rings) {
      if (!R.visible) continue;
      any = true;
      if (!R.gl && !R.glFailed) initGL(R);
      if (R.gl && !R.gl.ready) continue;
      if (R.gl ? frameGL(R, now, t) : frameCSS(R, now, t)) inFilm = true;
    }
    nav.classList.toggle('in-film', inFilm);
    if (any) raf = requestAnimationFrame(frame);
  }
  const kick = () => { if (!raf) raf = requestAnimationFrame(frame); };


  function rollable(view, get) {
    const edge = document.createElement('div');
    edge.className = 'roll-edges';
    edge.innerHTML = '<span class="roll-l" aria-hidden="true">‹</span><span class="roll-r" aria-hidden="true">›</span>';
    view.appendChild(edge);
    const setDir = (d) => { const R = get(); if (!R) return; R.dir = d; view.classList.toggle('roll-left', d < 0); view.classList.toggle('roll-right', d > 0); };
    view.addEventListener('pointermove', (e) => {
      const R = get(); if (!R) return;
      const r = view.getBoundingClientRect(), f = (e.clientX - r.left) / r.width;
      if (R.drag) {
        const dx = e.clientX - R.drag.x;
        if (Math.abs(dx) > 6) R.drag.moved = true;
        if (R.drag.moved) R.offT = R.drag.off - (dx / r.width) * 1.7;
        return;
      }
      if (e.pointerType === 'mouse') setDir(f < 0.24 ? -1 : f > 0.76 ? 1 : 0);
    });
    view.addEventListener('pointerleave', () => { setDir(0); const R = get(); if (R) R.drag = null; });
    view.addEventListener('pointerdown', (e) => { const R = get(); if (!R) return; R.drag = { x: e.clientX, off: R.offT, moved: false, type: e.pointerType }; });
    const end = (e) => {
      const R = get(); if (!R || !R.drag) return;
      const { moved, type } = R.drag; R.drag = null;
      if (!moved && type !== 'mouse') {                 // tap a side on a touch screen
        const r = view.getBoundingClientRect(), f = (e.clientX - r.left) / r.width;
        if (f < 0.35) R.offT -= 1; else if (f > 0.65) R.offT += 1;
      }
    };
    view.addEventListener('pointerup', end);
    view.addEventListener('pointercancel', () => { const R = get(); if (R) R.drag = null; });
  }
  rings.forEach((R) => rollable(R.view, () => (R.gl ? R : null)));

  const io = new IntersectionObserver((entries) => {
    for (const e of entries) { const R = rings.find((x) => x.el === e.target); R.visible = e.isIntersecting; }
    kick();
  }, { rootMargin: '0px' });
  rings.forEach((R) => io.observe(R.el));

  // build a cylinder a screen or two before it arrives, and free its WebGL context once it is far away
  const idle = window.requestIdleCallback || ((f) => setTimeout(f, 30));
  const near = new IntersectionObserver((entries) => {
    for (const e of entries) {
      const R = rings.find((x) => x.el === e.target);
      R.near = e.isIntersecting;
      if (R.near) {
        idle(() => {
          if (!R.near) return;
          if (initGL(R)) return;
          if (!R.rad) geometry(R);
          R.faces.forEach((F) => { if (F.ctx && !F.w) size(F); });
        });
      } else {
        destroyGL(R);
        R.faces.forEach((F) => { if (F.ctx && F.w) release(F); });
      }
    }
  }, { rootMargin: '250% 0px' });
  rings.forEach((R) => near.observe(R.el));

  // repaint the words once the web fonts have arrived
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => {
    const t = performance.now() / 1000;
    rings.forEach((R) => { if (R.gl) R.gl.slats.forEach((S) => { if (S.title || S.sum || S.painted) paintSlat(R, S, S.title || S.sum ? 0 : (S.glP >= 0 ? S.glP : S.a + 0.002), t); }); });
    kick();
  });

  document.querySelectorAll('.toc a[href^="#"]').forEach((a) => {
    const R = rings.find((x) => x.el.id === a.getAttribute('href').slice(1));
    if (R) a.addEventListener('click', (e) => { e.preventDefault(); jump(R, 0); });
  });

  addEventListener('keydown', (e) => {
    if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
    if (/^(input|textarea|select)$/i.test(e.target.tagName)) return;
    const R = rings.find((x) => x.visible && progress(x).pinned);
    if (!R) return;
    e.preventDefault();
    const k = Math.max(0, R.cur) + (e.key === 'ArrowRight' ? 1 : -1);
    if (k >= 0 && k < R.n) jump(R, k);
    else if (k >= R.n && R.list[R.ri + 1]) jump(rings.find((x) => x.el === R.list[R.ri + 1]), 0);
    else if (k < 0 && R.ri > 0) { const Rp = rings.find((x) => x.el === R.list[R.ri - 1]); jump(Rp, Rp.n - 1); }
  });

  let rz = 0;
  addEventListener('resize', () => { clearTimeout(rz); rz = setTimeout(() => { rings.forEach((R) => { if (R.gl) sizeGL(R); else geometry(R); }); kick(); }, 150); });

  /* ───────────── peer review: the three reviews printed around a cylinder ─────────────
     Point at (or click, or tab to) a name and the cylinder turns smoothly to that review.
     Left alone, it advances by itself every few seconds; hovering the section pauses it. */
  (() => {
    const sec = document.getElementById('words');
    const panel = sec && sec.querySelector('.words__panels');
    const tabs = sec ? Array.from(sec.querySelectorAll('[role="tab"]')) : [];
    if (!panel || !tabs.length || !window.THREE) return;
    const T = window.THREE;
    let G = null, target = 0, angle = 0, visible = false, hovering = false, raf2 = 0, lastAuto = performance.now(), lastLoop = 0;
    const ctl = { off: 0, offT: 0, dir: 0, drag: null };
    const items = [{ intro: true }].concat(tabs.map((tab) => {
      const q = document.getElementById(tab.getAttribute('aria-controls'));
      const img = tab.querySelector('img');
      const src = img ? img.getAttribute('src').split('?')[0] : '';
      const av = new Image(); av.src = (window.CANVAS_IMG && CANVAS_IMG[src]) || src;
      return { tab, name: text(tab, 'b'), role: text(tab, 'small'), quote: q ? text(q, 'p') : '', av };
    }));
    const n = items.length, seg = TAU / n;
    const dimsFor = (w) => (w < 560 ? { LW: 480, LH: 640, narrow: true } : { LW: 900, LH: 560, narrow: false });

    function paint(S) {
      const { LW, LH, narrow } = G.dims, c = S.ctx;
      c.setTransform(TS, 0, 0, TS, 0, 0);
      c.fillStyle = '#0a0a09'; c.fillRect(0, 0, LW, LH);
      c.fillStyle = 'rgba(236,232,222,0.12)'; c.fillRect(0, 0, 1.5, LH); c.fillRect(LW - 1.5, 0, 1.5, LH);
      const x = LW * 0.1, mw = LW * 0.8;
      c.textAlign = 'left'; c.textBaseline = 'alphabetic';
      if (S.intro) {
        label(c, 'PEER REVIEW', x, LH * 0.3, acc(1), 12);
        c.font = `400 ${narrow ? 54 : 78}px ${SERIF}`; c.fillStyle = `rgb(${INK})`;
        c.fillText('Three people,', x, LH * 0.3 + (narrow ? 64 : 88));
        c.fillText('three jobs.', x, LH * 0.3 + (narrow ? 122 : 168));
        c.font = `300 ${narrow ? 16 : 18}px ${SANS}`; c.fillStyle = ink(0.68);
        wrapText(c, 'What a CTO, a project manager and a fellow engineer said after working with me. Point at a name to turn to their review.', x, LH * 0.3 + (narrow ? 172 : 222), mw * 0.82, 26, 4);
      } else {
        const r = narrow ? 30 : 34, cy = LH * 0.14;
        c.save(); c.beginPath(); c.arc(x + r, cy + r, r, 0, TAU); c.closePath(); c.clip();
        if (S.av.complete && S.av.naturalWidth) c.drawImage(S.av, x, cy, r * 2, r * 2); else { c.fillStyle = '#222'; c.fillRect(x, cy, r * 2, r * 2); }
        c.restore();
        c.strokeStyle = acc(0.9); c.lineWidth = 1.5; c.beginPath(); c.arc(x + r, cy + r, r + 2, 0, TAU); c.stroke();
        c.font = `500 ${narrow ? 17 : 19}px ${SANS}`; c.fillStyle = `rgb(${INK})`; c.fillText(S.name, x + r * 2 + 18, cy + r - 2);
        label(c, S.role.toUpperCase(), x + r * 2 + 18, cy + r + 18, ink(0.55), 10.5);
        let fs = narrow ? 20 : 25, lh;
        const top = cy + r * 2 + (narrow ? 44 : 54);
        for (; fs > 13; fs -= 1) {                      // largest size at which the whole quote fits the side
          c.font = `400 ${fs}px ${SERIF}`; lh = fs * 1.28;
          const words = S.quote.split(' '); let line = '', lines = 1;
          for (const w of words) { const tt = line ? `${line} ${w}` : w; if (c.measureText(tt).width > mw) { lines++; line = w; } else line = tt; }
          if (top + lines * lh < LH * 0.93) break;
        }
        c.fillStyle = acc(1); c.font = `400 ${fs * 1.6}px ${SERIF}`; c.fillText('“', x - fs * 0.6, top + fs * 0.35);
        c.font = `400 ${fs}px ${SERIF}`; c.fillStyle = ink(0.95);
        wrapText(c, S.quote, x, top, mw, lh);
      }
      S.tex.needsUpdate = true;
    }

    function init() {
      if (G) return;
      try {
        const view = document.createElement('div');
        view.className = 'words__gl';
        const canvas = document.createElement('canvas');
        view.appendChild(canvas);
        panel.appendChild(view);
        const renderer = new T.WebGLRenderer({ canvas, antialias: true, alpha: true });
        const scene = new T.Scene(), camera = new T.PerspectiveCamera(28, 1, 0.05, 50), group = new T.Group();
        scene.add(group, new T.AmbientLight(0xffffff, 0.45));
        const light = new T.DirectionalLight(0xffffff, 0.7); light.position.set(0, 0.2, 1); scene.add(light);
        const dims = dimsFor(panel.clientWidth), h = seg * (dims.LH / dims.LW);
        const slats = items.map((it, k) => {
          const tcan = document.createElement('canvas');
          tcan.width = Math.round(dims.LW * TS); tcan.height = Math.round(dims.LH * TS);
          const tex = new T.CanvasTexture(tcan); tex.minFilter = T.LinearFilter; tex.generateMipmaps = false;
          tex.anisotropy = Math.min(4, renderer.capabilities.getMaxAnisotropy());
          const mesh = new T.Mesh(new T.CylinderGeometry(1, 1, h, 48, 1, true, k * seg, seg), new T.MeshLambertMaterial({ map: tex }));
          group.add(mesh);
          return Object.assign(it, { ctx: tcan.getContext('2d'), tex, mesh, tcan });
        });
        const pts = [], tk = [];
        for (const sgn of [1, -1]) {
          const y = sgn * (h / 2 + 0.012);
          for (let k = 0; k < 240; k++) { const a0 = (k / 240) * TAU, a1 = ((k + 1) / 240) * TAU; pts.push(Math.sin(a0) * 1.004, y, Math.cos(a0) * 1.004, Math.sin(a1) * 1.004, y, Math.cos(a1) * 1.004); }
          for (let k = 0; k < 72; k++) { const a = (k / 72) * TAU; tk.push(Math.sin(a) * 1.004, y, Math.cos(a) * 1.004, Math.sin(a) * 1.004, y + sgn * (k % 6 ? 0.025 : 0.05), Math.cos(a) * 1.004); }
        }
        const lines = (arr, color, op) => { const g = new T.BufferGeometry(); g.setAttribute('position', new T.Float32BufferAttribute(arr, 3)); return new T.LineSegments(g, new T.LineBasicMaterial({ color, transparent: true, opacity: op })); };
        group.add(lines(pts, 0xece8de, 0.18), lines(tk, 0xc9f24b, 0.6));
        G = { renderer, scene, camera, group, canvas, view, slats, dims, h, w: 0, hh: 0 };
        wire();
        sec.classList.add('gl');
        slats.forEach(paint);
        size();
        items.forEach((it) => { if (it.av) it.av.onload = () => G && paint(it); });
      } catch (e) { G = null; }
    }
    function size() {
      const w = G.view.clientWidth, h = G.view.clientHeight;
      if (!w || !h) return;
      G.w = w; G.hh = h;
      G.renderer.setPixelRatio(Math.max(0.8, Math.min(window.devicePixelRatio || 1, 1.5, Math.sqrt(1.6e6 / (w * h)))));
      G.renderer.setSize(w, h, false);
      const cam = G.camera, aspect = w / h, tanH = Math.tan((cam.fov / 2) * Math.PI / 180);
      cam.aspect = aspect;
      const dV = 1 + G.h / (2 * 0.86 * tanH), dW = Math.cos(seg / 2) + (2 * Math.sin(seg / 2)) / (2 * (G.dims.narrow ? 0.99 : 0.92) * tanH * aspect);
      cam.position.set(0, 0, Math.max(dV, dW)); cam.lookAt(0, 0, 0); cam.updateProjectionMatrix();
    }
    const turnTo = (k) => {                                   // shortest way round to side k
      let d = k - (target % n);
      if (d > n / 2) d -= n; if (d < -n / 2) d += n;
      target += d; lastAuto = performance.now();
    };
    function loop(now) {
      raf2 = 0;
      if (!G || !visible) return;
      if (!hovering && now - lastAuto > 6500) {               // auto-advance through the reviews
        const k = ((Math.round(target) % n) + n) % n, nk = k === n - 1 ? 1 : k + 1;
        const tab = items[nk].tab; if (tab) tab.click();
        turnTo(nk);
      }
      const dt = lastLoop ? Math.min(0.05, (now - lastLoop) / 1000) : 0; lastLoop = now;
      if (ctl.dir) { target += ctl.dir * dt * 0.8; lastAuto = now; }
      if (ctl.drag && ctl.drag.moved) { target = ctl.drag.t0 + (ctl.offT - ctl.drag.off); lastAuto = now; }
      if (!ctl.dir && !ctl.drag && Math.abs(target - Math.round(target)) > 0.001) target += (Math.round(target) - target) * Math.min(1, dt * 3);
      ctl.offT = 0;
      angle += (target - angle) * 0.075;
      G.group.rotation.y = -(angle + 0.5) * seg;
      if (G.view.clientWidth !== G.w || G.view.clientHeight !== G.hh) size();
      G.renderer.render(G.scene, G.camera);
      raf2 = requestAnimationFrame(loop);
    }
    function wire() {
      rollable(G.view, () => ctl);
      G.view.addEventListener('pointerdown', () => { if (ctl.drag) ctl.drag.t0 = target; });
      G.view.addEventListener('pointerup', () => {          // taps move a whole side
        if (ctl.offT) { target += ctl.offT; ctl.offT = 0; lastAuto = performance.now(); }
      });
    }
    tabs.forEach((tab, i) => {
      const go = () => turnTo(i + 1);
      tab.addEventListener('pointerenter', go); tab.addEventListener('click', go); tab.addEventListener('focus', go);
    });
    sec.addEventListener('pointerenter', () => { hovering = true; });
    sec.addEventListener('pointerleave', () => { hovering = false; lastAuto = performance.now(); });
    new IntersectionObserver((en) => {
      visible = en[0].isIntersecting;
      if (visible) { init(); lastAuto = performance.now(); if (G && !raf2) raf2 = requestAnimationFrame(loop); }
    }, { rootMargin: '20% 0px' }).observe(sec);
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => { if (G) G.slats.forEach(paint); });
  })();
})();
