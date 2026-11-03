// えにし作業室：みんなで同じ時間に集中する部屋。屋形船「えにし丸」（池に浮かぶ）と、参道わきの書院。
// ポモドーロは部屋で共通：日本時間の毎時 :00 と :30 に始まり、25分集中・5分休憩。休憩に入ると鈴が鳴り、みんなで一礼。
// 部屋にいる人は頭の上に「🛶 屋形船で作業中」「📖 書院で作業中」と出て、正座で並ぶ。集中の5分ごとに徳+5。
import * as THREE from "three";
import { MAT, box, cyl, roof, chochin, kakejiku } from "./arch.js?v=11032132";
import { SHOIN, YAKATA } from "./map.js?v=11032132";

const std = (color, o = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.75, ...o });
const jst = () => new Date(Date.now() + 9 * 3600e3);
export const CHANNELS = [
  { id: "lofi", icon: "🎧", name: "和風 lo-fi" },
  { id: "keidai", icon: "🎵", name: "境内の調べ" },
  { id: "nature", icon: "🌧", name: "雨と川の音" },
];
// いまのポモドーロ：{ focus, left（秒）, block（何本目の通し番号）}
export function pomodoro(d = jst()) {
  const m = (d.getUTCMinutes() % 30) + d.getUTCSeconds() / 60, focus = m < 25;
  return { focus, left: Math.round(((focus ? 25 : 30) - m) * 60), block: Math.floor(d.getTime() / 1800e3) };
}
const fmt = (s) => `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(Math.floor(s % 60)).padStart(2, "0")}`;

// 三毛猫：縁側（書院）と舳先（屋形船）で眠っている。なでると、ごろごろ
function makeCat(scene, x, y, z, ry) {
  const g = new THREE.Group(); g.position.set(x, y, z); g.rotation.y = ry; scene.add(g);
  const w = std(0xf6f1e6, { roughness: 0.95 }), o = std(0xd9822b, { roughness: 0.95 }), k = std(0x2a2420, { roughness: 0.95 });
  const body = new THREE.Mesh(new THREE.SphereGeometry(0.2, 16, 12), w); body.scale.set(1.35, 0.62, 0.95); body.position.y = 0.12; g.add(body);
  const p1 = new THREE.Mesh(new THREE.SphereGeometry(0.11, 10, 8), o); p1.scale.set(1.2, 0.5, 1); p1.position.set(-0.06, 0.2, 0.06); g.add(p1);
  const p2 = new THREE.Mesh(new THREE.SphereGeometry(0.08, 10, 8), k); p2.scale.set(1.2, 0.45, 1); p2.position.set(0.1, 0.19, -0.06); g.add(p2);
  const head = new THREE.Group(); head.position.set(0.26, 0.12, 0.02); g.add(head);
  const hm = new THREE.Mesh(new THREE.SphereGeometry(0.11, 14, 10), w); hm.scale.set(1, 0.85, 1); head.add(hm);
  const hp = new THREE.Mesh(new THREE.SphereGeometry(0.06, 8, 6), o); hp.position.set(-0.02, 0.06, 0.05); hp.scale.set(1, 0.5, 1); head.add(hp);
  for (const s of [-1, 1]) { const e = new THREE.Mesh(new THREE.ConeGeometry(0.035, 0.07, 4), s > 0 ? o : w); e.position.set(0, 0.1, s * 0.055); e.rotation.x = s * 0.25; head.add(e);
    const eye = new THREE.Mesh(new THREE.BoxGeometry(0.004, 0.006, 0.03), k); eye.position.set(0.1, 0.01, s * 0.04); head.add(eye); }
  const tail = new THREE.Group(); tail.position.set(-0.25, 0.08, 0); g.add(tail);
  const tm = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.035, 0.32, 6), o); tm.rotation.z = Math.PI / 2; tm.position.x = -0.12; tail.add(tm);
  g.traverse((m) => m.isMesh && (m.castShadow = true));
  let pet = 0;
  return { group: g, pet: () => (pet = 2.4), tick: (t, dt) => {
    body.scale.y = 0.62 + Math.sin(t * 1.6) * 0.025; tail.rotation.y = Math.sin(t * 0.7) * 0.35 + (pet > 0 ? Math.sin(t * 9) * 0.4 : 0);
    head.rotation.z = pet > 0 ? 0.25 : Math.sin(t * 0.2) * 0.03; if (pet > 0) pet -= dt; } };
}

