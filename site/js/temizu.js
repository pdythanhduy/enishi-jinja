// 手水舎：龍の口から水が流れつづける水盤、柄杓の掛け台、作法の立て札。
// 手水の所作は、肩越しのカメラで柄杓を持ち、汲んで、注ぐところまで見せる。
import * as THREE from "three";
import { waterMaterial } from "./water.js?v=11031916";
import { MAT, box, cyl, roof, chochin } from "./arch.js?v=11031916";

const std = (color, o = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.7, ...o });
const BRONZE = std(0x5a7458, { metalness: 0.65, roughness: 0.38 });
const GOLD = std(0xe3b54a, { metalness: 0.9, roughness: 0.25 });

export function makeLadle() {
  const g = new THREE.Group();
  const cup = new THREE.Mesh(new THREE.CylinderGeometry(0.075, 0.068, 0.1, 18, 1, true), std(0xe2c99a, { side: THREE.DoubleSide, roughness: 0.6 }));
  cup.position.set(0, 0, 0.56); g.add(cup);
  const bot = new THREE.Mesh(new THREE.CircleGeometry(0.068, 18), std(0xd8bd8c)); bot.rotation.x = -Math.PI / 2; bot.position.set(0, -0.05, 0.56); g.add(bot);
  const water = new THREE.Mesh(new THREE.CircleGeometry(0.066, 18), new THREE.MeshStandardMaterial({ color: 0x9fd4ff, transparent: true, opacity: 0.75, roughness: 0.05, metalness: 0.3 }));
  water.rotation.x = -Math.PI / 2; water.position.set(0, 0.02, 0.56); water.visible = false; g.add(water);
  const handle = new THREE.Mesh(new THREE.BoxGeometry(0.018, 0.014, 0.58), std(0xd9c08e)); handle.position.set(0, 0.03, 0.27); g.add(handle);
  g.userData.water = water; g.userData.cupLocal = new THREE.Vector3(0, 0, 0.56);
  g.traverse((o) => o.isMesh && (o.castShadow = true));
  return g;
}

