// えにし神社 — アプリ本体（境内・参拝者・カメラ・地図・行動）
import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { EffectComposer } from "three/addons/postprocessing/EffectComposer.js";
import { RenderPass } from "three/addons/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/addons/postprocessing/UnrealBloomPass.js";
import { OutputPass } from "three/addons/postprocessing/OutputPass.js";
import { createEnv, jstNow, season as seasonOf } from "./env.js?v=11030851";
import { buildWorld } from "./world.js?v=11030851";
import { PLACES, blocked, footY, routeTo, region, TRAIL, OKPOND } from "./map.js?v=11030851";
import { book, drawShuin, drawOmamori, OMAMORI, SHUIN, limitedFor } from "./collect.js?v=11030851";
import { Leaves, DarkLanterns, LostFox, Fireworks } from "./good.js?v=11030851";
import { deeds } from "../deeds.js?v=11030851";
import { LIGHT_SPOTS } from "./arch.js?v=11030851";
import { makeAvatar, setPose, bowTo } from "./avatar.js?v=11030851";
import { Lanterns, ambience } from "../fx.js?v=11030851";
import { connect, board } from "../net.js?v=11030851";
import { HALLS, OMIKUJI, RANKS, NAMES_A, NAMES_B, EMA_CATS } from "../content.js?v=11030851";

const $ = (s) => document.querySelector(s);
const rand = (a, b) => a + Math.random() * (b - a);
const pick = (a) => a[Math.floor(Math.random() * a.length)];
const store = { get(k, d) { try { return JSON.parse(localStorage.getItem(k)) ?? d; } catch { return d; } }, set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} } };
const today = () => jstNow().toISOString().slice(0, 10);
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const QS = new URLSearchParams(location.search);
const MOBILE = matchMedia("(pointer:coarse)").matches || innerWidth < 700;

// ------------------------------------------------------------------ renderer / scene / env
const canvas = $("#c");
const renderer = new THREE.WebGLRenderer({ canvas, antialias: !MOBILE, powerPreference: "high-performance" });
renderer.setPixelRatio(Math.min(devicePixelRatio, MOBILE ? 1.4 : 2));
renderer.setSize(innerWidth, innerHeight);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(52, innerWidth / innerHeight, 0.1, 900);
const fitFov = () => { const a = innerWidth / innerHeight; camera.fov = a < 0.8 ? 66 : a < 1.2 ? 58 : 52; camera.aspect = a; camera.updateProjectionMatrix(); };
fitFov();
const env = createEnv(scene, renderer, { mobile: MOBILE });
if (QS.get("season")) env.season = QS.get("season");
const hourNow = () => (QS.get("hour") ? +QS.get("hour") : jstNow().getUTCHours() + jstNow().getUTCMinutes() / 60);
env.set(hourNow());
setInterval(() => env.set(hourNow()), 60e3);

const W = buildWorld(scene, env, { mobile: MOBILE });
// 光源プール：近くの灯籠・社殿だけ本物の光で照らす（遠くは発光だけ）
const POOL = Array.from({ length: MOBILE ? 5 : 8 }, () => { const l = new THREE.PointLight(0xffa04a, 0, 9, 1.7); scene.add(l); return l; });
const spotPos = LIGHT_SPOTS.map((s) => { const v = new THREE.Vector3(); s.obj.updateWorldMatrix(true, false); s.obj.getWorldPosition(v); v.y += s.y; return { ...s, v }; });
function updateLightPool() {
  const p = me.position; const near = spotPos.map((s) => [s, s.v.distanceToSquared(p)]).sort((a, b) => a[1] - b[1]).slice(0, POOL.length);
  POOL.forEach((l, i) => { const s = near[i]?.[0]; if (!s) { l.intensity = 0; return; } l.position.copy(s.v); l.color.setHex(s.color); l.distance = s.dist; l.intensity = s.int * env.lamp; });
}
const lanterns = new Lanterns(scene);
const leaves = new Leaves(scene, env.season), darkL = new DarkLanterns(W.lamps), kit = new LostFox(scene), fireworks = new Fireworks(scene);
setInterval(() => leaves.spawn(), 40e3);
setInterval(() => darkL.turnOffRandom(), 150e3);

// ------------------------------------------------------------------ 自分
const myName = store.get("enishi_name", null) || `${pick(NAMES_A)}${pick(NAMES_B)}`; store.set("enishi_name", myName);
const myLook = store.get("enishi_look", null) ?? Math.random(); store.set("enishi_look", myLook);
const me = makeAvatar(myLook, env);
me.position.set(0, 0, 80); me.rotation.y = Math.PI; scene.add(me);
$("#me-tag").textContent = "わたし · " + myName;

// ------------------------------------------------------------------ ポストエフェクト
const composer = new EffectComposer(renderer);
composer.addPass(new RenderPass(scene, camera));
const bloom = new UnrealBloomPass(new THREE.Vector2(innerWidth, innerHeight), MOBILE ? 0.55 : 0.8, 0.55, 0.78);
composer.addPass(bloom); composer.addPass(new OutputPass());

// ------------------------------------------------------------------ カメラ
const controls = new OrbitControls(camera, canvas);
controls.enableDamping = true; controls.dampingFactor = 0.08; controls.enablePan = false;
controls.minDistance = 3.5; controls.maxDistance = 22; controls.maxPolarAngle = Math.PI * 0.48; controls.minPolarAngle = Math.PI * 0.12;
camera.position.set(0, innerWidth < innerHeight ? 8 : 6, innerWidth < innerHeight ? 93 : 90); controls.target.set(0, 1.2, 80);

// ------------------------------------------------------------------ 歩く（当たり判定つき）・道順
const ray = new THREE.Raycaster(), ptr = new THREE.Vector2();
let path = [], busy = false, onArrive = null, speedMul = 1;
let downAt = null;
canvas.addEventListener("pointerdown", (e) => { downAt = [e.clientX, e.clientY, performance.now()]; });
canvas.addEventListener("pointerup", (e) => {
  if (!downAt || busy || intro) return;
  const [x, y, t] = downAt; downAt = null;
  if (Math.hypot(e.clientX - x, e.clientY - y) > 8 || performance.now() - t > 450) return;
  ptr.set((e.clientX / innerWidth) * 2 - 1, -(e.clientY / innerHeight) * 2 + 1);
  ray.setFromCamera(ptr, camera);
  const hit = ray.intersectObject(W.terrain)[0] || ray.intersectObjects(scene.children, true).find((h) => h.point.y < 20);
  if (hit) { walkTo([hit.point.x, hit.point.z]); $("#hint").style.opacity = 0; }
});
function walkTo(dest, cb = null, { route = false, fast = false } = {}) {
  path = route ? routeTo([me.position.x, me.position.z], dest) : [dest];
  onArrive = cb; speedMul = fast ? 2.4 : 1;
}
const SPEED = 3.4, step = new THREE.Vector3();
let stuck = 0, avoidSide = 0;
function stepMove(dt) {
  const u = me.userData;
  if (path.length) {
    const [tx, tz] = path[0], dx = tx - me.position.x, dz = tz - me.position.z, dist = Math.hypot(dx, dz);
    if (dist < 0.08 || (path.length > 1 && dist < 0.9)) { path.shift(); avoidSide = 0; if (!path.length) { u.walk = 0; speedMul = 1; const cb = onArrive; onArrive = null; cb && cb(); } }
    else {
      const ang = Math.atan2(dx, dz);
      me.rotation.y += ((((ang - me.rotation.y) % (2 * Math.PI)) + 3 * Math.PI) % (2 * Math.PI) - Math.PI) * Math.min(1, dt * 10);
      const s = Math.min(dist, SPEED * speedMul * dt), nx = me.position.x + (dx / dist) * s, nz = me.position.z + (dz / dist) * s;
      if (!blocked(nx, nz)) { me.position.x = nx; me.position.z = nz; stuck = 0; }
      else {   // 障害物：少しずつ向きを変えて回り込む
        let moved = false;
        for (const da of [0.45, -0.45, 0.9, -0.9, 1.35, -1.35, 1.8, -1.8]) {
          const a2 = Math.atan2(dx, dz) + da * (avoidSide || 1), ax = me.position.x + Math.sin(a2) * s, az = me.position.z + Math.cos(a2) * s;
          if (!blocked(ax, az)) { me.position.x = ax; me.position.z = az; moved = true; if (!avoidSide) avoidSide = Math.sign(da); break; }
        }
        stuck = moved ? 0 : stuck + dt;
        if (stuck > 1.5) { path = []; onArrive = null; speedMul = 1; stuck = 0; }
      }
      u.walk += dt * 11 * Math.min(2, speedMul);
    }
  }
  const moving = path.length > 0;
  me.position.y += (footY(me.position.x, me.position.z) - me.position.y) * Math.min(1, dt * 14);
  if (!u.pose) { u.body.position.y = moving ? Math.abs(Math.sin(u.walk)) * 0.08 : 0; u.arms.forEach((a, i) => (a.rotation.x = moving ? Math.sin(u.walk + i * Math.PI) * 0.5 : 0)); }
}