// ---------------------------------------------------------------- 屋形船「えにし丸」
function buildYakata(scene, env) {
  const g = new THREE.Group(); g.position.set(YAKATA.x, 0, YAKATA.z); scene.add(g);
  const L = YAKATA.len, Wd = YAKATA.wid, D = YAKATA.deck;
  // 船体：上から見て舳先がとがる形
  const sh = new THREE.Shape(); sh.moveTo(-L / 2, -Wd / 2); sh.lineTo(L / 2 - 1.2, -Wd / 2); sh.quadraticCurveTo(L / 2, -Wd / 4, L / 2 + 0.3, 0); sh.quadraticCurveTo(L / 2, Wd / 4, L / 2 - 1.2, Wd / 2); sh.lineTo(-L / 2, Wd / 2); sh.closePath();
  const hull = new THREE.Mesh(new THREE.ExtrudeGeometry(sh, { depth: 0.7, bevelEnabled: true, bevelThickness: 0.06, bevelSize: 0.06, bevelSegments: 2 }), std(0x3a2a20, { roughness: 0.6 }));
  hull.rotation.x = -Math.PI / 2; hull.position.y = D - 0.72; hull.castShadow = true; g.add(hull);
  const rim = new THREE.Mesh(new THREE.ExtrudeGeometry(sh, { depth: 0.08, bevelEnabled: false }), MAT.shu); rim.rotation.x = -Math.PI / 2; rim.position.y = D - 0.05; rim.scale.set(1.01, 1.01, 1); g.add(rim);
  box(g, L - 0.4, 0.06, Wd - 0.3, MAT.woodL, -0.1, D, 0);                                                       // 甲板
  box(g, 6.6, 0.04, Wd - 0.5, MAT.tatami, -0.4, D + 0.04, 0);                                                    // 座敷（畳）
  // 座敷：柱・腰板・障子窓（上は開いていて外が見える）・屋根
  for (const x of [-3.7, -1.25, 1.25, 2.9]) for (const s of [-1, 1]) cyl(g, 0.06, 0.06, 1.95, MAT.woodD, x, D + 1.0, s * (Wd / 2 - 0.22), 8);
  for (const s of [-1, 1]) { box(g, 6.6, 0.45, 0.05, MAT.woodD, -0.4, D + 0.26, s * (Wd / 2 - 0.22)); box(g, 6.6, 0.06, 0.08, MAT.shu, -0.4, D + 0.5, s * (Wd / 2 - 0.22)); }
  box(g, 0.05, 1.95, Wd - 0.44, MAT.shoji, -3.72, D + 1.0, 0);                                                 // 艫（とも）側は障子
  roof(g, { w: 7.6, d: Wd + 0.5, h: 0.75, lift: 0.18, y: D + 1.98, x: -0.4, mat: std(0x2a2a2e, { roughness: 0.6 }), gable: true, ridgeGold: false });
  // 提灯：軒に紅白を交互に
  for (let i = 1; i < 6; i++) for (const s of [-1, 1]) chochin(g, -3.3 + i * 1.3, D + 1.72, s * (Wd / 2 + 0.05), env, 0.5, i % 2 ? 0xfff3d6 : 0xffb8a0);
  // 座卓と座布団（左右に四つずつ、向かい合う）
  box(g, 5.6, 0.06, 0.7, MAT.wood, -0.4, D + 0.34, 0); for (const x of [-2.9, 2.1]) for (const s of [-1, 1]) box(g, 0.06, 0.3, 0.06, MAT.woodD, x, D + 0.18, s * 0.28);
  const zab = std(0x7a2a3a, { roughness: 0.95 });
  for (const s of [-1, 1]) for (const x of [-2.6, -1.2, 0.2, 1.6]) box(g, 0.56, 0.07, 0.56, zab, x, D + 0.08, s * 0.82);
  for (let i = 0; i < 4; i++) { const tc = cyl(g, 0.05, 0.04, 0.08, std(0xe8e2d0), -2.6 + i * 1.4, D + 0.41, (i % 2 ? 1 : -1) * 0.18, 10); tc.castShadow = false; }   // 湯呑み
  // 船名と、艫の竿
  const c = document.createElement("canvas"); c.width = 256; c.height = 64; const x = c.getContext("2d"); x.fillStyle = "#1a1612"; x.fillRect(0, 0, 256, 64); x.fillStyle = "#f3d999";
  x.font = 'bold 40px "Hiragino Mincho ProN","Yu Mincho",serif'; x.textAlign = "center"; x.textBaseline = "middle"; x.fillText("えにし丸", 128, 34);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
  const plate = new THREE.Mesh(new THREE.PlaneGeometry(1.1, 0.28), new THREE.MeshStandardMaterial({ map: t })); plate.position.set(2.95, D + 1.62, 0); plate.rotation.y = Math.PI / 2; g.add(plate);
  const sao = cyl(g, 0.03, 0.03, 3.2, MAT.woodL, -L / 2 + 0.3, D + 1.2, 0.6, 6); sao.rotation.z = 0.5;
  // 桟橋：池の南岸から船へ
  const pier = new THREE.Group(); pier.position.set(YAKATA.x, 0, 0); scene.add(pier); pier.userData.static = true;
  for (let z = YAKATA.z + Wd / 2 + 0.1; z < YAKATA.z + Wd / 2 + 3.4; z += 0.32) box(pier, 1.5, 0.06, 0.28, MAT.woodL, 0, 0.18, z);
  for (const z of [YAKATA.z + Wd / 2 + 0.4, YAKATA.z + Wd / 2 + 2.2]) for (const s of [-1, 1]) cyl(pier, 0.06, 0.06, 0.8, MAT.woodD, s * 0.72, -0.15, z, 6);
  // 揺れ：ほんの少しだけ
  return { group: g, tick: (t2) => { g.rotation.z = Math.sin(t2 * 0.55) * 0.012; g.rotation.x = Math.sin(t2 * 0.37) * 0.008; g.position.y = Math.sin(t2 * 0.8) * 0.018; } };
}

