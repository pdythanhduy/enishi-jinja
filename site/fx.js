// えにし神社の「美しさ」担当：和柄テクスチャ、祈りの灯り、蛍、環境音。
import * as THREE from "three";

// ------------------------------------------------------------------ 和柄（Canvasで描く）
const patCache = new Map();
export function wagara(kind, base, accent) {
  const key = kind + base + accent;
  if (patCache.has(key)) return patCache.get(key);
  const c = document.createElement("canvas"); c.width = c.height = 128; const x = c.getContext("2d");
  const hex = (n) => "#" + n.toString(16).padStart(6, "0");
  x.fillStyle = hex(base); x.fillRect(0, 0, 128, 128);
  x.strokeStyle = x.fillStyle = hex(accent); x.lineWidth = 3;
  if (kind === "asanoha") {                                   // 麻の葉
    const s = 32;
    for (let gy = 0; gy < 5; gy++) for (let gx = 0; gx < 5; gx++) {
      const cx = gx * s + (gy % 2 ? s / 2 : 0), cy = gy * s * 0.87;
      for (let k = 0; k < 6; k++) { const a = (k * Math.PI) / 3; x.beginPath(); x.moveTo(cx, cy); x.lineTo(cx + Math.cos(a) * s / 2, cy + Math.sin(a) * s / 2); x.stroke(); }
    }
  } else if (kind === "ichimatsu") {                          // 市松
    for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) if ((i + j) % 2) x.fillRect(i * 32, j * 32, 32, 32);
  } else if (kind === "seigaiha") {                           // 青海波
    x.lineWidth = 2.5;
    for (let row = -1; row < 6; row++) for (let col = -1; col < 6; col++) {
      const cx = col * 32 + (row % 2 ? 16 : 0), cy = row * 16;
      for (let r = 15; r > 2; r -= 4.5) { x.beginPath(); x.arc(cx, cy + 16, r, Math.PI, 0); x.stroke(); }
    }
  } else if (kind === "yagasuri") {                           // 矢絣
    for (let col = 0; col < 4; col++) for (let row = -1; row < 5; row++) {
      const ox = col * 32, oy = row * 32 + (col % 2 ? 16 : 0);
      x.beginPath(); x.moveTo(ox, oy); x.lineTo(ox + 16, oy + 12); x.lineTo(ox + 32, oy); x.lineTo(ox + 32, oy + 20); x.lineTo(ox + 16, oy + 32); x.lineTo(ox, oy + 20); x.closePath(); x.fill();
    }
  } else {                                                    // 桜
    for (let i = 0; i < 7; i++) {
      const cx = (i * 47) % 128 + 10, cy = (i * 71) % 128 + 10;
      for (let k = 0; k < 5; k++) { const a = (k * 2 * Math.PI) / 5; x.beginPath(); x.ellipse(cx + Math.cos(a) * 6, cy + Math.sin(a) * 6, 5, 3.5, a, 0, Math.PI * 2); x.fill(); }
    }
  }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(2, 2);
  patCache.set(key, t); return t;
}

// ------------------------------------------------------------------ 光の粒（加算合成スプライト）
function glowTex() {
  const c = document.createElement("canvas"); c.width = c.height = 64; const x = c.getContext("2d");
  const g = x.createRadialGradient(32, 32, 0, 32, 32, 32);
  g.addColorStop(0, "rgba(255,255,240,1)"); g.addColorStop(0.25, "rgba(255,214,140,.85)"); g.addColorStop(1, "rgba(255,160,60,0)");
  x.fillStyle = g; x.fillRect(0, 0, 64, 64);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}
const GLOW = glowTex();
const glowMat = (color = 0xffd08a, op = 1) => new THREE.SpriteMaterial({ map: GLOW, color, transparent: true, opacity: op, depthWrite: false, blending: THREE.AdditiveBlending, fog: false });

// 祈りの灯り：お参りのたびに一つ、空へ昇っていく
export class Lanterns {
  constructor(scene) { this.scene = scene; this.list = []; this.max = 320; }
  spawn(x, y, z, { mine = false, instant = false } = {}) {
    const s = new THREE.Sprite(glowMat(mine ? 0xffe9b0 : 0xffc777, 1));
    const size = mine ? 1.5 : rand(0.7, 1.15); s.scale.set(size, size, 1);
    s.position.set(x, y, z); this.scene.add(s);
    const d = { s, vy: rand(0.9, 1.4), top: rand(14, 34), drift: rand(0, 6.28), age: 0, life: rand(240, 420), base: size };
    if (instant) { s.position.set(rand(-22, 22), d.top, rand(-30, 20)); d.age = rand(0, 120); }
    this.list.push(d);
    if (this.list.length > this.max) { const o = this.list.shift(); this.scene.remove(o.s); o.s.material.dispose(); }
  }
  update(dt, t) {
    for (let i = this.list.length - 1; i >= 0; i--) {
      const d = this.list[i], p = d.s.position; d.age += dt;
      if (p.y < d.top) p.y += d.vy * dt * (1 + (d.top - p.y) / 20); else p.y += Math.sin(t * 0.3 + d.drift) * 0.004;
      p.x += Math.sin(t * 0.25 + d.drift) * dt * 0.25; p.z += Math.cos(t * 0.2 + d.drift) * dt * 0.15;
      const flick = 0.85 + Math.sin(t * 3 + d.drift * 5) * 0.15;
      const fade = d.age > d.life ? Math.max(0, 1 - (d.age - d.life) / 20) : 1;
      d.s.material.opacity = flick * fade; const sc = d.base * (0.9 + flick * 0.1); d.s.scale.set(sc, sc, 1);
      if (fade <= 0) { this.scene.remove(d.s); d.s.material.dispose(); this.list.splice(i, 1); }
    }
  }
}

