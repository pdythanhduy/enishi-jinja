// 眺める：カメラがゆっくりと境内の十三か所をめぐる（一か所およそ40秒、場面の間は黒でつなぐ）。
// もう一つは「奥の院の池」：月の池に灯籠が流れていくのを、ただ眺め続ける。画面をタップすると戻る。
import * as THREE from "three";

// 場所ごとのカメラ：見る点からの距離 R・高さ H・向き（見る点から立ち位置の方向を基準にした角度のずれ）
const VIEW = {
  ootorii: { R: 13, H: 4.5, a: 0.5, look: 4 },  sando: { R: 11, H: 3.2, a: -0.35, look: 2 }, pond: { R: 13, H: 5.5, a: 0.9, look: 0.5 },
  romon: { R: 16, H: 5, a: -0.4, look: 5 },     temizu: { R: 8, H: 3.4, a: 0.6, look: 1.5 }, juyosho: { R: 9, H: 3.6, a: -0.5, look: 1.6 },
  shinboku: { R: 11, H: 3.5, a: 0.4, look: 5 }, honden: { R: 24, H: 8, a: 0.25, look: 7 },  enmusubi: { R: 15, H: 5, a: 0.35, look: 3 },
  gokaku: { R: 15, H: 5, a: -0.35, look: 3 },   senbon: { R: 7, H: 2.6, a: 0.3, look: 2 },   okunoin: { R: 15, H: 6, a: -0.3, look: 3 },
  pagoda: { R: 20, H: 7, a: 0.4, look: 9 },
};

export function setupTour(A) {
  const { camera, PLACES, footY } = A;
  const fade = document.createElement("div"); fade.id = "tour-fade"; document.body.appendChild(fade);
  const cap = document.createElement("div"); cap.id = "tour-cap"; cap.hidden = true; document.body.appendChild(cap);
  const exitB = document.createElement("button"); exitB.id = "tour-exit"; exitB.type = "button"; exitB.hidden = true; exitB.textContent = "✕ 眺めるのをやめる"; document.body.appendChild(exitB);
  let mode = null, idx = 0, t0 = 0, shot = null, spawned = [];
  const keys = Object.keys(PLACES);

  function makeShot(k) {
    const p = PLACES[k], v = VIEW[k] || { R: 12, H: 4, a: 0, look: 2 };
    const gy = footY(p.pos[0], p.pos[1]);
    const base = Math.atan2(p.stand[0] - p.pos[0], p.stand[1] - p.pos[1]) || 0;
    const a0 = base + v.a - 0.22, a1 = base + v.a + 0.22, dur = 40;
    return { k, name: p.name, n: p.n, look: new THREE.Vector3(p.pos[0], gy + v.look, p.pos[1]), R: v.R, H: v.H, gy, a0, a1, dur, r0: v.R * 1.08, r1: v.R * 0.94 };
  }
  function place(s, k) {
    const e = 0.5 - Math.cos(Math.min(1, k) * Math.PI) / 2, a = s.a0 + (s.a1 - s.a0) * e, r = s.r0 + (s.r1 - s.r0) * e;
    const x = s.look.x + Math.sin(a) * r, z = s.look.z + Math.cos(a) * r;
    camera.position.set(x, Math.max(s.gy + s.H, footY(x, z) + 1.6), z); camera.lookAt(s.look);
  }
  function caption(s) { cap.innerHTML = `<small>境内めぐり ${s.n} / ${keys.length}</small><b>${s.name}</b>`; cap.classList.remove("on"); void cap.offsetWidth; cap.classList.add("on"); }
  async function cut(next) { fade.classList.add("on"); await new Promise((r) => setTimeout(r, 1100)); next(); fade.classList.remove("on"); }

  function tourTick() {
    if (!shot) return;
    const k = (performance.now() - t0) / 1000 / shot.dur;
    place(shot, k);
    if (k >= 1 && !shot.cutting) { shot.cutting = true; cut(() => { idx = (idx + 1) % keys.length; shot = makeShot(keys[idx]); t0 = performance.now(); caption(shot); place(shot, 0); }); }
  }
  // 奥の院の池：池を見下ろす位置から、ゆっくり呼吸するように揺れる
  function pondTick() {
    const p = A.okPond, k = (performance.now() - t0) / 1000;
    const x = p.x + 2.6 + Math.sin(k * 0.05) * 0.7, z = p.z + 7.2 + Math.cos(k * 0.04) * 0.5;      // 南東から：池・滝・奥の院が一枚に
    camera.position.set(x, p.y + 3.1 + Math.sin(k * 0.07) * 0.15, z); camera.lookAt(p.x - 1.2, p.y + 0.6, p.z - 1.5);
    if (spawned.length < 7 && k > spawned.length * 6) spawned.push(A.floatLamp());     // 灯籠がひとつずつ流れてくる
  }
  function start(m) {
    if (mode) return; mode = m; t0 = performance.now();
    document.body.classList.add("cine", "touring"); exitB.hidden = false;
    if (m === "tour") { idx = Math.max(0, keys.indexOf(A.nearest())); shot = makeShot(keys[idx]); caption(shot); cap.hidden = false; place(shot, 0); A.setCine(tourTick); }
    else { cap.innerHTML = `<small>眺める</small><b>奥の院の池</b>`; cap.hidden = false; cap.classList.add("on"); A.setCine(pondTick); }
    A.toast("画面をタップすると、もとに戻ります", 2600);
    setTimeout(() => addEventListener("pointerdown", stopOnTap), 600);
  }
  function stopOnTap(e) { if (e.target.closest("#chat,#chat-btn,#m-mix,.modal")) return; stop(); }
  function stop() {
    if (!mode) return; mode = null; shot = null;
    removeEventListener("pointerdown", stopOnTap);
    document.body.classList.remove("cine", "touring"); exitB.hidden = true; cap.hidden = true; fade.classList.remove("on");
    for (const l of spawned) A.removeFloatLamp(l); spawned = [];
    A.setCine(null);
  }
  exitB.onclick = (e) => { e.stopPropagation(); stop(); };
  addEventListener("keydown", (e) => { if (e.key === "Escape") stop(); });
  return { start, stop, get on() { return !!mode; } };
}