export function buildTemizuya(scene, env, [x, z]) {
  const g = new THREE.Group(); g.position.set(x, 0, z); scene.add(g); g.userData.static = true;
  const live = new THREE.Group(); live.position.set(x, 0, z); scene.add(live);      // 動くもの（水の流れ・波紋）
  // 屋根と柱・石の基壇
  box(g, 4.4, 0.18, 3.4, MAT.stoneD, 0, 0.09, 0);
  for (const [xx, zz] of [[-1.6, -1.1], [1.6, -1.1], [-1.6, 1.1], [1.6, 1.1]]) { cyl(g, 0.15, 0.17, 3, MAT.woodD, xx, 1.6, zz, 12); cyl(g, 0.22, 0.24, 0.2, MAT.stone, xx, 0.28, zz, 10); }
  for (const zz of [-1.1, 1.1]) box(g, 3.6, 0.16, 0.16, MAT.woodD, 0, 3.05, zz);
  roof(g, { w: 4.8, d: 3.8, h: 1.35, lift: 0.32, y: 3.12, mat: MAT.copper, ridgeGold: false });
  // 扁額「手水舎」
  const cv = document.createElement("canvas"); cv.width = 256; cv.height = 96; const c = cv.getContext("2d");
  c.fillStyle = "#2a1d14"; c.fillRect(0, 0, 256, 96); c.strokeStyle = "#e3b54a"; c.lineWidth = 5; c.strokeRect(5, 5, 246, 86);
  c.fillStyle = "#f3d999"; c.font = `bold 52px "Hiragino Mincho ProN","Yu Mincho","Noto Serif JP",serif`; c.textAlign = "center"; c.textBaseline = "middle"; c.fillText("手 水 舎", 128, 50);
  const tp = new THREE.CanvasTexture(cv); tp.colorSpace = THREE.SRGBColorSpace;
  const plaque = new THREE.Mesh(new THREE.PlaneGeometry(0.95, 0.36), new THREE.MeshStandardMaterial({ map: tp })); plaque.position.set(0, 2.8, -1.2); plaque.rotation.y = Math.PI; g.add(plaque);
  // 水盤：縁のある石、少し低い水面
  box(g, 2.7, 0.62, 1.4, MAT.stoneL, 0, 0.49, 0);
  for (const s of [-1, 1]) { box(g, 2.82, 0.12, 0.12, MAT.stone, 0, 0.84, s * 0.66); box(g, 0.12, 0.12, 1.4, MAT.stone, s * 1.35, 0.84, 0); }
  const water = new THREE.Mesh(new THREE.PlaneGeometry(2.56, 1.2), waterMaterial({ rx: 1.28, rz: 0.6, foam: 0, minAlpha: 0.45, scale: 0.6 })); water.rotation.x = -Math.PI / 2; water.position.set(0, 0.83, 0); g.add(water);
  // 龍：岩の上から水を吐く（青銅）
  const rock = new THREE.Mesh(new THREE.IcosahedronGeometry(0.34, 0), std(0x6f6a62, { flatShading: true, roughness: 0.95 })); rock.scale.set(1.2, 0.8, 1); rock.position.set(-1.12, 0.98, 0.34); rock.castShadow = true; g.add(rock);
  const dr = new THREE.Group(); dr.position.set(-1.05, 1.12, 0.34); dr.rotation.y = 0.15; g.add(dr);
  const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.12, 0.42, 10), BRONZE); neck.position.set(0, 0.12, 0); neck.rotation.z = -0.5; dr.add(neck);
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.12, 14, 10), BRONZE); head.scale.set(1.5, 0.85, 0.9); head.position.set(0.18, 0.3, 0); dr.add(head);
  const jawU = new THREE.Mesh(new THREE.ConeGeometry(0.07, 0.22, 8), BRONZE); jawU.rotation.z = -Math.PI / 2 - 0.15; jawU.position.set(0.35, 0.33, 0); dr.add(jawU);
  const jawL = new THREE.Mesh(new THREE.ConeGeometry(0.05, 0.18, 8), BRONZE); jawL.rotation.z = -Math.PI / 2 + 0.35; jawL.position.set(0.32, 0.24, 0); dr.add(jawL);
  for (const s of [-1, 1]) {
    const horn = new THREE.Mesh(new THREE.ConeGeometry(0.02, 0.22, 6), GOLD); horn.position.set(0.08, 0.45, s * 0.06); horn.rotation.set(s * 0.3, 0, 0.6); dr.add(horn);
    const eye = new THREE.Mesh(new THREE.SphereGeometry(0.022, 8, 6), GOLD); eye.position.set(0.24, 0.35, s * 0.075); dr.add(eye);
    const wh = new THREE.Mesh(new THREE.CylinderGeometry(0.004, 0.004, 0.32, 4), GOLD); wh.position.set(0.38, 0.27, s * 0.06); wh.rotation.z = -1.3; wh.rotation.x = s * 0.4; dr.add(wh);
  }
  dr.traverse((o) => o.isMesh && (o.castShadow = true));
  // 流れる水（縞の透けた筒を流す）
  const mouth = new THREE.Vector3(-0.6, 1.4, 0.36), fall = new THREE.Vector3(-0.38, 0.84, 0.34);
  const curve = new THREE.QuadraticBezierCurve3(mouth, new THREE.Vector3(-0.45, 1.36, 0.35), fall);
  const sc = document.createElement("canvas"); sc.width = 32; sc.height = 128; const sx = sc.getContext("2d");
  for (let i = 0; i < 40; i++) { sx.fillStyle = `rgba(255,255,255,${0.25 + Math.random() * 0.6})`; sx.fillRect(Math.random() * 32, Math.random() * 128, 2 + Math.random() * 3, 10 + Math.random() * 30); }
  const st = new THREE.CanvasTexture(sc); st.wrapS = st.wrapT = THREE.RepeatWrapping; st.repeat.set(1, 2);
  const streamM = new THREE.MeshStandardMaterial({ color: 0xcfeeff, map: st, alphaMap: st, transparent: true, opacity: 0.85, roughness: 0.05, metalness: 0.2, emissive: 0x335566, emissiveIntensity: 0.4, depthWrite: false });
  const stream = new THREE.Mesh(new THREE.TubeGeometry(curve, 16, 0.022, 8, false), streamM); live.add(stream);
  // 波紋
  const ripples = [0, 1, 2].map((i) => { const r = new THREE.Mesh(new THREE.RingGeometry(0.05, 0.075, 28), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.5, depthWrite: false }));
    r.rotation.x = -Math.PI / 2; r.position.set(fall.x, 0.845, fall.z); r.userData.ph = i / 3; live.add(r); return r; });
  // 柄杓の掛け台（参拝者の側）と柄杓
  for (const yy of [0.95, 0.88]) { const b = cyl(g, 0.022, 0.022, 2.3, std(0x7c9a52, { roughness: 0.5 }), 0, yy, -0.78, 8); b.rotation.z = Math.PI / 2; }
  for (const xx of [-1.1, 1.1]) cyl(g, 0.03, 0.03, 0.2, MAT.woodD, xx, 0.86, -0.78, 6);
  const ladles = [];
  for (let i = 0; i < 5; i++) { const l = makeLadle(); l.position.set(-0.8 + i * 0.4, 0.98, -0.95); l.rotation.set(-0.35, 0, 0); l.scale.setScalar(0.9); live.add(l); ladles.push(l); }
  // 立て札「手水の作法」
  const sg = document.createElement("canvas"); sg.width = 300; sg.height = 520; const s2 = sg.getContext("2d");
  s2.fillStyle = "#e9dcc0"; s2.fillRect(0, 0, 300, 520); s2.strokeStyle = "#5a3a22"; s2.lineWidth = 10; s2.strokeRect(5, 5, 290, 510);
  s2.fillStyle = "#2b2016"; s2.textAlign = "center"; s2.font = `bold 40px "Hiragino Mincho ProN","Yu Mincho",serif`; s2.fillText("手水の作法", 150, 66);
  s2.font = `24px "Hiragino Mincho ProN","Yu Mincho",serif`; s2.textAlign = "left";
  ["一、右手で柄杓を持ち", "　　左手を清める", "二、左手に持ちかえ", "　　右手を清める", "三、左の手のひらに", "　　水を受け口をすすぐ", "四、柄杓を立てて", "　　柄を清める"].forEach((t, i) => s2.fillText(t, 30, 130 + i * 44));
  s2.fillStyle = "#8a2a1c"; s2.fillText("※ 柄杓に直接口をつけない", 30, 488);
  const sgt = new THREE.CanvasTexture(sg); sgt.colorSpace = THREE.SRGBColorSpace;
  const board = new THREE.Mesh(new THREE.PlaneGeometry(0.75, 1.3), new THREE.MeshStandardMaterial({ map: sgt, roughness: 0.85 })); board.position.set(2.15, 1.25, -1.5); board.rotation.y = Math.PI - 0.35; g.add(board);
  const post = cyl(g, 0.05, 0.05, 1.9, MAT.woodD, 2.15, 0.95, -1.47, 6); post.castShadow = true;
  box(g, 0.85, 0.06, 0.1, MAT.woodD, 2.15, 1.94, -1.47);
  chochin(g, 0, 2.55, -1.25, env, 0.55);
  // 毎フレーム：水の流れと波紋
  const tick = (t) => { st.offset.y = -t * 1.6; ripples.forEach((r) => { const k = (t * 0.9 + r.userData.ph) % 1; r.scale.setScalar(1 + k * 4); r.material.opacity = 0.5 * (1 - k); }); };
  const local = (v) => g.localToWorld(v.clone());
  return { group: g, live, ladles, tick, local, center: [x, z] };
}

