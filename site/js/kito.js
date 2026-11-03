// 御祈祷：本殿で神職と巫女が執り行う、あなたのための小さな儀式。
// 修祓 → 祝詞奏上（あなたの名と願いが読み上げられる）→ 神楽 → 玉串拝礼 → 御札の授与。
// 願いの文は端末の中だけで使い、サーバーには送らない。
import * as THREE from "three";
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";
import { HONDEN, inHonden, PLACES } from "./map.js?v=11040020";

export const GANI = ["当選祈願", "縁結び", "合格祈願", "心願成就", "家内安全", "健康長寿"];
const FLOOR = 1.7;                      // 本殿の床の高さ
const SEAT = new THREE.Vector3(0, FLOOR, 0.5), PRIEST_HOME = new THREE.Vector3(-1.15, FLOOR, -1.5), MIKO_HOME = new THREE.Vector3(1.15, FLOOR, -1.5);   // 結界の内側、中央の両脇
const MIRROR = new THREE.Vector3(0, 4.1, -3.6), TABLE_Z = -1.35;
const HARAE = "掛けまくも畏き 伊邪那岐大神 筑紫の日向の橘の小戸の阿波岐原に 禊ぎ祓へ給ひし時に 生り坐せる祓戸の大神等 諸々の禍事罪穢有らむをば 祓へ給ひ清め給へと 白す事を聞こし食せと 恐み恐みも白す";
const std = (color, o = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.75, ...o });
const easeIO = (k) => 0.5 - Math.cos(Math.min(1, Math.max(0, k)) * Math.PI) / 2;

// ------------------------------------------------------------------ 神職・巫女（参拝者と同じ骨組み：body / arms）
function makeNPC(kind) {
  const priest = kind === "priest";
  const top = std(0xf6f3ea, { roughness: 0.9 }), low = std(priest ? 0x6fa3a8 : 0xc8281e, { roughness: 0.8 });
  const skin = std(0xf6d7bd, { roughness: 0.8 }), hair = std(0x1f1a17, { roughness: 0.7 }), kuro = std(0x161412);
  const g = new THREE.Group(), lower = new THREE.Group(), body = new THREE.Group(); g.add(lower, body);
  const add = (p, geo, m, x, y, z) => { const o = new THREE.Mesh(geo, m); o.position.set(x, y, z); o.castShadow = true; p.add(o); return o; };
  add(lower, new THREE.CylinderGeometry(0.3, 0.48, 0.66, 16), low, 0, 0.33, 0);                 // 袴
  add(body, new RoundedBoxGeometry(0.7, 0.52, 0.5, 3, 0.16), top, 0, 0.8, 0);                 // 狩衣・白衣
  add(body, new THREE.SphereGeometry(0.4, 22, 16), skin, 0, 1.38, 0);
  if (priest) {                                                                               // 烏帽子
    const e = add(body, new THREE.CylinderGeometry(0.2, 0.3, 0.5, 14), kuro, 0, 1.86, -0.05); e.rotation.x = -0.15;
    add(body, new THREE.SphereGeometry(0.41, 20, 14, 0, Math.PI * 2, 0, Math.PI * 0.45), hair, 0, 1.42, -0.02);
  } else {                                                                                    // 長い黒髪・丈長・前天冠
    add(body, new THREE.SphereGeometry(0.43, 20, 14, 0, Math.PI * 2, 0, Math.PI * 0.6), hair, 0, 1.4, -0.03);
    add(body, new THREE.BoxGeometry(0.32, 0.9, 0.08), hair, 0, 0.98, -0.3);
    add(body, new THREE.BoxGeometry(0.2, 0.08, 0.1), top, 0, 1.18, -0.34);
    const kan = add(body, new THREE.TorusGeometry(0.2, 0.03, 6, 16, Math.PI), std(0xe3b54a, { metalness: 0.8, roughness: 0.3 }), 0, 1.72, 0.12); kan.rotation.x = -0.4;
  }
  for (const s of [-1, 1]) { const e = add(body, new THREE.SphereGeometry(0.06, 10, 8), kuro, s * 0.14, 1.36, 0.35); e.scale.set(0.8, priest ? 0.5 : 1.1, 0.5); }
  const arms = [];
  for (const s of [-1, 1]) {
    const a = new THREE.Group(); a.position.set(s * 0.38, 0.98, 0); body.add(a);
    add(a, new THREE.CylinderGeometry(0.12, 0.2, 0.46, 10), top, 0, -0.22, 0); add(a, new THREE.SphereGeometry(0.075, 10, 8), skin, 0, -0.47, 0.02);
    a.rotation.z = s * 0.22; arms.push(a);
  }
  for (const s of [-1, 1]) add(lower, new THREE.BoxGeometry(0.17, 0.06, 0.3), std(0xf4f1ea), s * 0.13, 0.03, 0.05);
  g.userData = { body, lower, arms };
  return g;
}
// 大麻（おおぬさ）・神楽鈴・玉串
function haraegushi() {
  const g = new THREE.Group();
  const st = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.9, 6), std(0xd9c49a)); st.position.y = -0.2; g.add(st);
  const paper = std(0xffffff, { roughness: 0.95, side: THREE.DoubleSide });
  for (let i = 0; i < 14; i++) { const p = new THREE.Mesh(new THREE.PlaneGeometry(0.06, 0.62), paper); const a = (i / 14) * Math.PI * 2; p.position.set(Math.cos(a) * 0.05, -0.92, Math.sin(a) * 0.05); p.rotation.set(Math.sin(a) * 0.25, a, Math.cos(a) * 0.25); g.add(p); }
  return g;
}
function kaguraSuzu() {
  const g = new THREE.Group(), gold = std(0xe3b54a, { metalness: 0.85, roughness: 0.25 });
  const st = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.4, 6), std(0x8a5a2a)); st.position.y = -0.3; g.add(st);
  for (let t = 0; t < 3; t++) for (let i = 0; i < 5 - t; i++) { const b = new THREE.Mesh(new THREE.SphereGeometry(0.04, 8, 6), gold); const a = (i / (5 - t)) * Math.PI * 2; b.position.set(Math.cos(a) * (0.12 - t * 0.03), -0.55 - t * 0.09, Math.sin(a) * (0.12 - t * 0.03)); g.add(b); }
  const cols = [0x2c6db3, 0xd9412b, 0xf6d36b, 0x3f9a5a, 0xffffff];
  cols.forEach((c, i) => { const r = new THREE.Mesh(new THREE.PlaneGeometry(0.05, 0.9), std(c, { side: THREE.DoubleSide })); r.position.set(-0.08 + i * 0.04, -0.2, -0.02); g.add(r); });
  return g;
}
function tamagushi() {
  const g = new THREE.Group(), leaf = std(0x2f5a2e, { roughness: 0.6 });
  const st = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.02, 0.7, 6), std(0x6b4a2a)); st.rotation.x = Math.PI / 2; g.add(st);
  for (let i = 0; i < 9; i++) { const l = new THREE.Mesh(new THREE.SphereGeometry(0.06, 8, 6), leaf); l.scale.set(1.6, 0.35, 0.8); l.position.set((i % 2 ? 1 : -1) * 0.05, 0, -0.32 + i * 0.03); l.rotation.y = (i % 2 ? 0.6 : -0.6); g.add(l); }
  for (const s of [-1, 1]) { const p = new THREE.Mesh(new THREE.PlaneGeometry(0.07, 0.24), std(0xffffff, { side: THREE.DoubleSide })); p.position.set(s * 0.05, -0.1, -0.22); g.add(p); }
  return g;
}