// ------------------------------------------------------------------ 音
let AC = null, muted = store.get("enishi_mute", false);
const ac = () => (AC ||= new (window.AudioContext || window.webkitAudioContext)());
function tone(freqs, dur = 2.5, gain = 0.25) {
  if (muted) return; const a = ac(), t = a.currentTime, out = a.createGain(); out.gain.value = gain; out.connect(a.destination);
  freqs.forEach(([f, g]) => { const o = a.createOscillator(), v = a.createGain(); o.frequency.value = f; v.gain.setValueAtTime(g, t); v.gain.exponentialRampToValueAtTime(0.0001, t + dur * (0.5 + g)); o.connect(v).connect(out); o.start(t); o.stop(t + dur * 1.5); });
}
function noise(dur, freq, gain, type = "bandpass") {
  if (muted) return; const a = ac(), n = Math.floor(a.sampleRate * dur), b = a.createBuffer(1, n, a.sampleRate), d = b.getChannelData(0);
  for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / n, 4);
  const s = a.createBufferSource(), f = a.createBiquadFilter(), g = a.createGain(); f.type = type; f.frequency.value = freq; g.gain.value = gain; s.buffer = b; s.connect(f).connect(g).connect(a.destination); s.start();
}
const sfx = {
  suzu: () => { for (let i = 0; i < 6; i++) setTimeout(() => tone([[2093 + rand(-30, 30), 0.5], [3136, 0.3], [4186, 0.2]], 1.2, 0.12), i * 90); },
  clap: () => noise(0.12, 1400, 0.9), coin: () => tone([[1567, 0.6], [2349, 0.3]], 0.5, 0.15), gong: () => tone([[110, 0.8], [220, 0.4], [331, 0.2]], 3.5, 0.2),
  taiko: () => { tone([[70, 0.9], [105, 0.3]], 0.9, 0.5); noise(0.08, 300, 0.4, "lowpass"); }, splash: () => noise(0.5, 1800, 0.35, "highpass"),
};
$("#btn-sound").textContent = muted ? "🔇" : "🔈";
const startAmb = ambience(() => ac(), () => muted);
addEventListener("pointerdown", () => { ac(); startAmb(); });
$("#btn-sound").onclick = () => { muted = !muted; store.set("enishi_mute", muted); $("#btn-sound").textContent = muted ? "🔇" : "🔈"; };

// ------------------------------------------------------------------ UI
const toast = (t, ms = 2800) => { const el = $("#toast"); el.textContent = t; el.classList.add("on"); clearTimeout(el._t); el._t = setTimeout(() => el.classList.remove("on"), ms); };
const stepText = (t) => { const el = $("#step"); el.textContent = t; el.classList.toggle("on", !!t); };
const open = (id) => { $(id).hidden = false; };
document.querySelectorAll("[data-close]").forEach((b) => (b.onclick = () => (b.closest(".modal").hidden = true)));
document.querySelectorAll(".modal").forEach((m) => m.addEventListener("click", (e) => { if (e.target === m) m.hidden = true; }));
let todayLights = 0;
const setLights = (n) => { todayLights = n; $("#lights").textContent = n.toLocaleString(); };
function releaseLight(x, y, z, mine) { lanterns.spawn(x, y + 1.6, z - 0.4, { mine }); setLights(todayLights + 1); }
const hallOf = () => { const r = region(me.position.x, me.position.z); const id = r === "west" ? "enmusubi" : r === "east" ? "gokaku" : r === "trail" && me.position.z < -58 ? "okunoin" : "tosen"; return HALLS.find((h) => h.id === id) || HALLS[0]; };
let kujiHall = null;

// ------------------------------------------------------------------ 地図（ミニマップ：絵地図の上に番号）
const MAP_PIN = { ootorii: [260, 600], sando: [470, 610], pond: [745, 650], romon: [605, 430], temizu: [785, 465], juyosho: [950, 515], shinboku: [965, 405], honden: [840, 290], enmusubi: [480, 320], gokaku: [1135, 385], senbon: [900, 165], okunoin: [1030, 105], pagoda: [1240, 190] };
$("#map-pins").innerHTML = Object.entries(PLACES).map(([k, p]) => { const [px, py] = MAP_PIN[k];
  return `<button class="pin" data-k="${k}" style="left:${(px / 1408) * 100}%;top:${(py / 768) * 100}%"><b>${p.n}</b><span>${p.name}<small>${p.vi}</small></span></button>`; }).join("");
$("#map-pins").onclick = (e) => { const b = e.target.closest(".pin"); if (!b) return; goPlace(b.dataset.k); $("#m-map").hidden = true; };
function goPlace(k, cb) {
  const p = PLACES[k]; if (!p || busy) return;
  toast(`${p.n}. ${p.name}へ向かいます`, 1800);
  walkTo(p.stand, () => { me.rotation.y = p.face; cb && cb(); }, { route: true, fast: true });
}

// 今いる場所の名前
let lastPlace = "";
function nearestPlace() {
  let best = null, bd = 1e9; for (const [k, p] of Object.entries(PLACES)) { const d = Math.hypot(p.pos[0] - me.position.x, p.pos[1] - me.position.z); if (d < bd) { bd = d; best = k; } }
  return bd < 14 ? best : null;
}

// ------------------------------------------------------------------ その場でできること（近づくとボタンが変わる）
const fox = (i) => W.foxes[i];
const ACTIONS = [
  { id: "omairi", label: "⛩ お参り", at: [0, 13.6], r: 3.2, run: () => omairi("tosen") },
  { id: "omairi_en", label: "⛩ お参り（縁結び）", at: [-31, 19.1], r: 2.6, run: () => omairi("enmusubi") },
  { id: "omairi_go", label: "⛩ お参り（合格）", at: [31, 19.1], r: 2.6, run: () => omairi("gokaku") },
  { id: "omairi_ok", label: "⛩ お参り（奥の院）", at: [-2, -73.4], r: 2.2, run: () => omairi("okunoin") },
  { id: "temizu", label: "💧 手水をとる", at: PLACES.temizu.stand, r: 3, run: () => temizu() },
  { id: "kuji", label: "⛩ 授与所", at: PLACES.juyosho.stand, r: 3.4, run: () => openJuyo() },
  { id: "ema", label: "🪵 絵馬を奉納", at: [15.5, 10.5], r: 4, run: () => { renderEma(); loadEma(); open("#m-ema"); } },
  { id: "musubi", label: "🎋 おみくじを結ぶ", at: [21, 27.6], r: 2.8, run: () => musubi() },
  { id: "fox", label: "🦊 狐を撫でる", at: [-5.5, 19.6], r: 2.4, run: () => petFox(0) },
  { id: "fox2", label: "🦊 狐を撫でる", at: [5.5, 19.6], r: 2.4, run: () => petFox(1) },
  { id: "ushi", label: "🐂 撫で牛を撫でる", at: [27, 22.4], r: 2.8, run: () => nadeUshi() },
  { id: "enito", label: "💞 赤い糸に願う", at: [-27, 21.6], r: 2.8, run: () => akaiIto() },
  { id: "koi", label: "🐟 鯉にえさをあげる", at: [18, 54], r: 5, run: () => feedKoi() },
  { id: "toro", label: "🏮 灯籠を流す", at: [2, -71.5], r: 5, run: () => toroNagashi() },
  { id: "seiza_tosen", label: "🙇 正座して祈る", box: [-9, -4.5, 9, 8.3], run: () => seiza("tosen") },
  { id: "seiza_en", label: "🙇 正座して祈る", box: [-35.7, 9.4, -26.3, 15.9], run: () => seiza("enmusubi") },
  { id: "seiza_go", label: "🙇 正座して祈る", box: [26.3, 9.4, 35.7, 15.9], run: () => seiza("gokaku") },
];
let curAct = null;
function currentAction() {
  const x = me.position.x, z = me.position.z;
  if (kit.state === "follow" && W.foxes.some((f) => Math.hypot(f.position.x - x, f.position.z - z) < 3.2)) return { id: "kithome", label: "🦊 子狐を狛狐のもとへ", run: () => kitHome() };
  if (kit.near(me.position)) return { id: "kit", label: "🦊 迷子の子狐を連れていく", run: () => kitFollow() };
  const pile = leaves.near(me.position); if (pile) return { id: "leaf" + pile.x + pile.z, label: "🧹 落ち葉を掃く", run: () => sweep(pile) };
  const dl = darkL.near(me.position); if (dl) return { id: "lamp" + dl.id, label: "🏮 灯籠に火を灯す", run: () => lightLamp(dl) };
  for (const a of ACTIONS) {
    if (a.box) { const [x0, z0, x1, z1] = a.box; if (x > x0 && x < x1 && z > z0 && z < z1) return a; }
    else if (Math.hypot(a.at[0] - x, a.at[1] - z) < a.r) return a;
  }
  return null;
}
function refreshAction() {
  const a = currentAction(); if ((a && a.id) === (curAct && curAct.id)) { curAct = a; return; } curAct = a;
  const b = $("#act-main"); b.innerHTML = a ? a.label : "⛩ 本殿へ";
  b.classList.toggle("glow", !!a);
}
$("#act-main").onclick = () => { if (busy) return; ac(); if (curAct) curAct.run(); else goPlace("honden"); };
$("#act-map").onclick = () => open("#m-map");
$("#act-ema").onclick = () => { renderEma(); loadEma(); open("#m-ema"); };
$("#act-report").onclick = () => report();
function setActions(on) { document.querySelectorAll("#actions button").forEach((b) => (b.disabled = !on)); }
async function doing(fn) { if (busy) return; busy = true; setActions(false); try { await fn(); } finally { busy = false; setActions(true); stepText(""); setPose(me, null); } }

