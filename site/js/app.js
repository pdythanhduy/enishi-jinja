// えにし神社 — アプリ本体（境内・参拝者・カメラ・地図・行動）
import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { EffectComposer } from "three/addons/postprocessing/EffectComposer.js";
import { RenderPass } from "three/addons/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/addons/postprocessing/UnrealBloomPass.js";
import { OutputPass } from "three/addons/postprocessing/OutputPass.js";
import { createEnv, jstNow, season as seasonOf } from "./env.js?v=11032027";
import { buildWorld } from "./world.js?v=11032027";
import { floors, PLACES, blocked, footY, routeTo, region, TRAIL, OKPOND, SMALL, HONDEN, hw, inHonden, OKU_Y, STAGE } from "./map.js?v=11032027";
import { book, drawShuin, drawOmamori, OMAMORI, SHUIN, limitedFor } from "./collect.js?v=11032027";
import { Leaves, DarkLanterns, LostFox, Fireworks } from "./good.js?v=11032027";
import { deeds } from "../deeds.js?v=11032027";
import { environment, textures, nobori, lanternRows, rocksAndBushes, clouds, snowRoofs } from "./decor.js?v=11032027";
import { fireflies } from "../fx.js?v=11032027";
import { LIGHT_SPOTS } from "./arch.js?v=11032027";
import { freeze } from "./freeze.js?v=11032027";
import { setupSeasonal } from "./seasonal.js?v=11032027";
import { buildTemizuya, runTemizu, waterSound } from "./temizu.js?v=11032027";
import { makeBGM } from "./bgm.js?v=11032027";
import { setupGuide, STEP_OF } from "./guide.js?v=11032027";
import { setupKenno } from "./kenno.js?v=11032027";
import { setupSocial } from "./social.js?v=11032027";
import { setupProfile } from "./profile.js?v=11032027";
import { setupChores } from "./chores.js?v=11032027";
import { setupSagyo } from "./sagyo.js?v=11032027";
import { setupWelcome } from "./welcome.js?v=11032027";
import { setupZen } from "./zen.js?v=11032027";
import { setupMixer } from "./mixer.js?v=11032027";
import { setupShakyo } from "./shakyo.js?v=11032027";
import { setupTour } from "./tour.js?v=11032027";
import { setupChat } from "./chat.js?v=11032027";
import { setupKito, ofudaImage } from "./kito.js?v=11032027";
import { makeAvatar, setPose, bowTo, restyle, AV_SCALE } from "./avatar.js?v=11032027";
import { Lanterns, ambience, matsuri } from "../fx.js?v=11032027";
import { connect, board } from "../net.js?v=11032027";
import { HALLS, OMIKUJI, RANKS, NAMES_A, NAMES_B, EMA_CATS } from "../content.js?v=11032027";

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
const TZ = buildTemizuya(scene, env, PLACES.temizu.pos); W.update.push((t) => TZ.tick(t));
// 光源プール：近くの灯籠・社殿だけ本物の光で照らす（遠くは発光だけ）
const POOL = Array.from({ length: MOBILE ? 5 : 8 }, () => { const l = new THREE.PointLight(0xffa04a, 0, 9, 1.7); scene.add(l); return l; });
const spotPos = LIGHT_SPOTS.map((s) => { const v = new THREE.Vector3(); s.obj.updateWorldMatrix(true, false); s.obj.getWorldPosition(v); const sc = new THREE.Vector3(); s.obj.getWorldScale(sc); v.y += s.y * sc.y; return { ...s, v }; });
function updateLightPool() {
  const p = me.position; const near = spotPos.map((s) => [s, s.v.distanceToSquared(p)]).sort((a, b) => a[1] - b[1]).slice(0, POOL.length);
  POOL.forEach((l, i) => { const s = near[i]?.[0]; if (!s) { l.intensity = 0; return; } l.position.copy(s.v); l.color.setHex(s.color); l.distance = s.dist; l.intensity = s.int * env.lamp; });
}
const lanterns = new Lanterns(scene);
// 仕上げ（質感・幟・提灯の列・岩と植え込み・雲・蛍・映り込み）
const texTick = textures(W), noboriTick = nobori(scene), rowTick = lanternRows(scene, env); rocksAndBushes(scene, env.season); snowRoofs(env.season);
// 動かない建物をまとめてドローコールを減らす（?nofreeze で無効）
if (!QS.has("nofreeze")) { const fz = freeze(scene.children.filter((c) => c.userData.static), scene); console.info("[freeze]", fz); }
// 灯りの素材をすべて昼夜の切り替えに登録し、今の時刻を一度反映（世界を作る前の env.set では間に合わない）
scene.traverse((o) => { if (o.isMesh && !Array.isArray(o.material) && o.material.userData?.base !== undefined) env.registerLamp(o.material, null); });
env.set(hourNow());
const cloudTick = clouds(scene), ffTick = env.season === "summer" || env.season === "autumn" ? fireflies(scene, MOBILE ? 40 : 80) : () => {};
const envUpdate = environment(renderer, scene, env); setInterval(envUpdate, 10 * 60e3);
const leaves = new Leaves(scene, env.season), darkL = new DarkLanterns(W.lamps), kit = new LostFox(scene), fireworks = new Fireworks(scene);
setInterval(() => leaves.spawn(), 40e3);
setInterval(() => darkL.turnOffRandom(), 150e3);

