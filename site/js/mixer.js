// 環境音ミキサー：雨・せせらぎ・風・虫の声・小鳥・風鈴・鈴・拍子木・音楽を、それぞれの音量で重ねる。
// どれも端末の中で合成する（音源ファイルなし）。雨を流すと、境内にも雨が降る。設定は端末に保存。
import * as THREE from "three";

export const LAYERS = [
  { id: "rain", icon: "🌧", name: "雨", sub: "屋根を打つ雨" },
  { id: "stream", icon: "🏞", name: "せせらぎ", sub: "山の渓流と滝" },
  { id: "wind", icon: "🍃", name: "森の風", sub: "杉林をわたる風" },
  { id: "mushi", icon: "🦗", name: "虫の声", sub: "鈴虫・こおろぎ" },
  { id: "tori", icon: "🐦", name: "小鳥", sub: "朝の境内の鳥" },
  { id: "furin", icon: "🎐", name: "風鈴", sub: "ときどき揺れる" },
  { id: "suzu", icon: "🔔", name: "鈴", sub: "遠くの神楽鈴" },
  { id: "hyoshi", icon: "🪵", name: "拍子木", sub: "一定の間で打つ" },
  { id: "music", icon: "🎵", name: "音楽", sub: "境内の調べ・月夜の調べ" },
];
export const PRESETS = [
  { name: "奥の院の雨夜", icon: "🌧", mix: { rain: 0.7, stream: 0.45, wind: 0.15, mushi: 0.12, music: 0.25 } },
  { name: "秋の夕暮れ", icon: "🍁", mix: { wind: 0.45, mushi: 0.55, furin: 0.3, music: 0.45 } },
  { name: "参道の朝", icon: "🌅", mix: { tori: 0.6, wind: 0.25, stream: 0.2, suzu: 0.15, music: 0.35 } },
  { name: "集中", icon: "📖", mix: { rain: 0.5, stream: 0.2, music: 0.3 } },
  { name: "静寂", icon: "🌙", mix: { wind: 0.2, mushi: 0.2, hyoshi: 0.25 } },
];
const rand = (a, b) => a + Math.random() * (b - a);