// ------------------------------------------------------------------ 行いのフック（徳・御朱印などで使う）
const hooks = [];
function deedHook(kind, data = {}) { for (const h of hooks) try { h(kind, data); } catch (e) { console.warn(e); } }

// ------------------------------------------------------------------ 手水
let purified = false;
function drops(x, y, z) {
  for (let i = 0; i < 10; i++) {
    const d = new THREE.Mesh(new THREE.SphereGeometry(0.035, 6, 5), new THREE.MeshBasicMaterial({ color: 0x9fd4ff })); d.position.set(x + rand(-0.15, 0.15), y, z + rand(-0.1, 0.1)); scene.add(d);
    const vy = rand(0.5, 1.4), t0 = performance.now();
    (function f() { const k = (performance.now() - t0) / 1000; d.position.y = y + vy * k - 4.9 * k * k; if (d.position.y > 0.1 && k < 1.2) requestAnimationFrame(f); else scene.remove(d); })();
  }
}
// 長押しボタン（押し続けると円が満ちる）
function holdStep(title, sub, ms = 900) {
  return new Promise((resolve) => {
    const el = $("#hold"); el.hidden = false; $("#hold-title").textContent = title; $("#hold-sub").textContent = sub;
    const ring = $("#hold-ring"), btn = $("#hold-btn"); let t0 = 0, raf = 0, done = false;
    const set = (k) => ring.style.setProperty("--k", k);
    set(0);
    const tick = () => { const k = Math.min(1, (performance.now() - t0) / ms); set(k); if (k >= 1) { done = true; cleanup(); el.hidden = true; resolve(true); } else raf = requestAnimationFrame(tick); };
    const down = (e) => { e.preventDefault(); if (done) return; t0 = performance.now(); btn.classList.add("on"); sfx.splash(); raf = requestAnimationFrame(tick); };
    const up = () => { if (done) return; cancelAnimationFrame(raf); btn.classList.remove("on"); set(0); };
    const skip = () => { done = true; cleanup(); el.hidden = true; resolve(false); };
    function cleanup() { btn.removeEventListener("pointerdown", down); btn.removeEventListener("pointerup", up); btn.removeEventListener("pointerleave", up); $("#hold-skip").removeEventListener("click", skip); btn.classList.remove("on"); }
    btn.addEventListener("pointerdown", down); btn.addEventListener("pointerup", up); btn.addEventListener("pointerleave", up); $("#hold-skip").addEventListener("click", skip);
  });
}
const temizu = () => doing(async () => {
  await new Promise((r) => walkTo(PLACES.temizu.stand, r)); me.rotation.y = 0; const u = me.userData; u.pose = "act";
  const steps = [["左手を清める", "右手で柄杓を持ち、水を汲んで左手にかけます", 1], ["右手を清める", "柄杓を左手に持ちかえて、右手にかけます", 0],
    ["口をすすぐ", "左の手のひらに水を受け、口をすすぎます", 1], ["柄杓を清める", "柄杓を立て、残りの水で柄を流します", 1]];
  for (const [t, sub, arm] of steps) {
    stepText(t); u.arms[arm].rotation.x = -1.2;
    const ok = await holdStep(t, sub);
    if (!ok) break;
    drops(me.position.x + (arm ? 0.3 : -0.3), 1.0, me.position.z + 0.6); await wait(350); u.arms[arm].rotation.x = 0;
  }
  purified = true; stepText(""); toast("心と手を清めました。気持ちよくお参りできます 💧"); deedHook("temizu");
});

// ------------------------------------------------------------------ お参り（賽銭→鈴→二礼二拍手一礼）
const SHRINES = {
  tosen: { stand: [0, 13.6], bell: () => W.suzu, place: "honden" },
  enmusubi: { stand: [-31, 19.1], bell: () => W.smallSaisen.enmusubi, place: "enmusubi" },
  gokaku: { stand: [31, 19.1], bell: () => W.smallSaisen.gokaku, place: "gokaku" },
  okunoin: { stand: [-2, -73.4], bell: () => null, place: "okunoin" },
};
const COINS = [
  { yen: 5, label: "5円", mean: "ご縁がありますように" }, { yen: 15, label: "15円", mean: "十分なご縁" }, { yen: 25, label: "25円", mean: "二重にご縁" },
  { yen: 45, label: "45円", mean: "始終ご縁がありますように" }, { yen: 115, label: "115円", mean: "いいご縁" }, { yen: 485, label: "485円", mean: "四方八方からご縁" },
];
$("#coin-list").innerHTML = COINS.map((c, i) => `<button data-i="${i}"><b>${c.label}</b><small>${c.mean}</small></button>`).join("");
function chooseCoin() {
  return new Promise((resolve) => { open("#m-coin");
    const list = $("#coin-list"), close = $("#m-coin [data-close]");
    const pickIt = (e) => { const b = e.target.closest("button[data-i]"); if (!b) return; done(COINS[+b.dataset.i]); };
    const cancel = () => done(null);
    function done(c) { list.removeEventListener("click", pickIt); close.removeEventListener("click", cancel); $("#m-coin").hidden = true; resolve(c); }
    list.addEventListener("click", pickIt); close.addEventListener("click", cancel);
  });
}
const omairi = (sid = "tosen") => doing(async () => {
  const S = SHRINES[sid];
  await new Promise((r) => walkTo(S.stand, r, { route: Math.hypot(me.position.x - S.stand[0], me.position.z - S.stand[1]) > 6 })); me.rotation.y = Math.PI;
  const u = me.userData; u.pose = "act";
  const coinC = await chooseCoin(); if (!coinC) return;
  toast(`${coinC.label}を納めます（${coinC.mean}）`, 2000);
  const coin = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 0.02, 16), new THREE.MeshStandardMaterial({ color: 0xd9b45a, metalness: 0.8, roughness: 0.3 }));
  coin.position.set(me.position.x, me.position.y + 1.2, me.position.z - 0.3); scene.add(coin); const cy0 = coin.position.y;
  await new Promise((r) => { const t0 = performance.now(); (function f() { const k = Math.min(1, (performance.now() - t0) / 700);
    coin.position.z = me.position.z - 0.3 - k * 0.9; coin.position.y = cy0 + Math.sin(k * Math.PI) * 0.8 - k * 0.25; coin.rotation.x += 0.4; k < 1 ? requestAnimationFrame(f) : r(); })(); });
  scene.remove(coin); sfx.coin(); await wait(400); net?.act("suzu");
  u.arms.forEach((a) => (a.rotation.x = -2.4)); sfx.suzu();
  const BL = S.bell(); if (BL) for (let i = 0; i < 18; i++) { BL.rope.rotation.x = Math.sin(i / 2) * 0.22 * (1 - i / 18); BL.bell.position.x = Math.sin(i / 1.5) * 0.06; await wait(45); }
  u.arms.forEach((a) => (a.rotation.x = 0)); await wait(400);
  for (let i = 0; i < 2; i++) { stepText(i ? "二 礼" : "一 礼"); net?.act("bow"); await bowTo(me, 1.25, 650); await wait(350); await bowTo(me, 0, 500); await wait(250); }
  stepText("二 拍 手"); net?.act("clap");
  for (let i = 0; i < 2; i++) { u.arms.forEach((a, j) => { a.rotation.x = -1.3; a.rotation.z = (j ? -1 : 1) * 0.05; }); sfx.clap(); await wait(260); u.arms.forEach((a, j) => (a.rotation.z = (j ? -1 : 1) * 0.6)); await wait(260); }
  u.arms.forEach((a, j) => { a.rotation.x = -1.3; a.rotation.z = (j ? -1 : 1) * 0.05; });
  stepText("祈 る"); releaseLight(me.position.x, me.position.y, me.position.z, true); board.light(sid).then((r) => r?.lights && setLights(r.lights)).catch(() => {});
  await wait(2200);
  stepText("一 礼"); net?.act("bow"); u.arms.forEach((a, j) => { a.rotation.x = 0; a.rotation.z = (j ? -1 : 1) * 0.25; });
  await bowTo(me, 1.25, 650); await wait(500); await bowTo(me, 0, 600);
  const n = store.get("enishi_visits", 0) + 1; store.set("enishi_visits", n);
  toast(purified ? `手水で清めてからの丁寧なお参りでした。${n}回目のご参拝です 🙏` : `お参りしました。${n}回目のご参拝です 🙏`);
  deedHook("omairi", { sid, purified }); purified = false;
});