// ------------------------------------------------------------------ 自分
let myName = store.get("enishi_name", null) || `${pick(NAMES_A)}${pick(NAMES_B)}`; store.set("enishi_name", myName);
let myLook = store.get("enishi_look", null) ?? Math.random(); store.set("enishi_look", myLook);
// 名札：頭の上の言葉（ひとこと）＋名前
const escT = (t) => String(t || "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
function paintTag(o) { o.tag.innerHTML = (o.st && !o.muted ? `<span class="tag-st">${escT(o.st)}</span>` : "") + escT(o.name); }
let myStatus = store.get("enishi_status", "");
if (/^(🧘|🛶|📖)/.test(myStatus)) { myStatus = ""; store.set("enishi_status", ""); }   // 集中中・作業中は、開き直したら消す
const me = makeAvatar(myLook, env);
me.scale.setScalar(AV_SCALE); me.position.set(0, 0, 80); me.rotation.y = Math.PI; scene.add(me);
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
// 見渡す：地図のように、指一本（マウス左）でずらして境内を見る。二本指（マウス右・Ctrl/Shift＋左）で回す・寄る
controls.enablePan = true; controls.screenSpacePanning = false; controls.panSpeed = 1.15;
// 一本指（マウス左）で見回す、二本指（マウス右）でずらして境内を見渡す・つまんで寄る
controls.mouseButtons = { LEFT: THREE.MOUSE.ROTATE, MIDDLE: THREE.MOUSE.DOLLY, RIGHT: THREE.MOUSE.PAN };
controls.touches = { ONE: THREE.TOUCH.ROTATE, TWO: THREE.TOUCH.DOLLY_PAN };
const UP = new THREE.Vector3(0, 1, 0);
function orbitCam(yaw, zoom = 1) {
  const off = camera.position.clone().sub(controls.target); off.applyAxisAngle(UP, yaw);
  off.setLength(THREE.MathUtils.clamp(off.length() * zoom, controls.minDistance, controls.maxDistance));
  camera.position.copy(controls.target).add(off); controls.update();
}
let freeCam = false, camUser = false; const camT0 = new THREE.Vector3();
const homeBtn = document.createElement("button"); homeBtn.id = "cam-home"; homeBtn.type = "button"; homeBtn.hidden = true; homeBtn.textContent = "📍 自分の場所へ"; document.body.appendChild(homeBtn);
function camHome() { if (!freeCam) return; freeCam = false; homeBtn.hidden = true; }   // 追いかけを再開（なめらかに戻る）
homeBtn.onclick = camHome;
controls.addEventListener("start", () => { camUser = true; camT0.copy(controls.target); });
let camEndAt = 0;
controls.addEventListener("end", () => { camUser = false; camEndAt = performance.now(); });
controls.addEventListener("change", () => {
  if ((camUser || performance.now() - camEndAt < 500) && !freeCam && controls.target.distanceTo(camT0) > 0.3) { freeCam = true; homeBtn.hidden = false; }   // 指を離した直後の一コマも拾う
  const t = controls.target, cx = Math.max(-60, Math.min(60, t.x)) - t.x, cz = Math.max(-95, Math.min(95, t.z)) - t.z;   // 境内の外へは行きすぎない
  if (cx || cz) { t.x += cx; t.z += cz; camera.position.x += cx; camera.position.z += cz; }
});
camera.position.set(0, innerWidth < innerHeight ? 8 : 6, innerWidth < innerHeight ? 93 : 90); controls.target.set(0, 1.2, 80);

// ------------------------------------------------------------------ 歩く（当たり判定つき）・道順
const ray = new THREE.Raycaster(), ptr = new THREE.Vector2();
let path = [], busy = false, onArrive = null, speedMul = 1;
// 本殿の前から中へ：賽銭箱をよけて大階段を上がる
const HONDEN_IN = [[2.7, 12.6], [2.7, 10.0], [0.8, 9.1], hw(0, 7.6)];
let cine = null;   // 御祈祷などの演出中は、カメラをこの関数が動かす
let social = null, kenno = null; const tapHandlers = [];   // 人や献灯をタップしたとき
let downAt = null;
canvas.addEventListener("pointerdown", (e) => { downAt = [e.clientX, e.clientY, performance.now()]; });
canvas.addEventListener("pointerup", (e) => {
  if (!downAt || busy || intro) return;
  const [x, y, t] = downAt; downAt = null;
  if (Math.hypot(e.clientX - x, e.clientY - y) > 8 || performance.now() - t > 450) return;
  ptr.set((e.clientX / innerWidth) * 2 - 1, -(e.clientY / innerHeight) * 2 + 1);
  ray.setFromCamera(ptr, camera);
  if (social && others.size) {                                    // 人をタップ → 縁のカード
    const h = ray.intersectObjects([...others.values()].map((o) => o.av), true)[0];
    if (h) { let x = h.object; while (x && x.userData.otherId === undefined) x = x.parent; const o = x && others.get(x.userData.otherId); if (o) { social.tapOther(o); return; } }
  }
  for (const f of tapHandlers) if (f(ray)) return;
  // 座布団をタップ → そこに座る（社の中で）
  const first = ray.intersectObjects(scene.children, true).find((h) => h.point.y < 20 && h.object.visible && !h.object.isPoints);
  if (first) for (const [hid, cs] of Object.entries(W.cushions)) {
    const c = cs.find(([x, z]) => Math.hypot(x - first.point.x, z - first.point.z) < 0.62);
    if (c) { const taken = [...others.values()].some((o) => Math.hypot(o.to.x - c[0], o.to.z - c[1]) < 0.5); if (taken) { toast("その座布団には、どなたかが座っています"); return; } seiza(hid, c); return; }
  }
  const hit = ray.intersectObject(W.terrain)[0] || ray.intersectObjects(scene.children, true).find((h) => h.point.y < 20);
  if (hit) { const to = nearestFree(hit.point.x, hit.point.z); if (to) { walkTo(to); $("#hint").style.opacity = 0; } }
});
// 建物の中や柵の向こうをタップしたとき：まわりを少しずつ広げて、いちばん近い歩ける点を探す
function nearestFree(x, z) {
  if (!blocked(x, z)) return [x, z];
  for (let r = 0.3; r <= 4; r += 0.3) { let best = null, bd = 1e9; for (let k = 0; k < 16; k++) { const a = (k / 16) * Math.PI * 2, px = x + Math.cos(a) * r, pz = z + Math.sin(a) * r;
    if (!blocked(px, pz)) { const d = Math.hypot(px - me.position.x, pz - me.position.z); if (d < bd) { bd = d; best = [px, pz]; } } } if (best) return best; }
  return null;
}
// 階段：坂として補間すると、足が段に沈んだり浮いたりする。読みこみ時に、上から光線で段の上面を測っておく
function measureStairs() {
  const rc = new THREE.Raycaster(), down = new THREE.Vector3(0, -1, 0), meshes = [], bs = new THREE.Sphere();
  for (const f of floors) if (f.ramp) {
    const top = Math.max(...f.ramp) + 0.45, cxm = (f.x0 + f.x1) / 2, czm = (f.z0 + f.z1) / 2, R = Math.hypot(f.x1 - f.x0, f.z1 - f.z0) / 2 + 1;
    meshes.length = 0;
    scene.traverse((o) => { if (!o.isMesh || o.isInstancedMesh || o.isSkinnedMesh || !o.visible || o.material?.transparent) return; for (let p = o; p; p = p.parent) if (p === me || p.userData?.otherId) return;
      if (!o.geometry.boundingSphere) o.geometry.computeBoundingSphere(); bs.copy(o.geometry.boundingSphere).applyMatrix4(o.matrixWorld);
      if (Math.hypot(bs.center.x - cxm, bs.center.z - czm) < bs.radius + R && bs.center.y - bs.radius < top) meshes.push(o); });
    const n = Math.ceil((f.z1 - f.z0) / 0.04), tab = new Float32Array(n + 1), xs = [0.22, 0.36, 0.64, 0.78].map((t) => f.x0 + (f.x1 - f.x0) * t);
    for (let i = 0; i <= n; i++) {
      const z = f.z0 + ((f.z1 - f.z0) * i) / n, ys = [];
      for (const x of xs) { rc.set(new THREE.Vector3(x, top, z), down); rc.far = top + 3; const h = rc.intersectObjects(meshes, false)[0]; if (h) ys.push(h.point.y); }
      ys.sort((a, b) => a - b); const lin = f.ramp[0] + ((f.ramp[1] - f.ramp[0]) * i) / n;
      tab[i] = ys.length ? Math.max(Math.min(...f.ramp) - 0.05, Math.min(Math.max(...f.ramp) + 0.05, ys[ys.length >> 1])) : lin;
    }
    const dn = f.ramp[0] > f.ramp[1] ? 1 : -1;                                       // 段は一方向にだけ下がる（ほかの物に当たった点をならす）
    if (dn > 0) for (let i = 1; i <= n; i++) tab[i] = Math.min(tab[i], tab[i - 1]); else for (let i = n - 1; i >= 0; i--) tab[i] = Math.min(tab[i], tab[i + 1]);
    f.table = tab;
  }
}
function walkTo(dest, cb = null, { route = false, fast = false } = {}) {
  camHome();
  prog.best = 1e9; prog.t = 0;
  if (me.userData.pose === "seiza" && !busy) setPose(me, null);      // 座って待っていたら立ち上がる
  path = route ? routeTo([me.position.x, me.position.z], dest) : [dest];
  onArrive = cb; speedMul = fast ? 1.4 : 1;
}
const SPEED = 2.5, step = new THREE.Vector3();   // 歩く速さ（m/秒）
let stuck = 0, avoidSide = 0; const prog = { best: 1e9, t: 0 };   // 目的地に近づけているか
// 移動の入力：画面左下のスティック（スマホ）と WASD・矢印キー（PC）。カメラの向きを前として歩く
const joy = { x: 0, y: 0 }, keys = new Set();
addEventListener("keydown", (e) => { if (e.target.closest?.("input,textarea,[contenteditable]")) return; const k = e.key.toLowerCase(); if (["w", "a", "s", "d", "arrowup", "arrowdown", "arrowleft", "arrowright"].includes(k)) { keys.add(k); if (k.startsWith("arrow")) e.preventDefault(); } });
addEventListener("keyup", (e) => keys.delete(e.key.toLowerCase())); addEventListener("blur", () => keys.clear());
function moveInput() {
  let x = joy.x, y = joy.y;
  if (keys.has("a") || keys.has("arrowleft")) x -= 1; if (keys.has("d") || keys.has("arrowright")) x += 1;
  if (keys.has("w") || keys.has("arrowup")) y -= 1; if (keys.has("s") || keys.has("arrowdown")) y += 1;
  const m = Math.hypot(x, y); return m > 1 ? [x / m, y / m, 1] : [x, y, m];
}
const fwd = new THREE.Vector3();
function steer(dt) {
  const [ix, iy, m] = moveInput(); const u = me.userData;
  if (m < 0.15 || busy || cine || intro) return false;
  if (path.length) { path = []; onArrive = null; speedMul = 1; }
  camHome();
  if (u.pose === "seiza") setPose(me, null);
  camera.getWorldDirection(fwd); fwd.y = 0; fwd.normalize();
  const dx = fwd.x * -iy + -fwd.z * ix, dz = fwd.z * -iy + fwd.x * ix, dl = Math.hypot(dx, dz) || 1, s = SPEED * Math.min(1, m) * dt;
  const ang = Math.atan2(dx, dz); me.rotation.y += ((((ang - me.rotation.y) % (2 * Math.PI)) + 3 * Math.PI) % (2 * Math.PI) - Math.PI) * Math.min(1, dt * 12);
  const nx = me.position.x + (dx / dl) * s, nz = me.position.z + (dz / dl) * s;
  if (!blocked(nx, nz)) { me.position.x = nx; me.position.z = nz; }
  else if (!blocked(nx, me.position.z)) me.position.x = nx;                                  // 壁に沿ってすべる
  else if (!blocked(me.position.x, nz)) me.position.z = nz;
  u.walk += dt * 11 * Math.min(1, m); u.body.position.y = Math.abs(Math.sin(u.walk)) * 0.08; u.arms.forEach((a, i) => (a.rotation.x = Math.sin(u.walk + i * Math.PI) * 0.5));
  me.position.y += (footY(me.position.x, me.position.z) - me.position.y) * Math.min(1, dt * 14);
  $("#hint").style.opacity = 0;
  return true;
}
function stepMove(dt) {
  if (steer(dt)) return;
  const u = me.userData;
  if (path.length) {
    const [tx, tz] = path[0], dx = tx - me.position.x, dz = tz - me.position.z, dist = Math.hypot(dx, dz);
    if (dist < prog.best - 0.12) { prog.best = dist; prog.t = 0; } else prog.t += dt;
    if (prog.t > 1.4) { path = []; u.walk = 0; speedMul = 1; stuck = 0; prog.t = 0; const cb = onArrive; onArrive = null; cb && cb(); return; }   // 近づけない：その場で止まる
    if (dist < 0.08 || (path.length > 1 && dist < 0.9)) { path.shift(); avoidSide = 0; prog.best = 1e9; prog.t = 0; if (!path.length) { u.walk = 0; speedMul = 1; const cb = onArrive; onArrive = null; cb && cb(); } }
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
        if (stuck > 1.5) { path = []; const cb = onArrive; onArrive = null; speedMul = 1; stuck = 0; cb && cb(); }   // 詰まったらそこで続ける（待っている所作を止めない）
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
let fxVol = store.get("enishi_vol", 0.55) * 0.7;
const ac = () => { if (!AC) { AC = new (window.AudioContext || window.webkitAudioContext)(); AC.fxBus = AC.createGain(); AC.fxBus.gain.value = fxVol; AC.fxBus.connect(AC.destination); } return AC; };   // 効果音はすべて fxBus を通す
function tone(freqs, dur = 2.5, gain = 0.25) {
  if (muted) return; const a = ac(), t = a.currentTime, out = a.createGain(); out.gain.value = gain; out.connect(a.fxBus);
  freqs.forEach(([f, g]) => { const o = a.createOscillator(), v = a.createGain(); o.frequency.value = f; v.gain.setValueAtTime(g, t); v.gain.exponentialRampToValueAtTime(0.0001, t + dur * (0.5 + g)); o.connect(v).connect(out); o.start(t); o.stop(t + dur * 1.5); });
}
function noise(dur, freq, gain, type = "bandpass") {
  if (muted) return; const a = ac(), n = Math.floor(a.sampleRate * dur), b = a.createBuffer(1, n, a.sampleRate), d = b.getChannelData(0);
  for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / n, 4);
  const s = a.createBufferSource(), f = a.createBiquadFilter(), g = a.createGain(); f.type = type; f.frequency.value = freq; g.gain.value = gain; s.buffer = b; s.connect(f).connect(g).connect(a.fxBus); s.start();
}
const sfx = {
  suzu: () => { for (let i = 0; i < 6; i++) setTimeout(() => tone([[2093 + rand(-30, 30), 0.5], [3136, 0.3], [4186, 0.2]], 1.2, 0.12), i * 90); },
  clap: () => noise(0.12, 1400, 0.5), coin: () => tone([[1567, 0.6], [2349, 0.3]], 0.5, 0.15), gong: () => tone([[110, 0.8], [220, 0.4], [331, 0.2]], 3.5, 0.2),
  taiko: () => { tone([[70, 0.9], [105, 0.3]], 0.9, 0.35); noise(0.08, 300, 0.25, "lowpass"); }, splash: () => noise(0.5, 1800, 0.35, "highpass"),
};
$("#btn-sound").textContent = muted ? "🔇" : "🔈";
// ------------------------------------------------------------------ 境内のお手伝い（chores.js）
const chores = setupChores({ store, today, season: () => env.season, noise, tone, chime: () => tone([[1046, 0.3], [1318, 0.25], [1568, 0.2]], 1.4, 0.08) });
const startAmb = ambience(() => ac(), () => muted);
const hayashi = matsuri(() => ac(), () => muted); let gestured = false;
const syncHayashi = () => { if (gestured) hayashi.set(festOn && !muted); typeof bgm !== "undefined" && bgm.duck(festOn && !muted); };
const bgm = makeBGM(() => ac(), { night: () => env.lamp });
let bgmOn = store.get("enishi_bgm", true);
addEventListener("pointerdown", () => { ac(); startAmb(); gestured = true; syncHayashi(); if (bgmOn && !bgm.on) bgm.start(); });
// 音の設定：音楽・効果音・音量
const sndPop = document.createElement("div"); sndPop.id = "snd-pop"; sndPop.hidden = true;
sndPop.innerHTML = `<p class="kicker">音</p>
  <label class="snd-row"><span>🎵 境内の音楽<small>昼は「境内の調べ」、夜は「月夜の調べ」</small></span><input type="checkbox" id="snd-bgm"></label>
  <label class="snd-row"><span>🔔 効果音<small>鈴・太鼓・環境音</small></span><input type="checkbox" id="snd-fx"></label>
  <label class="snd-vol"><span>音量</span><input type="range" id="snd-vol" min="0" max="100"></label>`;
document.body.appendChild(sndPop);
const paintSnd = () => { $("#snd-bgm").checked = bgmOn; $("#snd-fx").checked = !muted; $("#snd-vol").value = Math.round(store.get("enishi_vol", 0.55) * 100); $("#btn-sound").textContent = !bgmOn && muted ? "🔇" : bgmOn ? "🎵" : "🔈"; };
bgm.setVolume(store.get("enishi_vol", 0.55)); paintSnd();
$("#btn-sound").onclick = (e) => { e.stopPropagation(); sndPop.hidden = !sndPop.hidden; paintSnd(); };
document.addEventListener("pointerdown", (e) => { if (!sndPop.hidden && !sndPop.contains(e.target) && e.target.id !== "btn-sound") sndPop.hidden = true; });
$("#snd-bgm").onchange = (e) => { bgmOn = e.target.checked; store.set("enishi_bgm", bgmOn); bgmOn ? bgm.start() : bgm.stop(); paintSnd(); };
$("#snd-fx").onchange = (e) => { muted = !e.target.checked; store.set("enishi_mute", muted); syncHayashi(); paintSnd(); };
$("#snd-vol").oninput = (e) => { const v = e.target.value / 100; store.set("enishi_vol", v); bgm.setVolume(v); fxVol = v * 0.7; if (AC) AC.fxBus.gain.setTargetAtTime(fxVol, AC.currentTime, 0.05); };   // ひとつの音量で、音楽と効果音（少し控えめ）をいっしょに

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
// 境内図：3Dの境内を真上から写した絵地図。北（山）が上
const MAPB = { x0: -48, x1: 48, z0: -34, z1: 88 }, MW = 640, MH = 813;
const mapPct = (x, z) => [Math.min(96, Math.max(4, ((x - MAPB.x0) / (MAPB.x1 - MAPB.x0)) * 100)), Math.min(97, Math.max(3, ((z - MAPB.z0) / (MAPB.z1 - MAPB.z0)) * 100))];
$("#map-pins").innerHTML = Object.entries(PLACES).map(([k, p]) => { const [l, t] = mapPct(p.pos[0], p.pos[1]);
  const up = p.pos[1] < MAPB.z0 ? " up" : "";
  return `<button class="pin${up}" data-k="${k}" style="left:${l}%;top:${t}%" aria-label="${p.name}"><b>${up ? "↑" : p.n}</b><span>${p.name}<small>${p.vi}</small></span></button>`; }).join("");
$("#map-legend").innerHTML = Object.entries(PLACES).map(([k, p]) => `<li><button data-k="${k}"><b>${p.n}</b>${p.name}<small>${p.vi}</small></button></li>`).join("");
$("#map-legend").onclick = (e) => { const b = e.target.closest("[data-k]"); if (!b) return; goPlace(b.dataset.k); $("#m-map").hidden = true; };
let mapDrawn = false;
function drawMap() {
  if (mapDrawn) return; mapDrawn = true;
  const size = new THREE.Vector2(); renderer.getSize(size); const pr = renderer.getPixelRatio(), hour = env.hour, fog = scene.fog;
  const hidden = [me, ...[...others.values()].map((o) => o.av)].filter((o) => o.visible); hidden.forEach((o) => (o.visible = false));
  env.set(12.5); scene.fog = null;
  renderer.setPixelRatio(1); renderer.setSize(MW, MH, false);
  const cam = new THREE.OrthographicCamera(MAPB.x0, MAPB.x1, -MAPB.z0, -MAPB.z1, 150, 215);   // 高さ 50 m より上（雲）は写さない
  cam.position.set(0, 200, 0); cam.up.set(0, 0, -1); cam.lookAt(0, 0, 0); cam.updateProjectionMatrix();
  renderer.render(scene, cam);
  const shot = new Image(); shot.src = renderer.domElement.toDataURL("image/png");
  renderer.setPixelRatio(pr); renderer.setSize(size.x, size.y, false); scene.fog = fog; env.set(hour); hidden.forEach((o) => (o.visible = true));
  // 古い絵地図のように：和紙の色を重ね、縁を暗くし、方位と題を描く
  shot.onload = () => {
    const c = document.createElement("canvas"); c.width = MW; c.height = MH; const x = c.getContext("2d");
    x.filter = "saturate(0.85) contrast(1.05) brightness(1.04)"; x.drawImage(shot, 0, 0); x.filter = "none";
    x.globalCompositeOperation = "multiply"; x.fillStyle = "rgba(240,224,190,0.42)"; x.fillRect(0, 0, MW, MH);
    x.globalCompositeOperation = "source-over";
    const vg = x.createRadialGradient(MW / 2, MH / 2, MH * 0.32, MW / 2, MH / 2, MH * 0.62); vg.addColorStop(0, "rgba(40,24,10,0)"); vg.addColorStop(1, "rgba(40,24,10,0.55)"); x.fillStyle = vg; x.fillRect(0, 0, MW, MH);
    x.strokeStyle = "rgba(90,58,34,.85)"; x.lineWidth = 10; x.strokeRect(5, 5, MW - 10, MH - 10); x.strokeStyle = "rgba(227,181,74,.7)"; x.lineWidth = 2; x.strokeRect(16, 16, MW - 32, MH - 32);
    // 題箋
    x.fillStyle = "rgba(251,246,234,.92)"; x.fillRect(34, 34, 58, 250); x.strokeStyle = "#8a2a1c"; x.lineWidth = 2; x.strokeRect(38, 38, 50, 242);
    x.fillStyle = "#2b2016"; x.font = `bold 30px "Hiragino Mincho ProN","Yu Mincho","Noto Serif JP",serif`; x.textAlign = "center"; x.textBaseline = "top";
    [..."えにし神社境内図"].forEach((ch, i) => x.fillText(ch, 63, 48 + i * 29));
    // 方位
    const cx = 64, cy = MH - 78; x.strokeStyle = "rgba(43,32,22,.85)"; x.lineWidth = 2; x.beginPath(); x.arc(cx, cy, 30, 0, 7); x.stroke();
    x.fillStyle = "#8a2a1c"; x.beginPath(); x.moveTo(cx, cy - 28); x.lineTo(cx + 8, cy); x.lineTo(cx - 8, cy); x.fill();
    x.fillStyle = "#2b2016"; x.beginPath(); x.moveTo(cx, cy + 28); x.lineTo(cx + 8, cy); x.lineTo(cx - 8, cy); x.fill();
    x.font = `bold 22px "Hiragino Mincho ProN","Yu Mincho",serif`; x.fillStyle = "#8a2a1c"; x.fillText("北", cx, cy - 58);
    $("#map-img").src = c.toDataURL("image/jpeg", 0.88);
  };
}
const mapMe = document.createElement("div"); mapMe.className = "map-me"; mapMe.innerHTML = "<i></i><span>現在地</span>"; $("#map-pins").appendChild(mapMe);
const mapOthers = document.createElement("div"); mapOthers.className = "map-others"; $("#map-pins").appendChild(mapOthers);
function paintMapMe() {
  const [l, t] = mapPct(me.position.x, me.position.z); mapMe.style.left = l + "%"; mapMe.style.top = t + "%"; mapMe.style.setProperty("--ry", `${Math.PI - me.rotation.y}rad`);
  mapOthers.innerHTML = [...others.values()].map((o) => { const [x, y] = mapPct(o.av.position.x, o.av.position.z); return `<b style="left:${x}%;top:${y}%" title="${o.name.replace(/[<>&"]/g, "")}"></b>`; }).join("");
}
setInterval(() => { if (!$("#m-map").hidden) paintMapMe(); }, 500);
$("#map-pins").onclick = (e) => { const b = e.target.closest(".pin"); if (!b) return; goPlace(b.dataset.k); $("#m-map").hidden = true; };
function goPlace(k, cb) {
  const p = PLACES[k]; if (!p || busy) return;
  toast(`${p.n}. ${p.name}へ向かいます`, 1800);
  const arrive = () => { me.rotation.y = p.face; cb && cb(); };
  if (Math.hypot(p.stand[0] - me.position.x, p.stand[1] - me.position.z) > 38) warpTo(p.stand).then(arrive);   // 遠い場所は、暗転してそのまま
  else walkTo(p.stand, arrive, { route: true });
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
  { id: "omairi", label: "⛩ お参り", at: [0, 12.2], r: 3.0, run: () => omairi("tosen") },
  { id: "omairi_en", label: "⛩ お参り（縁結び）", at: PLACES.enmusubi.stand, r: 2.6, run: () => omairi("enmusubi") },
  { id: "omairi_go", label: "⛩ お参り（合格）", at: PLACES.gokaku.stand, r: 2.6, run: () => omairi("gokaku") },
  { id: "omairi_ok", label: "⛩ お参り（奥の院）", at: [-2, -73.4], r: 2.2, run: () => omairi("okunoin") },
  { id: "ichibo", label: "🌄 境内を一望する", at: [(STAGE.x0 + STAGE.x1) / 2, STAGE.z1 - 1.6], r: 2.6, run: () => panorama() },
  { id: "temizu", label: "💧 手水をとる", at: PLACES.temizu.stand, r: 3, run: () => temizu() },
  { id: "kuji", label: "⛩ 授与所", at: PLACES.juyosho.stand, r: 3.4, run: () => openJuyo() },
  { id: "ema", label: "🪵 絵馬を奉納", at: [18.6, 13.2], r: 3.6, run: () => { renderEma(); loadEma(); open("#m-ema"); } },
  { id: "musubi", label: "🎋 おみくじを結ぶ", at: [21, 27.6], r: 2.8, run: () => musubi() },
  { id: "fox", label: "🦊 狐を撫でる", at: [-5.5, 19.6], r: 2.4, run: () => petFox(0) },
  { id: "fox2", label: "🦊 狐を撫でる", at: [5.5, 19.6], r: 2.4, run: () => petFox(1) },
  { id: "ushi", label: "🐂 撫で牛を撫でる", at: [28.6, 21.9], r: 2.8, run: () => nadeUshi() },
  { id: "enito", label: "💞 赤い糸に願う", at: [-28.6, 21.9], r: 2.8, run: () => akaiIto() },
  { id: "itotana", label: "🧵 赤い糸を結ぶ", at: [-34.6, 23.1], r: 2.0, run: () => tieIto() },
  { id: "fudezuka", label: "🖌 筆塚に祈る", at: [34.6, 23.1], r: 2.0, run: () => fudeNosame() },
  { id: "fune", label: "🛶 屋形船の作業室に乗る", at: [18, 62.6], r: 1.8, run: () => sagyo.enter("fune") },
  { id: "shoin", label: "📖 書院の作業室に入る", at: [-6.4, 67], r: 1.8, run: () => sagyo.enter("shoin") },
  { id: "koi", label: "🐟 鯉にえさをあげる", at: [18, 54], r: 5, run: () => feedKoi() },
  { id: "toro", label: "🏮 灯籠を流す", at: [4.2, -72.4], r: 3.2, run: () => toroNagashi() },
  { id: "kito", label: "🎴 御祈祷を受ける", at: hw(0, 0.5), r: 1.5, run: () => kito.open() },
  { id: "kito_front", label: "🎴 御祈祷を受ける", at: [0, 9.9], r: 1.4, run: () => kito.open() },
  { id: "kenno", label: "🏮 献灯する", at: [-18.2, 22], r: 2.4, run: () => kenno?.open() },
  { id: "seiza_tosen", label: "🙇 正座して祈る", box: [...hw(-9, -4.5), ...hw(9, 8.3)], run: () => seiza("tosen") },
  { id: "seiza_en", label: "🙇 正座して祈る", box: [-SMALL.X - SMALL.W / 2, SMALL.Z - SMALL.D / 2, -SMALL.X + SMALL.W / 2, SMALL.Z + SMALL.D / 2], run: () => seiza("enmusubi") },
  { id: "seiza_go", label: "🙇 正座して祈る", box: [SMALL.X - SMALL.W / 2, SMALL.Z - SMALL.D / 2, SMALL.X + SMALL.W / 2, SMALL.Z + SMALL.D / 2], run: () => seiza("gokaku") },
];
let curAct = null;
function currentAction() {
  const x = me.position.x, z = me.position.z;
  if (kit.state === "follow" && W.foxes.some((f) => Math.hypot(f.position.x - x, f.position.z - z) < 3.2)) return { id: "kithome", label: "🦊 子狐を狛狐のもとへ", run: () => kitHome() };
  if (kit.near(me.position)) return { id: "kit", label: "🦊 迷子の子狐を連れていく", run: () => kitFollow() };
  const pile = leaves.near(me.position); if (pile) return { id: "leaf" + pile.x + pile.z, label: "🧹 落ち葉を掃く", run: () => sweep(pile) };
  const ch = chores.near(me.position); if (ch) return { id: "chore_" + ch.id, label: `${ch.label}（お手伝い）`, run: () => doChore(ch) };
  const dl = darkL.near(me.position); if (dl) return { id: "lamp" + dl.id, label: "🏮 灯籠に火を灯す", run: () => lightLamp(dl) };
  for (const a of ACTIONS) {
    if (a.box) { const [x0, z0, x1, z1] = a.box; if (x > x0 && x < x1 && z > z0 && z < z1) return a; }
    else if (Math.hypot(a.at[0] - x, a.at[1] - z) < a.r) return a;
  }
  return null;
}
function refreshAction() {
  const a = currentAction(); if ((a && a.id) === (curAct && curAct.id)) { curAct = a; return; } curAct = a;
  if (a && a.id.startsWith("seiza") && !store.get("enishi_seat_tip", 0)) { store.set("enishi_seat_tip", 1); setTimeout(() => toast("🙇 座布団をタップすると、好きな場所に座って祈れます", 4200), 800); }
  const b = $("#act-main"); b.innerHTML = a ? a.label : "⛩ 本殿へ";
  b.classList.toggle("glow", !!a);
}
$("#act-main").onclick = () => { if (busy) return; ac(); if (curAct) curAct.run(); else goPlace("honden"); };
$("#act-map").onclick = () => { drawMap(); paintMapMe(); open("#m-map"); };
$("#act-ema").onclick = () => { renderEma(); loadEma(); open("#m-ema"); };
$("#act-report").onclick = () => report();
$("#act-say").onclick = () => social?.toggleSay();
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
// 水のしずく（柄杓から落ちる）
function drip(p) {
  const d = new THREE.Mesh(new THREE.SphereGeometry(0.022, 6, 5), new THREE.MeshBasicMaterial({ color: 0xbfe6ff, transparent: true, opacity: 0.9 })); d.position.copy(p); d.position.x += rand(-0.02, 0.02); scene.add(d);
  const vx = rand(-0.12, 0.12), vz = rand(-0.12, 0.12), t0 = performance.now(), y0 = p.y;
  (function f() { const k = (performance.now() - t0) / 1000; d.position.y = y0 - 4.9 * k * k; d.position.x += vx * 0.016; d.position.z += vz * 0.016; if (d.position.y > footY(d.position.x, d.position.z) + 0.02 && k < 1.2) requestAnimationFrame(f); else scene.remove(d); })();
}
const temizu = () => doing(async () => {
  const ok = await runTemizu({ me, camera, setCine, stepText, holdStep, wait, tone, noise, drip, stand: PLACES.temizu.stand, walk: (p) => new Promise((r) => walkTo(p, r)) }, TZ);
  stepText(""); if (!ok) return;
  purified = true; toast("心と手を清めました。気持ちよくお参りできます 💧"); deedHook("temizu");
});

// ------------------------------------------------------------------ 一望：奥の院の舞台から、境内をぐるりと見渡す
const panorama = () => doing(async () => {
  me.rotation.y = 0; document.body.classList.add("cine");
  const P = [camera.position.toArray(), [-11, OKU_Y + 3.4, -63], [-4, OKU_Y + 2, -42], [6, 33, -14], [34, 28, 16], [16, 28, 60], [-26, 27, 36], [-14, OKU_Y + 5, -50], [-11, OKU_Y + 3.0, -65]];   // 楼門・本殿の屋根より上を飛ぶ
  const L = [[0, 4, 10], [0, 6, 10], [0, 5, 4], [0, 6, -4], [0, 4, 10], [0, 6, 0], [0, 5, 10], [0, 5, 10], [0, 4, 12]];
  const pc = new THREE.CatmullRomCurve3(P.map((p) => new THREE.Vector3(...p))), lc = new THREE.CatmullRomCurve3(L.map((p) => new THREE.Vector3(...p)));
  const DUR = 22000, t0 = performance.now();
  setCine(() => { const k = Math.min(1, (performance.now() - t0) / DUR), e = 0.5 - Math.cos(k * Math.PI) / 2; camera.position.copy(pc.getPointAt(e)); camera.lookAt(lc.getPointAt(e)); });
  bgm.duck(false); tone([[392, 0.5], [587.33, 0.3], [784, 0.2]], 4, 0.06);
  stepText("境 内 一 望"); setTimeout(() => stepText(""), 3200);
  toast("えにし神社を一望しています。タップで戻ります", 3000);
  await new Promise((r) => { const end = () => { removeEventListener("pointerdown", end); r(); }; setTimeout(end, DUR); setTimeout(() => addEventListener("pointerdown", end), 600); });
  setCine(null); document.body.classList.remove("cine"); deedHook("ichibo");
  toast("🌄 山の上から見る境内は、ひとつの小さな町のようでした", 3600);
});

// ------------------------------------------------------------------ お参り（賽銭→鈴→二礼二拍手一礼）
const SHRINES = {
  tosen: { stand: [0, 12.8], bell: () => W.suzu, place: "honden" },          // 賽銭箱から1m（お辞儀で頭が当たらない）
  enmusubi: { stand: PLACES.enmusubi.stand, bell: () => W.smallSaisen.enmusubi, place: "enmusubi" },
  gokaku: { stand: PLACES.gokaku.stand, bell: () => W.smallSaisen.gokaku, place: "gokaku" },
  okunoin: { stand: [-2, -72.9], bell: () => null, place: "okunoin" },
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
  coin.position.set(me.position.x, me.position.y + 1.0, me.position.z - 0.3); scene.add(coin); const cy0 = coin.position.y;
  await new Promise((r) => { const t0 = performance.now(); (function f() { const k = Math.min(1, (performance.now() - t0) / 700);
    coin.position.z = me.position.z - 0.3 - k * 1.2; coin.position.y = cy0 + Math.sin(k * Math.PI) * 0.8 - k * 0.25; coin.rotation.x += 0.4; k < 1 ? requestAnimationFrame(f) : r(); })(); });
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
const seiza = (hid, chosen = null) => doing(async () => {
  const cs = W.cushions[hid], taken = new Set([...others.values()].map((o) => `${Math.round(o.to.x)},${Math.round(o.to.z)}`));
  const free = cs.filter(([x, z]) => !taken.has(`${Math.round(x)},${Math.round(z)}`)); const [cx, cz] = chosen || pick(free.length ? free : cs);
  await new Promise((r) => {
    const x = me.position.x, z = me.position.z, inside = hid === "tosen" ? inHonden(x, z) : z < SMALL.Z + SMALL.D / 2;
    if (inside) return walkTo([cx, cz], r);
    if (hid === "tosen") { path = [...HONDEN_IN, [cx * 0.4, hw(0, 6)[1]], [cx, cz]]; onArrive = r; speedMul = 1; }
    else { const hx = hid === "enmusubi" ? -SMALL.X : SMALL.X, sz = SMALL.standZ, fz = SMALL.Z + SMALL.D / 2; path = [[hx, sz], [hx + 1.65, sz], [hx + 1.65, fz + 1.2], [hx, fz - 1.4], [cx, cz]]; onArrive = r; speedMul = 1; }
  });
  me.rotation.y = Math.PI;
  setPose(me, "seiza"); await wait(500);
  stepText("正 座"); sfx.taiko(); await wait(1200);
  for (let i = 0; i < 2; i++) { stepText(i ? "二 拝" : "一 拝"); net?.act("bow"); sfx.taiko(); await bowTo(me, 1.35, 800); await wait(700); await bowTo(me, 0, 600); await wait(300); }
  stepText("祈 る"); releaseLight(me.position.x, me.position.y, me.position.z, true); await wait(2600);
  stepText("一 拝"); await bowTo(me, 1.35, 800); await wait(500); await bowTo(me, 0, 600);
  toast("静かに祈りました。心が少し軽くなりますように 🙇"); deedHook("seiza");
});

// ------------------------------------------------------------------ 善行：落ち葉掃き・灯籠・迷子の子狐
let broom = null;
// 落ち葉の下の見つけもの（めったに出ないものほど嬉しい）
const FINDS = [
  { id: "goen", w: 26, icon: "🪙", name: "五円玉", msg: "落ち葉の下に五円玉。ご縁がありますように", toku: 1 },
  { id: "clover", w: 14, icon: "🍀", name: "四つ葉", msg: "四つ葉のクローバーを見つけました。いいことがありそう", toku: 1 },
  { id: "momiji", w: 16, icon: "🍁", name: "紅葉の栞", msg: "いちばんきれいな紅葉を一枚、栞にしました", toku: 0 },
  { id: "suzu", w: 4, icon: "🔔", name: "狐の鈴", msg: "小さな金の鈴…。金の狐の落とし物かもしれません", toku: 3 },
  { id: "none", w: 40 },
];
const pickFind = () => { let r = Math.random() * FINDS.reduce((a, f) => a + f.w, 0); for (const f of FINDS) { r -= f.w; if (r <= 0) return f; } return FINDS.at(-1); };
// 大きな丸いボタンを叩く小さな遊び（need 回たたく。しばらく触らなければ自動で進む）
const sweep = (pile) => doing(async () => {
  await new Promise((r) => walkTo([pile.x - 0.9, pile.z + 0.4], r)); me.rotation.y = Math.atan2(pile.x - me.position.x, pile.z - me.position.z);
  const u = me.userData; u.pose = "act";
  if (!broom) { broom = new THREE.Group(); const st = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 1.4, 6), new THREE.MeshStandardMaterial({ color: 0xc9a46a })); st.position.y = -0.5; broom.add(st);
    const br = new THREE.Mesh(new THREE.ConeGeometry(0.18, 0.4, 8), new THREE.MeshStandardMaterial({ color: 0xb8964a })); br.position.y = -1.25; br.rotation.x = Math.PI; broom.add(br); }
  u.arms[0].add(broom); broom.position.set(0, -0.3, 0.1);
  const f = pickFind(); let k = 0;
  const r = await chores.sweepGame({ find: f, onStroke: () => {
    const sgn = ++k % 2 ? 1 : -1; u.arms[0].rotation.x = -0.9; u.arms[0].rotation.z = sgn * 0.7; setTimeout(() => { u.arms[0].rotation.z = -sgn * 0.2; }, 120);
    if (k % 3 === 0) { leaves.burst(pile.x, pile.z, 3); pile.g.scale.setScalar(Math.max(0.15, pile.g.scale.x * 0.96)); } } });
  u.arms[0].remove(broom); u.arms[0].rotation.set(0, 0, 0.25);
  if (!r.ok) return;
  leaves.remove(pile); deedHook("sweep");
  if (f.id === "none") { toast("境内がきれいになりました 🍂 ありがとうございます（徳 +2）"); return; }
  const got = store.get("enishi_finds", {}); got[f.id] = (got[f.id] || 0) + 1; store.set("enishi_finds", got);
  tone([[1318, 0.3], [1760, 0.25], [2637, 0.15]], 1.2, 0.08);
  bubbleAt(me, f.icon, 2200, 2.2);
  toast(`${f.icon} ${f.msg}（${f.name} ${got[f.id]}個目）`, 4600);
  if (f.toku) D.add(f.toku);
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
// お手伝い：その場所へ行き、手を動かす（arms で小さく所作）
const CHORE_MSG = { fox0: "狛狐がぴかぴかになりました。狐たちが嬉しそうです 🦊✨", fox1: "狛狐がぴかぴかになりました。狐たちが嬉しそうです 🦊✨",
  chozu: "手水鉢がすっきりきれいに。次に来る人も、気持ちよく清められます 💧", uchimizu: "打ち水で参道がしっとり涼しくなりました。夏の風物詩です 💦",
  kusa: "五重塔のまわりがすっきりしました。お花はそのまま、元気に咲いています 🌼" };
const doChore = (c) => doing(async () => {
  await new Promise((r) => walkTo(c.at, r, { route: Math.hypot(me.position.x - c.at[0], me.position.z - c.at[1]) > 6 }));
  const tgt = c.id.startsWith("fox") ? W.foxes[c.id === "fox0" ? 0 : 1]?.position : c.id === "chozu" ? { x: PLACES.temizu.pos[0], z: PLACES.temizu.pos[1] } : null;
  if (tgt) me.rotation.y = Math.atan2(tgt.x - me.position.x, tgt.z - me.position.z);
  const u = me.userData; u.pose = "act"; let k = 0;
  const ok = await chores.run(c, () => { const s = ++k % 2 ? 1 : -1; u.arms[1].rotation.x = -1.0; u.arms[1].rotation.z = s * 0.5; setTimeout(() => (u.arms[1].rotation.z = -0.25), 110); });
  u.arms.forEach((a, i) => a.rotation.set(0, 0, (i ? -1 : 1) * 0.25));
  if (!ok) return;
  deedHook("chore", { id: c.id }); releaseLight(c.at[0], footY(c.at[0], c.at[1]), c.at[1], true);
  if (c.id.startsWith("fox")) { bubbleAt(W.foxes[c.id === "fox0" ? 0 : 1], "コン♪", 1800); sfx.suzu(); }
  toast(`${c.id === "uchimizu" && env.season === "winter" ? "参道の雪をよけて、歩きやすくなりました ❄" : CHORE_MSG[c.id]}（徳 +3）`, 5000);
});
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
// 赤い糸の結び棚：一日に一本、自分の糸を結ぶ（結んだ糸は棚に残る）
const itoBase = 180 + (Math.floor(Date.now() / 86400e3) % 60);
setTimeout(() => W.itoTana?.setN(itoBase + store.get("enishi_ito_n", 0)), 0);
function tieIto() {
  if (!onceToday("itotana")) { toast("今日の糸はもう結ばれています。ご縁はゆっくり育ちます 🧵"); return; }
  const n = store.get("enishi_ito_n", 0) + 1; store.set("enishi_ito_n", n); W.itoTana?.setN(itoBase + n);
  deedHook("ito"); net?.act("ito"); bubbleAt(W.itoTana.group, "🧵💞", 2000, 2.6); tone([[880, 0.3], [1175, 0.25], [1397, 0.2]], 1.2, 0.08); D.add(1);
  toast(`赤い糸を結びました（あなたの糸 ${n} 本目）。結ばれた糸のように、良いご縁がつながりますように`, 5000);
}
// 筆塚：使った筆・鉛筆に感謝して、学びの実りを祈る
function fudeNosame() {
  if (!onceToday("fudezuka")) { toast("今日はもう筆塚にお参りしました。明日も学びを ✍️"); return; }
  deedHook("fude"); bubbleAt(W.fudezuka, "✍️", 2000, 2.8); tone([[659, 0.3], [988, 0.25], [1319, 0.2]], 1.2, 0.08); D.add(1);
  releaseLight(W.fudezuka.position.x, 0, W.fudezuka.position.z, true);
  toast("筆塚に手を合わせました。これまで支えてくれた筆と鉛筆に感謝を。積み重ねた学びが実を結びますように", 5200);
}
function akaiIto() { deedHook("ito"); bubbleAt(W.enTree, "💞", 1800, 3.4); tone([[1046, 0.3], [1318, 0.25], [1568, 0.2]], 1.2, 0.1); releaseLight(W.enTree.position.x, 0, W.enTree.position.z, true); toast("赤い糸にご縁を願いました。同じ時に願った人がいると、糸がつながるかも…💞"); net?.act("ito"); }
function feedKoi() { deedHook("koi"); W.koiFeed?.(me.position.x, me.position.z); noise(0.2, 2500, 0.15, "highpass"); toast("鯉が集まってきました 🐟"); }
function toroNagashi() { deedHook("toro");
  const { lamp } = makeFloatLamp();
  toast("灯籠を池に流しました。遠くの大切な人に、想いが届きますように 🏮"); releaseLight(lamp.position.x, OKU_Y, lamp.position.z, true); net?.act("toro");
}
function removeFloatLamp(fl) { scene.remove(fl.lamp); W.floatLamps = (W.floatLamps || []).filter((x) => x !== fl); }
function makeFloatLamp() {
  const lamp = new THREE.Group(); const m = new THREE.MeshStandardMaterial({ color: 0xfff0d0, emissive: 0xffa040, emissiveIntensity: 2.6 });
  const b = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.4, 0.4), m); b.position.y = 0.25; lamp.add(b);
  const base = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.06, 0.55), new THREE.MeshStandardMaterial({ color: 0x6b4428 })); lamp.add(base);
  lamp.position.set(OKPOND.cx - OKPOND.rx * 0.7, OKU_Y - 0.06, OKPOND.cz + 0.4); scene.add(lamp);
  const fl = { lamp, a: Math.random() * 6, t: 0 }; W.floatLamps = (W.floatLamps || []).concat([fl]); return fl;
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
  $("#kuji-stage").hidden = true; $("#kuji-result").hidden = false; showKuji(); net?.act("kuji", drawKuji().rk.key); deedHook("kuji");
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
  x.fillStyle = "#8a7f70"; x.font = "30px serif"; x.fillText("作業と祈りのオンライン神社", 540, 1120); x.fillStyle = "#fbf6ea"; x.font = "34px serif"; x.fillText("#えにし神社", 540, 1290);
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
    $("#ema-text").value = ""; $("#ema-count").textContent = "0/60"; sfx.gong(); net?.act("ema"); addEma(1); deedHook("ema", {}); if (r.id) social?.rememberEma(hallOf().id, r.id, t);
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
const visited = () => { const v = store.get("enishi_visited", {}); return Object.keys(v).filter((k) => v[k] === today() && SHUIN[k]); };
hooks.push((kind, d) => { if (kind === "omairi" && d.sid) { const v = store.get("enishi_visited", {}); v[d.sid] = today(); store.set("enishi_visited", v); } });
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
// 御札・宝物：授かった御札と、境内で見つけたもの・いただいたもの
const TAKARA = () => [...FINDS.filter((f) => f.id !== "none"), { id: "chitose", icon: "🍬", name: "千歳飴" }, { id: "amazake", icon: "🍶", name: "甘酒" }];
function renderTakara() {
  const ofuda = store.get("enishi_ofuda", []), finds = store.get("enishi_finds", {}), el = $("#book-takara");
  el.innerHTML = `<h3>御札 <small>${ofuda.length}体</small></h3>` + (ofuda.length ? `<div class="ofuda-row"></div>` : `<p class="sub">まだ御札はありません。本殿で御祈祷を受けると、あなたの名前の入った御札を授かります。</p>`)
    + `<h3>見つけたもの・いただいたもの</h3><div class="finds-grid">${TAKARA().map((f) => { const n = finds[f.id] || 0;
      return `<div class="find${n ? "" : " no"}"><span>${n ? f.icon : "？"}</span><b>${n ? f.name : "まだ見つけていません"}</b><small>${n ? `× ${n}` : ""}</small></div>`; }).join("")}</div>
    <p class="sub">落ち葉を掃くと、ときどき何かが見つかります。行事の日には、いただけるものも。</p>`
    + (() => { const sk = store.get("enishi_shakyo", []), me2 = store.get("enishi_myema", []);
        return `<h3>写経・写歌 <small>${sk.length}巻</small></h3>` + (sk.length ? `<div class="sk-done">${sk.slice(0, 12).map((x) => `<span><b>${escT(x.title)}</b><small>${escT(x.date)}</small></span>`).join("")}</div>` : `<p class="sub">🧘 静のひととき →「写経・写歌」から。</p>`)
          + `<h3>描いた絵馬 <small>${me2.length}枚</small></h3>` + (me2.length ? `<div class="my-ema">${me2.map((x) => `<img src="${x.url}" alt="描いた絵馬">`).join("")}</div>` : `<p class="sub">絵馬を奉納する画面の「筆で絵馬を描く」から。</p>`); })();
  const row = el.querySelector(".ofuda-row");
  ofuda.forEach((rec) => { const cv = ofudaImage(rec); cv.className = "ofuda-thumb"; cv.title = `${rec.gan}・${rec.date}`; cv.onclick = () => viewOfuda(rec); row?.appendChild(cv); });
}
function viewOfuda(rec) {
  let v = $("#ofuda-view"); if (!v) { v = document.createElement("div"); v.id = "ofuda-view"; v.onclick = () => (v.hidden = true); document.body.appendChild(v); }
  v.innerHTML = ""; const cv = ofudaImage(rec); v.appendChild(cv); v.insertAdjacentHTML("beforeend", `<small>${rec.gan}・${rec.date}　（タップで閉じる）</small>`); v.hidden = false;
}
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
  $("#book-shuin-wrap").hidden = tab !== "shuin"; $("#book-mamori").hidden = tab !== "mamori"; $("#book-takara").hidden = tab !== "takara";
  if (tab === "takara") renderTakara();
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
  onAllDone: () => {},                                                // 満願の知らせは guide.js
});
const onceToday = (k) => { const m = store.get("enishi_once", {}); if (m[k] === today()) return false; m[k] = today(); store.set("enishi_once", m); return true; };
const TOKU = { temizu: 1, goshuin: 1, ema: 1, omamori: 0, lamp: 2, kit: 3 };
hooks.push((kind, d) => {
  let pts = 0, q = null;
  if (kind === "omairi") pts = 2 + (d.purified ? 1 : 0);
  else if (kind === "sweep") pts = 2;
  else if (kind === "chore") pts = 3;
  else if (kind === "pray") pts = 1;
  else if (["koi", "ushi", "ito", "toro"].includes(kind)) pts = onceToday(kind) ? (kind === "toro" ? 2 : 1) : 0;
  else if (kind === "kito") pts = onceToday("kito") ? 5 : 0;
  else if (kind === "en") pts = onceToday("en") ? 2 : 0; else if (kind === "bless") pts = onceToday("bless") ? 1 : 0;
  else if (kind === "kenno") pts = onceToday("kenno") ? 2 : 0; else if (kind === "streak") pts = d.bonus || 0;
  else pts = TOKU[kind] || 0;
  q = STEP_OF[kind] || null;                                          // 今日の参拝の段
  if (!pts && !q) return;
  D.add(pts, q);
  if (pts) fetch(API_T + "/toku", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ n: pts }) }).then((r) => r.json()).then(setFest).catch(() => {});
});
const API_T = "https://enishi-rooms.thanhduy8vn.workers.dev";
function refreshToku() { $("#toku").textContent = D.toku; $("#rank").textContent = D.rank(); $("#me-tag").innerHTML = (myStatus ? `<span class="tag-st">${escT(myStatus)}</span>` : "") + `わたし · ${escT(myName)}（${D.rank()}）`; }
function flyToku(n) { const b = document.createElement("div"); b.className = "toku-fly"; b.textContent = `徳 +${n}`; document.body.appendChild(b); setTimeout(() => b.remove(), 1600); }
function openQuests() {
  $("#q-list").innerHTML = guide.steps().map((q, i) => `<li class="${q.done ? "done" : ""}"><span>${q.done ? "✅" : `<b class="q-n">${i + 1}</b>`} ${q.icon} ${q.label}</span><button class="btn q-go" data-q="${q.id}" ${q.done ? "disabled" : ""}>${q.done ? "済" : "行く"}</button></li>`).join("");
  const nx = D.next(); $("#q-rank").innerHTML = `徳 <b>${D.toku}</b>・位「${D.rank()}」${nx ? `（次の位まであと ${nx - D.toku}）` : ""}`; open("#m-quest");
}
$("#btn-quest").onclick = openQuests;
$("#q-list").onclick = (e) => { const b = e.target.closest("[data-q]"); if (!b || busy) return; const st = guide.steps().find((x) => x.id === b.dataset.q); $("#m-quest").hidden = true; walkTo(typeof st.to === "string" ? PLACES[st.to].stand : st.to, null, { route: true, fast: true }); };
let festOn = false;
function setFest(r) {
  if (!r || r.toku === undefined) return; const pct = Math.min(100, Math.round((r.toku / r.goal) * 100));
  $("#gtoku").textContent = `${r.toku}/${r.goal}`; $("#gbar").style.width = pct + "%";
  const on = r.toku >= r.goal; if (on && !festOn) toast("🎆 境内のみんなの徳が満ちました。今夜は夜祭りです！五重塔の空を見上げてください", 6000);
  festOn = on; fireworks.on = on; document.body.classList.toggle("fest", on); syncHayashi();
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
  const av = makeAvatar(o.look || Math.random(), env); av.scale.setScalar(AV_SCALE); av.position.set(o.x ?? 0, footY(o.x ?? 0, o.z ?? 80), o.z ?? 80); av.rotation.y = o.ry ?? Math.PI; scene.add(av);
  const tag = document.createElement("div"); tag.className = "tag"; tag.textContent = o.name || "参拝者"; document.body.appendChild(tag);
  av.userData.otherId = o.id;
  const mutedNames = store.get("enishi_muted", []);
  const rec = { id: o.id, name: o.name || "参拝者", pid: null, st: o.st || "", muted: mutedNames.includes(o.name), av, tag, to: new THREE.Vector3(o.x ?? 0, 0, o.z ?? 80), ry: o.ry ?? Math.PI, bubble: null };
  others.set(o.id, rec); paintTag(rec);
  const added = others.get(o.id); if (added) poseBySt(added);
}
function muteOther(o) { o.muted = !o.muted; const l = store.get("enishi_muted", []).filter((n) => n !== o.name); if (o.muted) l.push(o.name); store.set("enishi_muted", l.slice(-200)); paintTag(o); toast(o.muted ? `${o.name}さんの言葉を表示しないようにしました` : `${o.name}さんの言葉を表示します`); }
// 作業室や集中中の人は、正座で
function poseBySt(o) { setPose(o.av, /^(🧘|🛶|📖)/.test(o.st || "") ? "seiza" : null); }
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
  else if (a === "say" || a === "emo") { const t = social?.otherSay(a, r); if (t && !o.muted) { bubble(o, t, 4200); chat.add(o, t); } }
  else if (a === "kito") { bubble(o, "🎴 御祈祷を受けています", 5000); chat.sys(`${o.name}さんが御祈祷を受けています`); } else if (a === "kenno") bubble(o, "🏮 献灯しました", 4000);
}
let net = null;
const setCount = (n) => { $("#ppl").textContent = Math.max(1, n || 1); };

