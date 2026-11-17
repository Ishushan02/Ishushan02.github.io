/* Fig. 2: multi-modal trajectory forecasting on the visitor's cursor.
   Six kinematic hypotheses are rolled out 0.8 s ahead. Each forecast is later scored
   against what really happened (ADE / FDE) and mode probabilities follow recent error. */
(() => {
  const cv = document.getElementById('fcCanvas');
  if (!cv) return;
  const ctx = cv.getContext('2d');
  const stageEl = cv.parentElement;
  const elAgent = document.getElementById('fcAgent');
  const elAde = document.getElementById('fcAde');
  const elFde = document.getElementById('fcFde');
  const elModes = document.getElementById('fcModes');
  const elHint = document.getElementById('fcHint');
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;

  const MODES = ['const. velocity', 'const. turn', 'turn + brake', 'brake', 'turn harder', 'accelerate'];
  const K = MODES.length, STEPS = 8, DT = 0.1;
  const INK = '236,232,222', ACC = '201,242,75';

  const rows = MODES.map((name) => {
    const li = document.createElement('li');
    li.innerHTML = `<span>${name}</span><i></i><b>0%</b>`;
    elModes.appendChild(li);
    return li;
  });

  let W = 0, H = 0, DPR = 1, visible = false, raf = 0;
  const hist = [];
  const pending = [];
  const modeErr = new Float32Array(K).fill(40);
  const probs = new Float32Array(K).fill(1 / K);
  let paths = null;
  let lastPredict = 0, lastUi = 0;
  let ade = 0, fde = 0, scored = 0;
  const pointer = { x: 0, y: 0, at: -1e9 };
  let userSeen = false;

  function resize() {
    const r = stageEl.getBoundingClientRect();
    W = r.width; H = r.height;
    DPR = Math.min(window.devicePixelRatio || 1, 1.5);
    cv.width = Math.round(W * DPR); cv.height = Math.round(H * DPR);
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
  }

  function autopilot(s) {
    const mx = W * 0.38, my = H * 0.33;
    return {
      x: W * 0.5 + mx * Math.sin(s * 0.92 + 0.4),
      y: H * 0.5 + my * Math.sin(s * 1.38 + 1.1) * (0.72 + 0.28 * Math.cos(s * 0.31)),
    };
  }

  function at(time) {
    for (let i = hist.length - 1; i > 0; i--) {
      const p = hist[i - 1], q = hist[i];
      if (p.t <= time) {
        const f = q.t === p.t ? 0 : Math.min(1, Math.max(0, (time - p.t) / (q.t - p.t)));
        return { x: p.x + (q.x - p.x) * f, y: p.y + (q.y - p.y) * f };
      }
    }
    return hist[0];
  }

  function predict(now) {
    if (hist.length < 4) return null;
    const w = 0.12;
    const p2 = hist[hist.length - 1], p1 = at(now - w * 1000), p0 = at(now - 2 * w * 1000);
    const v1x = (p2.x - p1.x) / w, v1y = (p2.y - p1.y) / w;
    const v0x = (p1.x - p0.x) / w, v0y = (p1.y - p0.y) / w;
    const s1 = Math.hypot(v1x, v1y), s0 = Math.hypot(v0x, v0y);
    if (s1 < 12) return null;
    const th = Math.atan2(v1y, v1x);
    let om = 0;
    if (s0 > 20) {
      let d = th - Math.atan2(v0y, v0x);
      d = Math.atan2(Math.sin(d), Math.cos(d));
      om = Math.max(-7, Math.min(7, d / w));
    }
    const acc = Math.max(-1500, Math.min(1500, (s1 - s0) / w));

    const out = [];
    for (let k = 0; k < K; k++) {
      let x = p2.x, y = p2.y, h = th, s = s1;
      const turn = k === 1 || k === 2 ? om : k === 4 ? om * 1.9 : k === 5 ? om * 0.5 : 0;
      const pts = [];
      const sub = 5, dt = DT / sub;
      for (let j = 0; j < STEPS; j++) {
        for (let q = 0; q < sub; q++) {
          if (k === 2 || k === 3) s *= Math.exp(-2.6 * dt);
          if (k === 5) s = Math.max(0, Math.min(s1 * 2.4 + 120, s + Math.max(acc, 260) * dt));
          h += turn * dt;
          x += Math.cos(h) * s * dt; y += Math.sin(h) * s * dt;
        }
        pts.push({ x, y });
      }
      out.push(pts);
    }
    return out;
  }

  function score(now, cur) {
    for (let i = pending.length - 1; i >= 0; i--) {
      const s = pending[i];
      while (s.n < STEPS && now >= s.t0 + (s.n + 1) * DT * 1000) {
        for (let k = 0; k < K; k++) {
          const p = s.paths[k][s.n];
          const d = Math.hypot(p.x - cur.x, p.y - cur.y);
          s.sum[k] += d; s.last[k] = d;
        }
        s.n++;
      }
      if (s.n >= STEPS) {
        let mA = Infinity, mF = Infinity;
        for (let k = 0; k < K; k++) {
          const e = s.sum[k] / STEPS;
          modeErr[k] = modeErr[k] * 0.86 + e * 0.14;
          if (e < mA) mA = e;
          if (s.last[k] < mF) mF = s.last[k];
        }
        ade = scored ? ade * 0.9 + mA * 0.1 : mA;
        fde = scored ? fde * 0.9 + mF * 0.1 : mF;
        scored++;
        pending.splice(i, 1);
      }
    }
    let lo = Infinity;
    for (let k = 0; k < K; k++) lo = Math.min(lo, modeErr[k]);
    const tau = Math.max(3, lo * 0.45);
    let z = 0;
    for (let k = 0; k < K; k++) { probs[k] = Math.exp(-(modeErr[k] - lo) / tau); z += probs[k]; }
    for (let k = 0; k < K; k++) probs[k] /= z;
  }

  function ui(user) {
    elAgent.textContent = user ? 'your cursor' : 'autopilot';
    elAde.textContent = ade.toFixed(1);
    elFde.textContent = fde.toFixed(1);
    let top = 0;
    for (let k = 1; k < K; k++) if (probs[k] > probs[top]) top = k;
    rows.forEach((li, k) => {
      li.classList.toggle('top', k === top);
      li.children[1].style.setProperty('--p', probs[k].toFixed(3));
      li.children[2].textContent = Math.round(probs[k] * 100) + '%';
    });
  }

  function draw(cur) {
    ctx.clearRect(0, 0, W, H);

    // dot grid
    ctx.fillStyle = `rgba(${INK},0.09)`;
    const g = 28;
    for (let y = g / 2; y < H; y += g) for (let x = g / 2; x < W; x += g) ctx.fillRect(x, y, 1, 1);

    // observed past
    const n = hist.length;
    for (let i = 1; i < n; i++) {
      const f = i / n;
      ctx.strokeStyle = `rgba(${INK},${(f * f * 0.75).toFixed(3)})`;
      ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.moveTo(hist[i - 1].x, hist[i - 1].y); ctx.lineTo(hist[i].x, hist[i].y); ctx.stroke();
    }

    // predicted futures
    if (paths) {
      let top = 0;
      for (let k = 1; k < K; k++) if (probs[k] > probs[top]) top = k;
      for (let pass = 0; pass < 2; pass++) {
        for (let k = 0; k < K; k++) {
          if ((k === top) !== (pass === 1)) continue;
          const best = k === top;
          const a = best ? 1 : 0.14 + probs[k] * 1.1;
          ctx.strokeStyle = best ? `rgba(${ACC},0.95)` : `rgba(${INK},${Math.min(0.6, a).toFixed(3)})`;
          ctx.lineWidth = best ? 2 : 1;
          ctx.setLineDash(best ? [] : [3, 5]);
          ctx.beginPath(); ctx.moveTo(cur.x, cur.y);
          for (const p of paths[k]) ctx.lineTo(p.x, p.y);
          ctx.stroke();
          ctx.setLineDash([]);
          const e = paths[k][STEPS - 1];
          ctx.fillStyle = best ? `rgb(${ACC})` : `rgba(${INK},${Math.min(0.7, a + 0.1).toFixed(3)})`;
          if (best) {
            for (const p of paths[k]) { ctx.beginPath(); ctx.arc(p.x, p.y, 2, 0, 6.2832); ctx.fill(); }
            ctx.font = '500 10.5px "JetBrains Mono", monospace';
            const flip = e.x + 170 > W;
            ctx.textAlign = flip ? 'right' : 'left';
            ctx.fillText(`${MODES[k]}  p=${probs[k].toFixed(2)}`, e.x + (flip ? -10 : 10), e.y + 4);
            ctx.textAlign = 'left';
          } else {
            ctx.beginPath(); ctx.arc(e.x, e.y, 2, 0, 6.2832); ctx.fill();
          }
        }
      }
    }

    // the agent
    ctx.fillStyle = `rgb(${INK})`;
    ctx.beginPath(); ctx.arc(cur.x, cur.y, 4, 0, 6.2832); ctx.fill();
    ctx.strokeStyle = `rgba(${INK},0.35)`; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.arc(cur.x, cur.y, 11, 0, 6.2832); ctx.stroke();
  }

  function frame(now) {
    raf = 0;
    if (!visible) return;
    const user = now - pointer.at < 2200;
    const cur = user ? { x: pointer.x, y: pointer.y } : autopilot(now * 0.001 * (reduce ? 0.35 : 1));
    hist.push({ x: cur.x, y: cur.y, t: now });
    while (hist.length && now - hist[0].t > 1400) hist.shift();

    score(now, cur);
    if (now - lastPredict > 90) {
      lastPredict = now;
      paths = predict(now);
      if (paths && pending.length < 24) {
        pending.push({ t0: now, paths, sum: new Float32Array(K), last: new Float32Array(K), n: 0 });
      }
    }
    draw(cur);
    if (now - lastUi > 140) { lastUi = now; ui(user); }
    raf = requestAnimationFrame(frame);
  }

  function reset() { hist.length = 0; pending.length = 0; paths = null; }

  stageEl.addEventListener('pointermove', (e) => {
    const r = stageEl.getBoundingClientRect();
    const fresh = performance.now() - pointer.at > 2200;
    pointer.x = e.clientX - r.left; pointer.y = e.clientY - r.top; pointer.at = performance.now();
    if (fresh) reset();
    if (!userSeen) { userSeen = true; elHint.classList.add('off'); }
  });
  stageEl.addEventListener('pointerleave', () => { pointer.at = -1e9; reset(); });

  new ResizeObserver(() => { resize(); reset(); }).observe(stageEl);
  new IntersectionObserver((en) => {
    visible = en[0].isIntersecting;
    if (visible && !raf) { reset(); raf = requestAnimationFrame(frame); }
  }, { rootMargin: '80px' }).observe(stageEl);
})();
