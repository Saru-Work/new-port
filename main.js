/* ==========================================================================
   Saru — portfolio · interactions
   Vanilla JS, no dependencies.
   ========================================================================== */
(() => {
  "use strict";

  // ───────── Config — edit me ─────────
  const CONFIG = {
    timezone: "Asia/Colombo",
    email: "saruatwork@gmail.com", // shown in the footer + copied on click
    medium: "saruatwork", // Medium username — the Writing section loads its live feed
    links: {
      "GitHub — Saru-Work": "https://github.com/Saru-Work",
      "LinkedIn": "https://linkedin.com/in/saruhasan-thavachelvan",
      "Medium — articles": "https://medium.com/@saruatwork",
      "All repositories": "https://github.com/Saru-Work?tab=repositories",
    },
  };

  // ───────── Helpers ─────────
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const lerp = (a, b, t) => a + (b - a) * t;
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  const root = document.documentElement;
  const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const finePointer = matchMedia("(hover: hover) and (pointer: fine)").matches;
  const isMac = /Mac|iPhone|iPad/.test(navigator.platform || navigator.userAgent);
  const cssVar = (name) => getComputedStyle(root).getPropertyValue(name).trim();
  const hexToRgb = (hex) => {
    const h = hex.replace("#", "");
    const n = parseInt(h.length === 3 ? h.split("").map((c) => c + c).join("") : h, 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  };

  const mouse = { x: innerWidth / 2, y: innerHeight / 2, speed: 0 };
  addEventListener("pointermove", (e) => {
    mouse.speed = Math.hypot(e.clientX - mouse.x, e.clientY - mouse.y);
    mouse.x = e.clientX; mouse.y = e.clientY;
  }, { passive: true });

  // shared "heartbeat" value (drives --pulse)
  const beat = { pulse: 0, next: 0 };

  // ───────── Theme ─────────
  const mqDark = matchMedia("(prefers-color-scheme: dark)");
  const palette = { bg: [12, 12, 11], ink: [239, 235, 226], accent: [255, 91, 31] };
  const currentTheme = () => root.dataset.theme || (mqDark.matches ? "dark" : "light");

  function readPalette() {
    palette.bg = hexToRgb(cssVar("--bg"));
    palette.ink = hexToRgb(cssVar("--ink"));
    palette.accent = hexToRgb(cssVar("--accent"));
    const meta = $('meta[name="theme-color"]');
    if (meta) meta.setAttribute("content", cssVar("--bg"));
  }
  function onThemeChanged() {
    readPalette();
    drawTerrain(0, true);
    renderLab();
  }
  function toggleTheme(origin) {
    const next = currentTheme() === "dark" ? "light" : "dark";
    const apply = () => {
      root.dataset.theme = next;
      try { localStorage.setItem("theme", next); } catch (e) { /* storage unavailable */ }
      onThemeChanged();
    };
    if (!document.startViewTransition || reduced) { apply(); return; }
    let x = innerWidth - 60, y = 30;
    if (origin && origin.getBoundingClientRect) {
      const r = origin.getBoundingClientRect();
      if (r.width) { x = r.left + r.width / 2; y = r.top + r.height / 2; }
    }
    const radius = Math.hypot(Math.max(x, innerWidth - x), Math.max(y, innerHeight - y));
    const vt = document.startViewTransition(apply);
    vt.ready.then(() => {
      root.animate(
        { clipPath: [`circle(0px at ${x}px ${y}px)`, `circle(${radius}px at ${x}px ${y}px)`] },
        { duration: 850, easing: "cubic-bezier(.7,0,.2,1)", pseudoElement: "::view-transition-new(root)" }
      );
    }).catch(() => {});
  }
  function initTheme() {
    readPalette();
    $$("[data-theme-toggle]").forEach((b) => b.addEventListener("click", () => toggleTheme(b)));
    mqDark.addEventListener("change", () => { if (!root.dataset.theme) onThemeChanged(); });
  }

  // ───────── Loader ─────────
  function runLoader() {
    const num = $("#loadNum"), bar = $("#loadBar"), msg = $("#loadMsg"), loader = $("#loader");
    const msgs = ["resolving modules…", "compiling shaders…", "initialising weights…", "warming the cache…", "ready."];
    const finish = () => {
      root.classList.add("is-loaded");
      setTimeout(() => { root.classList.remove("is-loading"); loader.style.display = "none"; }, reduced ? 0 : 1150);
    };
    if (reduced) { finish(); return; }
    const dur = 1700, start = performance.now();
    const fontsReady = Promise.race([document.fonts ? document.fonts.ready : Promise.resolve(), new Promise((r) => setTimeout(r, 2500))]);
    const tick = (now) => {
      const p = clamp((now - start) / dur, 0, 1);
      const e = p < 0.5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2;
      const v = Math.round(e * 100);
      num.textContent = String(v).padStart(3, "0");
      bar.style.width = v + "%";
      msg.textContent = msgs[Math.min(msgs.length - 1, Math.floor(p * msgs.length))];
      if (p < 1) requestAnimationFrame(tick);
      else fontsReady.then(() => setTimeout(finish, 150));
    };
    requestAnimationFrame(tick);
  }

  // ───────── Clock ─────────
  function runClock() {
    const fmt = new Intl.DateTimeFormat("en-GB", { hour: "2-digit", minute: "2-digit", timeZone: CONFIG.timezone });
    const els = [$("#clock"), $("#clock2")].filter(Boolean);
    const upd = () => { const t = fmt.format(new Date()); els.forEach((el) => (el.textContent = t)); };
    upd(); setInterval(upd, 10000);
  }

  // ───────── Rolling hover text ─────────
  function rollingLinks() {
    $$("[data-hover-text]").forEach((el) => { el.innerHTML = `<span class="roll">${el.innerHTML}</span>`; });
  }

  // ───────── Cursor + magnetic ─────────
  const cursor = { el: $("#cursor"), ring: null, dot: null, label: $("#cursorLabel"), rx: mouse.x, ry: mouse.y };
  function initCursor() {
    if (!finePointer) return;
    root.classList.add("has-cursor");
    cursor.ring = $(".cursor__ring", cursor.el);
    cursor.dot = $(".cursor__dot", cursor.el);
    document.addEventListener("mouseover", (e) => {
      const t = e.target.closest("[data-cursor]");
      if (t) { cursor.label.textContent = t.dataset.cursor; cursor.el.classList.add("has-label"); }
    });
    document.addEventListener("mouseout", (e) => {
      const t = e.target.closest("[data-cursor]");
      if (t && !t.contains(e.relatedTarget)) cursor.el.classList.remove("has-label");
    });
    addEventListener("pointerdown", () => cursor.el.classList.add("is-down"));
    addEventListener("pointerup", () => cursor.el.classList.remove("is-down"));
    document.addEventListener("mouseleave", () => (cursor.el.style.opacity = 0));
    document.addEventListener("mouseenter", () => (cursor.el.style.opacity = 1));

    $$("[data-magnetic]").forEach((el) => {
      el.style.transition = "transform .7s cubic-bezier(.16,1,.3,1), opacity 1s .5s";
      el.addEventListener("pointermove", (e) => {
        const r = el.getBoundingClientRect();
        const dx = e.clientX - (r.left + r.width / 2), dy = e.clientY - (r.top + r.height / 2);
        el.style.transform = `translate(${dx * 0.35}px, ${dy * 0.35}px)`;
      });
      el.addEventListener("pointerleave", () => (el.style.transform = ""));
    });
  }
  function updateCursor() {
    if (!cursor.ring) return;
    cursor.rx = lerp(cursor.rx, mouse.x, 0.18);
    cursor.ry = lerp(cursor.ry, mouse.y, 0.18);
    cursor.dot.style.transform = `translate(${mouse.x}px, ${mouse.y}px)`;
    cursor.ring.style.transform = `translate(${cursor.rx}px, ${cursor.ry}px)`;
  }

  // ───────── Menu ─────────
  function initMenu() {
    const btn = $("#menuBtn"), menu = $("#menu");
    const set = (open) => {
      btn.setAttribute("aria-expanded", open);
      menu.classList.toggle("is-open", open);
      menu.setAttribute("aria-hidden", !open);
    };
    btn.addEventListener("click", () => set(btn.getAttribute("aria-expanded") !== "true"));
    $$("a", menu).forEach((a) => a.addEventListener("click", () => set(false)));
    addEventListener("keydown", (e) => e.key === "Escape" && set(false));
  }

  // ───────── Hero: loss-landscape shader (WebGL2) ─────────
  const terrain = { gl: null, visible: true, mx: 0.5, my: 0.5, t: 0, grad: 0 };
  function initTerrain() {
    const canvas = $("#gl");
    const gl = canvas.getContext("webgl2", { antialias: false, alpha: false, powerPreference: "high-performance" });
    if (!gl) { canvas.remove(); return; }

    const vs = `#version 300 es
      in vec2 p; void main(){ gl_Position = vec4(p, 0., 1.); }`;
    const fs = `#version 300 es
      precision highp float;
      uniform vec2 uRes; uniform float uTime; uniform vec2 uMouse; uniform float uPulse;
      uniform vec3 uBg; uniform vec3 uInk; uniform vec3 uAccent;
      out vec4 o;

      vec3 permute(vec3 x){ return mod(((x*34.)+1.)*x, 289.); }
      float snoise(vec2 v){
        const vec4 C = vec4(.211324865405187, .366025403784439, -.577350269189626, .024390243902439);
        vec2 i = floor(v + dot(v, C.yy));
        vec2 x0 = v - i + dot(i, C.xx);
        vec2 i1 = (x0.x > x0.y) ? vec2(1., 0.) : vec2(0., 1.);
        vec4 x12 = x0.xyxy + C.xxzz; x12.xy -= i1;
        i = mod(i, 289.);
        vec3 p = permute(permute(i.y + vec3(0., i1.y, 1.)) + i.x + vec3(0., i1.x, 1.));
        vec3 m = max(.5 - vec3(dot(x0,x0), dot(x12.xy,x12.xy), dot(x12.zw,x12.zw)), 0.);
        m = m*m; m = m*m;
        vec3 x = 2.*fract(p*C.www) - 1.;
        vec3 h = abs(x) - .5;
        vec3 ox = floor(x + .5);
        vec3 a0 = x - ox;
        m *= 1.79284291400159 - .85373472095314*(a0*a0 + h*h);
        vec3 g; g.x = a0.x*x0.x + h.x*x0.y; g.yz = a0.yz*x12.xz + h.yz*x12.yw;
        return 130.*dot(m, g);
      }
      float fbm(vec2 p){
        float s = 0., a = .5;
        for (int i = 0; i < 4; i++){ s += a*snoise(p); p = p*2.03 + vec2(1.7, 9.2); a *= .5; }
        return s;
      }

      void main(){
        vec2 uv = gl_FragCoord.xy / uRes;
        vec2 p = (gl_FragCoord.xy - .5*uRes) / uRes.y;
        vec2 m = (uMouse - .5*uRes) / uRes.y;
        float t = uTime;

        vec2 q = p*1.25;
        vec2 w = vec2(fbm(q + vec2(0., t*.035)), fbm(q + vec2(5.2, 1.3) - t*.03));
        float h = fbm(q + .65*w + t*.015);

        // the cursor digs a basin into the landscape (a local minimum)
        float d = length(p - m);
        float basin = exp(-d*d*7.);
        h -= basin*(.55 + uPulse*.3);

        float n = h*13.;
        float f = fract(n);
        float fw = fwidth(n);
        float ld = min(f, 1. - f);
        float thin = 1. - smoothstep(0., fw*1.1, ld);
        float k = floor(n + .5);
        float major = 1. - step(.5, mod(k, 5.));
        float thick = 1. - smoothstep(0., fw*2.4, ld);

        float heat = clamp(basin*1.6, 0., 1.);
        vec3 lineCol = mix(uInk, uAccent, heat);
        float a = mix(thin*.16, thick*.48, major);
        a += thin*heat*.55;

        vec3 col = mix(uBg, uAccent, (1. - smoothstep(-.9, -.1, h))*.10);
        col = mix(col, lineCol, clamp(a, 0., 1.));

        float v = smoothstep(1.25, .25, length(p*vec2(.85, 1.)));
        col = mix(uBg, col, .55 + .45*v);
        col = mix(col, uBg, (1. - smoothstep(0., .6, uv.y))*.6);

        o = vec4(col, 1.);
      }`;

    const sh = (type, src) => {
      const s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s);
      if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) { console.error(gl.getShaderInfoLog(s)); return null; }
      return s;
    };
    const v = sh(gl.VERTEX_SHADER, vs), f = sh(gl.FRAGMENT_SHADER, fs);
    if (!v || !f) { canvas.remove(); return; }
    const prog = gl.createProgram();
    gl.attachShader(prog, v); gl.attachShader(prog, f); gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) { console.error(gl.getProgramInfoLog(prog)); canvas.remove(); return; }
    gl.useProgram(prog);

    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    const loc = gl.getAttribLocation(prog, "p");
    gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);

    const U = (n) => gl.getUniformLocation(prog, n);
    terrain.u = { res: U("uRes"), time: U("uTime"), mouse: U("uMouse"), pulse: U("uPulse"), bg: U("uBg"), ink: U("uInk"), accent: U("uAccent") };
    terrain.gl = gl; terrain.canvas = canvas;

    const resize = () => {
      const dpr = Math.min(devicePixelRatio || 1, 1.5);
      canvas.width = Math.round(canvas.clientWidth * dpr);
      canvas.height = Math.round(canvas.clientHeight * dpr);
      gl.viewport(0, 0, canvas.width, canvas.height);
    };
    resize();
    addEventListener("resize", resize);
    new IntersectionObserver(([e]) => (terrain.visible = e.isIntersecting)).observe(canvas);
  }
  const rx = $("#rx"), ry = $("#ry"), rg = $("#rg");
  function drawTerrain(dt, force) {
    const { gl, u, canvas } = terrain;
    if (!gl || (!terrain.visible && !force)) return;
    if (!reduced) terrain.t += dt;
    const rect = canvas.getBoundingClientRect();
    const tx = clamp((mouse.x - rect.left) / rect.width, -0.2, 1.2);
    const ty = clamp((mouse.y - rect.top) / rect.height, -0.2, 1.2);
    terrain.mx = lerp(terrain.mx, tx, 0.06);
    terrain.my = lerp(terrain.my, ty, 0.06);
    terrain.grad = lerp(terrain.grad, Math.min(mouse.speed / 40, 1), 0.08);
    mouse.speed *= 0.85;
    const c = (rgb) => rgb.map((x) => x / 255);
    gl.uniform2f(u.res, canvas.width, canvas.height);
    gl.uniform1f(u.time, terrain.t);
    gl.uniform2f(u.mouse, terrain.mx * canvas.width, (1 - terrain.my) * canvas.height);
    gl.uniform1f(u.pulse, beat.pulse);
    gl.uniform3fv(u.bg, c(palette.bg));
    gl.uniform3fv(u.ink, c(palette.ink));
    gl.uniform3fv(u.accent, c(palette.accent));
    gl.drawArrays(gl.TRIANGLES, 0, 3);
    if (rx) {
      rx.textContent = clamp(terrain.mx, 0, 1).toFixed(3);
      ry.textContent = clamp(1 - terrain.my, 0, 1).toFixed(3);
      rg.textContent = terrain.grad.toFixed(3);
    }
  }

  // ───────── Heartbeat ─────────
  function updateBeat(dt, now) {
    if (now >= beat.next) {
      beat.pulse = Math.max(beat.pulse, 1);
      setTimeout(() => (beat.pulse = Math.max(beat.pulse, 0.55)), 200);
      beat.next = now + 1.6;
    }
    beat.pulse *= Math.exp(-dt * 6);
    root.style.setProperty("--pulse", (beat.pulse * (reduced ? 0.3 : 1)).toFixed(3));
  }

  // ───────── Lab: a tiny neural network, from scratch ─────────
  const gauss = () => { let u = 0, v = 0; while (!u) u = Math.random(); while (!v) v = Math.random(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); };
  const IN_SCALE = 1.8;

  function createNet(sizes) {
    const net = { sizes, L: sizes.length - 1, t: 0, W: [], b: [], gW: [], gb: [], mW: [], vW: [], mb: [], vb: [],
      a: sizes.map((n) => new Float64Array(n)), d: sizes.map((n) => new Float64Array(n)) };
    for (let l = 0; l < net.L; l++) {
      const m = sizes[l], n = sizes[l + 1], sc = Math.sqrt(2 / (m + n));
      net.W[l] = Float64Array.from({ length: n * m }, () => gauss() * sc);
      net.b[l] = new Float64Array(n);
      for (const k of ["gW", "mW", "vW"]) net[k][l] = new Float64Array(n * m);
      for (const k of ["gb", "mb", "vb"]) net[k][l] = new Float64Array(n);
    }
    return net;
  }
  function forward(net, x, y) {
    const { sizes, W, b, a, L } = net;
    a[0][0] = x * IN_SCALE; a[0][1] = y * IN_SCALE;
    for (let l = 0; l < L; l++) {
      const m = sizes[l], n = sizes[l + 1], Wl = W[l], bl = b[l], al = a[l], out = a[l + 1];
      for (let i = 0; i < n; i++) {
        let s = bl[i];
        for (let j = 0; j < m; j++) s += Wl[i * m + j] * al[j];
        out[i] = l === L - 1 ? 1 / (1 + Math.exp(-s)) : Math.tanh(s);
      }
    }
    return a[L][0];
  }
  function trainStep(net, pts, lr) {
    const { sizes, W, a, d, L, gW, gb } = net;
    for (let l = 0; l < L; l++) { gW[l].fill(0); gb[l].fill(0); }
    let loss = 0, correct = 0;
    for (const p of pts) {
      const out = forward(net, p.x, p.y), y = p.c;
      loss -= y * Math.log(out + 1e-7) + (1 - y) * Math.log(1 - out + 1e-7);
      if ((out > 0.5) === (y === 1)) correct++;
      d[L][0] = out - y; // sigmoid + binary cross-entropy
      for (let l = L - 1; l >= 0; l--) {
        const m = sizes[l], n = sizes[l + 1], dn = d[l + 1], al = a[l], Wl = W[l];
        for (let i = 0; i < n; i++) {
          gb[l][i] += dn[i];
          for (let j = 0; j < m; j++) gW[l][i * m + j] += dn[i] * al[j];
        }
        if (l > 0) {
          for (let j = 0; j < m; j++) {
            let s = 0;
            for (let i = 0; i < n; i++) s += Wl[i * m + j] * dn[i];
            d[l][j] = s * (1 - al[j] * al[j]); // tanh'
          }
        }
      }
    }
    // Adam
    const N = pts.length, b1 = 0.9, b2 = 0.999;
    net.t++;
    const c1 = 1 - Math.pow(b1, net.t), c2 = 1 - Math.pow(b2, net.t);
    const adam = (w, g, mo, ve) => {
      for (let i = 0; i < w.length; i++) {
        const gi = g[i] / N;
        mo[i] = b1 * mo[i] + (1 - b1) * gi;
        ve[i] = b2 * ve[i] + (1 - b2) * gi * gi;
        w[i] -= (lr * (mo[i] / c1)) / (Math.sqrt(ve[i] / c2) + 1e-8);
      }
    };
    for (let l = 0; l < L; l++) { adam(W[l], gW[l], net.mW[l], net.vW[l]); adam(net.b[l], gb[l], net.mb[l], net.vb[l]); }
    return { loss: loss / N, acc: correct / N };
  }

  const lab = {
    canvas: $("#labCanvas"), ctx: null, off: null, offCtx: null, img: null,
    net: null, pts: [], cls: 1, running: true, visible: false, epoch: 0, losses: [], last: null, frame: 0,
    w: 0, h: 0, gw: 64, gh: 44, ry: 0.6875,
  };
  const DATASETS = {
    spiral() {
      const pts = [], n = 70;
      for (let k = 0; k < 2; k++) for (let i = 0; i < n; i++) {
        const t = i / n, r = 0.08 + t * 0.82, ang = t * 3.4 * Math.PI + k * Math.PI;
        pts.push({ x: r * Math.cos(ang) + gauss() * 0.02, y: r * Math.sin(ang) * 0.72 + gauss() * 0.02, c: k });
      }
      return pts;
    },
    circle() {
      const pts = [];
      for (let i = 0; i < 140; i++) {
        const inner = i % 2 === 0, ang = Math.random() * Math.PI * 2;
        const r = inner ? Math.sqrt(Math.random()) * 0.3 : 0.48 + Math.random() * 0.14;
        pts.push({ x: r * Math.cos(ang), y: r * Math.sin(ang) * 0.92, c: inner ? 1 : 0 });
      }
      return pts;
    },
    xor() {
      const pts = [];
      for (let i = 0; i < 140; i++) {
        const sx = Math.random() < 0.5 ? -1 : 1, sy = Math.random() < 0.5 ? -1 : 1;
        pts.push({ x: sx * 0.42 + gauss() * 0.13, y: sy * 0.3 + gauss() * 0.1, c: sx * sy > 0 ? 1 : 0 });
      }
      return pts;
    },
  };

  function labResize() {
    const c = lab.canvas, dpr = Math.min(devicePixelRatio || 1, 2);
    lab.w = c.width = Math.round(c.clientWidth * dpr);
    lab.h = c.height = Math.round(c.clientHeight * dpr);
    lab.ry = lab.h / lab.w; // y range is ±ry
    lab.gh = Math.max(16, Math.round(lab.gw * lab.ry));
    lab.off.width = lab.gw; lab.off.height = lab.gh;
    lab.img = lab.offCtx.createImageData(lab.gw, lab.gh);
    renderLab();
  }
  function labReinit() {
    lab.net = createNet([2, 16, 16, 1]);
    lab.epoch = 0; lab.losses = []; lab.last = null;
    updateLabStats();
  }
  function loadPreset(name) {
    lab.pts = DATASETS[name]();
    $$("[data-preset]").forEach((b) => b.classList.toggle("is-on", b.dataset.preset === name));
    labReinit();
    setRunning(true);
  }
  function setRunning(on) {
    lab.running = on;
    const b = $("#labPlay");
    b.setAttribute("aria-pressed", on);
    b.textContent = on ? "Pause" : "Train";
  }
  function initLab() {
    if (!lab.canvas) return;
    lab.ctx = lab.canvas.getContext("2d");
    lab.off = document.createElement("canvas");
    lab.offCtx = lab.off.getContext("2d");
    labReinit();
    lab.pts = DATASETS.spiral();
    $('[data-preset="spiral"]').classList.add("is-on");
    labResize();
    addEventListener("resize", labResize);
    new IntersectionObserver(([e]) => (lab.visible = e.isIntersecting), { threshold: 0.1 }).observe(lab.canvas);

    const toDomain = (e) => {
      const r = lab.canvas.getBoundingClientRect();
      return { x: ((e.clientX - r.left) / r.width) * 2 - 1, y: -(((e.clientY - r.top) / r.height) * 2 - 1) * lab.ry };
    };
    const add = (e, cls) => {
      const p = toDomain(e);
      lab.pts.push({ x: p.x, y: p.y, c: cls });
      if (lab.pts.length > 400) lab.pts.shift();
      $$("[data-preset]").forEach((b) => b.classList.remove("is-on"));
      setRunning(true);
      beat.pulse = Math.max(beat.pulse, 0.6);
      renderLab();
    };
    lab.canvas.addEventListener("pointerdown", (e) => {
      if (e.button === 2) return;
      add(e, e.shiftKey ? 1 - lab.cls : lab.cls);
    });
    lab.canvas.addEventListener("contextmenu", (e) => { e.preventDefault(); add(e, 1 - lab.cls); });

    $$("[data-class]").forEach((b) => b.addEventListener("click", () => {
      lab.cls = +b.dataset.class;
      $$("[data-class]").forEach((x) => x.classList.toggle("is-on", x === b));
    }));
    $$("[data-preset]").forEach((b) => b.addEventListener("click", () => loadPreset(b.dataset.preset)));
    $("#labPlay").addEventListener("click", () => setRunning(!lab.running));
    $("#labReset").addEventListener("click", () => { labReinit(); setRunning(true); });
    $("#labClear").addEventListener("click", () => {
      lab.pts = []; labReinit();
      $$("[data-preset]").forEach((b) => b.classList.remove("is-on"));
      renderLab();
    });
  }
  function updateLab() {
    if (!lab.net || !lab.visible) return;
    const hasBoth = lab.pts.some((p) => p.c === 1) && lab.pts.some((p) => p.c === 0);
    if (lab.running && hasBoth) {
      const steps = reduced ? 1 : 4;
      for (let s = 0; s < steps; s++) {
        lab.last = trainStep(lab.net, lab.pts, 0.03);
        lab.epoch++;
        if (lab.epoch % 8 === 0) { lab.losses.push(lab.last.loss); if (lab.losses.length > 140) lab.losses.shift(); }
        if (lab.epoch % 150 === 0) beat.pulse = Math.max(beat.pulse, 0.5);
      }
      updateLabStats();
    }
    if (++lab.frame % 2 === 0) renderLab();
  }
  function updateLabStats() {
    $("#labEpoch").textContent = lab.epoch.toLocaleString("en");
    $("#labLoss").textContent = lab.last ? lab.last.loss.toFixed(3) : "—";
    $("#labAcc").textContent = lab.last ? Math.round(lab.last.acc * 100) + "%" : "—";
    const pl = $("#labSpark polyline");
    if (!lab.losses.length) { pl.setAttribute("points", ""); return; }
    const max = Math.max(...lab.losses, 0.01);
    pl.setAttribute("points", lab.losses.map((l, i) => `${(i / 139) * 120},${34 - (l / max) * 32}`).join(" "));
  }
  function renderLab() {
    if (!lab.ctx || !lab.net || !lab.img) return;
    const { gw, gh, img, ctx, w, h, ry } = lab;
    const [br, bg, bb] = palette.bg, [ar, ag, ab] = palette.accent, [ir, ig, ib] = palette.ink;
    const data = img.data;
    for (let j = 0; j < gh; j++) {
      const y = -(((j + 0.5) / gh) * 2 - 1) * ry;
      for (let i = 0; i < gw; i++) {
        const x = ((i + 0.5) / gw) * 2 - 1;
        const p = forward(lab.net, x, y);
        const s = Math.pow(Math.abs(p - 0.5) * 2, 0.7) * 0.32;
        const A = p > 0.5;
        const o = (j * gw + i) * 4;
        data[o] = br + ((A ? ar : ir) - br) * s;
        data[o + 1] = bg + ((A ? ag : ig) - bg) * s;
        data[o + 2] = bb + ((A ? ab : ib) - bb) * s;
        data[o + 3] = 255;
      }
    }
    lab.offCtx.putImageData(img, 0, 0);
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(lab.off, 0, 0, w, h);

    // axes
    ctx.strokeStyle = `rgba(${ir},${ig},${ib},0.12)`;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(w / 2, 0); ctx.lineTo(w / 2, h);
    ctx.moveTo(0, h / 2); ctx.lineTo(w, h / 2);
    ctx.stroke();

    // points
    const dpr = w / lab.canvas.clientWidth || 1;
    const rad = 4.2 * dpr;
    for (const p of lab.pts) {
      const px = ((p.x + 1) / 2) * w, py = ((-p.y / ry + 1) / 2) * h;
      ctx.beginPath();
      ctx.arc(px, py, rad, 0, Math.PI * 2);
      ctx.fillStyle = p.c === 1 ? `rgb(${ar},${ag},${ab})` : `rgb(${ir},${ig},${ib})`;
      ctx.fill();
      ctx.lineWidth = 1.5 * dpr;
      ctx.strokeStyle = `rgb(${br},${bg},${bb})`;
      ctx.stroke();
    }
    if (!lab.pts.length) {
      ctx.fillStyle = `rgba(${ir},${ig},${ib},0.5)`;
      ctx.font = `${12 * dpr}px "JetBrains Mono", monospace`;
      ctx.textAlign = "center";
      ctx.fillText("CLICK TO ADD TRAINING DATA", w / 2, h / 2 - 12 * dpr);
    }
  }

  // ───────── Terminal ─────────
  function initTerminal() {
    const body = $("#termBody");
    if (!body) return;
    const script = [
      { cmd: "whoami", out: `<span class="c">saruhasan</span> — software engineer · backend &amp; AI` },
      { cmd: "cat stack.json", out:
`{
  <span class="k">"lang"</span>: [<span class="c">"ts","python","java"</span>],
  <span class="k">"api"</span>:  [<span class="c">"node","fastapi","spring"</span>],
  <span class="k">"data"</span>: [<span class="c">"postgres","mongodb","redis"</span>],
  <span class="k">"ai"</span>:   [<span class="c">"openai","langchain","ollama"</span>]
}` },
      { cmd: "cat motto.txt", out: `Understand the problem. Design the solution.\nEngineer it. Improve it.` },
    ];
    let html = "";
    const prompt = `<span class="p">~ $</span> `;
    const render = (extra = "") => (body.innerHTML = html + extra + `<span class="term__cursor"></span>`);
    const finalHTML = () => script.map((s) => `${prompt}<span class="c">${s.cmd}</span>\n${s.out}\n`).join("") + prompt;
    if (reduced) { html = finalHTML(); render(); return; }
    render(prompt);

    const run = async () => {
      const wait = (ms) => new Promise((r) => setTimeout(r, ms));
      for (const s of script) {
        let typed = "";
        for (const ch of s.cmd) { typed += ch; render(prompt + `<span class="c">${typed}</span>`); await wait(55 + Math.random() * 60); }
        await wait(260);
        html += `${prompt}<span class="c">${s.cmd}</span>\n${s.out}\n`;
        render(prompt);
        await wait(500);
      }
      html += prompt;
      render();
    };
    const io = new IntersectionObserver(([e]) => { if (e.isIntersecting) { io.disconnect(); run(); } }, { threshold: 0.4 });
    io.observe(body);
  }

  // ───────── Command palette ─────────
  function initPalette() {
    const wrap = $("#palette"), input = $("#paletteInput"), list = $("#paletteList");
    const mod = isMac ? "⌘" : "Ctrl";
    $("#modKey").textContent = mod;
    $$(".mod-key-mirror").forEach((k) => (k.textContent = mod));

    const go = (sel) => () => document.querySelector(sel).scrollIntoView({ behavior: reduced ? "auto" : "smooth" });
    const openLink = (url) => () => { if (url && url !== "#") window.open(url, "_blank", "noopener"); };
    const commands = [
      { group: "Navigate", label: "Work", hint: "03", run: go("#work") },
      { group: "Navigate", label: "Focus areas", hint: "04", run: go("#capabilities") },
      { group: "Navigate", label: "Lab — live neural net", hint: "05", run: go("#lab") },
      { group: "Navigate", label: "How I work", hint: "06", run: go("#process") },
      { group: "Navigate", label: "Toolbox — tech stack", hint: "07", run: go("#toolbox") },
      { group: "Navigate", label: "Writing — articles", hint: "08", run: go("#writing") },
      { group: "Navigate", label: "Contact", hint: "09", run: go("#contact") },
      { group: "Navigate", label: "Back to top", hint: "01", run: go("#top") },
      { group: "Actions", label: "Toggle light / dark mode", hint: "theme", run: () => toggleTheme($("[data-theme-toggle]")) },
      { group: "Actions", label: "Copy email address", hint: "copy", run: () => copyEmail() },
      { group: "Actions", label: "Train the network on a spiral", hint: "lab", run: () => { go("#lab")(); loadPreset("spiral"); } },
      { group: "Actions", label: "Train the network on XOR", hint: "lab", run: () => { go("#lab")(); loadPreset("xor"); } },
      ...Object.entries(CONFIG.links).map(([label, url]) => ({ group: "Links", label, hint: "↗", run: openLink(url) })),
    ];
    let filtered = commands, sel = 0, lastFocus = null;

    const match = (q, s) => { // subsequence fuzzy match
      q = q.toLowerCase(); s = s.toLowerCase();
      let i = 0;
      for (const ch of s) if (ch === q[i]) i++;
      return i === q.length;
    };
    const render = () => {
      const q = input.value.trim();
      filtered = q ? commands.filter((c) => match(q, c.label)) : commands;
      sel = clamp(sel, 0, Math.max(0, filtered.length - 1));
      if (!filtered.length) { list.innerHTML = `<li class="palette__empty">No matches. Try “lab” or “theme”.</li>`; return; }
      let html = "", group = "";
      filtered.forEach((c, i) => {
        if (!q && c.group !== group) { group = c.group; html += `<li class="palette__group" role="presentation">${group}</li>`; }
        html += `<li class="palette__item" role="option" id="pc-${i}" data-i="${i}" aria-selected="${i === sel}"><span>${c.label}</span><span>${c.hint}</span></li>`;
      });
      list.innerHTML = html;
      const active = $(`#pc-${sel}`, list);
      if (active) { active.scrollIntoView({ block: "nearest" }); input.setAttribute("aria-activedescendant", active.id); }
    };
    const open = () => {
      lastFocus = document.activeElement;
      wrap.hidden = false; input.value = ""; sel = 0; render();
      requestAnimationFrame(() => input.focus());
    };
    const close = () => { wrap.hidden = true; if (lastFocus && lastFocus.focus) lastFocus.focus(); };
    const exec = (i) => { const c = filtered[i]; if (!c) return; close(); setTimeout(c.run, 10); };

    $("#paletteBtn").addEventListener("click", open);
    input.addEventListener("input", () => { sel = 0; render(); });
    list.addEventListener("pointermove", (e) => {
      const it = e.target.closest(".palette__item");
      if (it && +it.dataset.i !== sel) { sel = +it.dataset.i; render(); }
    });
    list.addEventListener("click", (e) => { const it = e.target.closest(".palette__item"); if (it) exec(+it.dataset.i); });
    wrap.addEventListener("pointerdown", (e) => { if (e.target === wrap) close(); });
    addEventListener("keydown", (e) => {
      const typing = /INPUT|TEXTAREA/.test(document.activeElement.tagName) && document.activeElement !== input;
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") { e.preventDefault(); wrap.hidden ? open() : close(); return; }
      if (!wrap.hidden) {
        if (e.key === "Escape") { e.preventDefault(); close(); }
        else if (e.key === "ArrowDown") { e.preventDefault(); sel = (sel + 1) % filtered.length; render(); }
        else if (e.key === "ArrowUp") { e.preventDefault(); sel = (sel - 1 + filtered.length) % filtered.length; render(); }
        else if (e.key === "Enter") { e.preventDefault(); exec(sel); }
        else if (e.key === "Tab") { e.preventDefault(); input.focus(); }
      } else if (e.key === "/" && !typing) { e.preventDefault(); open(); }
    });
  }

  // ───────── Marquee ─────────
  const marquee = { track: $("#marquee"), x: 0, w: 0, dir: -1 };
  function initMarquee() {
    const group = $(".marquee__group", marquee.track);
    const fill = () => {
      $$(".marquee__group", marquee.track).slice(1).forEach((g) => g.remove());
      marquee.w = group.getBoundingClientRect().width;
      const copies = Math.max(2, Math.ceil((innerWidth * 2) / marquee.w));
      for (let i = 1; i < copies; i++) {
        const c = group.cloneNode(true); c.setAttribute("aria-hidden", "true"); marquee.track.appendChild(c);
      }
    };
    fill();
    addEventListener("resize", fill);
    if (document.fonts) document.fonts.ready.then(fill);
  }
  function updateMarquee(dt, vel) {
    if (!marquee.w || reduced) return;
    if (Math.abs(vel) > 0.5) marquee.dir = vel > 0 ? -1 : 1;
    const speed = 80 * (1 + Math.min(Math.abs(vel) * 0.08, 4)) + beat.pulse * 40;
    marquee.x += marquee.dir * speed * dt;
    if (marquee.x <= -marquee.w) marquee.x += marquee.w;
    if (marquee.x > 0) marquee.x -= marquee.w;
    const skew = clamp(vel * 0.25, -12, 12);
    marquee.track.style.transform = `translate3d(${marquee.x}px,0,0) skewX(${skew}deg)`;
  }

  // ───────── About: words light up as you read ─────────
  const about = { el: $("#aboutText"), words: [] };
  function initAbout() {
    const words = about.el.textContent.trim().split(/\s+/);
    about.el.innerHTML = words.map((w) => `<span class="w">${w}</span>`).join(" ");
    about.words = $$(".w", about.el);
  }
  function updateAbout() {
    const r = about.el.getBoundingClientRect(), vh = innerHeight;
    if (r.bottom < 0 || r.top > vh) return;
    const p = clamp((vh * 0.85 - r.top) / (r.height + vh * 0.25), 0, 1);
    const on = Math.floor(p * about.words.length * 1.05);
    about.words.forEach((w, i) => w.classList.toggle("on", i < on));
  }

  // ───────── Reveals ─────────
  function initReveals() {
    // Observe the parent: a fully clipped element never registers as intersecting.
    const map = new Map();
    const io = new IntersectionObserver((entries) => entries.forEach((e) => {
      if (!e.isIntersecting) return;
      map.get(e.target).forEach((el) => el.classList.add("in"));
      io.unobserve(e.target);
    }), { threshold: 0.15 });
    $$("[data-reveal]").forEach((el) => {
      const host = el.parentElement;
      if (!map.has(host)) { map.set(host, []); io.observe(host); }
      map.get(host).push(el);
    });
  }

  // ───────── Work: floating preview ─────────
  const preview = { el: $("#preview"), track: $("#previewTrack"), x: 0, y: 0, s: 0, target: 0, rot: 0 };
  function initWork() {
    const items = $$(".work__item");
    const artHTML = (item) => `<div class="art" style="${item.getAttribute("style")}">
        <small>${item.dataset.stack || ""}</small><b>${item.dataset.glyph || ""}</b><strong>${item.dataset.metric || ""}</strong></div>`;
    items.forEach((item, i) => {
      const slide = document.createElement("div");
      slide.className = "preview__slide";
      slide.style.top = i * 100 + "%";
      slide.innerHTML = artHTML(item);
      preview.track.appendChild(slide);
      $(".work__thumb", item).innerHTML = artHTML(item);
      item.addEventListener("mouseenter", () => { preview.track.style.transform = `translateY(${-i * 100}%)`; });
    });
    const list = $("#workList");
    list.addEventListener("mouseenter", () => { preview.target = 1; preview.x = mouse.x; preview.y = mouse.y; });
    list.addEventListener("mouseleave", () => (preview.target = 0));
  }
  function updatePreview() {
    if (!finePointer) return;
    const px = preview.x;
    preview.x = lerp(preview.x, mouse.x, 0.12);
    preview.y = lerp(preview.y, mouse.y, 0.12);
    preview.s = lerp(preview.s, preview.target, 0.12);
    preview.rot = lerp(preview.rot, clamp((preview.x - px) * 0.6, -14, 14), 0.15);
    if (preview.s < 0.001 && preview.target === 0) { preview.el.style.transform = "scale(0)"; return; }
    preview.el.style.transform = `translate(${preview.x}px, ${preview.y}px) rotate(${preview.rot}deg) scale(${preview.s})`;
  }

  // ───────── Process: horizontal scroll ─────────
  const proc = { el: $("#process"), track: $("#processTrack"), steps: $$(".step"), num: $("#procNum"), pinned: false, active: -1 };
  function setupProcess() {
    proc.pinned = innerWidth >= 900 && !reduced;
    proc.el.classList.toggle("no-pin", !proc.pinned);
    proc.active = -1;
    if (!proc.pinned) { proc.track.style.transform = ""; proc.steps.forEach((s) => s.classList.add("active")); }
    else proc.steps.forEach((s) => s.classList.remove("active"));
  }
  function updateProcess() {
    if (!proc.pinned) return;
    const r = proc.el.getBoundingClientRect();
    const total = proc.el.offsetHeight - innerHeight;
    const p = clamp(-r.top / total, 0, 1);
    const max = proc.track.scrollWidth - innerWidth;
    proc.track.style.transform = `translate3d(${-p * max}px,0,0)`;
    const a = Math.min(proc.steps.length - 1, Math.floor(p * proc.steps.length));
    if (a !== proc.active) {
      proc.steps.forEach((s, i) => s.classList.toggle("active", i <= a));
      proc.num.textContent = String(a + 1).padStart(2, "0");
      proc.active = a;
    }
  }

  // ───────── Numbers ─────────
  function initNumbers() {
    const io = new IntersectionObserver((entries) => entries.forEach((e) => {
      if (!e.isIntersecting) return;
      io.unobserve(e.target);
      const el = e.target, end = +el.dataset.count, dec = +(el.dataset.decimals || 0);
      const start = performance.now(), dur = reduced ? 1 : 1600;
      const tick = (now) => {
        const p = clamp((now - start) / dur, 0, 1);
        el.textContent = (end * (1 - Math.pow(2, -10 * p))).toFixed(dec);
        if (p < 1) requestAnimationFrame(tick); else el.textContent = end.toFixed(dec);
      };
      requestAnimationFrame(tick);
    }), { threshold: 0.6 });
    $$("[data-count]").forEach((el) => io.observe(el));
  }

  // ───────── Email copy ─────────
  async function copyEmail() {
    const hint = $("#emailHint");
    try {
      await navigator.clipboard.writeText(CONFIG.email);
      hint.textContent = "Copied — talk soon ✓";
      $("#cursorLabel").textContent = "Copied";
    } catch (e) {
      location.href = `mailto:${CONFIG.email}`;
    }
    setTimeout(() => { hint.textContent = "Click to copy"; $("#cursorLabel").textContent = "Copy"; }, 2200);
  }
  function initEmail() {
    $("#emailText").textContent = CONFIG.email;
    $("#emailBtn").addEventListener("click", copyEmail);
  }

  // ───────── Big name: letters gain weight near the cursor ─────────
  const big = { el: $("#bigname"), letters: [], weights: [], visible: false };
  function initBigName() {
    const text = big.el.textContent;
    big.el.innerHTML = [...text].map((c) => `<span aria-hidden="true">${c}</span>`).join("");
    big.letters = $$("span", big.el);
    big.weights = big.letters.map(() => 200);
    new IntersectionObserver(([e]) => (big.visible = e.isIntersecting)).observe(big.el);
  }
  function updateBigName(time) {
    if (!big.visible) return;
    const r = big.el.getBoundingClientRect();
    const mouseNear = finePointer && mouse.y > r.top - 200 && mouse.y < r.bottom + 200;
    big.letters.forEach((l, i) => {
      let target;
      if (mouseNear) {
        const lr = l.getBoundingClientRect();
        const d = Math.hypot(mouse.x - (lr.left + lr.width / 2), (mouse.y - (lr.top + lr.height / 2)) * 0.6);
        target = 200 + 700 * clamp(1 - d / (innerWidth * 0.3), 0, 1);
      } else {
        target = reduced ? 400 : 200 + 350 * (0.5 + 0.5 * Math.sin(time * 1.6 - i * 0.9));
      }
      target += beat.pulse * 100;
      big.weights[i] = lerp(big.weights[i], clamp(target, 200, 900), 0.12);
      l.style.fontWeight = Math.round(big.weights[i]);
    });
  }

  // ───────── Writing: live Medium feed ─────────
  // Medium's RSS doesn't allow cross-origin requests, so the feed goes through
  // rss2json (free, no key). If that fails, the articles baked into the HTML stay.
  const CURATED_EXCERPTS = {
    "2d6994e8811d": "Putting the theory into practice — a simple authentication system with Node.js and MongoDB, built step by step with JSON Web Tokens.",
    "661220a9e686": "What JSON Web Tokens are, how they work, and why they took over from traditional session-based authentication.",
  };
  async function initWriting() {
    const list = $("#writingList");
    if (!list || !CONFIG.medium) return;
    const feed = `https://medium.com/feed/@${CONFIG.medium}`;
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 6000);
    try {
      const res = await fetch(`https://api.rss2json.com/v1/api.json?rss_url=${encodeURIComponent(feed)}`, { signal: ctrl.signal });
      const data = await res.json();
      if (data.status !== "ok" || !Array.isArray(data.items) || !data.items.length) return;
      const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
      const fmt = new Intl.DateTimeFormat("en-US", { month: "short", day: "2-digit", year: "numeric" });
      list.innerHTML = data.items.map((it) => {
        const link = String(it.link || "").split("?")[0];
        if (!/^https:\/\/medium\.com\//.test(link)) return "";
        const id = link.split("-").pop();
        const text = String(it.content || it.description || "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
        const words = text.split(" ").length;
        const mins = Math.max(1, Math.round(words / 238));
        const excerpt = CURATED_EXCERPTS[id] || (text.split(" ").slice(0, 28).join(" ") + "…");
        const date = new Date(String(it.pubDate).replace(" ", "T") + "Z");
        const iso = isNaN(date) ? "" : date.toISOString().slice(0, 10);
        const tags = (it.categories || []).slice(0, 4).map((t) => `<span>${esc(t)}</span>`).join("");
        return `<li class="post"><a href="${esc(link)}" target="_blank" rel="noopener" data-cursor="Read ↗">
            <span class="post__meta mono"><time datetime="${iso}">${isNaN(date) ? "" : fmt.format(date)}</time><span>${mins} min read</span></span>
            <span class="post__main">
              <span class="post__title">${esc(it.title)}</span>
              <span class="post__excerpt">${esc(excerpt)}</span>
              <span class="post__tags">${tags}</span>
            </span>
            <span class="post__arrow" aria-hidden="true">↗</span>
          </a></li>`;
      }).join("") || list.innerHTML;
    } catch (e) {
      /* offline or rate-limited — keep the baked-in list */
    } finally {
      clearTimeout(timer);
    }
  }

  // ───────── Main loop ─────────
  let last = performance.now(), lastY = scrollY, vel = 0;
  function frame(now) {
    const dt = Math.min((now - last) / 1000, 0.05);
    last = now;
    vel = lerp(vel, scrollY - lastY, 0.15);
    lastY = scrollY;

    updateBeat(dt, now / 1000);
    updateCursor();
    drawTerrain(dt);
    updateMarquee(dt, vel);
    updateAbout();
    updatePreview();
    updateProcess();
    updateLab();
    updateBigName(now / 1000);
    requestAnimationFrame(frame);
  }

  // ───────── Boot ─────────
  rollingLinks();
  initTheme();
  runLoader();
  runClock();
  initCursor();
  initMenu();
  initTerrain();
  initMarquee();
  initAbout();
  initTerminal();
  initReveals();
  initWork();
  initLab();
  setupProcess();
  addEventListener("resize", setupProcess);
  initNumbers();
  initEmail();
  initPalette();
  initBigName();
  initWriting();
  requestAnimationFrame(frame);
})();
