/* Page behaviour: clock, reveals, reviews, detector overlays, small toys. */
(() => {
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const fine = matchMedia('(hover: hover) and (pointer: fine)').matches;

  /* ── San Diego clock ── */
  const clock = $('#clock');
  if (clock) {
    const fmt = new Intl.DateTimeFormat('en-GB', { timeZone: 'America/Los_Angeles', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false });
    const tick = () => { clock.textContent = fmt.format(new Date()); };
    tick(); setInterval(tick, 1000);
  }

  /* ── reveal on scroll ── */
  const countUp = (el) => {
    const to = Number(el.dataset.count);
    if (reduce) { el.textContent = to; return; }
    const s = performance.now(), d = 1400;
    const step = (now) => {
      const p = Math.min(1, (now - s) / d);
      el.textContent = Math.round(to * (1 - Math.pow(1 - p, 4)));
      if (p < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  };
  const io = new IntersectionObserver((entries) => {
    for (const e of entries) {
      if (!e.isIntersecting) continue;
      e.target.classList.add('in');
      $$('[data-count]', e.target).forEach(countUp);
      io.unobserve(e.target);
    }
  }, { rootMargin: '0px 0px -8% 0px', threshold: 0.08 });
  $$('[data-r]').forEach((el) => io.observe(el));

  /* ── abstract: words resolve as you scroll through them ── */
  const abs = $('#abstractText');
  let words = [];
  if (abs && !reduce) {
    abs.innerHTML = abs.textContent.trim().split(/\s+/).map((w) => `<span class="w">${w}</span>`).join(' ');
    words = $$('.w', abs);
  }
  const scrubAbstract = () => {
    if (!words.length) return;
    const r = abs.getBoundingClientRect(), vh = innerHeight;
    const p = (vh * 0.9 - r.top) / (r.height + vh * 0.42);
    const k = Math.round(Math.max(0, Math.min(1, p)) * words.length);
    for (let i = 0; i < words.length; i++) words[i].classList.toggle('on', i < k);
  };

  /* ── nav: hide on the way down, mark the active section ── */
  const nav = $('#nav');
  const links = $$('.nav__links a');
  const targets = links.map((a) => $(a.getAttribute('href')));
  let lastY = scrollY, ticking = false;
  const onScroll = () => {
    ticking = false;
    const y = scrollY;
    nav.classList.toggle('is-hidden', y > lastY && y > innerHeight * 0.6);
    lastY = y;
    let active = -1;
    targets.forEach((t, i) => { if (t && t.getBoundingClientRect().top < innerHeight * 0.45) active = i; });
    links.forEach((a, i) => a.classList.toggle('is-active', i === active));
    scrubAbstract();
    hideReticle();
  };
  addEventListener('scroll', () => { if (!ticking) { ticking = true; requestAnimationFrame(onScroll); } }, { passive: true });

  /* ── recommendations: hover, click or arrow-key a name to read their review ── */
  const tabs = $$('.words__tabs [role="tab"]');
  const selectTab = (tab) => {
    tabs.forEach((t) => {
      const on = t === tab;
      t.setAttribute('aria-selected', String(on));
      t.tabIndex = on ? 0 : -1;
      $('#' + t.getAttribute('aria-controls')).hidden = !on;
    });
  };
  tabs.forEach((tab, i) => {
    tab.addEventListener('click', () => selectTab(tab));
    if (fine) tab.addEventListener('pointerenter', () => selectTab(tab));
    tab.addEventListener('focus', () => selectTab(tab));
    tab.addEventListener('keydown', (e) => {
      if (e.key !== 'ArrowDown' && e.key !== 'ArrowUp') return;
      e.preventDefault();
      const next = tabs[(i + (e.key === 'ArrowDown' ? 1 : tabs.length - 1)) % tabs.length];
      selectTab(next); next.focus();
    });
  });

  /* ── copy buttons ── */
  const BIB = `@inproceedings{menachery2023brain,
  title={Brain tumor detection using deep learning model},
  author={Menachery, Joel and Anand, Ishan Kumar and Thiruthuvanathan, Michael Moses},
  booktitle={2023 IEEE International Conference on Contemporary Computing and Communications (InC4)},
  volume={1},
  pages={1--6},
  year={2023},
  organization={IEEE}
}`;
  const copyBtn = (btn, text) => {
    if (!btn) return;
    const label = btn.textContent;
    btn.addEventListener('click', async () => {
      try { await navigator.clipboard.writeText(text); btn.textContent = 'Copied'; }
      catch { btn.textContent = 'Copy failed'; }
      setTimeout(() => { btn.textContent = label; }, 1600);
    });
  };
  copyBtn($('#copyBib'), BIB);
  copyBtn($('#copyMail'), 'isanand@ucsd.edu');

  /* ── detector: a box that snaps to whatever you point at ── */
  const hash = (s) => { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; };
  const conf = (el) => (0.86 + (hash(el.textContent.trim().slice(0, 40) + el.dataset.det) % 1300) / 10000).toFixed(2);
  const reticle = $('#reticle');
  const reticleLabel = $('span', reticle);
  let reticleOn = false;
  function hideReticle() { if (reticleOn) { reticleOn = false; reticle.classList.remove('on'); } }
  if (fine) {
    $$('[data-det]').forEach((el) => {
      if (['person', 'figure', 'project'].includes(el.dataset.det)) return;
      el.addEventListener('pointerenter', () => {
        const r = el.getBoundingClientRect(), pad = 7;
        reticle.style.width = r.width + pad * 2 + 'px';
        reticle.style.height = r.height + pad * 2 + 'px';
        reticle.style.transform = `translate3d(${r.left - pad}px, ${r.top - pad}px, 0)`;
        reticleLabel.textContent = `${el.dataset.det} ${conf(el)}`;
        reticle.classList.add('on'); reticleOn = true;
      });
      el.addEventListener('pointerleave', hideReticle);
    });
  }

  /* ── vision mode: label everything, the way a detector would ──
     Boxes track their targets live, like a tracker following objects frame to frame, so they stay
     on pinned (sticky) elements, revealed elements and anything that changes size. */
  const layer = $('#detLayer');
  const toggle = $('#visionToggle');
  const COLORS = { person: '#c9f24b', heading: '#ece8de', figure: '#6fd6ff', chart: '#6fd6ff', quote: '#b79bff', paper: '#6fd6ff', link: '#ffd24c', email: '#c9f24b' };
  let vision = false, tracks = [], vraf = 0;
  function buildVision() {
    layer.innerHTML = '';
    tracks = $$('[data-det]').map((el, i) => {
      const d = document.createElement('div');
      d.className = 'det';
      d.style.setProperty('--c', COLORS[el.dataset.det] || '#c9f24b');
      d.style.setProperty('--d', `${Math.min(i * 0.03, 0.6)}s`);
      d.innerHTML = `<span>${el.dataset.det} ${el.dataset.det === 'person' ? '0.99' : conf(el)}</span>`;
      layer.appendChild(d);
      return { el, d, last: '' };
    });
  }
  function track() {
    vraf = 0;
    if (!vision) return;
    const vh = innerHeight, vw = innerWidth, pad = 6;
    const rects = tracks.map((t) => t.el.getBoundingClientRect());      // read everything first...
    tracks.forEach((t, i) => {                                            // ...then write
      const r = rects[i];
      const on = r.width > 0 && r.height > 0 && r.bottom > -40 && r.top < vh + 40 && r.right > 0 && r.left < vw;
      const key = on ? `${Math.round(r.left)},${Math.round(r.top)},${Math.round(r.width)},${Math.round(r.height)}` : 'off';
      if (key === t.last) return;
      t.last = key;
      if (!on) { t.d.style.display = 'none'; return; }
      t.d.style.display = '';
      t.d.style.left = `${r.left - pad}px`; t.d.style.top = `${r.top - pad}px`;
      t.d.style.width = `${r.width + pad * 2}px`; t.d.style.height = `${r.height + pad * 2}px`;
    });
    vraf = requestAnimationFrame(track);
  }
  const setVision = (on) => {
    vision = on;
    document.documentElement.classList.toggle('vision', on);
    toggle.setAttribute('aria-pressed', String(on));
    if (on) { buildVision(); if (!vraf) vraf = requestAnimationFrame(track); }
    else { layer.innerHTML = ''; tracks = []; }
  };
  toggle.addEventListener('click', () => setVision(!vision));
  addEventListener('keydown', (e) => {
    if (e.key.toLowerCase() !== 'v' || e.metaKey || e.ctrlKey || e.altKey) return;
    if (/^(input|textarea|select)$/i.test(e.target.tagName)) return;
    setVision(!vision);
  });
  onScroll();

  /* ── Tile Burst: hover a tile to arm it, complete a row and it bursts ── */
  const tiles = $('#tiles');
  if (tiles) {
    const COLS = 10, ROWS = 4, cells = [];
    for (let i = 0; i < COLS * ROWS; i++) {
      const t = document.createElement('div');
      t.className = 'tile';
      tiles.appendChild(t); cells.push(t);
    }
    const burstRow = (row) => {
      for (let c = 0; c < COLS; c++) {
        const t = cells[row * COLS + c];
        setTimeout(() => t.classList.add('pop'), c * 28);
        setTimeout(() => t.classList.remove('pop', 'hot'), 620 + c * 28);
      }
    };
    const arm = (i) => {
      const t = cells[i];
      if (t.classList.contains('hot') || t.classList.contains('pop')) return;
      t.classList.add('hot');
      const row = Math.floor(i / COLS);
      if (cells.slice(row * COLS, row * COLS + COLS).every((c) => c.classList.contains('hot'))) burstRow(row);
    };
    cells.forEach((t, i) => t.addEventListener('pointerenter', () => arm(i)));
    tiles.addEventListener('pointermove', (e) => {
      if (e.pointerType !== 'touch') return;
      const el = document.elementFromPoint(e.clientX, e.clientY);
      const i = cells.indexOf(el);
      if (i >= 0) arm(i);
    });
    // a few tiles start armed so the board never looks empty
    [3, 4, 5, 13, 14, 22, 27, 28, 36].forEach((i) => cells[i].classList.add('hot'));
  }

  /* ── ECG trace ── */
  const ecg = $('#ecgPath');
  if (ecg) {
    const bpmEl = $('#bpm');
    const beat = (x) => {            // one heartbeat, x in [0,1)
      const g = (m, s, a) => a * Math.exp(-((x - m) * (x - m)) / (2 * s * s));
      return g(0.18, 0.025, 0.12) - g(0.265, 0.008, 0.18) + g(0.29, 0.011, 1) - g(0.318, 0.009, 0.28) + g(0.5, 0.04, 0.22);
    };
    let phase = 0, last = 0, bpm = 72, vis = false, raf = 0;
    const SAMPLES = 220, SPAN = 3.2; // beats visible
    const drawEcg = (now) => {
      raf = 0;
      const dt = last ? Math.min(0.05, (now - last) / 1000) : 0; last = now;
      bpm = 72 + Math.sin(now / 4200) * 6 + Math.sin(now / 1300) * 1.5;
      phase += dt * bpm / 60;
      let d = '';
      for (let i = 0; i <= SAMPLES; i++) {
        const u = i / SAMPLES;
        const x = ((phase + u * SPAN) % 1 + 1) % 1;
        d += (i ? 'L' : 'M') + (u * 600).toFixed(1) + ' ' + (104 - beat(x) * 74).toFixed(1);
      }
      ecg.setAttribute('d', d);
      bpmEl.textContent = Math.round(bpm);
      if (vis && !reduce) raf = requestAnimationFrame(drawEcg);
    };
    new IntersectionObserver((en) => {
      vis = en[0].isIntersecting;
      if (vis && !raf) { last = 0; raf = requestAnimationFrame(drawEcg); }
    }).observe(ecg);
  }

  /* ── back to top: appears after the hero, lifts above a cylinder's bottom bar ── */
  {
    const btn = document.querySelector('.totop');
    if (btn) {
      const prog = btn.querySelector('.totop__prog');
      const inRing = new Set();
      let queued = false, lastOff = -1, lastShow = null, lastLift = null;
      const update = () => {
        queued = false;
        const max = document.documentElement.scrollHeight - innerHeight;
        const f = max > 0 ? Math.min(1, scrollY / max) : 0;
        const off = (138.2 * (1 - f)).toFixed(1);
        if (off !== lastOff) { prog.style.strokeDashoffset = off; lastOff = off; }
        const show = scrollY > innerHeight * 0.6;
        if (show !== lastShow) { btn.classList.toggle('show', show); lastShow = show; }
        const lift = inRing.size > 0;
        if (lift !== lastLift) { btn.classList.toggle('lift', lift); lastLift = lift; }
      };
      const queue = () => { if (!queued) { queued = true; requestAnimationFrame(update); } };
      addEventListener('scroll', queue, { passive: true });
      addEventListener('resize', queue);
      const io = new IntersectionObserver((en) => {
        en.forEach((e) => (e.isIntersecting ? inRing.add(e.target) : inRing.delete(e.target)));
        queue();
      }, { rootMargin: '0px 0px -99% 0px' });
      document.querySelectorAll('.ring').forEach((r) => io.observe(r));
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        scrollTo({ top: 0, behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
      });
      update();
    }
  }

  /* ── skill index: point at an area (or tap it) to see its skills ── */
  {
    const tabs = [...document.querySelectorAll('.kit__tab')];
    const show = (t, focus) => {
      tabs.forEach((x) => {
        const on = x === t;
        x.classList.toggle('on', on); x.setAttribute('aria-selected', on); x.tabIndex = on ? 0 : -1;
        document.getElementById(x.getAttribute('aria-controls')).classList.toggle('on', on);
      });
      if (focus) t.focus({ preventScroll: true });
      const row = t.parentElement;
      if (row.scrollWidth > row.clientWidth) {
        const want = t.offsetLeft - (row.clientWidth - t.offsetWidth) / 2;
        row.scrollTo({ left: Math.max(0, want), behavior: 'smooth' });
      }
    };
    const fine = matchMedia('(hover: hover) and (pointer: fine)');
    tabs.forEach((t, i) => {
      t.addEventListener('click', () => show(t));
      t.addEventListener('pointerenter', () => { if (fine.matches) show(t); });
      t.addEventListener('keydown', (e) => {
        const d = { ArrowDown: 1, ArrowRight: 1, ArrowUp: -1, ArrowLeft: -1 }[e.key];
        if (d) { e.preventDefault(); show(tabs[(i + d + tabs.length) % tabs.length], true); }
      });
    });
  }
})();