// ------------------------------------------------------------------ 正座して祈る（社の中）
const seiza = (hid) => doing(async () => {
  const cs = W.cushions[hid], taken = new Set([...others.values()].map((o) => `${Math.round(o.to.x)},${Math.round(o.to.z)}`));
  const free = cs.filter(([x, z]) => !taken.has(`${Math.round(x)},${Math.round(z)}`)); const [cx, cz] = pick(free.length ? free : cs);
  await new Promise((r) => {
    const x = me.position.x, z = me.position.z, inside = hid === "tosen" ? z < 8.3 : z < 15.9;
    if (inside) return walkTo([cx, cz], r);
    if (hid === "tosen") { path = [[2.7, 14.0], [2.7, 11.3], [0.8, 10.2], [0, 7.6], [cx * 0.4, 6.0], [cx, cz]]; onArrive = r; speedMul = 1; }
    else { const hx = hid === "enmusubi" ? -31 : 31; path = [[hx, 19.2], [hx + 1.55, 19.2], [hx + 1.55, 16.3], [hx, 15.0], [cx, cz]]; onArrive = r; speedMul = 1; }
  });
  me.rotation.y = Math.PI;
  setPose(me, "seiza"); await wait(500);
  stepText("正 座"); sfx.taiko(); await wait(1200);
  for (let i = 0; i < 2; i++) { stepText(i ? "二 拝" : "一 拝"); net?.act("bow"); sfx.taiko(); await bowTo(me, 1.35, 800); await wait(700); await bowTo(me, 0, 600); await wait(300); }
  stepText("祈 る"); releaseLight(me.position.x, me.position.y, me.position.z, true); await wait(2600);
  stepText("一 拝"); await bowTo(me, 1.35, 800); await wait(500); await bowTo(me, 0, 600);
  toast("静かに祈りました。心が少し軽くなりますように 🙇");
});

// ------------------------------------------------------------------ 善行：落ち葉掃き・灯籠・迷子の子狐
let broom = null;
const sweep = (pile) => doing(async () => {
  await new Promise((r) => walkTo([pile.x - 0.9, pile.z + 0.4], r)); me.rotation.y = Math.atan2(pile.x - me.position.x, pile.z - me.position.z);
  const u = me.userData; u.pose = "act";
  if (!broom) { broom = new THREE.Group(); const st = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 1.4, 6), new THREE.MeshStandardMaterial({ color: 0xc9a46a })); st.position.y = -0.5; broom.add(st);
    const br = new THREE.Mesh(new THREE.ConeGeometry(0.18, 0.4, 8), new THREE.MeshStandardMaterial({ color: 0xb8964a })); br.position.y = -1.25; br.rotation.x = Math.PI; broom.add(br); }
  u.arms[0].add(broom); broom.position.set(0, -0.3, 0.1);
  stepText("掃 く"); const sw = leaves.sweep(pile);
  for (let i = 0; i < 8; i++) { u.arms[0].rotation.x = -0.6 + Math.sin(i * 1.2) * 0.5; u.arms[0].rotation.z = Math.sin(i * 1.2) * 0.5; noise(0.18, 3000, 0.08, "highpass"); await wait(150); }
  await sw; u.arms[0].remove(broom); u.arms[0].rotation.z = 0.25;
  toast("境内がきれいになりました 🍂"); deedHook("sweep");
});
const lightLamp = (g) => doing(async () => {
  const v = new THREE.Vector3(); g.getWorldPosition(v);
  await new Promise((r) => walkTo([v.x + (v.x > me.position.x ? -1.1 : 1.1), v.z], r)); me.rotation.y = Math.atan2(v.x - me.position.x, v.z - me.position.z);
  const u = me.userData; u.pose = "act"; u.arms[1].rotation.x = -1.5; stepText("火を灯す"); await wait(900);
  darkL.light(g, env); tone([[660, 0.3], [990, 0.2]], 0.8, 0.08); u.arms[1].rotation.x = 0;
  toast("灯籠に火が灯りました。道ゆく人の足もとが明るくなります 🏮"); deedHook("lamp");
});
function kitFollow() { kit.follow(); tone([[1200, 0.3], [1500, 0.2]], 0.3, 0.1); toast("子狐がついてきます。狛狐（本殿前の狐の像）のところへ連れていきましょう 🦊", 4500); }
const kitHome = () => doing(async () => {
  bubbleAt(W.foxes[0], "コン♪"); bubbleAt(W.foxes[1], "コン！"); sfx.suzu(); await wait(600); kit.home();
  releaseLight(me.position.x, me.position.y, me.position.z, true); toast("子狐が無事にお家に帰りました。狐たちがとても喜んでいます ✨", 4500); deedHook("kit");
});