// 蛍（参道の脇でふわふわ）
export function fireflies(scene, n = 90) {
  const g = new THREE.BufferGeometry(), pos = new Float32Array(n * 3), seed = [];
  for (let i = 0; i < n; i++) {
    const side = i % 2 ? 1 : -1;
    seed.push([side * rand(3.5, 13), rand(0.4, 3), rand(-24, 30), rand(0, 6.28)]);
  }
  g.setAttribute("position", new THREE.BufferAttribute(pos, 3));
  const m = new THREE.PointsMaterial({ map: GLOW, color: 0xd9ff9a, size: 0.35, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, fog: false });
  const pts = new THREE.Points(g, m); scene.add(pts);
  return (t) => {
    for (let i = 0; i < n; i++) { const [x, y, z, ph] = seed[i];
      pos[i * 3] = x + Math.sin(t * 0.4 + ph) * 1.2; pos[i * 3 + 1] = y + Math.sin(t * 0.7 + ph * 2) * 0.5; pos[i * 3 + 2] = z + Math.cos(t * 0.3 + ph) * 1.2; }
    g.attributes.position.needsUpdate = true; m.opacity = 0.75 + Math.sin(t * 2) * 0.15;
  };
}

// 月
export function moon(scene) {
  const s = new THREE.Sprite(glowMat(0xfff4dc, 1)); s.scale.set(26, 26, 1); s.position.set(-60, 70, -150); scene.add(s);
  const disc = new THREE.Mesh(new THREE.CircleGeometry(4.2, 48), new THREE.MeshBasicMaterial({ color: 0xfff6e3, fog: false }));
  disc.position.copy(s.position); disc.lookAt(0, 0, 0); scene.add(disc);
}

// ------------------------------------------------------------------ 環境音（秋の夜：風・虫の声・風鈴）
export function ambience(getCtx, isMuted) {
  let started = false, master;
  return function start() {
    if (started || isMuted()) return; started = true;
    const a = getCtx(); master = a.createGain(); master.gain.value = 0.0; master.connect(a.destination);
    master.gain.linearRampToValueAtTime(0.5, a.currentTime + 3);
    // 風（ブラウンノイズ＋ローパス）
    const len = a.sampleRate * 4, buf = a.createBuffer(1, len, a.sampleRate), d = buf.getChannelData(0); let last = 0;
    for (let i = 0; i < len; i++) { last = (last + 0.02 * (Math.random() * 2 - 1)) / 1.02; d[i] = last * 3.2; }
    const src = a.createBufferSource(); src.buffer = buf; src.loop = true;
    const lp = a.createBiquadFilter(); lp.type = "lowpass"; lp.frequency.value = 420; const wg = a.createGain(); wg.gain.value = 0.35;
    src.connect(lp).connect(wg).connect(master); src.start();
    // 鈴虫（リーン…）
    const cricket = () => {
      if (!isMuted()) { const t = a.currentTime, o = a.createOscillator(), g = a.createGain(), lfo = a.createOscillator(), lg = a.createGain();
        o.frequency.value = rand(4300, 4700); lfo.frequency.value = rand(28, 40); lg.gain.value = 0.5; lfo.connect(lg).connect(g.gain);
        g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(0.025, t + 0.05); g.gain.linearRampToValueAtTime(0, t + rand(0.6, 1.4));
        o.connect(g).connect(master); o.start(t); lfo.start(t); o.stop(t + 1.6); lfo.stop(t + 1.6); }
      setTimeout(cricket, rand(700, 2600));
    };
    cricket(); setTimeout(cricket, 900);
    // 風鈴（ときどき）
    const furin = () => {
      if (!isMuted()) { const t = a.currentTime;
        [[rand(2600, 3000), 0.05], [rand(5200, 5800), 0.02]].forEach(([f, gv]) => { const o = a.createOscillator(), g = a.createGain();
          o.frequency.value = f; g.gain.setValueAtTime(gv, t); g.gain.exponentialRampToValueAtTime(0.0001, t + 2.2); o.connect(g).connect(master); o.start(t); o.stop(t + 2.4); }); }
      setTimeout(furin, rand(9000, 22000));
    };
    setTimeout(furin, 4000);
  };
}
function rand(a, b) { return a + Math.random() * (b - a); }