// ------------------------------------------------------------------ 声（祝詞の節）と笛：WebAudio で合成
function chantVoice(ac, muted) {
  if (muted()) return { syl() {}, rest() {}, stop() {} };
  const a = ac(), out = a.createGain(); out.gain.value = 0; out.connect(a.fxBus || a.destination);
  const f1 = a.createBiquadFilter(), f2 = a.createBiquadFilter(); f1.type = f2.type = "bandpass"; f1.frequency.value = 520; f2.frequency.value = 980; f1.Q.value = 4; f2.Q.value = 6;
  const mix = a.createGain(); mix.gain.value = 0.9; f1.connect(out); f2.connect(out);
  const oscs = [104, 104.6, 156].map((f) => { const o = a.createOscillator(); o.type = "sawtooth"; o.frequency.value = f; o.connect(mix); o.start(); return o; });
  mix.connect(f1); mix.connect(f2);
  const vib = a.createOscillator(), vg = a.createGain(); vib.frequency.value = 5.2; vg.gain.value = 1.6; vib.connect(vg); oscs.forEach((o) => vg.connect(o.frequency)); vib.start();
  const VOW = { a: [700, 1150], i: [300, 2200], u: [350, 1250], e: [480, 1850], o: [480, 860] };
  return {
    syl(v = "a", dur = 0.22, accent = false) {
      const t = a.currentTime, [x, y] = VOW[v] || VOW.a;
      f1.frequency.setTargetAtTime(x, t, 0.03); f2.frequency.setTargetAtTime(y, t, 0.03);
      out.gain.cancelScheduledValues(t); out.gain.setTargetAtTime(accent ? 0.2 : 0.13, t, 0.025); out.gain.setTargetAtTime(0.07, t + dur * 0.6, 0.05);
      oscs.forEach((o, i) => o.frequency.setTargetAtTime([104, 104.6, 156][i] * (accent ? 1.12 : 1), t, 0.05));
    },
    rest(drop = true) { const t = a.currentTime; out.gain.setTargetAtTime(0, t, 0.12); if (drop) oscs.forEach((o, i) => o.frequency.setTargetAtTime([104, 104.6, 156][i] * 0.94, t, 0.2)); },
    stop() { const t = a.currentTime; out.gain.setTargetAtTime(0, t, 0.1); setTimeout(() => { oscs.forEach((o) => o.stop()); vib.stop(); out.disconnect(); }, 600); },
  };
}
function fue(ac, muted, notes) {   // 篠笛：息まじりの正弦波でゆったりと
  if (muted()) return () => {};
  const a = ac(), t0 = a.currentTime + 0.05, out = a.createGain(); out.gain.value = 0; out.connect(a.fxBus || a.destination);
  const o = a.createOscillator(); o.type = "sine"; const vib = a.createOscillator(), vg = a.createGain(); vib.frequency.value = 5.5; vg.gain.value = 9; vib.connect(vg).connect(o.frequency); o.connect(out);
  let t = t0; for (const [f, d] of notes) { o.frequency.setTargetAtTime(f, t, 0.04); out.gain.setTargetAtTime(0.07, t, 0.05); out.gain.setTargetAtTime(0.045, t + d * 0.7, 0.2); t += d; }
  out.gain.setTargetAtTime(0, t, 0.3); o.start(t0); vib.start(t0); o.stop(t + 1.5); vib.stop(t + 1.5);
  return () => { try { out.gain.cancelScheduledValues(a.currentTime); out.gain.setTargetAtTime(0, a.currentTime, 0.05); o.stop(a.currentTime + 0.3); vib.stop(a.currentTime + 0.3); } catch {} };
}
const vowelOf = (ch) => { const k = "あかさたなはまやらわがざだばぱぁアカサタナハマヤラワガザダバパ".includes(ch) ? "a" : "いきしちにひみりぎじぢびぴぃイキシチニヒミリギジビピ".includes(ch) ? "i" : "うくすつぬふむゆるぐずづぶぷゅウクスツヌフムユルグズブプ".includes(ch) ? "u" : "えけせてねへめれげぜでべぺエケセテネヘメレゲゼデベペ".includes(ch) ? "e" : "おこそとのほもよろをごぞどぼぽょオコソトノホモヨロヲゴゾドボポ".includes(ch) ? "o" : "aiueo"[ch.charCodeAt(0) % 5]; return k; };

// ------------------------------------------------------------------ 御札の絵
export function ofudaImage({ name, gan, wish, date }) {
  const c = document.createElement("canvas"); c.width = 600; c.height = 1500; const x = c.getContext("2d");
  const font = (px, b = "") => `${b} ${px}px "Hiragino Mincho ProN","Yu Mincho","Noto Serif JP",serif`;
  x.fillStyle = "#16201c"; x.fillRect(0, 0, 600, 1500);
  x.fillStyle = "#fbf7ec"; x.fillRect(40, 40, 520, 1420);
  x.fillStyle = "#e9dfc6"; x.fillRect(40, 40, 520, 150); x.fillStyle = "#b8321e"; x.fillRect(40, 186, 520, 6);
  x.fillStyle = "#3a2a1a"; x.font = font(56, "bold"); x.textAlign = "center"; x.textBaseline = "middle"; x.fillText("御 祈 祷", 300, 115);
  const vert = (s, cx, top, px, col, gap = 1.12, b = "bold") => { x.fillStyle = col; x.font = font(px, b); [...s].forEach((ch, i) => x.fillText(ch, cx, top + i * px * gap)); };
  vert("えにし大神守護", 300, 300, 104, "#1a1612", 1.08);
  vert(gan, 470, 320, 46, "#2b2620");
  vert(`${name}様`.slice(0, 14), 130, 320, 40, "#2b2620", 1.1, "");
  vert(date, 130, 320 + (name.length + 2) * 46, 26, "#6b6258", 1.15, "");
  if (wish) { x.save(); x.globalAlpha = 0.85; vert(`「${wish}」`.slice(0, 18), 470, 320 + gan.length * 52 + 40, 26, "#6b6258", 1.15, ""); x.restore(); }
  x.save(); x.translate(300, 1300); x.rotate(-0.05); x.strokeStyle = "#c8281e"; x.lineWidth = 8; x.strokeRect(-70, -70, 140, 140);
  x.fillStyle = "#c8281e"; x.font = font(40, "bold"); x.fillText("えにし", 0, -18); x.fillText("神社", 0, 30); x.restore();
  return c;
}
const reiwa = () => { const d = new Date(Date.now() + 9 * 3600e3); return `令和${d.getUTCFullYear() - 2018}年${d.getUTCMonth() + 1}月${d.getUTCDate()}日`; };