// ------------------------------------------------------------------ 狐・撫で牛・赤い糸・鯉・灯籠流し（第一段階：簡易版）
const goldM = new THREE.MeshStandardMaterial({ color: 0xffd36b, metalness: 0.9, roughness: 0.25, emissive: 0x7a5400, emissiveIntensity: 0.6 });
function bubbleAt(obj, text, ms = 1600, dy = 2.8) {
  const b = document.createElement("div"); b.className = "tag bub"; b.textContent = text; document.body.appendChild(b);
  const v = new THREE.Vector3(); obj.getWorldPosition(v); v.y += dy; v.project(camera);
  b.style.left = (v.x * 0.5 + 0.5) * innerWidth + "px"; b.style.top = (-v.y * 0.5 + 0.5) * innerHeight + "px"; setTimeout(() => b.remove(), ms);
}
function petFox(i) {
  const f = fox(i); bubbleAt(f, "コン♪"); tone([[880, 0.4], [1320, 0.2]], 0.4, 0.12);
  const n = store.get("enishi_pet", 0) + 1; store.set("enishi_pet", n);
  if (Math.random() < 1 / 25 || n === 7) {
    const keep = []; f.traverse((m) => { if (m.isMesh && m.material.userData?.fox) { keep.push([m, m.material]); m.material = goldM; } });
    sfx.suzu(); releaseLight(f.position.x, 0, f.position.z + 0.6, true); toast("✨ 金の狐が微笑みました。今日はいいことがありそうです", 4500); net?.act("goldfox");
    setTimeout(() => keep.forEach(([m, mm]) => (m.material = mm)), 8000);
  }
}
function nadeUshi() { deedHook("ushi"); bubbleAt(W.ushi, "もぉ〜", 1500, 1.9); tone([[160, 0.5], [120, 0.3]], 0.6, 0.15); toast("撫で牛の頭を撫でました。知恵と合格を授かりますように 📚"); }
function akaiIto() { deedHook("ito"); bubbleAt(W.enTree, "💞", 1800, 3.4); tone([[1046, 0.3], [1318, 0.25], [1568, 0.2]], 1.2, 0.1); releaseLight(W.enTree.position.x, 0, W.enTree.position.z, true); toast("赤い糸にご縁を願いました。同じ時に願った人がいると、糸がつながるかも…💞"); net?.act("ito"); }
function feedKoi() { deedHook("koi"); for (const k of W.koi) k.boost = 4; noise(0.2, 2500, 0.15, "highpass"); toast("鯉が集まってきました 🐟"); }
function toroNagashi() { deedHook("toro");
  const lamp = new THREE.Group(); const m = new THREE.MeshStandardMaterial({ color: 0xfff0d0, emissive: 0xffa040, emissiveIntensity: 2.6 });
  const b = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.4, 0.4), m); b.position.y = 0.25; lamp.add(b);
  const base = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.06, 0.55), new THREE.MeshStandardMaterial({ color: 0x6b4428 })); lamp.add(base);
  lamp.position.set(OKPOND.cx - 3.5, 15.6, OKPOND.cz + 0.5); scene.add(lamp); W.floatLamps = (W.floatLamps || []).concat([{ lamp, a: Math.random() * 6, t: 0 }]);
  toast("灯籠を池に流しました。遠くの大切な人に、想いが届きますように 🏮"); releaseLight(lamp.position.x, 15.5, lamp.position.z, true); net?.act("toro");
}

// ------------------------------------------------------------------ おみくじ（一日一回）
let hall = HALLS[0];
function hash(s) { let h = 2166136261; for (const c of s) { h ^= c.charCodeAt(0); h = Math.imul(h, 16777619); } return h >>> 0; }
function drawKuji() {
  const h = kujiHall || hallOf(), list0 = OMIKUJI[h.id] || OMIKUJI.tosen, seed = hash(myName + today() + h.id);
  const rk = RANKS[seed % 1000 < 170 ? 0 : seed % 1000 < 450 ? 1 : seed % 1000 < 700 ? 2 : seed % 1000 < 860 ? 3 : seed % 1000 < 960 ? 4 : 5];
  const list = list0.filter((o) => o.rank === rk.key); return { h, rk, o: list[(seed >>> 8) % list.length] };
}
function openKuji(hid) {
  kujiHall = HALLS.find((h) => h.id === hid) || hallOf();
  open("#m-omikuji"); const done = store.get("enishi_kuji", {})[kujiHall.id] === today();
  $("#kuji-stage").hidden = done; $("#kuji-result").hidden = !done;
  if (done) showKuji(); else { $("#kuji-box").classList.remove("shake", "out"); $("#kuji-help").textContent = "箱をタップして、振ってください"; }
}
$("#kuji-box").onclick = async () => {
  const b = $("#kuji-box"); if (b.classList.contains("shake")) return;
  b.classList.add("shake"); $("#kuji-help").textContent = "心の中で、願いをひとつ…";
  for (let i = 0; i < 6; i++) setTimeout(() => tone([[400 + rand(0, 200), 0.3]], 0.15, 0.08), i * 230);
  await wait(1600); b.classList.add("out"); sfx.suzu(); await wait(900);
  const k = store.get("enishi_kuji", {}); k[(kujiHall || hallOf()).id] = today(); store.set("enishi_kuji", k);
  $("#kuji-stage").hidden = true; $("#kuji-result").hidden = false; showKuji(); net?.act("kuji", drawKuji().rk.key);
};
function showKuji() {
  const { h, rk, o } = drawKuji();
  $("#r-hall").textContent = h.name; $("#r-rank").textContent = rk.key; $("#r-luck").textContent = `${h.luck}：${rk.stars}`; $("#r-msg").textContent = o.msg;
  $("#r-items").innerHTML = o.items.map(([k, v]) => `<dt>${k}</dt><dd>${v}</dd>`).join("");
  $("#btn-again").textContent = rk.key === "凶" ? "結び所に結んで、厄を置いていく" : "結ぶ（ありがとう）";
}
const musubi = () => { const done = Object.values(store.get("enishi_kuji", {})).includes(today()); if (!done) return toast("先に授与所でおみくじを引いてから、ここに結びましょう 🎋"); addKuji(1); net?.act("musubi"); toast("おみくじを結びました。良い縁がありますように 🎋"); };
$("#btn-again").onclick = () => { $("#m-omikuji").hidden = true; goPlace("juyosho"); setTimeout(() => walkTo([21, 27.6], () => musubi()), 300); };
$("#btn-share").onclick = async () => {
  const { h, rk, o } = drawKuji();
  const text = `えにし神社の${h.name}でおみくじを引いたら【${rk.key}】でした。\n「${o.short}」\n#えにし神社 #おみくじ`;
  const url = location.origin + location.pathname;
  try { const blob = await kujiImage(h, rk, o), file = new File([blob], "enishi-omikuji.png", { type: "image/png" });
    if (navigator.canShare && navigator.canShare({ files: [file] })) { await navigator.share({ text, url, files: [file] }); return; } } catch {}
  window.open(`https://x.com/intent/post?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`, "_blank", "noopener");
};
async function kujiImage(h, rk, o) {
  const c = document.createElement("canvas"); c.width = 1080; c.height = 1350; const x = c.getContext("2d");
  const g = x.createLinearGradient(0, 0, 0, 1350); g.addColorStop(0, "#1c2340"); g.addColorStop(0.55, "#d9825b"); g.addColorStop(1, "#3a2a33");
  x.fillStyle = g; x.fillRect(0, 0, 1080, 1350); x.fillStyle = "#fbf6ea"; x.fillRect(180, 140, 720, 1060); x.fillStyle = "#d9412b"; x.fillRect(180, 140, 720, 18);
  x.fillStyle = "#8a7f70"; x.textAlign = "center"; x.font = "34px serif"; x.fillText(`えにし神社 · ${h.name}`, 540, 230);
  x.fillStyle = "#b8321e"; x.font = "bold 190px serif"; x.fillText(rk.key, 540, 470);
  x.fillStyle = "#2b2620"; x.font = "40px serif"; x.fillText(`${h.luck}：${rk.stars}`, 540, 560); x.font = "42px serif"; wrap(x, o.short, 540, 680, 600, 64);
  x.fillStyle = "#8a7f70"; x.font = "30px serif"; x.fillText("みんなで祈るネット神社", 540, 1120); x.fillStyle = "#fbf6ea"; x.font = "34px serif"; x.fillText("#えにし神社", 540, 1290);
  return new Promise((r) => c.toBlob(r, "image/png"));
}
function wrap(x, t, cx, y, w, lh) { let line = ""; for (const ch of t) { if (x.measureText(line + ch).width > w) { x.fillText(line, cx, y); y += lh; line = ch; } else line += ch; } x.fillText(line, cx, y); }