// ---------------------------------------------------------------- 書院（東の参道へ開いた座敷。文机が二列）
function buildShoin(scene, env) {
  const { x0, x1, z0, z1, y: F } = SHOIN, cxm = (x0 + x1) / 2, czm = (z0 + z1) / 2, Wd = x1 - x0, Dp = z1 - z0;
  const g = new THREE.Group(); g.position.set(cxm, 0, czm); scene.add(g); g.userData.static = true;
  box(g, Wd + 0.4, F - 0.06, Dp + 0.4, MAT.stoneD, 0, (F - 0.06) / 2, 0);                                // 基礎
  box(g, Wd, 0.06, Dp, MAT.tatami, 0, F - 0.03, 0);                                                         // 畳
  box(g, 1.1, 0.08, Dp + 0.2, MAT.woodL, Wd / 2 + 0.5, F - 0.12, 0);                                        // 縁側
  for (let i = 0; i < 3; i++) box(g, 0.32, 0.12, 1.6, MAT.stoneL, Wd / 2 + 1.2 + i * 0.3, (F - 0.12) * (1 - i / 3) - 0.04, 0);   // 沓脱ぎ石
  // 柱
  const cols = []; for (let i = 0; i <= 4; i++) cols.push(-Wd / 2 + (Wd * i) / 4);
  for (const xx of cols) for (const zz of [-Dp / 2, Dp / 2]) cyl(g, 0.11, 0.11, 2.9, MAT.woodD, xx, F + 1.45, zz, 10);
  for (const zz of [-Dp / 2 + Dp / 3, Dp / 2 - Dp / 3]) cyl(g, 0.11, 0.11, 2.9, MAT.woodD, Wd / 2, F + 1.45, zz, 10);
  // 奥の壁（床の間と掛け軸）・左右の障子
  box(g, 0.12, 2.9, Dp, MAT.white, -Wd / 2, F + 1.45, 0);
  box(g, 0.9, 2.5, 2.4, std(0xe9e0cc), -Wd / 2 + 0.5, F + 1.25, 0); box(g, 0.95, 0.1, 2.5, MAT.wood, -Wd / 2 + 0.5, F + 0.05, 0);
  kakejiku(g, "一期一会", -Wd / 2 + 0.08, F + 1.55, 0, Math.PI / 2);
  const ik = cyl(g, 0.12, 0.09, 0.3, std(0x3a4a5a), -Wd / 2 + 0.55, F + 0.25, 0.7, 12);                     // 花入れ
  for (let k = 0; k < 3; k++) { const b = new THREE.Mesh(new THREE.SphereGeometry(0.07, 8, 6), std(0xd8402a)); b.position.set(-Wd / 2 + 0.55 + Math.sin(k) * 0.1, F + 0.55 + k * 0.08, 0.7 + Math.cos(k) * 0.1); g.add(b); }
  const shoji = (() => { const c = document.createElement("canvas"); c.width = 128; c.height = 256; const x = c.getContext("2d"); x.fillStyle = "#f6efdc"; x.fillRect(0, 0, 128, 256);
    x.strokeStyle = "#6b4a2a"; x.lineWidth = 4; for (let i = 0; i <= 128; i += 32) { x.beginPath(); x.moveTo(i, 0); x.lineTo(i, 256); x.stroke(); } for (let j = 0; j <= 256; j += 42) { x.beginPath(); x.moveTo(0, j); x.lineTo(128, j); x.stroke(); }
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.wrapS = THREE.RepeatWrapping; t.repeat.set(Wd / 1.2, 1); return new THREE.MeshStandardMaterial({ map: t, emissive: 0xffd9a0, emissiveIntensity: 0.12, side: THREE.DoubleSide }); })();
  for (const s of [-1, 1]) { const p = new THREE.Mesh(new THREE.PlaneGeometry(Wd, 2.6), shoji); p.position.set(0, F + 1.35, s * Dp / 2); g.add(p); }
  box(g, Wd + 0.2, 0.22, 0.16, MAT.woodD, 0, F + 2.85, Dp / 2); box(g, Wd + 0.2, 0.22, 0.16, MAT.woodD, 0, F + 2.85, -Dp / 2); box(g, 0.16, 0.22, Dp, MAT.woodD, Wd / 2, F + 2.85, 0);
  box(g, Wd, 0.05, Dp, std(0xc9b48a), 0, F + 2.92, 0);                                                     // 天井
  roof(g, { w: Wd + 2.4, d: Dp + 2.2, h: 2.0, lift: 0.4, y: F + 2.95, mat: MAT.hinoki, ridgeGold: false });
  // 文机：二列×四人、東（参道）を向いて
  const desk = std(0x3a2418, { roughness: 0.45 }), zab = std(0x2c4a6e, { roughness: 0.95 }), paper = std(0xfbf7ec), ink = std(0x1a1612);
  for (const sx of SHOIN.rows) for (const sz of SHOIN.cols) {
    const lx = sx - cxm, lz = sz - czm;
    box(g, 0.56, 0.07, 0.56, zab, lx, F + 0.04, lz);
    box(g, 0.45, 0.05, 0.95, desk, lx + 0.62, F + 0.36, lz); for (const dz of [-0.4, 0.4]) box(g, 0.4, 0.32, 0.05, desk, lx + 0.62, F + 0.17, lz + dz);
    box(g, 0.24, 0.01, 0.33, paper, lx + 0.6, F + 0.395, lz + 0.12, false); box(g, 0.1, 0.03, 0.16, ink, lx + 0.65, F + 0.4, lz - 0.28, false);
    cyl(g, 0.045, 0.035, 0.08, std(0x6b8a72, { roughness: 0.4 }), lx + 0.72, F + 0.43, lz - 0.38, 10);   // 湯呑み
  }
  // 行灯（夕方から灯る）
  for (const [lx, lz] of [[-Wd / 2 + 1.2, -Dp / 2 + 0.6], [-Wd / 2 + 1.2, Dp / 2 - 0.6], [Wd / 2 - 0.6, -Dp / 2 + 0.6], [Wd / 2 - 0.6, Dp / 2 - 0.6]]) chochin(g, lx, F + 0.45, lz, env, 0.75, 0xfff0d0);
  // 庭：縁側の先に白砂と石
  const sand = new THREE.Mesh(new THREE.PlaneGeometry(1.6, Dp + 0.6), std(0xe6e0d2, { roughness: 1 })); sand.rotation.x = -Math.PI / 2; sand.position.set(Wd / 2 + 1.9, 0.02, 0); g.add(sand);
  for (const [dx, dz, s] of [[2.0, -2.2, 0.35], [1.7, 1.6, 0.28], [2.2, 2.6, 0.2]]) { const r = new THREE.Mesh(new THREE.DodecahedronGeometry(s, 0), std(0x6f6a62, { flatShading: true })); r.position.set(Wd / 2 + dx, s * 0.6, dz); g.add(r); }
  return { group: g };
}