// 手水の所作（A：app から渡される道具）
export async function runTemizu(A, TZ) {
  const { me } = A, u = me.userData;
  await A.walk(A.stand); me.rotation.y = 0; u.pose = "act";
  // 肩越しのカメラ
  TZ.group.updateMatrixWorld(true);
  const camPos = TZ.local(new THREE.Vector3(-1.25, 2.15, -3.25)), look = TZ.local(new THREE.Vector3(0.15, 0.75, -1.1));   // 左肩の後ろ・少し上から手元を
  const from = A.camera.position.clone(), t0 = performance.now();
  A.setCine(() => { const k = Math.min(1, (performance.now() - t0) / 1400), e = 0.5 - Math.cos(k * Math.PI) / 2; A.camera.position.lerpVectors(from, camPos, e); A.camera.lookAt(look); });
  // 柄杓を取る
  const rack = TZ.ladles[2]; rack.visible = false;
  const ladle = makeLadle(); ladle.scale.setScalar(1 / 0.8);
  const R = u.arms[0], L = u.arms[1];
  const hold = (arm) => { arm.add(ladle); ladle.position.set(0, -0.5, 0.05); ladle.rotation.set(0, 0, 0); };
  const cupWorld = () => ladle.localToWorld(ladle.userData.cupLocal.clone());
  const pour = async (target) => {
    ladle.userData.water.visible = false;
    for (let i = 0; i < 16; i++) { const p = cupWorld(); A.drip(p, target); if (i % 5 === 0) A.noise(0.5, 1300 + Math.random() * 500, 0.1, "bandpass"); await A.wait(55); }
  };
  const scoop = async (arm) => { arm.rotation.x = -0.75; await A.wait(380); A.tone([[180, 0.6], [240, 0.3]], 0.35, 0.08); ladle.userData.water.visible = true; arm.rotation.x = -1.25; await A.wait(320); };
  const steps = [
    ["左手を清める", "右手で柄杓を持ち、水を汲んで左手にかけます", async () => { hold(R); await scoop(R); L.rotation.x = -1.0; await pour(L); L.rotation.x = 0; }],
    ["右手を清める", "柄杓を左手に持ちかえて、右手にかけます", async () => { hold(L); await scoop(L); R.rotation.x = -1.0; await pour(R); R.rotation.x = 0; }],
    ["口をすすぐ", "左の手のひらに水を受け、口をすすぎます", async () => { hold(R); await scoop(R); L.rotation.x = -1.1; await pour(L); L.rotation.x = -1.9; u.body.rotation.x = 0.25; await A.wait(700); A.noise(0.3, 900, 0.06); u.body.rotation.x = 0; L.rotation.x = 0; }],
    ["柄杓を清める", "柄杓を立て、残りの水で柄を流します", async () => { ladle.userData.water.visible = true; R.rotation.x = -1.1; ladle.rotation.x = -1.3; await A.wait(300); await pour(L); ladle.rotation.x = 0; R.rotation.x = 0; }],
  ];
  let ok = true;
  try {
    for (const [t, sub, act] of steps) { A.stepText(t); ok = await A.holdStep(t, sub); if (!ok) break; await act(); await A.wait(250); }
  } finally {
    ladle.parent?.remove(ladle); rack.visible = true; u.arms.forEach((a, i) => { a.rotation.set(0, 0, (i ? -1 : 1) * 0.25); }); u.body.rotation.x = 0;
    A.setCine(null);
  }
  return ok;
}

// 手水舎のそばでは、水の音が聞こえる
export function waterSound(A, TZ) {
  let src = null, gain = null;
  return (me) => {
    if (!A.audioReady() || A.muted()) { if (gain) gain.gain.value = 0; return; }
    const a = A.ac();
    if (!src) {
      const len = a.sampleRate * 2, b = a.createBuffer(1, len, a.sampleRate), d = b.getChannelData(0);
      for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (0.6 + 0.4 * Math.sin(i / 900) * Math.sin(i / 2300));
      src = a.createBufferSource(); src.buffer = b; src.loop = true;
      const bp = a.createBiquadFilter(); bp.type = "bandpass"; bp.frequency.value = 1700; bp.Q.value = 0.7;
      const lp = a.createBiquadFilter(); lp.type = "lowpass"; lp.frequency.value = 3800;
      gain = a.createGain(); gain.gain.value = 0; src.connect(bp).connect(lp).connect(gain).connect(a.fxBus || a.destination); src.start();
    }
    const d = Math.hypot(me.position.x - TZ.center[0], me.position.z - TZ.center[1]);
    gain.gain.setTargetAtTime(Math.max(0, 1 - d / 9) * 0.09, a.currentTime, 0.3);
  };
}