export function setupMixer(A) {
  const vol = Object.assign(Object.fromEntries(LAYERS.map((l) => [l.id, 0])), A.store.get("enishi_mix", {}));
  let every = A.store.get("enishi_mix_every", 10), a = null, master = null;
  const g = {}, started = {};
  const save = () => { A.store.set("enishi_mix", vol); A.store.set("enishi_mix_every", every); };

  function noiseBuf(sec, fill) { const len = Math.floor(a.sampleRate * sec), b = a.createBuffer(1, len, a.sampleRate), d = b.getChannelData(0); fill(d, a.sampleRate); return b; }
  function loop(buf) { const s = a.createBufferSource(); s.buffer = buf; s.loop = true; s.start(); return s; }
  // 連続する音（雨・せせらぎ・風）
  const BUILD = {
    rain() {
      const buf = noiseBuf(6, (d, sr) => { let lp = 0;
        for (let i = 0; i < d.length; i++) { lp += 0.35 * ((Math.random() * 2 - 1) - lp); d[i] = lp * 0.22; }
        for (let k = 0; k < 6 * 260; k++) { const at = Math.floor(Math.random() * d.length), amp = rand(0.08, 0.5), dec = rand(0.0015, 0.006) * sr;   // 雨粒
          for (let j = 0; j < dec * 5 && at + j < d.length; j++) d[at + j] += amp * Math.exp(-j / dec) * (Math.random() * 2 - 1); }
        for (let k = 0; k < 6 * 9; k++) { const at = Math.floor(Math.random() * d.length), dec = 0.02 * sr;                            // 軒からの大粒
          for (let j = 0; j < dec * 4 && at + j < d.length; j++) d[at + j] += 0.5 * Math.exp(-j / dec) * Math.sin(j * 0.09); } });
      const bp = a.createBiquadFilter(); bp.type = "lowpass"; bp.frequency.value = 6500;
      const hp = a.createBiquadFilter(); hp.type = "highpass"; hp.frequency.value = 180;
      loop(buf).connect(hp).connect(bp).connect(g.rain);
    },
    stream() {
      const buf = noiseBuf(5, (d) => { for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1; });
      for (const [f, q, lfoF, depth, gain] of [[700, 0.9, 0.31, 260, 0.5], [1600, 1.2, 0.53, 500, 0.32], [3400, 1.5, 0.87, 900, 0.14]]) {
        const bp = a.createBiquadFilter(); bp.type = "bandpass"; bp.frequency.value = f; bp.Q.value = q;
        const lfo = a.createOscillator(), lg = a.createGain(); lfo.frequency.value = lfoF; lg.gain.value = depth; lfo.connect(lg).connect(bp.frequency); lfo.start();
        const gg = a.createGain(); gg.gain.value = gain; loop(buf).connect(bp).connect(gg).connect(g.stream);
      }
    },
    wind() {
      const buf = noiseBuf(8, (d) => { let last = 0; for (let i = 0; i < d.length; i++) { last = (last + 0.02 * (Math.random() * 2 - 1)) / 1.02; d[i] = last * 3.4; } });
      const lp = a.createBiquadFilter(); lp.type = "lowpass"; lp.frequency.value = 520;
      const sw = a.createGain(); sw.gain.value = 0.7; const lfo = a.createOscillator(), lg = a.createGain(); lfo.frequency.value = 0.07; lg.gain.value = 0.3; lfo.connect(lg).connect(sw.gain); lfo.start();
      const lfo2 = a.createOscillator(), lg2 = a.createGain(); lfo2.frequency.value = 0.045; lg2.gain.value = 220; lfo2.connect(lg2).connect(lp.frequency); lfo2.start();
      loop(buf).connect(lp).connect(sw).connect(g.wind);
    },
  };
  // ときどき鳴る音（虫・小鳥・風鈴・鈴・拍子木）
  const tone = (out, f, t, dur, peak, type = "sine") => { const o = a.createOscillator(), gg = a.createGain(); o.type = type; o.frequency.value = f;
    gg.gain.setValueAtTime(0.0001, t); gg.gain.exponentialRampToValueAtTime(peak, t + 0.008); gg.gain.exponentialRampToValueAtTime(0.0001, t + dur); o.connect(gg).connect(out); o.start(t); o.stop(t + dur + 0.05); return o; };
  const EVENTS = {
    mushi() {
      const t = a.currentTime;
      if (Math.random() < 0.6) { const o = a.createOscillator(), gg = a.createGain(), lfo = a.createOscillator(), lg = a.createGain();   // 鈴虫：リーン
        o.frequency.value = rand(4200, 4700); lfo.frequency.value = rand(28, 40); lg.gain.value = 0.5; lfo.connect(lg).connect(gg.gain);
        gg.gain.setValueAtTime(0, t); gg.gain.linearRampToValueAtTime(0.05, t + 0.05); gg.gain.linearRampToValueAtTime(0, t + rand(0.6, 1.4));
        o.connect(gg).connect(g.mushi); o.start(t); lfo.start(t); o.stop(t + 1.6); lfo.stop(t + 1.6); }
      else for (let i = 0; i < 6; i++) tone(g.mushi, rand(3300, 3500), t + i * 0.07, 0.05, 0.025, "triangle");             // こおろぎ：コロコロ
      return rand(500, 2200);
    },
    tori() {
      const t = a.currentTime, n = Math.floor(rand(2, 6)), base = rand(2600, 4200);
      if (Math.random() < 0.12) { tone(g.tori, 1150, t, 1.0, 0.05); const o = tone(g.tori, 1400, t + 1.1, 0.25, 0.06); o.frequency.exponentialRampToValueAtTime(2100, t + 1.3);   // 鶯
        const o2 = tone(g.tori, 1900, t + 1.42, 0.35, 0.05); o2.frequency.exponentialRampToValueAtTime(1300, t + 1.75); return rand(6000, 12000); }
      for (let i = 0; i < n; i++) { const o = tone(g.tori, base, t + i * rand(0.09, 0.16), 0.08, 0.035); o.frequency.exponentialRampToValueAtTime(base * rand(1.2, 1.6), t + i * 0.12 + 0.07); }
      return rand(1200, 4500);
    },
    furin() { const t = a.currentTime; for (let i = 0; i < Math.floor(rand(1, 4)); i++) { const f = rand(2500, 3100), s = t + i * rand(0.12, 0.3); tone(g.furin, f, s, 2.4, 0.06); tone(g.furin, f * 2.76, s, 1.2, 0.015); } return rand(5000, 14000); },
    suzu() { const t = a.currentTime; for (let i = 0; i < 9; i++) { const s = t + i * rand(0.03, 0.09); for (const m of [1, 2.4, 3.9]) tone(g.suzu, 2200 * m * rand(0.98, 1.02), s, 0.5 / m, 0.02 / m); } return rand(12000, 26000); },
    hyoshi() { const t = a.currentTime; for (const s of [t, t + 0.16]) {                                                                           // カン、カン
        const b = a.createBufferSource(); b.buffer = noiseBuf(0.06, (d) => { for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * Math.exp(-i / 140); });
        const bp = a.createBiquadFilter(); bp.type = "bandpass"; bp.frequency.value = 1900; bp.Q.value = 6; const gg = a.createGain(); gg.gain.value = 1.4;
        b.connect(bp).connect(gg).connect(g.hyoshi); b.start(s); tone(g.hyoshi, 1880, s, 0.18, 0.08, "triangle"); }
      return every * 1000; },
  };
  function ensure() {
    if (a) return true;
    a = A.ac(); if (!a) return false;
    master = a.createGain(); master.gain.value = 0.9; master.connect(a.destination);
    for (const l of LAYERS) if (l.id !== "music") { g[l.id] = a.createGain(); g[l.id].gain.value = 0; g[l.id].connect(master); }
    return true;
  }
  function apply(id) {
    if (id === "music") { A.setMusic(vol.music); return; }
    if (!ensure()) return;
    const v = vol[id];
    g[id].gain.setTargetAtTime(v * (id === "rain" ? 0.9 : id === "stream" ? 0.8 : id === "wind" ? 0.7 : 1), a.currentTime, 0.4);
    if (v > 0 && !started[id]) {
      started[id] = true;
      if (BUILD[id]) BUILD[id]();
      else { const run = () => { const next = vol[id] > 0 ? EVENTS[id]() : 1500; setTimeout(run, next); }; setTimeout(run, id === "hyoshi" ? 400 : rand(300, 2000)); }
    }
  }
  const applyAll = () => LAYERS.forEach((l) => apply(l.id));
  const any = () => LAYERS.some((l) => l.id !== "music" && vol[l.id] > 0);

  // 雨の景色：カメラのまわりに雨の線を降らせる
  const N = 1400, pos = new Float32Array(N * 6), geo = new THREE.BufferGeometry(); geo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
  const rainM = new THREE.LineBasicMaterial({ color: 0xbcd0e0, transparent: true, opacity: 0, depthWrite: false, fog: true });
  const rain = new THREE.LineSegments(geo, rainM); rain.frustumCulled = false; rain.visible = false; A.scene.add(rain);
  const seed = () => { for (let i = 0; i < N; i++) { const x = rand(-16, 16), y = rand(-2, 18), z = rand(-16, 16); pos.set([x, y, z, x + 0.02, y - 0.55, z], i * 6); } };
  seed();
  A.W.update.push((t, dt) => {
    const want = Math.min(0.55, vol.rain * 0.7); rainM.opacity += (want - rainM.opacity) * Math.min(1, dt * 1.5);
    rain.visible = rainM.opacity > 0.01; if (!rain.visible) return;
    const c = A.camera.position; rain.position.set(Math.round(c.x), c.y - 6, Math.round(c.z));
    const fall = dt * 15;
    for (let i = 0; i < N; i++) { const k = i * 6; pos[k + 1] -= fall; pos[k + 4] -= fall; if (pos[k + 4] < -2) { pos[k + 1] += 20; pos[k + 4] += 20; } }
    geo.attributes.position.needsUpdate = true;
  });

  // ---------------------------------------------------------------- 画面
  const m = document.createElement("section"); m.className = "modal"; m.id = "m-mix"; m.hidden = true;
  m.innerHTML = `<div class="sheet"><button class="x" type="button" data-x>✕</button>
    <p class="kicker">AMBIENT</p><h2>🎧 境内の音</h2>
    <p class="sub">好きな音を重ねて、作業や読書、眠る前のひとときに。ほかの画面を開いても流れ続けます。</p>
    <div class="mx-presets">${PRESETS.map((p, i) => `<button type="button" class="chip" data-p="${i}">${p.icon} ${p.name}</button>`).join("")}</div>
    <div class="mx-rows">${LAYERS.map((l) => `<label class="mx-row"><span class="mx-ic">${l.icon}</span><span class="mx-nm"><b>${l.name}</b><small>${l.sub}</small></span>
      <input type="range" min="0" max="100" data-l="${l.id}" aria-label="${l.name}の音量">${l.id === "hyoshi" ? `<select data-every aria-label="拍子木の間隔"><option value="5">5秒</option><option value="10">10秒</option><option value="20">20秒</option></select>` : ""}</label>`).join("")}</div>
    <div class="row"><button type="button" class="btn" data-stop>すべて止める</button><button type="button" class="btn primary" data-x>閉じる</button></div></div>`;
  document.body.appendChild(m);
  const paint = () => { m.querySelectorAll("[data-l]").forEach((r) => (r.value = Math.round(vol[r.dataset.l] * 100))); m.querySelector("[data-every]").value = String(every); };
  m.addEventListener("input", (e) => { const l = e.target.dataset.l; if (!l) return; vol[l] = e.target.value / 100; apply(l); save(); A.onChange?.(); });
  m.addEventListener("change", (e) => { if (e.target.dataset.every !== undefined) { every = +e.target.value; save(); } });
  m.addEventListener("click", (e) => {
    if (e.target.closest("[data-x]") || e.target === m) { m.hidden = true; return; }
    const p = e.target.closest("[data-p]"); if (p) { setPreset(+p.dataset.p); A.toast(`${PRESETS[+p.dataset.p].icon} 「${PRESETS[+p.dataset.p].name}」`, 1800); }
    if (e.target.closest("[data-stop]")) { LAYERS.forEach((l) => { if (l.id !== "music") vol[l.id] = 0; }); applyAll(); save(); paint(); A.onChange?.(); }
  });
  function setPreset(i) { const mix = PRESETS[i].mix; LAYERS.forEach((l) => { vol[l.id] = l.id === "music" && mix.music === undefined ? vol.music : mix[l.id] || 0; }); applyAll(); save(); paint(); A.onChange?.(); }
  // 前回の設定は、最初に画面に触れたときに鳴らす（ブラウザの決まり）
  addEventListener("pointerdown", () => { if (any()) applyAll(); }, { once: true });
  vol.music = A.getMusic();
  return {
    open: () => { vol.music = A.getMusic(); paint(); m.hidden = false; },
    preset: (name) => { const i = PRESETS.findIndex((p) => p.name === name); if (i >= 0) setPreset(i); },
    playing: any,
  };
}