// ------------------------------------------------------------------ オープニング（大鳥居から参道、楼門をこえて本殿へ）
let intro = !QS.has("nointro") && store.get("enishi_intro2", "") !== today() ? { t: 0 } : null;
const introPath = new THREE.CatmullRomCurve3([[0, 40, 140], [0, 9, 92], [0, 3.2, 78], [0, 3, 58], [0, 12, 49], [0, 21, 33], [0, 12, 26], [6, 7, 92]].map((p) => new THREE.Vector3(...p)));
const introLook = new THREE.CatmullRomCurve3([[0, 6, 76], [0, 5, 70], [0, 3, 50], [0, 6, 38], [0, 8, 10], [0, 7, 1], [0, 6, 1], [0, 1.2, 80]].map((p) => new THREE.Vector3(...p)));
if (intro) { store.set("enishi_intro2", today()); $("#title-card").hidden = false; controls.enabled = false; }
function runIntro(dt) {
  intro.t += dt / 11; if (intro.t >= 0.86) return endIntro();
  camera.position.copy(introPath.getPointAt(intro.t)); camera.lookAt(introLook.getPointAt(intro.t));
}
function endIntro() { intro = null; setTimeout(onboard, 1400); $("#title-card").classList.add("out"); setTimeout(() => ($("#title-card").hidden = true), 1200);
  camera.position.set(0, 6, 90); controls.target.set(me.position.x, 1.2, me.position.z); controls.enabled = true; controls.update(); }