// ------------------------------------------------------------------ 本体
export function setupKito(A) {
  const { scene, camera, me, W } = A;
  // 本殿の中のものは H に入れる（座標は以前の本殿のまま。H が今の大きさと位置に合わせる）
  const H = new THREE.Group(); H.position.set(0, 0, HONDEN.Z - HONDEN.S); H.scale.setScalar(HONDEN.S); scene.add(H); H.updateMatrixWorld(true);
  const toW = (x, y, z) => H.localToWorld(new THREE.Vector3(x, y, z));
  const toXZ = (v) => { const p = toW(v.x, v.y, v.z); return [p.x, p.z]; };
  // 神職・巫女は普段から本殿に控えている
  const priest = makeNPC("priest"), miko = makeNPC("miko");
  priest.scale.setScalar(0.86 / HONDEN.S); miko.scale.setScalar(0.82 / HONDEN.S);   // 参拝者より少しだけ大きく
  priest.position.copy(PRIEST_HOME); miko.position.copy(MIKO_HOME); H.add(priest, miko);
  const nusa = haraegushi(), suzu = kaguraSuzu(); priest.userData.arms[0].add(nusa); nusa.visible = false; nusa.position.set(0, -0.45, 0.1);
  miko.userData.arms[1].add(suzu); suzu.position.set(0, -0.45, 0.05);
  // 祈祷の座（紫の座布団）と案（玉串を置く台）
  const seat = new THREE.Group(); seat.position.set(SEAT.x, FLOOR, SEAT.z); H.add(seat);
  const seatM = new THREE.Mesh(new THREE.BoxGeometry(1.0, 0.13, 1.0), std(0x5a2a7a)); seatM.position.y = 0.065; seat.add(seatM);
  const seatR = new THREE.Mesh(new THREE.BoxGeometry(1.04, 0.03, 1.04), std(0xe3b54a, { metalness: 0.7, roughness: 0.3 })); seatR.position.y = 0.13; seat.add(seatR);
  const an = new THREE.Group(); an.position.set(0, FLOOR, TABLE_Z); H.add(an);
  const wood = std(0xd9c49a, { roughness: 0.7 });
  const top = new THREE.Mesh(new THREE.BoxGeometry(1.3, 0.05, 0.45), wood); top.position.y = 0.62; an.add(top);
  for (const s of [-1, 1]) { const l = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.6, 0.4), wood); l.position.set(s * 0.58, 0.3, 0); an.add(l); }
  an.traverse((o) => o.isMesh && (o.castShadow = o.receiveShadow = true));
  // 燭台：祭壇の両脇で揺れる火
  const flames = [], flameM = [0, 1].map(() => { const m = new THREE.MeshStandardMaterial({ color: 0xffe2a0, emissive: 0xffa040, emissiveIntensity: 3 }); m.userData.base = 3; return m; });
  for (const [x, z] of [[-4.6, -1.7], [-3.4, -1.7], [3.4, -1.7], [4.6, -1.7]]) {
    const st = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.14, 1.1, 8), std(0x6f6a3a, { metalness: 0.7, roughness: 0.4 })); st.position.set(x, FLOOR + 0.55, z); H.add(st);
    const cd = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.22, 8), std(0xfbf7ec)); cd.position.set(x, FLOOR + 1.21, z); H.add(cd);
    const f = new THREE.Mesh(new THREE.ConeGeometry(0.035, 0.12, 8), flameM[flames.length % 2]); f.position.set(x, FLOOR + 1.38, z); H.add(f); flames.push(f);
  }
  A.env.registerLamp(flameM[0], null); A.env.registerLamp(flameM[1], null);
  // 光の柱（普段はかすか、祝詞で強くなる）と、光の中の塵
  const beamU = { op: { value: 0.05 }, col: { value: new THREE.Color(0xffe0a8) } };
  const beamM = new THREE.ShaderMaterial({ uniforms: beamU, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, fog: false,
    vertexShader: "varying float vY; varying vec3 vN, vV; void main(){ vY = position.y / 6.0 + 0.5; vec4 mv = modelViewMatrix * vec4(position,1.0); vN = normalize(normalMatrix * normal); vV = normalize(-mv.xyz); gl_Position = projectionMatrix * mv; }",
    fragmentShader: "uniform float op; uniform vec3 col; varying float vY; varying vec3 vN, vV; void main(){ float edge = pow(abs(dot(vN, vV)), 1.6); float a = op * edge * smoothstep(0.0, 0.35, vY) * (1.0 - 0.45 * vY); gl_FragColor = vec4(col * a, a); }" });
  const beam = new THREE.Mesh(new THREE.ConeGeometry(1.5, 6, 32, 1, true), beamM); beam.position.set(MIRROR.x, FLOOR + 3, MIRROR.z + 0.6); beam.rotation.x = Math.PI; H.add(beam);
  const dustN = 70, dustG = new THREE.BufferGeometry(), dp = new Float32Array(dustN * 3);
  for (let i = 0; i < dustN; i++) { dp[i * 3] = MIRROR.x + (Math.random() - 0.5) * 2; dp[i * 3 + 1] = FLOOR + Math.random() * 5; dp[i * 3 + 2] = MIRROR.z + 0.6 + (Math.random() - 0.5) * 2; }
  dustG.setAttribute("position", new THREE.BufferAttribute(dp, 3));
  const dustM = new THREE.PointsMaterial({ color: 0xffe9c0, size: 0.04, transparent: true, opacity: 0.25, depthWrite: false, blending: THREE.AdditiveBlending });
  H.add(new THREE.Points(dustG, dustM));
  const mirror = W.hondenMirror; if (mirror) { mirror.material = mirror.material.clone(); mirror.material.emissive = new THREE.Color(0xfff0d0); mirror.material.emissiveIntensity = 0; }
  let glow = 0, glowTo = 0;

  // ---------------------------------------------------------------- 控えの所作：日本時間で変わる
  // 朝（5–10時）：神職は拝殿を掃き清め、巫女は神饌を捧げる / 昼：神職は神前に拝礼、巫女は鈴を鳴らす
  // 夕（17–20時）：二人で燭台に火を灯す / 夜：神前に向かって静座
  const PI = Math.PI, PH = [PRIEST_HOME.x, PRIEST_HOME.z], MH = [MIKO_HOME.x, MIKO_HOME.z];
  const at = (t, [x, z], f) => [t, x, z, f];
  const houki = new THREE.Group();
  { const st = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 1.1, 6), std(0xc8a66a)); st.position.y = -0.3; houki.add(st);
    const br = new THREE.Mesh(new THREE.ConeGeometry(0.17, 0.42, 12, 1, true), std(0x9a7a3a, { side: THREE.DoubleSide, roughness: 1 })); br.position.y = -0.98; houki.add(br); }
  priest.userData.arms[0].add(houki); houki.position.set(0, -0.45, 0.12); houki.visible = false;
  const tsukegi = (n) => { const g = new THREE.Group(); const st = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.4, 5), std(0xd9c49a)); st.rotation.x = PI / 2; st.position.z = 0.15; g.add(st);
    const f = new THREE.Mesh(new THREE.ConeGeometry(0.03, 0.1, 8), flameM[0]); f.position.set(0, 0.04, 0.36); g.add(f); n.userData.arms[0].add(g); g.position.set(0, -0.47, 0.05); g.visible = false; return g; };
  const fireP = tsukegi(priest), fireM = tsukegi(miko);
  const sanbo = new THREE.Group();
  { const wd = std(0xe2cfa0, { roughness: 0.7 }); const t = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.04, 0.42), wd); t.position.y = 0.2; sanbo.add(t);
    const b = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.18, 0.26), wd); b.position.y = 0.09; sanbo.add(b);
    const r = new THREE.Mesh(new THREE.SphereGeometry(0.13, 12, 8, 0, PI * 2, 0, PI / 2), std(0xfbfaf4)); r.position.y = 0.22; sanbo.add(r);
    for (const d of [-0.12, 0.12]) { const s = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.05, 0.2, 8), std(0xfbfaf4)); s.position.set(d, 0.32, -0.1); sanbo.add(s); } }
  miko.userData.body.add(sanbo); sanbo.position.set(0, 0.62, 0.5); sanbo.visible = false;
  const hip = (n) => { const b = n.userData.body, th = b.rotation.x; b.position.y += 0.6 * (1 - Math.cos(th)); b.position.z = -0.6 * Math.sin(th); };   // お辞儀は腰を軸に
  const rest = (n) => { const u = n.userData; u.body.rotation.set(0, 0, 0); u.body.position.y = 0; u.body.position.z = 0; u.lower.scale.y = 1; u.arms.forEach((a, i) => { a.rotation.set(0, 0, (i ? 1 : -1) * 0.22); }); };
  const restAll = () => { rest(priest); rest(miko); houki.visible = fireP.visible = fireM.visible = sanbo.visible = false; };
  // keys: [時刻, x, z, 着いてから向く向き]。間は歩く（向きは進む方へ）
  function follow(n, keys, k, dt) {
    let i = 0; while (i < keys.length - 2 && k >= keys[i + 1][0]) i++;
    const [t0, x0, z0] = keys[i], [t1, x1, z1, f1] = keys[i + 1];
    const u = Math.min(1, Math.max(0, (k - t0) / (t1 - t0))), e = easeIO(u);
    const moving = (x1 !== x0 || z1 !== z0) && u > 0 && u < 1;
    n.position.set(x0 + (x1 - x0) * e, FLOOR, z0 + (z1 - z0) * e);
    let d = (moving ? Math.atan2(x1 - x0, z1 - z0) : f1) - n.rotation.y; d = Math.atan2(Math.sin(d), Math.cos(d)); n.rotation.y += d * Math.min(1, dt * 5);
    if (moving) n.userData.body.position.y = Math.abs(Math.sin(k * 7)) * 0.025;
  }
  const hump = (k, a, b) => (k < a || k > b ? 0 : Math.sin(((k - a) / (b - a)) * PI));
  const seiza = (n, k) => { const u = n.userData; u.lower.scale.y = 0.42; u.body.position.y = -0.38 + Math.sin(k * 1.3) * 0.008; u.arms.forEach((a) => (a.rotation.x = -0.55)); };
  const nearMe = (n, r) => { const p = n.getWorldPosition(new THREE.Vector3()); return Math.hypot(p.x - me.position.x, p.z - me.position.z) < r; };
  const MODES = {
    asa(k, dt) {
      follow(priest, [at(0, PH, 0), at(2.5, [-1.2, -0.6], 0), at(5.5, [-4.2, -0.6], 0), at(15, [4.2, -0.6], 0), at(19.5, [-1.2, -0.6], 0), at(22, PH, PI), at(26.5, PH, PI), at(28, PH, 0)], k, dt);
      const pu = priest.userData; houki.visible = k > 2.5 && k < 19.5;
      if (k > 5.5 && k < 15) { pu.arms[0].rotation.x = -0.75 + Math.sin(k * 5) * 0.45; pu.body.rotation.x = 0.28; } else if (houki.visible) pu.arms[0].rotation.x = -0.4;
      pu.body.rotation.x += hump(k, 23, 25.8) * 0.9;
      follow(miko, [at(0, MH, 0), at(8, MH, 0), at(10.5, [2.1, -1.55], PI), at(17.5, [2.1, -1.55], PI), at(20, MH, 0)], k, dt);
      const mu = miko.userData; sanbo.visible = k > 7 && k < 20.5;
      if (sanbo.visible) { const lift = hump(k, 11.5, 16); mu.arms.forEach((a) => (a.rotation.x = -1.25 - lift * 0.5)); sanbo.position.y = 0.62 + lift * 0.4; }
      mu.body.rotation.x += hump(k, 16, 17.5) * 0.6;
    },
    hiru(k, dt) {
      follow(priest, [at(0, PH, 0), at(2, PH, 0), at(3.5, PH, PI), at(8, PH, PI), at(9.5, PH, 0)], k, dt);
      priest.userData.body.rotation.x = hump(k, 4, 6.8) * 1.0;
      follow(miko, [at(0, MH, 0), at(12, MH, 0), at(13, MH, PI), at(20, MH, PI), at(21, MH, 0)], k, dt);
      const s = hump(k, 13.5, 19.5);
      if (s) { const a = miko.userData.arms[1]; a.rotation.x = -1.7 - Math.sin(k * 9) * 0.35 * s; a.rotation.z = 0.3 * s;
        if (Math.floor(k / 0.9) !== Math.floor((k - dt) / 0.9) && nearMe(miko, 9)) A.sfx.suzu(); }
    },
    yu(k, dt) {
      for (const [n, home, side, fire] of [[priest, PH, -1, fireP], [miko, MH, 1, fireM]]) {
        follow(n, [at(0, home, 0), at(3, [side * 4.0, -1.35], PI), at(9.5, [side * 4.0, -1.35], PI), at(12.5, home, 0)], k, dt);
        fire.visible = k > 2 && k < 10.5; const reach = hump(k, 3.5, 9.2);
        if (fire.visible) { const u = n.userData; u.arms[0].rotation.x = -0.6 - reach * 0.8; u.body.rotation.y = (k < 6.3 ? 0.55 : -0.55) * reach; }
      }
    },
    yoru(k, dt) {
      follow(priest, [at(0, PH, PI), at(30, PH, PI)], k, dt); follow(miko, [at(0, MH, PI), at(30, MH, PI)], k, dt);
      seiza(priest, k); seiza(miko, k + 1.7);
    },
  };
  const modeAt = (h) => (h >= 5 && h < 10 ? "asa" : h >= 10 && h < 17 ? "hiru" : h >= 17 && h < 20 ? "yu" : "yoru");
  let mode = null, modeT = 0;
  function idle(dt) {
    modeT += dt;
    if (!mode || modeT >= 30) { mode = modeAt(A.env.hour); modeT = 0; }
    restAll(); MODES[mode](modeT, dt); hip(priest); hip(miko);
  }
  // 授与所の巫女：参拝者が近づくと、お辞儀して迎える
  const jFloor = new THREE.Mesh(new THREE.BoxGeometry(2.6, 0.56, 6.1), std(0x8a6a48, { roughness: 0.8 })); jFloor.position.set(PLACES.juyosho.pos[0] + 1.77, 0.58, PLACES.juyosho.pos[1]); jFloor.receiveShadow = true; scene.add(jFloor);   // 授与所の板の間（一段高い）
  const jm = makeNPC("miko"); jm.scale.setScalar(0.82); jm.position.set(PLACES.juyosho.pos[0] + 1.0, 0.86, PLACES.juyosho.pos[1]); jm.rotation.y = -PI / 2; scene.add(jm);
  let jmGreeted = false, jmBow = -1;
  function juyoTick(t, dt) {
    const d = Math.hypot(me.position.x - PLACES.juyosho.stand[0], me.position.z - PLACES.juyosho.stand[1]);
    if (d < 4.2 && !jmGreeted) { jmGreeted = true; jmBow = 0; } else if (d > 8) jmGreeted = false;
    const u = jm.userData; rest(jm);
    u.body.rotation.y = Math.sin(t * 0.23) * 0.18;
    u.arms[0].rotation.x = -0.35 - Math.max(0, Math.sin(t * 0.5)) * 0.35;                      // お守りを並べ直す
    if (jmBow >= 0) { jmBow += dt; u.body.rotation.x = hump(jmBow, 0.2, 2.0) * 0.7; u.body.rotation.y *= 1 - hump(jmBow, 0, 2.2); if (jmBow > 2.2) jmBow = -1; }
    hip(jm);
  }
  // 御扉：0 閉 → 1 開
  let door = 0, doorTo = 0, doorShown = 0;
  // 毎フレーム：火の揺らぎ・塵・光・控えの所作
  W.update.push((t, dt) => {
    flameM.forEach((m, i) => { m.emissiveIntensity = (m.userData.base) * (0.8 + 0.25 * Math.sin(t * 13 + i * 2) + 0.12 * Math.sin(t * 31 + i)); });
    flames.forEach((f, i) => { f.scale.y = 1 + 0.18 * Math.sin(t * 17 + i * 1.7); });
    for (let i = 0; i < dustN; i++) { dp[i * 3 + 1] += dt * 0.08; dp[i * 3] += Math.sin(t * 0.5 + i) * dt * 0.03; if (dp[i * 3 + 1] > FLOOR + 5) dp[i * 3 + 1] = FLOOR; }
    dustG.attributes.position.needsUpdate = true;
    glow += (glowTo - glow) * Math.min(1, dt * 1.5);
    beamU.op.value = 0.05 + glow * 0.5; dustM.opacity = 0.2 + glow * 0.6;
    if (mirror) mirror.material.emissiveIntensity = glow * 0.55;
    door += (doorTo - door) * Math.min(1, dt * 0.8); if (Math.abs(door - doorShown) > 0.0005) { doorShown = door; W.hondenDoors?.(door); }
    if (!running) idle(dt);
    juyoTick(t, dt);
  });

  // ---------------------------------------------------------------- 画面（帯・縦書きの祝詞・中断）
  const ov = document.createElement("div"); ov.id = "kito"; ov.hidden = true;
  ov.innerHTML = `<div class="kt-shade"></div><div class="kt-bar kt-top"></div><div class="kt-bar kt-bot"></div><div class="kt-phase"><small></small><b></b></div><div class="kt-text" aria-live="polite"></div><div class="kt-cue" hidden><button></button><small></small></div><button class="kt-stop">中断する</button>`;
  document.body.appendChild(ov);
  const $ = (s) => ov.querySelector(s);
  let aborted = false, running = false;
  const stopWaits = new Set();
  $(".kt-stop").onclick = () => { aborted = true; ov.classList.add("leaving"); for (const f of stopWaits) f(); stopWaits.clear(); };
  // 待ち時間はタイマーで（フレーム数に左右されない）。中断はすぐ効く
  const w = (ms) => new Promise((r, j) => { if (aborted) return j(new Error("abort")); const cancel = () => { clearTimeout(id); j(new Error("abort")); }; const id = setTimeout(() => { stopWaits.delete(cancel); aborted ? j(new Error("abort")) : r(); }, ms); stopWaits.add(cancel); });
  const phase = (en, jp) => { $(".kt-phase small").textContent = en; $(".kt-phase b").textContent = jp; $(".kt-phase").classList.remove("on"); void ov.offsetWidth; $(".kt-phase").classList.add("on"); };
  // 縦書きの文。gold: 金色にする語
  function setText(text, gold = []) {
    const el = $(".kt-text"); el.innerHTML = ""; const spans = [];
    let marks = new Array(text.length).fill(false);
    for (const gw of gold) if (gw) { let i = text.indexOf(gw); while (i >= 0) { for (let k = i; k < i + gw.length; k++) marks[k] = true; i = text.indexOf(gw, i + gw.length); } }
    [...text].forEach((ch, i) => { if (ch === "\n") { el.appendChild(document.createElement("br")); return; } const s = document.createElement("span"); s.textContent = ch; if (marks[i]) s.className = "gold"; el.appendChild(s); spans.push({ s, ch, gold: marks[i] }); });
    el.classList.remove("on"); void el.offsetWidth; el.classList.add("on");
    return spans;
  }
  // 一文字ずつ灯す（節つき）
  async function recite(spans, cps, voice, onGold) {
    let goldOn = false;
    for (const sp of spans) {
      if (sp.ch === " " || sp.ch === "　") { voice?.rest(true); await w(380); continue; }
      sp.s.classList.add("lit");
      if (sp.gold && !goldOn) { goldOn = true; onGold?.(); }
      if (!sp.gold && goldOn) goldOn = false;
      voice?.syl(vowelOf(sp.ch), 1 / cps, sp.gold);
      await w((1000 / cps) * (sp.gold ? 1.35 : 1));
    }
    voice?.rest(true);
  }
  async function cue(label, help, ms = 7000) {
    const c = $(".kt-cue"); c.hidden = false; c.querySelector("button").textContent = label; c.querySelector("small").textContent = help;
    await new Promise((r, j) => { const t0 = performance.now(); let done = false; c.querySelector("button").onclick = () => { done = true; };
      const id = setInterval(() => { if (aborted) { clearInterval(id); j(new Error("abort")); } else if (done || performance.now() - t0 > ms) { clearInterval(id); r(); } }, 50); });
    c.hidden = true;
  }
  // ---------------------------------------------------------------- カメラ（ショットからショットへ）
  const camFrom = new THREE.Vector3(), camTo = new THREE.Vector3(), lookFrom = new THREE.Vector3(), lookTo = new THREE.Vector3(), lookNow = new THREE.Vector3();
  // 実時間で進める（端末が重くても、太鼓や祝詞の文字とずれない）
  let shotAt = 0, shotDur = 1;
  function shot(pos, look, sec = 2.2) { camFrom.copy(camera.position); lookFrom.copy(lookNow); camTo.copy(toW(...pos)); lookTo.copy(toW(...look)); shotAt = performance.now(); shotDur = sec * 1000; }
  function cineTick() {
    const now = performance.now(), k = easeIO((now - shotAt) / shotDur), drift = now / 1000;
    camera.position.lerpVectors(camFrom, camTo, k); camera.position.y += Math.sin(drift * 0.4) * 0.03; camera.position.x += Math.sin(drift * 0.23) * 0.04;
    lookNow.lerpVectors(lookFrom, lookTo, k); camera.lookAt(lookNow);
  }
  // NPC をなめらかに動かす
  const glide = (o, to, ms, face) => new Promise((r) => { const from = o.position.clone(), t0 = performance.now(), r0 = o.rotation.y;
    (function f() { const k = easeIO((performance.now() - t0) / ms); o.position.lerpVectors(from, to, k); if (face !== undefined) o.rotation.y = r0 + (face - r0) * k; const u = o.userData; u.lower.position.y = 0; u.body.position.y = Math.abs(Math.sin(k * Math.PI * 6)) * 0.04 * (1 - k); k < 1 ? requestAnimationFrame(f) : r(); })(); });
  const armTo = (arm, rx, rz, ms) => new Promise((r) => { const x0 = arm.rotation.x, z0 = arm.rotation.z, t0 = performance.now();
    (function f() { const k = easeIO((performance.now() - t0) / ms); arm.rotation.x = x0 + (rx - x0) * k; arm.rotation.z = z0 + (rz - z0) * k; k < 1 ? requestAnimationFrame(f) : r(); })(); });

  // ---------------------------------------------------------------- 申込の画面
  const m = document.createElement("section"); m.className = "modal"; m.id = "m-kito"; m.hidden = true;
  m.innerHTML = `<div class="sheet kito-sheet"><button class="x" data-close>✕</button>
    <p class="kicker">本殿 · 御祈祷</p><h2>あなたのための御祈祷</h2>
    <p class="sub">神職があなたの名前と願いを祝詞に込めて、神前に奏上します。最後に御札を授かります。<br>およそ1分半。音を出すと、太鼓と祝詞の声が聞こえます。</p>
    <h3>お名前</h3><input id="kito-name" maxlength="12" autocomplete="off">
    <h3>願意</h3><div class="chips" id="kito-gan">${GANI.map((g, i) => `<button class="${i ? "" : "on"}" data-g="${g}">${g}</button>`).join("")}</div>
    <h3>願いごと <small>（任意・この端末の中だけで使います）</small></h3><input id="kito-wish" maxlength="20" placeholder="例：推しのライブに当選しますように" autocomplete="off">
    <div class="row"><span class="sub" id="kito-note"></span><button class="btn primary" id="kito-go">御祈祷を受ける</button></div></div>`;
  document.body.appendChild(m);
  m.querySelector("[data-close]").onclick = () => (m.hidden = true);
  m.addEventListener("click", (e) => { if (e.target === m) m.hidden = true; });
  let gan = GANI[0];
  m.querySelector("#kito-gan").onclick = (e) => { const b = e.target.closest("button"); if (!b) return; gan = b.dataset.g; m.querySelectorAll("#kito-gan button").forEach((x) => x.classList.toggle("on", x === b)); };
  const clean = (s) => s.replace(/[<>&"'`\\]/g, "").replace(/\s+/g, " ").trim();
  function openForm() {
    m.querySelector("#kito-name").value = A.getName();
    const last = A.store.get("enishi_kito", {}); if (last.gan) { gan = last.gan; m.querySelectorAll("#kito-gan button").forEach((x) => x.classList.toggle("on", x.dataset.g === gan)); }
    m.querySelector("#kito-wish").value = last.wish || "";
    m.querySelector("#kito-note").textContent = last.day === A.today() ? "今日はもう受けています（何度でも受けられます）" : "";
    m.hidden = false;
  }
  m.querySelector("#kito-go").onclick = () => {
    const name = clean(m.querySelector("#kito-name").value) || A.getName(), wish = clean(m.querySelector("#kito-wish").value);
    if (A.ng(name) || A.ng(wish)) { m.querySelector("#kito-note").textContent = "その言葉は使えません"; return; }
    m.hidden = true; run({ name, gan, wish });
  };

  // ---------------------------------------------------------------- 儀式
  function run({ name, gan, wish, group = false, names = [] }) {
    return A.doing(async () => {
      aborted = false; running = true; restAll();
      let voice = null, stopFue = () => {};
      const u = me.userData, pu = priest.userData, mu = miko.userData;
      try {
        // 着座
        A.toast("本殿の祈祷の座へ向かいます", 2000);
        await A.goSeat(group ? A.freeCushion() : toXZ(SEAT));
        me.rotation.y = Math.PI; A.setPose(me, "seiza");
        ov.hidden = false; ov.classList.remove("leaving"); document.body.classList.add("cine"); if (!group) A.hideOthers(true);
        lookNow.copy(toW(0, 2.6, -0.5)); A.setCine(cineTick);
        shot([3.4, 4.0, 4.4], [0, 2.6, -0.6], 3.0);
        priest.rotation.y = 0; await glide(priest, new THREE.Vector3(-0.9, FLOOR, -0.5), 2200, Math.PI * 0.15);
        await glide(miko, new THREE.Vector3(2.7, FLOOR, -1.5), 1200, -Math.PI * 0.3);
        A.sfx.taiko(); await w(1200); A.sfx.taiko(); await w(900);
        for (let i = 0; i < 9; i++) { A.sfx.taiko(); await w(Math.max(90, 420 - i * 40)); }
        await w(800);

        // 修祓
        phase("SHUBATSU", "修 祓"); shot([3.0, 3.7, 3.6], [0, 2.6, -0.2], 2.4);
        nusa.visible = true; await glide(priest, new THREE.Vector3(0, FLOOR, -0.45), 1200, 0);
        await A.bowTo(priest, 0.5, 600); await A.bowTo(priest, 0, 500);
        const spansH = setText(HARAE);
        const sway = (async () => { for (const z of [-1.1, 1.1, -1.1]) { await armTo(pu.arms[0], -2.2, z, 900); A.noise(0.35, 2600, 0.06, "highpass"); } await armTo(pu.arms[0], -0.2, 0.22, 700); })();
        voice = chantVoice(A.ac, A.muted);
        await recite(spansH, 9, voice);
        await sway; nusa.visible = false; voice.rest(); await w(600);
        A.bowTo(me, 1.1, 600).then(() => A.bowTo(me, 0, 600));

        // 祝詞奏上
        phase("NORITO", "祝 詞 奏 上");
        await glide(priest, new THREE.Vector3(0, FLOOR, -0.75), 900, Math.PI);
        shot([0.9, 3.0, 2.7], [0, 3.3, -2.6], 2.6);
        await A.bowTo(priest, 1.0, 700); await w(300); await A.bowTo(priest, 0, 600); A.sfx.taiko(); await w(500);
        // 開扉：御扉が開き、奥から光があふれる
        doorTo = 1; A.noise(2.4, 180, 0.05, "lowpass"); A.tone([[392, 0.2], [587, 0.12]], 3.5, 0.04);
        shot([0.4, 3.2, 1.6], [0, 3.6, -3.4], 3.2); await w(3400);
        const all = group ? [name, ...names.filter((n) => n && n !== name)].slice(0, 12) : [name];
        const norito = group
          ? `掛けまくも畏き えにしの大神の大前に 恐み恐みも白さく\n今日の生日の足日に 参列の ${all.join(" ")} 等\n各も各も 心に願ひ奉る状を\n平けく安けく聞こし食して 夜の守り日の守りに 守り幸へ給へと 恐み恐みも白す`
          : `掛けまくも畏き えにしの大神の大前に 恐み恐みも白さく\n今日の生日の足日に ${name} ${gan}の為に\n` +
            (wish ? `「${wish}」と 願ひ奉る状を\n` : "") +
            `平けく安けく聞こし食して 夜の守り日の守りに 守り幸へ給へと 恐み恐みも白す`;
        const spansN = setText(norito, group ? all : [name, wish && `「${wish}」`]);
        let climax = false;
        await recite(spansN, 5.2, voice, () => {
          if (climax) return; climax = true; glowTo = 1; A.tone([[523, 0.25], [784, 0.2], [1046, 0.15]], 3.2, 0.06);
          shot([1.7, 3.7, 0.3], [0, 4.0, -3.6], 4.5);
        });
        voice.rest(); glowTo = 0.45; await w(500); await A.bowTo(priest, 1.0, 700); await w(400); await A.bowTo(priest, 0, 600);
        A.sfx.taiko(); await w(700);

        // 神楽
        phase("KAGURA", "神 楽 奉 納"); $(".kt-text").classList.remove("on");
        await glide(priest, new THREE.Vector3(-1.9, FLOOR, -0.8), 1100, Math.PI * 0.25);
        shot([-2.6, 2.9, 2.0], [0.2, 2.6, -0.8], 2.4);
        await glide(miko, new THREE.Vector3(0, FLOOR, -0.8), 1300, 0);
        stopFue = fue(A.ac, A.muted, [[880, 1.2], [988, 0.8], [1175, 1.6], [1046, 0.8], [880, 1.4], [784, 0.8], [880, 2.2], [1175, 1.2], [1318, 1.6], [1175, 2.0]]);
        const t0 = performance.now();
        while (performance.now() - t0 < 12500) {
          const k = (performance.now() - t0) / 1000;
          miko.rotation.y = Math.sin(k * 0.7) * 1.4; miko.position.x = Math.sin(k * 0.45) * 0.45;
          mu.arms[1].rotation.x = -1.6 - Math.sin(k * 2.2) * 0.5; mu.arms[1].rotation.z = -0.4 + Math.sin(k * 1.1) * 0.3;
          mu.arms[0].rotation.x = -0.6 + Math.sin(k * 1.1) * 0.3;
          if (Math.floor(k / 0.85) !== Math.floor((k - 0.016) / 0.85)) A.sfx.suzu();
          if (Math.floor(k / 1.7) !== Math.floor((k - 0.016) / 1.7)) A.sfx.taiko();
          await w(16);
        }
        stopFue(); stopFue = () => {}; await glide(miko, MIKO_HOME.clone(), 1500, 0); mu.arms.forEach((a, i) => { a.rotation.x = 0; a.rotation.z = (i ? -1 : 1) * 0.22; });
        miko.rotation.y = 0;

        // 玉串拝礼
        phase("TAMAGUSHI", "玉 串 拝 礼");
        A.setPose(me, null); shot([-3.7, 3.5, 0.6], [0.5, 2.4, -0.9], 2.2);
        await glide(priest, new THREE.Vector3(1.15, FLOOR, -0.45), 1100, -Math.PI * 0.5);
        const tg = tamagushi(); pu.arms[1].add(tg); tg.position.set(0, -0.5, 0.15); await armTo(pu.arms[1], -1.2, -0.2, 600);
        await A.walkTo2(toXZ(new THREE.Vector3(0, FLOOR, -0.7))); me.rotation.y = Math.PI;
        u.pose = "act"; u.arms.forEach((a) => (a.rotation.x = -1.1)); pu.arms[1].remove(tg); u.arms[1].add(tg); tg.position.set(0.2, -0.5, 0.15);
        await armTo(pu.arms[1], 0, -0.22, 500);
        await cue("玉串を捧げる", "枝先を神前へ向けて、案の上に");
        for (let i = 0; i < 12; i++) { tg.rotation.y += Math.PI / 12; await w(40); }
        u.arms[1].remove(tg); tg.position.set(0, FLOOR + 0.68, TABLE_Z); tg.rotation.set(0, Math.PI, 0); tg.scale.setScalar(1 / HONDEN.S * 0.8); H.add(tg);
        u.arms.forEach((a, i) => { a.rotation.x = 0; a.rotation.z = (i ? -1 : 1) * 0.25; }); u.pose = null; A.sfx.suzu();
        // 二礼二拍手一礼（自分の手で）
        for (const [label, kind] of [["一 礼", "bow"], ["二 礼", "bow"], ["拍 手", "clap"], ["拍 手", "clap"], ["一 礼", "bow"]]) {
          await cue(label, kind === "bow" ? "タップして、深くお辞儀" : "タップして、手を打つ", 6000);
          if (kind === "bow") { A.net?.act("bow"); await A.bowTo(me, 1.25, 550); await w(250); await A.bowTo(me, 0, 450); }
          else { A.net?.act("clap"); A.sfx.clap(); u.arms.forEach((a) => (a.rotation.x = -1.2)); await w(220); u.arms.forEach((a) => (a.rotation.x = 0)); }
        }
        H.remove(tg);

        // 撤饌・授与
        phase("JUYO", "御 札 授 与"); glowTo = 0.25; doorTo = 0;   // 閉扉
        shot([0, 3.5, 3.6], [0, 3.2, -2.8], 3.0);
        A.sfx.taiko(); await w(700); A.sfx.taiko(); await w(1200);
        await glide(priest, new THREE.Vector3(-0.6, FLOOR, -0.2), 900, Math.PI * 0.6);
        await A.bowTo(priest, 0.6, 600); await A.bowTo(priest, 0, 500);
        await w(400);
        const rec = { name, gan: group ? "心願成就" : gan, wish: group ? `合同祈祷・${all.length}人で` : wish, date: reiwa(), day: A.today() };
        const list = A.store.get("enishi_ofuda", []); list.unshift(rec); A.store.set("enishi_ofuda", list.slice(0, 30));
        const first = A.store.get("enishi_kito", {}).day !== A.today();
        A.store.set("enishi_kito", { gan, wish, day: A.today() });
        A.deedHook("kito", { first });
        showOfuda(rec);
      } catch (e) { if (e.message !== "abort") console.error(e); A.toast("御祈祷を中断しました", 2200); }
      finally {
        running = false; glowTo = 0; doorTo = 0; voice?.stop(); stopFue();
        nusa.visible = false; priest.position.copy(PRIEST_HOME); priest.rotation.y = 0; miko.position.copy(MIKO_HOME); miko.rotation.y = 0;
        [pu, mu].forEach((x) => x.arms.forEach((a, i) => { a.rotation.x = 0; a.rotation.z = (i ? -1 : 1) * 0.22; })); pu.body.rotation.x = 0;
        priest.userData.arms[1].children.slice(2).forEach((c) => priest.userData.arms[1].remove(c));
        ov.hidden = true; $(".kt-text").innerHTML = ""; $(".kt-cue").hidden = true; document.body.classList.remove("cine"); A.hideOthers(false); joined = false;
        A.setCine(null);
      }
    });
  }

  // ---------------------------------------------------------------- 御札の画面
  const mo = document.createElement("section"); mo.className = "modal"; mo.id = "m-ofuda"; mo.hidden = true;
  mo.innerHTML = `<div class="sheet ofuda-sheet"><button class="x" data-close>✕</button><p class="kicker">授与</p><h2>御札を授かりました</h2>
    <div class="ofuda-wrap"><img id="ofuda-img" alt="あなたの名前が入った御札"></div>
    <p class="sub" id="ofuda-msg"></p>
    <div class="row"><button class="btn" id="ofuda-share">Xでシェア</button><button class="btn primary" data-close>境内へ戻る</button></div></div>`;
  document.body.appendChild(mo);
  mo.querySelectorAll("[data-close]").forEach((b) => (b.onclick = () => (mo.hidden = true)));
  let lastCanvas = null, lastRec = null;
  function showOfuda(rec) {
    lastRec = rec; lastCanvas = ofudaImage(rec);
    mo.querySelector("#ofuda-img").src = lastCanvas.toDataURL("image/png");
    const n = A.store.get("enishi_ofuda", []).length;
    mo.querySelector("#ofuda-msg").textContent = `${rec.gan}の御札です。御朱印帳にしまいました（これまでに ${n} 枚）。願いが叶ったら、🎉 お礼参りを。`;
    mo.hidden = false;
  }
  mo.querySelector("#ofuda-share").onclick = async () => {
    if (!lastRec) return;
    const text = `えにし神社で御祈祷を受けました。神職さんが私の名前を読み上げてくれた…⛩\n願意：${lastRec.gan}\n#えにし神社 #${lastRec.gan}`;
    const url = location.origin + location.pathname;
    try { const blob = await new Promise((r) => lastCanvas.toBlob(r, "image/png")), file = new File([blob], "enishi-ofuda.png", { type: "image/png" });
      if (navigator.canShare && navigator.canShare({ files: [file] })) { await navigator.share({ text, url, files: [file] }); return; } } catch {}
    window.open(`https://x.com/intent/post?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`, "_blank", "noopener");
  };

  // ---------------------------------------------------------------- 合同祈祷：毎時0分と30分（日本時間）。本殿にいる人みんなの名前を読み上げる
  const bar = document.createElement("div"); bar.id = "gokito"; bar.hidden = true;
  bar.innerHTML = `<span class="gk-t"></span><button class="btn primary gk-go" type="button">参列する</button>`;
  document.body.appendChild(bar);
  let joined = false, joinedAt = 0, lastLeft = 1e9, seating = false;   // seating：席へ向かっている途中
  const inHondenMe = () => inHonden(me.position.x, me.position.z);
  const secsLeft = () => { const d = new Date(Date.now() + (globalThis.enishiSkew || 0) + 9 * 3600e3), m = d.getUTCMinutes(), s = d.getUTCSeconds(); return ((m < 30 ? 30 : 60) - m) * 60 - s; };
  bar.querySelector(".gk-go").onclick = () => {
    if (A.isBusy() || joined) return;
    joined = true; joinedAt = Date.now(); A.toast("本殿で合同祈祷を待ちます。始まるまで座ってお待ちください", 3200);
    seating = true; A.goSeat(A.freeCushion()).then(() => { seating = false; joinedAt = Date.now(); if (joined && !running) { me.rotation.y = Math.PI; A.setPose(me, "seiza"); } });
    paintBar();
  };
  function paintBar() {
    const left = secsLeft(), show = left <= 300 && !running && !A.inCine?.();
    bar.hidden = !show; if (!show) return;
    const mm = Math.floor(left / 60), ss = String(left % 60).padStart(2, "0");
    bar.querySelector(".gk-t").innerHTML = `<small>本殿 · 毎時0分と30分</small>⛩ 合同祈祷まで ${mm}:${ss}`;
    const b = bar.querySelector(".gk-go"); b.textContent = joined || inHondenMe() ? "参列しています" : "参列する"; b.disabled = joined || inHondenMe();
  }
  setInterval(() => {
    const left = secsLeft();
    if (joined && !seating && !inHondenMe() && Date.now() - joinedAt > 25e3 && !A.isBusy()) joined = false;     // 本殿を離れたら取り消し
    // 0分・30分になった瞬間（残りが急に増える）
    if (left > lastLeft + 60) {
      if ((joined || inHondenMe()) && !running && !A.isBusy()) {
        const names = A.othersInHonden();
        A.net?.act("kito"); run({ name: A.getName(), gan: "心願成就", wish: "", group: true, names });
      } else if (!running) A.toast("⛩ 本殿で合同祈祷が始まりました。次は30分後です", 3200);
    }
    lastLeft = left; paintBar();
  }, 1000);
  // 季節の願意を足す（七五三など）
  function addGan(gn) {
    if (GANI.includes(gn)) return; GANI.splice(1, 0, gn);
    m.querySelector("#kito-gan").innerHTML = GANI.map((g2, i) => `<button class="${i ? "" : "on"}" data-g="${g2}">${g2}</button>`).join("");
  }
  const cancelJoin = () => { if (!joined) return; joined = false; paintBar(); A.toast("参列をやめました。本殿の中にいれば、始まったときにそのまま参列できます", 3600); };
  return { open: openForm, run, priest, miko, get running() { return running; }, secsLeft, addGan, cancelJoin };
}