export function setupSagyo(A) {
  const fune = buildYakata(A.scene, A.env), shoin = buildShoin(A.scene, A.env);
  A.W.update.push((t) => fune.tick(t));
  const cats = [makeCat(A.scene, SHOIN.x1 + 0.6, SHOIN.y - 0.06, (SHOIN.z0 + SHOIN.z1) / 2 + 2.2, 0.6), makeCat(A.scene, YAKATA.x + 3.2, YAKATA.deck + 0.03, YAKATA.z - 0.3, Math.PI)];
  // 湯気：書院の湯呑みからゆらゆら
  const SN = 70, sg = new THREE.BufferGeometry(), sp = new Float32Array(SN * 3), seeds = [];
  const cups = SHOIN.rows.flatMap((x) => SHOIN.cols.map((z) => [x + 0.72, SHOIN.y + 0.48, z - 0.38]));
  for (let i = 0; i < SN; i++) { const c = cups[i % cups.length]; seeds.push({ c, ph: Math.random() * 3 }); }
  sg.setAttribute("position", new THREE.BufferAttribute(sp, 3));
  const steam = new THREE.Points(sg, new THREE.PointsMaterial({ color: 0xffffff, size: 0.05, transparent: true, opacity: 0.35, depthWrite: false }));
  steam.frustumCulled = false; A.scene.add(steam);
  A.W.update.push((t, dt) => {
    for (const c of cats) c.tick(t, dt);
    for (let i = 0; i < SN; i++) { const s = seeds[i], k = ((t * 0.25 + s.ph) % 1); sp[i * 3] = s.c[0] + Math.sin(t * 1.3 + s.ph * 5) * 0.03 * k; sp[i * 3 + 1] = s.c[1] + k * 0.35; sp[i * 3 + 2] = s.c[2] + Math.cos(t + s.ph) * 0.02; }
    sg.attributes.position.needsUpdate = true;
    if (cur) life(t);
  });
  // 部屋の中のしぐさ：集中は筆を走らせ、ときどき頁をめくる。休憩はお茶をひと口
  function life(t) {
    const p = pomodoro(), list = [A.me, ...inRoom(cur.room).map((o) => o.av)];
    list.forEach((av, i) => { const u = av.userData; if (u.pose !== "seiza" || !u.arms) return; const ph = t + i * 1.7;
      if (p.focus) { const write = Math.sin(ph * 0.35) > -0.2; u.arms[1].rotation.x = write ? -0.95 + Math.sin(ph * 7) * 0.08 : -0.5; u.arms[1].rotation.z = write ? -0.05 + Math.sin(ph * 5) * 0.06 : -0.15;
        u.arms[0].rotation.x = Math.sin(ph * 0.11) > 0.93 ? -1.2 : -0.6; u.body.rotation.x = 0.12; }
      else { const sip = Math.sin(ph * 0.5) > 0.6; u.arms[1].rotation.x = sip ? -2.0 : -0.5; u.arms[0].rotation.x = -0.5; u.body.rotation.x = sip ? -0.08 : 0; } });
  }
  const tmp = new THREE.Vector3();
  const ROOMS = {
    fune: { name: "屋形船 えにし丸", icon: "🛶", st: "🛶 屋形船で作業中", entry: [YAKATA.x, YAKATA.z + YAKATA.wid / 2 + 4.0],
      seats: [-1, 1].flatMap((s) => [1.6, 0.2, -1.2, -2.6].map((x) => [YAKATA.x + x, YAKATA.z + s * 0.82, s > 0 ? Math.PI : 0])),
      cam: (k) => { tmp.set(YAKATA.x - 3.5, YAKATA.deck + 1.85 + Math.sin(k * 0.25) * 0.03, YAKATA.z + Math.sin(k * 0.05) * 0.25); return [tmp, new THREE.Vector3(YAKATA.x + 4.5, YAKATA.deck + 0.4, YAKATA.z)]; } },
    shoin: { name: "書院", icon: "📖", st: "📖 書院で作業中", entry: [-6.4, (SHOIN.z0 + SHOIN.z1) / 2],
      seats: SHOIN.rows.flatMap((x) => SHOIN.cols.map((z) => [x, z, Math.PI / 2])).reverse(),
      cam: (k) => { const cz = (SHOIN.z0 + SHOIN.z1) / 2; tmp.set(SHOIN.x0 + 1.2, SHOIN.y + 2.05, cz + Math.sin(k * 0.05) * 0.5); return [tmp, new THREE.Vector3(-4, 1.0, cz)]; } },
  };
  const others = () => [...A.others.values()];
  const look = { yaw: 0, pitch: 0 }; let drag = null;
  const cv = document.getElementById("c"), ray = new THREE.Raycaster(), ndc = new THREE.Vector2();
  cv.addEventListener("pointerdown", (e) => { if (!cur) return; drag = { x: e.clientX, y: e.clientY, x0: e.clientX, y0: e.clientY }; });
  cv.addEventListener("pointermove", (e) => { if (!cur || !drag) return; look.yaw = Math.max(-1.25, Math.min(1.25, look.yaw - (e.clientX - drag.x) * 0.006)); look.pitch = Math.max(-0.45, Math.min(0.35, look.pitch + (e.clientY - drag.y) * 0.004)); drag.x = e.clientX; drag.y = e.clientY; });
  cv.addEventListener("pointerup", (e) => {
    if (!cur || !drag) return; const moved = Math.hypot(e.clientX - drag.x0, e.clientY - drag.y0); drag = null; if (moved > 8) return;
    ndc.set((e.clientX / innerWidth) * 2 - 1, -(e.clientY / innerHeight) * 2 + 1); ray.setFromCamera(ndc, A.camera);
    for (const c of cats) if (ray.intersectObject(c.group, true).length) { c.pet(); A.purr(); A.toast("🐈 ごろごろ…（猫がうれしそう）", 2200); return; }
  });
  const inRoom = (r) => others().filter((o) => o.st === r.st);
  function freeSeat(r) { return r.seats.find(([x, z]) => !others().some((o) => Math.hypot(o.av.position.x - x, o.av.position.z - z) < 0.45)); }

  // ---------------------------------------------------------------- 画面：部屋のタイマー
  const hud = document.createElement("div"); hud.id = "room-hud"; hud.hidden = true;
  hud.innerHTML = `<div class="rh-row"><b class="rh-name"></b><span class="rh-ppl"></span></div>
    <div class="rh-row rh-main"><svg viewBox="0 0 44 44"><circle cx="22" cy="22" r="19" class="fr-bg"/><circle cx="22" cy="22" r="19" class="fr-fg"/></svg>
      <div class="rh-t"><small class="rh-ph"></small><b class="rh-left"></b></div><div class="rh-me"><small>今日</small><b class="rh-today"></b></div></div>
    <div class="rh-row rh-ch">${CHANNELS.map((c) => `<button type="button" data-ch="${c.id}">${c.icon} ${c.name}</button>`).join("")}</div>
    <div class="rh-row rh-btns"><button type="button" class="rh-n" title="ほかの画面を見ていても、集中と休憩の切りかわりを知らせます">🔔 通知</button><button type="button" class="rh-q" title="画面を静かに">🌙 静かに</button><button type="button" class="rh-x">退室する</button></div>`;
  document.body.appendChild(hud);
  const C = 2 * Math.PI * 19;
  let cur = null;
  const stats = () => { const s = A.store.get("enishi_pomo", { day: "", n: 0, min: 0, total: 0 }); if (s.day !== A.today()) { s.day = A.today(); s.n = 0; s.min = 0; } return s; };
  function paint() {
    if (!cur) return;
    const p = pomodoro(), r = cur.room, n = inRoom(r).length + 1;
    hud.querySelector(".rh-name").textContent = `${r.icon} ${r.name}`;
    hud.querySelector(".rh-ppl").textContent = `👥 ${n}人で作業中`;
    hud.querySelector(".rh-ph").textContent = p.focus ? "集中" : "休憩";
    hud.querySelector(".rh-left").textContent = fmt(p.left);
    hud.classList.toggle("brk", !p.focus);
    const span = p.focus ? 1500 : 300; hud.querySelector(".fr-fg").style.strokeDashoffset = String(C * (p.left / span));
    const s = stats(); hud.querySelector(".rh-today").textContent = `${s.n}🍅 ${s.min}分`;
    hud.querySelectorAll("[data-ch]").forEach((b) => b.classList.toggle("on", b.dataset.ch === cur.ch));
    document.title = `${p.focus ? "🍅" : "🍵"} ${fmt(p.left)} ${p.focus ? "集中" : "休憩"}｜えにし神社`;
  }
  const paintN = () => { const on = "Notification" in window && Notification.permission === "granted", b = hud.querySelector(".rh-n"); b.textContent = on ? "🔔 通知オン" : "🔔 通知"; b.classList.toggle("on", on); };
  function setChannel(ch) {
    if (!cur) return; const prev = cur.ch; cur.ch = ch; A.store.set("enishi_room_ch", ch);
    A.ensureMusic(); A.bgm.setChannel(ch === "keidai" ? null : ch);
    if (ch === "nature" && !cur.snapped) { A.mixer.snap(); cur.snapped = true; A.mixer.preset("雨と川", true); }   // 部屋の中だけの音
    else if (ch !== "nature" && cur.snapped) { A.mixer.restore(); cur.snapped = false; }
    paint();
  }
  hud.addEventListener("click", (e) => {
    if (e.target.closest(".rh-row:first-child,.rh-main")) { hud.classList.toggle("mini"); return; }
    const b = e.target.closest("[data-ch]"); if (b) setChannel(b.dataset.ch);
    if (e.target.closest(".rh-q")) document.body.classList.toggle("focus-quiet");
    if (e.target.closest(".rh-n")) A.askNotify().then(paintN);
    if (e.target.closest(".rh-x")) leave();
  });

  // 1秒ごと：時間、切りかわり（集中→休憩で一礼）、徳
  function tick() {
    if (!cur) return;
    const p = pomodoro(), now = Date.now();
    if (p.focus) { cur.focusMs += now - cur.last; while (cur.focusMs >= 300e3) { cur.focusMs -= 300e3; A.addToku(5); const s = stats(); s.min += 5; s.total += 5; A.store.set("enishi_pomo", s); A.soft(); } }
    cur.last = now;
    if (cur.phase !== null && cur.phase !== p.focus) {
      if (!p.focus) {                                                                                 // 休憩へ：鈴と一礼、のび
        A.gong(); const s = stats(); if (cur.blockMs >= 15 * 60e3) { s.n += 1; A.store.set("enishi_pomo", s); A.deedHook("pomodoro", { n: s.n }); }
        A.notify("🍵 休憩の時間です", "25分おつかれさまでした。5分、のびをしてお茶を一口。"); bowAll(); A.toast(`🍵 おつかれさまでした。5分休憩です。のびをして、お茶を一口。${inRoom(cur.room).length ? "チャットでひとこと話してもいいですね。" : ""}`, 6500);
      } else { A.suzu(); A.notify("🔔 集中の時間です", "えにし作業室で、みんなと25分。"); A.toast("🔔 集中の時間です。今日も、ここから。", 3500); }
      cur.blockMs = 0;
    }
    if (p.focus) cur.blockMs += 1000;
    cur.phase = p.focus; paint();
  }
  async function bowAll() {
    const list = [A.me, ...inRoom(cur.room).map((o) => o.av)];
    await Promise.all(list.map((av) => A.bowTo(av, 0.9, 700))); await new Promise((r) => setTimeout(r, 500)); await Promise.all(list.map((av) => A.bowTo(av, 0, 600)));
    const u = A.me.userData; u.arms.forEach((a) => (a.rotation.x = -2.6)); setTimeout(() => { if (cur) u.arms.forEach((a, i) => { a.rotation.x = -0.5; a.rotation.z = (i ? -1 : 1) * 0.15; }); }, 1600);   // のび
  }
  function enter(id) {
    const r = ROOMS[id]; if (!r) return;
    if (A.isBusy()) { A.toast("いまの所作が終わってからどうぞ"); return; }
    const seat = freeSeat(r); if (!seat) { A.toast(`${r.name}は満席です。少しあとでどうぞ`); return; }
    A.doing(async () => {
      await A.warpTo([seat[0], seat[1]]); A.me.rotation.y = seat[2]; A.setPose(A.me, "seiza");
      const p = pomodoro();
      cur = { room: r, seat, prev: A.getStatus(), phase: null, last: Date.now(), focusMs: 0, blockMs: 0, ch: A.store.get("enishi_room_ch", "lofi"), iv: setInterval(tick, 1000), t0: performance.now() };
      A.setStatus(r.st);
      look.yaw = 0; look.pitch = 0;
      A.setCine(() => { const k = (performance.now() - cur.t0) / 1000, [pos, at] = r.cam(k); A.camera.position.copy(pos);
        const v = at.clone().sub(pos); v.applyAxisAngle(new THREE.Vector3(0, 1, 0), look.yaw); v.y += v.length() * look.pitch; A.camera.lookAt(pos.clone().add(v)); });
      document.body.classList.add("in-room"); hud.classList.toggle("mini", innerWidth < 560);
      hud.hidden = false; setChannel(cur.ch); paintN(); tick(); live.hidden = true;
      A.toast(`${r.icon} ${r.name}へようこそ。${p.focus ? `いまは集中の時間（あと${Math.ceil(p.left / 60)}分）。` : `いまは休憩（あと${Math.ceil(p.left / 60)}分）。`}毎時 :00 と :30 に、みんなで集中を始めます`, 7000);
      await new Promise((res) => (cur.done = res));
    });
  }
  function leave() {
    if (!cur) return;
    const c = cur; cur = null; clearInterval(c.iv);
    hud.hidden = true; document.body.classList.remove("focus-quiet", "in-room"); document.title = A.title;
    A.bgm.setChannel(null); if (c.snapped) A.mixer.restore(); A.setStatus(c.prev || ""); A.setCine(null); A.setPose(A.me, null);
    A.warpTo(c.room.entry);
    const s = stats(); A.toast(`おつかれさまでした。今日は ${s.n}ポモドーロ・${s.min}分 集中しました 🍅`, 5000);
    c.done?.();
  }
  const live = document.createElement("button"); live.id = "room-live"; live.type = "button"; live.hidden = true; document.body.appendChild(live);
  let liveRoom = null;
  setInterval(() => {
    if (cur || A.isBusy()) { live.hidden = true; return; }
    let best = null, n = 0; for (const [id, r] of Object.entries(ROOMS)) { const k = inRoom(r).length; if (k > n) { n = k; best = id; } }
    liveRoom = best; live.hidden = !best;
    if (best) { const r = ROOMS[best], p = pomodoro(); live.innerHTML = `${r.icon} ${r.name}で <b>${n}人</b> が作業中 <small>${p.focus ? `集中 あと${Math.ceil(p.left / 60)}分` : "いまは休憩"}</small>`; }
  }, 3000);
  live.onclick = () => liveRoom && enter(liveRoom);
  return { enter, leave, ROOMS, get active() { return !!cur; } };
}