// ------------------------------------------------------------------ 絵馬（共有）と、結ばれたおみくじ・掛かった絵馬（3D）
let emaCat = EMA_CATS[0], emaList = [], reportCount = 0;
$("#ema-cats").innerHTML = EMA_CATS.map((c, i) => `<button class="${i ? "" : "on"}" data-c="${c}">${c}</button>`).join("");
$("#ema-cats").onclick = (e) => { const b = e.target.closest("button"); if (!b) return; emaCat = b.dataset.c; $("#ema-cats").querySelectorAll("button").forEach((x) => x.classList.toggle("on", x === b)); };
$("#ema-text").oninput = (e) => ($("#ema-count").textContent = `${e.target.value.length}/60`);
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
async function loadEma() { try { const r = await board.list(hallOf().id); emaList = r.ema || []; reportCount = r.report || 0; } catch { emaList = []; } renderEma(); }
function renderEma() {
  const prayed = store.get("enishi_prayed", {});
  $("#ema-wall").innerHTML = emaList.length ? emaList.map((m) => `<div class="ema"><div class="cat">${esc(m.cat)}</div>${esc(m.text)}
    <div class="pray"><span>🙏 ${m.n || 0}</span><button data-id="${esc(m.id)}" class="${prayed[m.id] ? "on" : ""}">一緒に祈る</button></div></div>`).join("") : `<p class="sub">まだ絵馬がありません。最初の一枚を、どうぞ。</p>`;
}
$("#ema-wall").onclick = (e) => {
  const b = e.target.closest("button[data-id]"); if (!b) return; const id = b.dataset.id, p = store.get("enishi_prayed", {}), on = !p[id];
  p[id] = on; store.set("enishi_prayed", p); const m = emaList.find((x) => x.id === id); if (m) m.n = Math.max(0, (m.n || 0) + (on ? 1 : -1));
  renderEma(); board.pray(hallOf().id, id, on).catch(() => {}); if (on) { net?.act("pray"); toast("一緒に祈りました 🙏"); deedHook("pray"); }
};
$("#btn-ema").onclick = async () => {
  const t = $("#ema-text").value.trim(); if (t.length < 2) return toast("願いを書いてください"); $("#btn-ema").disabled = true;
  try { const r = await board.post(hallOf().id, emaCat, t); if (!r.ok) { toast(r.error || "奉納できませんでした"); return; }
    const day = $("#ema-day").value, want = $("#ema-notify").checked;
    $("#ema-text").value = ""; $("#ema-count").textContent = "0/60"; sfx.gong(); net?.act("ema"); addEma(1); deedHook("ema", {});
    if (day && want) { const ok = await remindOn(day, t); toast(ok ? `絵馬を奉納しました 🪵 ${day.replace(/-/g, "/")}の朝にお知らせします` : "絵馬を奉納しました 🪵（通知は設定できませんでした）", 4200); }
    else toast("絵馬を奉納しました 🪵");
    $("#ema-day").value = ""; $("#ema-notify").checked = false; await loadEma(); }
  catch { toast("通信できませんでした。少し後でもう一度。"); } finally { $("#btn-ema").disabled = false; }
};
const emaGeo = new THREE.BoxGeometry(0.28, 0.22, 0.025), emaMat = new THREE.MeshStandardMaterial({ color: 0xe2c38a }); let emaN = 0;
function addEma(n) { for (let i = 0; i < n && emaN < 60; i++, emaN++) { const row = emaN % 2, col = Math.floor(emaN / 2) % 15; const e = new THREE.Mesh(emaGeo, emaMat);
  e.position.set(-1.95 + col * 0.28, (row ? 1.13 : 1.73), 0.05); e.rotation.z = rand(-0.08, 0.08); e.castShadow = true; W.emaRack.add(e); } }
const kujiGeo = new THREE.BoxGeometry(0.05, 0.17, 0.03), kujiMat = new THREE.MeshStandardMaterial({ color: 0xf7f1e3 }); let kujiN = 0;
function addKuji(n) { for (let i = 0; i < n && kujiN < 110; i++, kujiN++) { const k = new THREE.Mesh(kujiGeo, kujiMat); k.position.set(rand(-1.7, 1.7), (Math.random() < 0.5 ? 1.15 : 1.65) - 0.07, 0.02); k.rotation.z = rand(-0.4, 0.4); W.musubi.add(k); } }

// ------------------------------------------------------------------ 授与所：おみくじ・御朱印・御守り
const visited = () => { const v = store.get("enishi_visited", {}); return Object.keys(v).filter((k) => v[k] === today()); };
hooks.push((kind, d) => { if (kind === "omairi") { const v = store.get("enishi_visited", {}); v[d.sid] = today(); store.set("enishi_visited", v); } });
function openJuyo() {
  const got = book.goshuin().filter((e) => e.day === today()).map((e) => e.hall), can = visited().filter((h) => !got.includes(h));
  $("#juyo-shuin").innerHTML = can.length ? can.map((h) => `<button data-h="${h}">🖌 ${SHUIN[h].title}の御朱印</button>`).join("")
    : `<p class="sub">${got.length ? "今日の御朱印はいただきました。" : "お参りをすると、その社の御朱印をいただけます。"}</p>`;
  const lim = limitedFor().map((L) => L.name).join("・"); $("#juyo-limited").textContent = `今日の限定印：${lim}`;
  const mine = book.omamori().map((x) => x.id);
  $("#juyo-mamori").innerHTML = OMAMORI.map((o) => `<button data-o="${o.id}" class="${mine.includes(o.id) ? "have" : ""}"><span style="background:${o.color}"></span>${o.name}${mine.includes(o.id) ? "<small>受け取り済み</small>" : ""}</button>`).join("");
  open("#m-juyo");
}
$("#juyo-kuji").innerHTML = HALLS.map((h) => `<button data-k="${h.id}">🎋 ${h.name}のおみくじ</button>`).join("");
$("#juyo-kuji").onclick = (e) => { const b = e.target.closest("button[data-k]"); if (!b) return; $("#m-juyo").hidden = true; openKuji(b.dataset.k); };
$("#juyo-shuin").onclick = async (e) => {
  const b = e.target.closest("button[data-h]"); if (!b) return; const entry = book.addGoshuin(b.dataset.h); if (!entry) return;
  $("#m-juyo").hidden = true; await stampAnim(entry); deedHook("goshuin", { hall: entry.hall });
};
$("#juyo-mamori").onclick = (e) => {
  const b = e.target.closest("button[data-o]"); if (!b) return; const o = OMAMORI.find((x) => x.id === b.dataset.o);
  $("#mamori-view").innerHTML = ""; $("#mamori-view").appendChild(drawOmamori(o)); $("#mamori-name").textContent = o.name; $("#mamori-desc").textContent = o.desc;
  $("#btn-mamori").dataset.o = o.id; $("#m-juyo").hidden = true; open("#m-mamori");
};
$("#btn-mamori").onclick = () => { const r = book.addOmamori($("#btn-mamori").dataset.o); $("#m-mamori").hidden = true; tone([[1318, 0.3], [1760, 0.2]], 0.8, 0.1);
  toast(`御守りを受けました。${r.until.replace(/-/g, "/")}まで、あなたを見守ります 🧿`); deedHook("omamori", { id: r.id }); };
async function stampAnim(entry) {
  const cv = drawShuin(entry); const v = $("#stamp-view"); v.innerHTML = ""; v.appendChild(cv); v.classList.remove("in"); void v.offsetWidth; v.classList.add("in");
  $("#stamp-title").textContent = `${SHUIN[entry.hall].title}の御朱印`; open("#m-stamp");
  await wait(500); tone([[180, 0.7], [90, 0.4]], 0.5, 0.35); noise(0.06, 500, 0.5, "lowpass");
  $("#btn-stamp-share").onclick = () => shareCanvas(cv, `えにし神社の${SHUIN[entry.hall].title}で御朱印をいただきました ⛩\n#えにし神社 #御朱印`, "enishi-goshuin.png");
}
async function shareCanvas(cv, text, name) {
  const url = location.origin + location.pathname;
  try { const blob = await new Promise((r) => cv.toBlob(r, "image/png")), file = new File([blob], name, { type: "image/png" });
    if (navigator.canShare && navigator.canShare({ files: [file] })) { await navigator.share({ text, url, files: [file] }); return; }
    const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = name; a.click(); } catch {}
  window.open(`https://x.com/intent/post?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`, "_blank", "noopener");
}
// わたしの帳（御朱印帳・御守り）
function openBook(tab = "shuin") {
  const list = book.goshuin();
  const halls = Object.keys(SHUIN);
  $("#book-shuin").innerHTML = "";
  const got = new Set(list.map((e) => e.hall));
  list.slice().reverse().forEach((e) => { const cv = drawShuin(e); cv.className = "page"; cv.title = `${SHUIN[e.hall].title} ${e.date}`; cv.onclick = () => stampAnim(e); $("#book-shuin").appendChild(cv); });
  halls.filter((h) => !got.has(h)).forEach((h) => { const d = document.createElement("div"); d.className = "page empty"; d.innerHTML = `<span>${SHUIN[h].title}</span><small>お参りしていただく</small>`; $("#book-shuin").appendChild(d); });
  $("#book-count").textContent = `${list.length}枚`;
  const now = new Date().toISOString().slice(0, 10);
  $("#book-mamori").innerHTML = book.omamori().length ? "" : `<p class="sub">まだ御守りはありません。授与所で受けられます。</p>`;
  book.omamori().forEach((m) => { const o = OMAMORI.find((x) => x.id === m.id); if (!o) return; const card = document.createElement("div"); card.className = "mamori-card"; const cv = drawOmamori(o, 120, 180);
    const expired = m.until < now; card.appendChild(cv); card.insertAdjacentHTML("beforeend", `<b>${o.name}</b><small>${expired ? "期限が過ぎました。感謝してお返ししましょう" : `${m.until.replace(/-/g, "/")}まで`}</small>${expired ? `<button data-ret="${o.id}">お返しする</button>` : ""}`);
    $("#book-mamori").appendChild(card); });
  document.querySelectorAll(".btab").forEach((b) => b.classList.toggle("on", b.dataset.t === tab));
  $("#book-shuin-wrap").hidden = tab !== "shuin"; $("#book-mamori").hidden = tab !== "mamori";
  open("#m-book");
}
$("#m-book").addEventListener("click", (e) => { const t = e.target.closest(".btab"); if (t) openBook(t.dataset.t);
  const r = e.target.closest("button[data-ret]"); if (r) { book.returnOmamori(r.dataset.ret); toast("ありがとうございました。御守りをお返ししました 🙏"); openBook("mamori"); } });