$("#title-card").onclick = () => intro && endIntro();

// ------------------------------------------------------------------ loop
const clock = new THREE.Clock(), v3 = new THREE.Vector3(), tagEl = $("#me-tag");
let tick = 0, lastHall = "tosen";
function loop() {
  const dt = Math.min(clock.getDelta(), 0.05), t = clock.elapsedTime;
  stepMove(dt);
  if (intro) runIntro(dt);
  else if (cine) cine(dt);
  else {
    const want = new THREE.Vector3(me.position.x, me.position.y + 1.0, me.position.z), delta = want.sub(controls.target).multiplyScalar(freeCam ? 0 : Math.min(1, dt * 4));
    controls.target.add(delta); camera.position.add(delta); controls.update();
    // 千本鳥居の中ではカメラを笠木より下に
    if (region(me.position.x, me.position.z) === "trail" && Math.hypot(me.position.x + 2, me.position.z + 74) > 15 && !(me.position.x > STAGE.x0 - 2 && me.position.z > STAGE.z0 - 2 && me.position.z < STAGE.z1 + 2) && me.position.y + 2.6 < camera.position.y) camera.position.y += (me.position.y + 2.6 - camera.position.y) * Math.min(1, dt * 10);
    const gy = footY(camera.position.x, camera.position.z) + 0.8; if (camera.position.y < gy) camera.position.y = gy;   // 地面にめり込まない
  }
  W.treeFade?.(camera.position, controls.target);
  env.follow(me.position);
  for (const f of W.update) f(t, dt, me.position);
  for (const fl of W.floatLamps || []) { fl.t += dt; fl.a += dt * 0.12; fl.lamp.position.x = OKPOND.cx + Math.cos(fl.a) * OKPOND.rx * 0.65; fl.lamp.position.z = OKPOND.cz + Math.sin(fl.a) * OKPOND.rz * 0.6; fl.lamp.position.y = OKU_Y - 0.06 + Math.sin(t * 2 + fl.a) * 0.02; }
  lanterns.update(dt, t); kit.update(dt, me); texTick(t); noboriTick(t); rowTick(t); cloudTick(t, env); ffTick(t);
  fireworks.update(dt, () => { tone([[60, 0.8], [90, 0.4]], 1.2, 0.25); setTimeout(() => noise(0.6, 2200, 0.12, "highpass"), 300); });
  for (const o of others.values()) {
    const d = o.to.clone().sub(o.av.position); d.y = 0; const dist = d.length(), u = o.av.userData;
    if (dist > 0.05) { o.av.position.add(d.multiplyScalar(Math.min(1, dt * 5))); if (!u.pose) { u.walk += dt * 11; u.body.position.y = Math.abs(Math.sin(u.walk)) * 0.08; u.arms.forEach((a, i) => (a.rotation.x = Math.sin(u.walk + i * Math.PI) * 0.5)); } }
    else if (!u.pose) { u.body.position.y = 0; u.arms.forEach((a) => (a.rotation.x = 0)); }   // 正座の人はそのまま
    o.av.position.y = footY(o.av.position.x, o.av.position.z);
    o.av.rotation.y += ((((o.ry - o.av.rotation.y) % (2 * Math.PI)) + 3 * Math.PI) % (2 * Math.PI) - Math.PI) * Math.min(1, dt * 8);
    v3.copy(o.av.position); v3.y += 2.05 * AV_SCALE; v3.project(camera);
    const vis = v3.z < 1 && Math.abs(v3.x) < 1.1 && Math.abs(v3.y) < 1.1, X = (v3.x * 0.5 + 0.5) * innerWidth + "px", Y = (-v3.y * 0.5 + 0.5) * innerHeight + "px";
    o.tag.style.display = vis ? "" : "none"; o.tag.style.left = X; o.tag.style.top = Y;
    if (o.bubble) { o.bubble.style.display = vis ? "" : "none"; o.bubble.style.left = X; o.bubble.style.top = `calc(${Y} - ${o.tag.offsetHeight + 6}px)`; }   // 名札の上に（重ならない）
  }
  net?.pos(me.position.x, me.position.z, me.rotation.y);
  bloom.strength = (MOBILE ? 0.42 : 0.55) * (0.12 + 0.88 * env.lamp); bloom.threshold = 0.86 + (1 - env.lamp) * 0.12; bloom.radius = 0.45;
  composer.render();
  v3.copy(me.position); v3.y += 2.15 * AV_SCALE; v3.project(camera);
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

setTimeout(() => { if (myStatus) net?.st(myStatus, "st"); }, 6000);
net = connect({ hall: "tosen", name: myName, look: myLook,
  onWelcome: (m) => m.others.forEach(addOther), onJoin: (m) => { const fresh = !others.has(m.id); addOther(m); if (fresh) chat.sys(`${m.name || "参拝者"}さんがお参りに来ました`); }, onLeave: (m) => removeOther(m.id), onCount: setCount,
  onPos: (m) => { const o = others.get(m.id); if (o) { o.to.set(m.x, 0, m.z); o.ry = m.ry; } },
  onAct: (m) => { const o = others.get(m.id); if (o) otherAct(o, m.a, m.r); },
  onLook: (m) => { const o = others.get(m.id); if (!o) return; restyle(o.av, m.look, env); o.av.userData.otherId = o.id; o.name = m.name || "参拝者"; o.tag.textContent = o.name; },
  onEn: (m) => { const o = others.get(m.from); if (o) social?.onEn(o, m); },
  onSt: (m) => { const o = others.get(m.id); if (!o) return; if (m.kind === "say") { if (!o.muted && m.text) { bubble(o, m.text, 6500); chat.add(o, m.text); } } else { o.st = m.text || ""; paintTag(o); poseBySt(o); } },
  onNope: () => toast("その言葉は境内では使えません") });
board.list("tosen").then((r) => { addEma(r.total || 0); addKuji(Math.min(60, Math.floor((r.lights || 0) / 2))); const n = r.lights || 0; setLights(n); for (let i = 0; i < Math.min(n, MOBILE ? 80 : 160); i++) lanterns.spawn(0, 0, 0, { instant: true }); }).catch(() => {});
scene.updateMatrixWorld(true); try { measureStairs(); } catch (e) { console.warn("stairs", e); }
loop();
$("#loading").classList.add("ready"); setTimeout(() => $("#loading").classList.add("done"), Math.max(300, 1400 - performance.now()));   // 絵を少しだけ見せてから
setTimeout(() => ($("#hint").style.opacity = 0), 10000);
if (!store.get("enishi_seen_story", false)) { store.set("enishi_seen_story", true); setTimeout(openStory, intro ? 9800 : 1500); }
// ------------------------------------------------------------------ 御祈祷（kito.js）
const setCine = (fn) => {
  if (!fn) { freeCam = false; homeBtn.hidden = true; }
  cine = fn; controls.enabled = !fn; bgm.duck(!!fn);
  if (!fn) { camera.position.set(me.position.x, me.position.y + 4.2, me.position.z + 6.5); controls.target.set(me.position.x, me.position.y + 1.2, me.position.z); controls.update(); }
};
const NG_WORDS = ["死ね", "殺す", "ころす", "しね", "消えろ", "ブス", "きもい", "キモい", "http", "www.", ".com", "ライン交換", "副業", "稼げる", "儲かる", "裏垢", "パパ活", "セックス", "エロ", "まんこ", "ちんこ", "fuck", "shit"];
const ngText = (t) => NG_WORDS.some((w) => String(t || "").toLowerCase().includes(w.toLowerCase()));
const walkP = (dest) => new Promise((r) => walkTo(dest, r));
// 本殿の中の席へ：外にいれば本殿前まで道なりに行き、正面の階段から入る
async function goSeat([sx, sz]) {
  // 途中で詰まっても儀式が止まらないように：一定時間で着かなければ席へ移す
  const arrive = (fn, ms) => Promise.race([new Promise(fn), wait(ms).then(() => "late")]);
  const inside = () => inHonden(me.position.x, me.position.z);
  if (!inside()) {
    if (Math.hypot(me.position.x - PLACES.honden.stand[0], me.position.z - PLACES.honden.stand[1]) > 3) await arrive((r) => walkTo(PLACES.honden.stand, r, { route: true, fast: true }), 40000);
    await arrive((r) => { path = [...HONDEN_IN, [sx, sz]]; onArrive = r; speedMul = 1; }, 18000);
  } else await arrive((r) => walkTo([sx, sz], r), 8000);
  if (Math.hypot(me.position.x - sx, me.position.z - sz) > 0.4) { path = []; onArrive = null; me.position.set(sx, footY(sx, sz), sz); }
}
const hideOthers = (on) => { for (const o of others.values()) { o.av.visible = !on; o.tag.style.visibility = on ? "hidden" : ""; if (o.bubble) o.bubble.style.visibility = on ? "hidden" : ""; } };
// 本殿の空いている座布団（前列の真ん中から）・本殿にいる人の名前
const freeCushion = () => { const taken = [...others.values()].map((o) => o.to); const cs = [...W.cushions.tosen].sort((a, b) => Math.hypot(a[0], a[1] + 0.6) - Math.hypot(b[0], b[1] + 0.6));
  return cs.find(([x, z]) => !taken.some((t) => Math.hypot(t.x - x, t.z - z) < 0.6)) || cs[0]; };
const othersInHonden = () => [...others.values()].filter((o) => inHonden(o.av.position.x, o.av.position.z)).map((o) => o.name);
const tzSound = waterSound({ ac, muted: () => muted, audioReady: () => gestured }, TZ); W.update.push(() => tzSound(me));
const STN = { center: [0, 0] }, stSound = waterSound({ ac, muted: () => muted, audioReady: () => gestured }, STN);   // 渓流のせせらぎ
W.update.push(() => { if (!W.stream) return; let b = 1e9; for (let i = 0; i < W.stream.length; i += 3) { const p = W.stream[i], d = (p.x - me.position.x) ** 2 + (p.z - me.position.z) ** 2; if (d < b) { b = d; STN.center = [p.x, p.z]; } } stSound(me); });
const kito = setupKito({ hideOthers, freeCushion, othersInHonden, isBusy: () => busy, inCine: () => !!cine || !!intro, scene, camera, me, W, env, store, sfx, tone, noise, ac, muted: () => muted, wait, toast, setPose, bowTo, doing, setCine, goSeat, walkTo2: walkP,
  deedHook, today, ng: ngText, getName: () => myName, get net() { return net; } });
// ------------------------------------------------------------------ 身支度（profile.js）
const cleanText = (t, n = 12) => String(t || "").replace(/[<>&"'`\\]/g, "").replace(/\s+/g, " ").trim().slice(0, n);
const profile = setupProfile({ me, camera, env, store, toast, setCine, ng: ngText, clean: cleanText, toku: () => D.toku,
  getName: () => myName, getLook: () => myLook, randomName: () => `${pick(NAMES_A)}${pick(NAMES_B)}`,
  setProfile: (name, look) => { myName = name; myLook = look; store.set("enishi_name", name); store.set("enishi_look", look); refreshToku(); net?.hello(name, look); } });
$("#btn-me").onclick = () => { if (!busy && !intro) profile.open(false); };
// ------------------------------------------------------------------ 人とのつながり（social.js）
const chime = () => tone([[1046, 0.3], [1318, 0.25], [1568, 0.2]], 1.4, 0.08);
setupSocial({ API: API_T, store, me, scene, camera, toast, W, bowTo, bubble, chime, deedHook, today, isBusy: () => busy, ng: ngText, clean: cleanText, logMine: (t) => chat.mine(t),
  getStatus: () => myStatus, setStatus: (t) => { myStatus = t; store.set("enishi_status", t); refreshToku(); },
  isMuted: (o) => o.muted, toggleMute: (o) => muteOther(o), getName: () => myName, hall: () => hallOf().id, get net() { return net; } })
  .then((s) => { social = s;
    kenno = setupKenno({ scene, env, store, API: API_T, W, toast, chime, deedHook, today, tapHandlers, ng: ngText, clean: cleanText, getName: () => myName, pid: () => s.pid, get net() { return net; } });
  }).catch((e) => console.warn("social", e));
$("#btn-en").onclick = () => social?.openBook();
// ------------------------------------------------------------------ チャット（chat.js）
const chat = setupChat({ toast, deedHook, ng: ngText, clean: cleanText, getName: () => myName, net: () => net, room: () => net?.room,
  sayMine: (t) => social?.sayMine(t),
  mute: (id, force) => { const o = others.get(id); if (!o) return; if (force && o.muted) return; muteOther(o); } });
hooks.push((kind) => { if (kind === "omairi" || kind === "kito" || kind === "seiza") social?.streakTick(); });
// ------------------------------------------------------------------ 今日の参拝（guide.js）
const guide = setupGuide({ scene, me, PLACES, W, D, store, toast, chime, today, releaseLight, footY, isBusy: () => busy, inCine: () => !!cine || !!intro,
  walkRoute: (to) => walkTo(to, null, { route: true, fast: true }), openList: () => openQuests() });
hooks.push((kind) => guide.onDeed(kind));
function onboard() { if (!store.get("enishi_profile", 0) && !busy) profile.open(true); }
if (!intro) setTimeout(onboard, 1200);
$("#juyo-kito").onclick = () => { $("#m-juyo").hidden = true; kito.open(); };
// ------------------------------------------------------------------ 季節の行事（seasonal.js）
setupSeasonal({ scene, W, toast, addAction: (a) => ACTIONS.unshift(a), addGan: (g) => kito.addGan(g), me, doing, stepText, deedHook, tone, noise, fireworks, getName: () => myName,
  walk: (p) => new Promise((r) => walkTo(p, r)), bow: async () => { await bowTo(me, 1.1, 600); await wait(300); await bowTo(me, 0, 500); }, light: (x, z) => releaseLight(x, footY(x, z), z, true),
  once: (k) => onceToday(k), addToku: (n) => { D.add(n); refreshToku(); }, chime: () => tone([[1046, 0.3], [1318, 0.25], [1568, 0.2]], 1.4, 0.08),
  amazake: () => {
    if (!onceToday("amazake")) { toast("甘酒は一日に一杯。明日もどうぞ 🍶"); return; }
    const got = store.get("enishi_finds", {}); got.amazake = (got.amazake || 0) + 1; store.set("enishi_finds", got);
    tone([[784, 0.3], [1175, 0.2]], 1.0, 0.08); bubbleAt(me, "🍶", 2200, 2.2); D.add(1);
    toast("🍶 振る舞いの甘酒をいただきました。体の芯から温まります。今年も良い一年になりますように", 5200);
  },
  chitose: () => {
    if (!onceToday("chitose")) { toast("千歳飴は一日にひとつ。明日またどうぞ 🍬"); return; }
    const got = store.get("enishi_finds", {}); got.chitose = (got.chitose || 0) + 1; store.set("enishi_finds", got);
    tone([[1046, 0.3], [1568, 0.2]], 1.0, 0.08); bubbleAt(me, "🍬", 2200, 2.2); D.add(1);
    toast("🍬 千歳飴をいただきました。細く長く、粘り強く…子どもの長寿と健やかな成長を願う縁起物です", 5200);
  } });
// ------------------------------------------------------------------ 画面のスティック（さわれる端末だけ）
if (matchMedia("(pointer: coarse)").matches) {
  const pad = document.createElement("div"); pad.id = "joy"; pad.innerHTML = "<i></i>"; document.body.appendChild(pad);
  const knob = pad.querySelector("i"); let id = null, cx = 0, cy = 0;
  const R = 44;
  const set = (x, y) => { const d = Math.hypot(x, y), k = d > R ? R / d : 1; knob.style.transform = `translate(${x * k}px, ${y * k}px)`; joy.x = (x * k) / R; joy.y = (y * k) / R; };
  pad.addEventListener("pointerdown", (e) => { e.preventDefault(); id = e.pointerId; pad.setPointerCapture(id); const r = pad.getBoundingClientRect(); cx = r.left + r.width / 2; cy = r.top + r.height / 2; set(e.clientX - cx, e.clientY - cy); pad.classList.add("on"); });
  pad.addEventListener("pointermove", (e) => { if (e.pointerId !== id) return; e.preventDefault(); set(e.clientX - cx, e.clientY - cy); });
  const end = (e) => { if (e.pointerId !== id) return; id = null; set(0, 0); pad.classList.remove("on"); };
  pad.addEventListener("pointerup", end); pad.addEventListener("pointercancel", end);
  const rot = document.createElement("div"); rot.id = "cam-rot"; rot.innerHTML = `<button type="button" data-r="1" aria-label="左に回す">⟲</button><button type="button" data-r="-1" aria-label="右に回す">⟳</button>`; document.body.appendChild(rot);
  rot.onclick = (e) => { const b = e.target.closest("[data-r]"); if (!b || cine) return; const dir = +b.dataset.r, t0 = performance.now(); let done = 0;
    (function f() { const k = Math.min(1, (performance.now() - t0) / 320), e2 = 0.5 - Math.cos(k * Math.PI) / 2; orbitCam(dir * (Math.PI / 4) * (e2 - done)); done = e2; if (k < 1) requestAnimationFrame(f); })(); };
  $("#hint").textContent = "左下のスティックで歩く · 1本指で見回す · 2本指でずらして見渡す";
} else $("#hint").textContent = "WASD・矢印キーで歩く · ドラッグで見回す · 右ドラッグでずらして見渡す";
// 指でなぞる遊び（落ち葉・お手伝い・絵馬・人形・スティック）の上では、ページが動かないように
document.addEventListener("touchmove", (e) => { if (e.cancelable && e.target.closest?.(".mg-stage,.mg .sheet,.ed-cv,.ht-cv,#joy")) e.preventDefault(); }, { passive: false });
// ------------------------------------------------------------------ 静のひととき（zen.js・mixer.js・shakyo.js・tour.js）
let stResend = 0;
const setStatusAll = (t) => { myStatus = t; store.set("enishi_status", t); refreshToku(); net?.st(t, "st"); clearTimeout(stResend); stResend = setTimeout(() => net?.st(myStatus, "st"), 9000); };
const mixer = setupMixer({ ac, store, scene, camera, W, toast,
  getMusic: () => (bgmOn ? store.get("enishi_vol", 0.55) : 0),
  setMusic: (v) => { if (v > 0.001) { store.set("enishi_vol", v); bgm.setVolume(v); if (!bgmOn) { bgmOn = true; store.set("enishi_bgm", true); } if (gestured && !bgm.on) bgm.start(); } else if (bgmOn) { bgmOn = false; store.set("enishi_bgm", false); bgm.stop(); } paintSnd(); } });
const tour = setupTour({ camera, PLACES, footY, setCine, toast, okPond: W.okPond, floatLamp: () => makeFloatLamp(), removeFloatLamp: (l) => removeFloatLamp(l),
  nearest: () => Object.keys(PLACES).reduce((b, k) => (Math.hypot(PLACES[k].pos[0] - me.position.x, PLACES[k].pos[1] - me.position.z) < Math.hypot(PLACES[b].pos[0] - me.position.x, PLACES[b].pos[1] - me.position.z) ? k : b), "ootorii") });
const shakyo = setupShakyo({ store, toast, today, deedHook, chime, addToku: (n) => { D.add(n); refreshToku(); }, hangEma: () => hangEma(), brush: () => noise(0.07, 1500, 0.04, "bandpass") });
// 通知：画面がほかにあるときだけ（作業室の切りかわり・集中の終わり）。端末を少しふるわせる
const notify = (title, body) => {
  navigator.vibrate?.([180, 90, 180]);
  if (!document.hidden || !("Notification" in window) || Notification.permission !== "granted") return;
  (navigator.serviceWorker ? navigator.serviceWorker.ready : Promise.reject()).then((r) => r.showNotification(title, { body, icon: "img/icon-192.png", badge: "img/icon-192.png", tag: "enishi-pomo", renotify: true }))
    .catch(() => { try { new Notification(title, { body, icon: "img/icon-192.png" }); } catch {} });
};
const askNotify = async () => { if (!("Notification" in window)) { toast("この端末では通知が使えません"); return false; } if (Notification.permission === "default") await Notification.requestPermission();
  if (Notification.permission === "granted") { toast("🔔 ほかの画面を見ていても、集中と休憩の切りかわりをお知らせします", 4000); return true; }
  toast("通知がオフになっています。ブラウザの設定から許可できます", 4000); return false; };
const sagyo = setupSagyo({ purr: () => tone([[55, 0.6], [57, 0.4]], 1.2, 0.12), notify, askNotify, scene, env, W, me, camera, others, store, toast, today, deedHook, bgm, mixer, setCine, setPose, bowTo, warpTo, doing, isBusy: () => busy,
  getStatus: () => myStatus, setStatus: setStatusAll, addToku: (n) => { D.add(n); refreshToku(); }, gong: () => sfx.gong(), suzu: () => sfx.suzu(), soft: () => tone([[784, 0.3], [1175, 0.2]], 1.6, 0.04),
  ensureMusic: () => { if (!bgmOn) { bgmOn = true; store.set("enishi_bgm", true); paintSnd(); } if (gestured && !bgm.on) bgm.start(); }, title: document.title });
const zen = setupZen({ notify, room: (id) => sagyo.enter(id), shareCanvas, store, toast, today, deedHook, me, camera, PLACES, STAGE, footY, setCine, setPose, mixer, shakyo, tour, isBusy: () => busy,
  doing, walkRoute: (to) => (Math.hypot(to[0] - me.position.x, to[1] - me.position.z) > 28 ? warpTo(to) : new Promise((r) => walkTo(to, r, { route: true, fast: true }))), getStatus: () => myStatus, setStatus: setStatusAll,
  addToku: (n) => { D.add(n); refreshToku(); }, gong: () => sfx.gong(), soft: () => tone([[784, 0.3], [1175, 0.2]], 1.6, 0.04),
  breathTone: (t) => tone(t.startsWith("鼻") ? [[392, 0.3]] : t.startsWith("息") ? [[523, 0.2]] : [[330, 0.3]], 2.5, 0.025),
  focusing: () => [...others.values()].filter((o) => (o.st || "").startsWith("🧘")).length });
$("#btn-zen").onclick = () => { if (!intro) zen.open(); };
$("#btn-ema-draw").onclick = () => { $("#m-ema").hidden = true; shakyo.drawEma(); };
// 遠い場所へは、暗転してそのまま移る（静のひとときの座る場所へ）
async function warpTo([x, z]) {
  const f = document.getElementById("tour-fade"); f.classList.add("on"); await wait(1000);
  const dx = x - me.position.x, dz = z - me.position.z, y = footY(x, z);
  me.position.set(x, y, z); controls.target.set(x, y + 1, z); camera.position.x += dx; camera.position.z += dz; camera.position.y = y + 4.2; controls.update();
  await wait(300); f.classList.remove("on"); await wait(600);
}
// 自分で描いた絵馬：絵馬掛けの下段・上段に交互に（最大6枚）
const myEmaMeshes = [];
function hangEma() {
  const rack = W.emaRack; if (!rack) return;
  for (const m of myEmaMeshes) { rack.remove(m); m.material.map?.dispose(); m.material.dispose(); m.geometry.dispose(); } myEmaMeshes.length = 0;
  store.get("enishi_myema", []).forEach((e, i) => {
    const img = new Image(), t = new THREE.Texture(img); t.colorSpace = THREE.SRGBColorSpace; img.onload = () => (t.needsUpdate = true); img.src = e.url;
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(0.5, 0.42), new THREE.MeshStandardMaterial({ map: t, transparent: true, alphaTest: 0.5, side: THREE.DoubleSide, roughness: 0.8 }));
    mesh.position.set(-1.55 + i * 0.62, i % 2 ? 1.62 : 1.02, 0.07); mesh.rotation.z = ((i * 37) % 7 - 3) * 0.015; rack.add(mesh); myEmaMeshes.push(mesh);
  });
}
hangEma();
const welcome = setupWelcome({ store, enterRoom: (id) => sagyo.enter(id), openZen: () => zen.open(), ready: () => store.get("enishi_profile", 0) && $("#m-profile")?.hidden !== false && !busy && !intro && !cine });
window.__enishi = { welcome, sagyo, chores, zen, mixer, tour, shakyo, social: () => social, kenno: () => kenno, kito, hayashi, leaves, darkL, kit, fireworks, D: () => D, hooks, deedHook, run: (id) => ACTIONS.find((a) => a.id === id)?.run(), isBusy: () => busy, scene, me, walkTo, goPlace, others, env, camera, W, controls, renderer, composer, bloom };
