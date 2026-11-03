// 境内の音楽：琴・やわらかな和音・りん（おりん）・風鈴。毎回ちがう旋律が、ゆっくり生まれては消える。
// site/audio/bgm.json に ["xxx.mp3", …] があれば、そちらを順に流す（自作の曲などに差し替えられる）。
const YO = [293.66, 329.63, 392.0, 440.0, 493.88, 587.33, 659.25, 783.99, 880.0];   // 陽音階（D E G A B）
const CHORDS = [[146.83, 220.0], [196.0, 293.66], [164.81, 246.94], [220.0, 329.63]];

export function makeBGM(ac, { night = () => 0 } = {}) {
  let a = null, out = null, dry = null, wet = null, on = false, vol = 0.55, timers = [], pad = null, track = null;
  function impulse(sec = 4.2) {
    const len = Math.floor(a.sampleRate * sec), b = a.createBuffer(2, len, a.sampleRate);
    for (let c = 0; c < 2; c++) { const d = b.getChannelData(c); for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 2.6); }
    return b;
  }
  function init() {
    if (a) return; a = ac();
    out = a.createGain(); out.gain.value = 0; out.connect(a.destination);
    dry = a.createGain(); dry.gain.value = 0.55; dry.connect(out);
    const rev = a.createConvolver(); rev.buffer = impulse(); wet = a.createGain(); wet.gain.value = 0.6; rev.connect(wet).connect(out);
    dry.rev = rev;
  }
  const send = (node) => { node.connect(dry); node.connect(dry.rev); };
  // 琴：のこぎり波を低域通過で丸め、すっと減衰させる（少しだけ音程が沈む）
  function koto(f, t, gain = 0.09) {
    const o = a.createOscillator(), o2 = a.createOscillator(), lp = a.createBiquadFilter(), g = a.createGain();
    o.type = "sawtooth"; o2.type = "triangle"; o.frequency.setValueAtTime(f * 1.004, t); o.frequency.exponentialRampToValueAtTime(f, t + 0.08); o2.frequency.value = f * 2;
    lp.type = "lowpass"; lp.frequency.setValueAtTime(3200, t); lp.frequency.exponentialRampToValueAtTime(420, t + 1.6); lp.Q.value = 2;
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(gain, t + 0.008); g.gain.exponentialRampToValueAtTime(0.0001, t + 2.6);
    const g2 = a.createGain(); g2.gain.value = 0.25; o2.connect(g2).connect(lp); o.connect(lp).connect(g); send(g);
    o.start(t); o2.start(t); o.stop(t + 2.8); o2.stop(t + 2.8);
  }
  // おりん：倍音の離れた正弦波を長く響かせる
  function rin(f, t, gain = 0.05) {
    for (const [m, k, d] of [[1, 1, 9], [2.76, 0.5, 6], [5.4, 0.25, 3.5], [8.9, 0.12, 2]]) {
      const o = a.createOscillator(), g = a.createGain(); o.frequency.value = f * m; o.detune.value = Math.random() * 6 - 3;
      g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(gain * k, t + 0.01); g.gain.exponentialRampToValueAtTime(0.0001, t + d);
      o.connect(g); send(g); o.start(t); o.stop(t + d + 0.1);
    }
  }
  function furin(t) { for (let i = 0; i < 3; i++) { const f = 2400 + Math.random() * 900; rin(f, t + i * (0.08 + Math.random() * 0.12), 0.012); } }
  // やわらかな和音（ゆっくり入れ替わる）
  function startPad() {
    const g = a.createGain(); g.gain.value = 0; const lp = a.createBiquadFilter(); lp.type = "lowpass"; lp.frequency.value = 520;
    const os = [0, 1, 2, 3].map((i) => { const o = a.createOscillator(); o.type = "triangle"; o.detune.value = (i % 2 ? 6 : -6); o.connect(lp); o.start(); return o; });
    lp.connect(g); send(g);
    let ci = 0;
    const next = () => { const [lo, hi] = CHORDS[ci++ % CHORDS.length], t = a.currentTime;
      os.forEach((o, i) => o.frequency.setTargetAtTime(i < 2 ? lo : hi, t, 1.8));
      g.gain.setTargetAtTime(0.032, t, 2.5); };
    next(); const iv = setInterval(next, 16000);
    pad = { stop() { clearInterval(iv); const t = a.currentTime; g.gain.setTargetAtTime(0, t, 0.6); setTimeout(() => os.forEach((o) => o.stop()), 2500); } };
  }
  // 旋律：二、三音ずつ、間をたっぷりとって
  function phrase() {
    if (!on) return;
    const t = a.currentTime + 0.05, slow = 1 + night() * 0.6, n = 1 + Math.floor(Math.random() * 3);
    let idx = Math.floor(Math.random() * YO.length);
    for (let i = 0; i < n; i++) {
      idx = Math.max(0, Math.min(YO.length - 1, idx + [-2, -1, 1, 2][Math.floor(Math.random() * 4)]));
      koto(YO[idx], t + i * (0.42 + Math.random() * 0.35) * slow, 0.06 + Math.random() * 0.04);
      if (Math.random() < 0.18) koto(YO[idx] / 2, t + i * 0.5 * slow + 0.02, 0.05);
    }
    timers.push(setTimeout(phrase, (2600 + Math.random() * 3200) * slow));
  }
  function bells() {
    if (!on) return;
    const t = a.currentTime + 0.1;
    if (Math.random() < 0.65 + night() * 0.2) rin([392, 293.66, 587.33][Math.floor(Math.random() * 3)], t);
    else furin(t);
    timers.push(setTimeout(bells, 22000 + Math.random() * 22000));
  }
  // 自作の曲（Suno など）があれば、そちらを流す。bgm.json は ["a.mp3", …] か { "day": [...], "night": [...] }
  let lists = null;
  async function tryTracks() {
    try {
      const j = await fetch("audio/bgm.json", { cache: "no-cache" }).then((r) => (r.ok ? r.json() : null));
      lists = Array.isArray(j) ? { day: j, night: j } : j && (j.day || j.night) ? { day: j.day || j.night, night: j.night || j.day } : null;
      if (!lists || !lists.day.length) return false;
      track = new Audio(); track.preload = "auto"; track.volume = 0;
      const play = () => {
        const L = night() > 0.5 ? lists.night : lists.day;
        track.src = "audio/" + L[Math.floor(Math.random() * L.length)]; track.play().catch(() => {});
        fadeTo(vol * 0.75, 4000);
      };
      track.onended = play; play();
      timers.push(setTimeout(bells, 20000));                                       // 曲の合間にも、おりんと風鈴をそっと
      return true;
    } catch { return false; }
  }
  let fadeIv = null;
  function fadeTo(v, ms) {
    if (!track) return; clearInterval(fadeIv); const v0 = track.volume, t0 = performance.now();
    fadeIv = setInterval(() => { if (!track) return clearInterval(fadeIv); const k = Math.min(1, (performance.now() - t0) / ms); track.volume = Math.max(0, Math.min(1, v0 + (v - v0) * k)); if (k >= 1) clearInterval(fadeIv); }, 60);
  }
  return {
    get on() { return on; },
    async start() {
      if (on) return; init(); on = true;
      out.gain.setTargetAtTime(vol, a.currentTime, 1.5);
      if (await tryTracks()) return;
      startPad(); timers.push(setTimeout(phrase, 1200)); timers.push(setTimeout(bells, 6000));
    },
    stop() {
      if (!on) return; on = false; timers.forEach(clearTimeout); timers = [];
      if (track) { const t = track; track = null; clearInterval(fadeIv); t.pause(); }
      if (a) { out.gain.setTargetAtTime(0, a.currentTime, 0.4); pad?.stop(); pad = null; }
    },
    setVolume(v) { vol = v; if (track) fadeTo(v * 0.75, 200); if (a && on) out.gain.setTargetAtTime(v, a.currentTime, 0.2); },
    duck(d) { if (a && on) out.gain.setTargetAtTime(d ? vol * 0.25 : vol, a.currentTime, 0.8); if (track) fadeTo((d ? 0.2 : 0.75) * vol, 1500); },
    rin: (f = 392) => { init(); rin(f, a.currentTime + 0.02, 0.06); },
  };
}