$("#btn-book").onclick = () => openBook();

// ------------------------------------------------------------------ 通知（願いの日）
const VAPID = "BC-GYCaO7ijTKLfVV_Jt10YDxqXA1zoovjrt2OYcnhI0lElA6JyT3XKkG6PsMJlyoGt-YD5qZNwyfLta4mGdnso";
const API = "https://enishi-rooms.thanhduy8vn.workers.dev";
const pushOk = "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;
if ("serviceWorker" in navigator) navigator.serviceWorker.register("sw.js").catch(() => {});
async function remindOn(day, text) {
  if (!pushOk) { toast(/iPhone|iPad/.test(navigator.userAgent) ? "iPhoneは「ホーム画面に追加」してから開くと通知を受け取れます" : "このブラウザは通知に対応していません", 4200); return false; }
  if (await Notification.requestPermission() !== "granted") return false;
  try {
    const reg = await Promise.race([navigator.serviceWorker.ready, wait(4000).then(() => null)]); if (!reg) return false;
    const key = Uint8Array.from(atob(VAPID.replace(/-/g, "+").replace(/_/g, "/")), (c) => c.charCodeAt(0));
    const sub = (await reg.pushManager.getSubscription()) || (await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: key }));
    const r = await fetch(API + "/remind", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ endpoint: sub.endpoint, day, text }) });
    return r.ok;
  } catch { return false; }
}

// ------------------------------------------------------------------ 徳・お勤め・境内の徳（夜祭り）
const D = deeds({
  onChange: (pts, newRank) => { refreshToku(); if (pts > 0) flyToku(pts); if (newRank) setTimeout(() => toast(`🎊 位が上がりました：「${newRank}」`, 4200), 1200); },
  onAllDone: () => setTimeout(() => toast("📜 今日のお勤めをすべて終えました。徳 +5 🎉", 4200), 1800),
});
const onceToday = (k) => { const m = store.get("enishi_once", {}); if (m[k] === today()) return false; m[k] = today(); store.set("enishi_once", m); return true; };
const TOKU = { temizu: 1, goshuin: 1, ema: 1, omamori: 0, lamp: 2, kit: 3 };
hooks.push((kind, d) => {
  let pts = 0, q = null;
  if (kind === "omairi") { pts = 2 + (d.purified ? 1 : 0); q = d.purified ? "temizu_omairi" : null; }
  else if (kind === "sweep") { pts = 1; q = "sweep"; }
  else if (kind === "pray") { pts = 1; q = "pray_ema"; }
  else if (["koi", "ushi", "ito", "toro"].includes(kind)) pts = onceToday(kind) ? (kind === "toro" ? 2 : 1) : 0;
  else pts = TOKU[kind] || 0;
  if (!pts && !q) return;
  D.add(pts, q);
  if (pts) fetch(API_T + "/toku", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ n: pts }) }).then((r) => r.json()).then(setFest).catch(() => {});
});
const API_T = "https://enishi-rooms.thanhduy8vn.workers.dev";
function refreshToku() { $("#toku").textContent = D.toku; $("#rank").textContent = D.rank(); $("#me-tag").textContent = `わたし · ${myName}（${D.rank()}）`; }
function flyToku(n) { const b = document.createElement("div"); b.className = "toku-fly"; b.textContent = `徳 +${n}`; document.body.appendChild(b); setTimeout(() => b.remove(), 1600); }
function openQuests() {
  $("#q-list").innerHTML = D.quests().map((q) => `<li class="${q.done >= q.n ? "done" : ""}"><span>${q.done >= q.n ? "✅" : "⬜"} ${q.label}</span><b>${q.done}/${q.n}</b></li>`).join("");
  const nx = D.next(); $("#q-rank").innerHTML = `徳 <b>${D.toku}</b>・位「${D.rank()}」${nx ? `（次の位まであと ${nx - D.toku}）` : ""}`; open("#m-quest");
}
$("#btn-quest").onclick = openQuests;
let festOn = false;
function setFest(r) {
  if (!r || r.toku === undefined) return; const pct = Math.min(100, Math.round((r.toku / r.goal) * 100));
  $("#gtoku").textContent = `${r.toku}/${r.goal}`; $("#gbar").style.width = pct + "%";
  const on = r.toku >= r.goal; if (on && !festOn) toast("🎆 境内のみんなの徳が満ちました。今夜は夜祭りです！五重塔の空を見上げてください", 6000);
  festOn = on; fireworks.on = on; document.body.classList.toggle("fest", on);
}
const pollFest = () => fetch(API_T + "/festival").then((r) => r.json()).then(setFest).catch(() => {});
pollFest(); setInterval(pollFest, 60e3);
refreshToku();

// ------------------------------------------------------------------ 由来・当選報告
function openStory() { const H = hallOf(), s = H.story; $("#story-body").innerHTML = `<h2>${H.name}の由来</h2><p class="lead">${s.lead}</p>${s.body.map((p) => `<p>${p}</p>`).join("")}<p class="moral">${s.moral}</p>`; open("#m-story"); }
$("#btn-story").onclick = openStory;
async function report() {
  if (!confirm("当選しましたか？おめでとうございます！お礼参りとして記録します。")) return;
  sfx.suzu(); net?.act("report"); try { const r = await board.report(hallOf().id); reportCount = r.report || reportCount; } catch {}
  toast(`🎉 おめでとうございます！今日は${Math.max(1, reportCount)}人がお礼参りに来ました。`, 4200);
}

// ------------------------------------------------------------------ ほかの参拝者（リアルタイム）
const others = new Map();
function addOther(o) {
  if (others.has(o.id)) return;
  const av = makeAvatar(o.look || Math.random(), env); av.position.set(o.x ?? 0, footY(o.x ?? 0, o.z ?? 80), o.z ?? 80); av.rotation.y = o.ry ?? Math.PI; scene.add(av);
  const tag = document.createElement("div"); tag.className = "tag"; tag.textContent = o.name || "参拝者"; document.body.appendChild(tag);
  others.set(o.id, { av, tag, to: new THREE.Vector3(o.x ?? 0, 0, o.z ?? 80), ry: o.ry ?? Math.PI, bubble: null });
}
function removeOther(id) { const o = others.get(id); if (!o) return; scene.remove(o.av); o.tag.remove(); o.bubble?.remove(); others.delete(id); }
function bubble(o, text, ms = 2500) { o.bubble?.remove(); const b = document.createElement("div"); b.className = "tag bub"; b.textContent = text; document.body.appendChild(b); o.bubble = b; setTimeout(() => { if (o.bubble === b) { b.remove(); o.bubble = null; } }, ms); }
async function otherAct(o, a, r) {
  if (a === "bow") { await bowTo(o.av, 1.2, 600); await wait(300); await bowTo(o.av, 0, 500); }
  else if (a === "clap") { bubble(o, "👏"); releaseLight(o.av.position.x, o.av.position.y, o.av.position.z, false); }
  else if (a === "suzu") bubble(o, "🔔"); else if (a === "kuji") bubble(o, r ? `🎋 ${r}` : "🎋", 4000);
  else if (a === "ema") { bubble(o, "🪵 絵馬を奉納"); addEma(1); } else if (a === "report") bubble(o, "🎉 当選しました！", 5000);
  else if (a === "pray") bubble(o, "🙏"); else if (a === "musubi") { bubble(o, "🎋 結んだ"); addKuji(1); }
  else if (a === "goldfox") { bubble(o, "✨ 金の狐！", 4000); releaseLight(o.av.position.x, o.av.position.y, o.av.position.z, false); }
  else if (a === "ito") bubble(o, "💞"); else if (a === "toro") bubble(o, "🏮");
}
let net = null;
const setCount = (n) => { $("#ppl").textContent = Math.max(1, n || 1); };

// ------------------------------------------------------------------ オープニング（大鳥居から参道、楼門をこえて本殿へ）
let intro = !QS.has("nointro") && store.get("enishi_intro2", "") !== today() ? { t: 0 } : null;
const introPath = new THREE.CatmullRomCurve3([[0, 40, 140], [0, 9, 92], [0, 3.2, 78], [0, 3, 58], [0, 9, 46], [0, 16, 34], [0, 12, 26], [6, 7, 92]].map((p) => new THREE.Vector3(...p)));
const introLook = new THREE.CatmullRomCurve3([[0, 6, 76], [0, 5, 70], [0, 3, 50], [0, 6, 38], [0, 8, 10], [0, 7, 1], [0, 6, 1], [0, 1.2, 80]].map((p) => new THREE.Vector3(...p)));
if (intro) { store.set("enishi_intro2", today()); $("#title-card").hidden = false; controls.enabled = false; }
function runIntro(dt) {
  intro.t += dt / 11; if (intro.t >= 0.86) return endIntro();
  camera.position.copy(introPath.getPointAt(intro.t)); camera.lookAt(introLook.getPointAt(intro.t));
}
function endIntro() { intro = null; $("#title-card").classList.add("out"); setTimeout(() => ($("#title-card").hidden = true), 1200);
  camera.position.set(0, 6, 90); controls.target.set(me.position.x, 1.2, me.position.z); controls.enabled = true; controls.update(); }
$("#title-card").onclick = () => intro && endIntro();

// ------------------------------------------------------------------ loop
const clock = new THREE.Clock(), v3 = new THREE.Vector3(), tagEl = $("#me-tag");
let tick = 0, lastHall = "tosen";
function loop() {
  const dt = Math.min(clock.getDelta(), 0.05), t = clock.elapsedTime;
  stepMove(dt);
  if (intro) runIntro(dt);
  else {
    const want = new THREE.Vector3(me.position.x, me.position.y + 1.2, me.position.z), delta = want.sub(controls.target).multiplyScalar(Math.min(1, dt * 4));
    controls.target.add(delta); camera.position.add(delta); controls.update();
    // 千本鳥居の中ではカメラを笠木より下に
    if (region(me.position.x, me.position.z) === "trail" && me.position.y + 2.6 < camera.position.y) camera.position.y += (me.position.y + 2.6 - camera.position.y) * Math.min(1, dt * 10);
    const gy = footY(camera.position.x, camera.position.z) + 0.8; if (camera.position.y < gy) camera.position.y = gy;   // 地面にめり込まない
  }
  env.follow(me.position);
  for (const f of W.update) f(t, dt, me.position);
  for (const fl of W.floatLamps || []) { fl.t += dt; fl.a += dt * 0.12; fl.lamp.position.x = OKPOND.cx + Math.cos(fl.a) * 3.2; fl.lamp.position.z = OKPOND.cz + Math.sin(fl.a) * 1.8; fl.lamp.position.y = 15.58 + Math.sin(t * 2 + fl.a) * 0.02; }
  lanterns.update(dt, t); kit.update(dt, me);
  fireworks.update(dt, () => { tone([[60, 0.8], [90, 0.4]], 1.2, 0.25); setTimeout(() => noise(0.6, 2200, 0.12, "highpass"), 300); });
  for (const o of others.values()) {
    const d = o.to.clone().sub(o.av.position); d.y = 0; const dist = d.length(), u = o.av.userData;
    if (dist > 0.05) { o.av.position.add(d.multiplyScalar(Math.min(1, dt * 5))); u.walk += dt * 11; u.body.position.y = Math.abs(Math.sin(u.walk)) * 0.08; u.arms.forEach((a, i) => (a.rotation.x = Math.sin(u.walk + i * Math.PI) * 0.5)); }
    else { u.body.position.y = 0; u.arms.forEach((a) => (a.rotation.x = 0)); }
    o.av.position.y = footY(o.av.position.x, o.av.position.z);
    o.av.rotation.y += ((((o.ry - o.av.rotation.y) % (2 * Math.PI)) + 3 * Math.PI) % (2 * Math.PI) - Math.PI) * Math.min(1, dt * 8);
    v3.copy(o.av.position); v3.y += 2.05; v3.project(camera);
    const vis = v3.z < 1 && Math.abs(v3.x) < 1.1 && Math.abs(v3.y) < 1.1, X = (v3.x * 0.5 + 0.5) * innerWidth + "px", Y = (-v3.y * 0.5 + 0.5) * innerHeight + "px";
    o.tag.style.display = vis ? "" : "none"; o.tag.style.left = X; o.tag.style.top = Y;
    if (o.bubble) { o.bubble.style.display = vis ? "" : "none"; o.bubble.style.left = X; o.bubble.style.top = `calc(${Y} - 22px)`; }
  }
  net?.pos(me.position.x, me.position.z, me.rotation.y);
  bloom.strength = (MOBILE ? 0.55 : 0.8) * (0.12 + 0.88 * env.lamp); bloom.threshold = 0.78 + (1 - env.lamp) * 0.2;
  composer.render();
  v3.copy(me.position); v3.y += 2.15; v3.project(camera);
  tagEl.style.display = intro ? "none" : ""; tagEl.style.left = (v3.x * 0.5 + 0.5) * innerWidth + "px"; tagEl.style.top = (-v3.y * 0.5 + 0.5) * innerHeight + "px";
  if (tick % 20 === 0) updateLightPool();
  if (++tick % 15 === 0) {
    refreshAction();
    const pl = nearestPlace(); if (pl && pl !== lastPlace) { lastPlace = pl; const p = PLACES[pl]; const el = $("#place"); el.innerHTML = `<b>${p.n}</b> ${p.name}<small>${p.vi}</small>`; el.classList.remove("on"); void el.offsetWidth; el.classList.add("on"); }
    const H = hallOf(); $("#hall-name").textContent = H.name;
    if (!intro && !busy && H.id !== lastHall) { lastHall = H.id; const seen = store.get("enishi_story_seen", {}); if (!seen[H.id] && H.id !== "tosen") { seen[H.id] = 1; store.set("enishi_story_seen", seen); setTimeout(openStory, 900); } }
  }
  requestAnimationFrame(loop);
}
addEventListener("resize", () => { renderer.setSize(innerWidth, innerHeight); composer.setSize(innerWidth, innerHeight); fitFov(); });

net = connect({ hall: "tosen", name: myName, look: myLook,
  onWelcome: (m) => m.others.forEach(addOther), onJoin: addOther, onLeave: (m) => removeOther(m.id), onCount: setCount,
  onPos: (m) => { const o = others.get(m.id); if (o) { o.to.set(m.x, 0, m.z); o.ry = m.ry; } },
  onAct: (m) => { const o = others.get(m.id); if (o) otherAct(o, m.a, m.r); } });
board.list("tosen").then((r) => { addEma(r.total || 0); addKuji(Math.min(60, Math.floor((r.lights || 0) / 2))); const n = r.lights || 0; setLights(n); for (let i = 0; i < Math.min(n, MOBILE ? 80 : 160); i++) lanterns.spawn(0, 0, 0, { instant: true }); }).catch(() => {});
loop();
setTimeout(() => $("#loading").classList.add("done"), 300);
setTimeout(() => ($("#hint").style.opacity = 0), 10000);
if (!store.get("enishi_seen_story", false)) { store.set("enishi_seen_story", true); setTimeout(openStory, intro ? 9800 : 1500); }
window.__enishi = { leaves, darkL, kit, fireworks, D: () => D, hooks, deedHook, run: (id) => ACTIONS.find((a) => a.id === id)?.run(), isBusy: () => busy, scene, me, walkTo, goPlace, others, env, camera, W, controls, renderer, composer, bloom };
