// 境内を広げる：縁結びの社（西・桜）、合格の社（東・梅・撫で牛）、社殿の内部（座布団）、落ち葉・消えた灯籠（善行）
import * as THREE from "three";

const std = (color, extra = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.8, ...extra });
const M = {
  shu: std(0xd9412b, { roughness: 0.55 }), kuro: std(0x1d1b1a), wood: std(0x6b4428), woodL: std(0x9a6a3e), tatami: std(0xb9b27a, { roughness: 0.95 }),
  roof: std(0x2f3d33, { roughness: 0.6 }), roofP: std(0x5a3a4a, { roughness: 0.6 }), roofB: std(0x2c3a52, { roughness: 0.6 }),
  stone: std(0x8e8a82, { roughness: 0.95 }), stoneD: std(0x6f6b64, { roughness: 0.95 }), gravel: std(0x8f8676, { roughness: 1 }),
  white: std(0xf4f1ea), gold: std(0xd9b45a, { metalness: 0.8, roughness: 0.3 }), mirror: std(0xe8eef5, { metalness: 1, roughness: 0.08 }),
  zab: std(0x8b2c3a), zabB: std(0x2c4a7a), sakaki: std(0x2f5a2e), bronze: std(0x5b4a32, { metalness: 0.6, roughness: 0.5 }),
  leaf: std(0xc8471f, { roughness: 1, flatShading: true }), leafY: std(0xd98a2b, { roughness: 1, flatShading: true }),
};
const mk = (geo, m, x, y, z, parent, shadow = true) => { const o = new THREE.Mesh(geo, m); o.position.set(x, y, z); if (shadow) o.castShadow = o.receiveShadow = true; parent.add(o); return o; };
const rnd = (a, b) => a + Math.random() * (b - a);

export const HALL_POS = { tosen: [0, -16], enmusubi: [-32, -17], gokaku: [32, -17] };
const FLOOR = 0.35;
export const interiors = [];          // {id, x0,x1,z0,z1, cushions:[[x,z]], altar:[x,z]}

// ------------------------------------------------------------------ 社殿（中に入れる）
function hall(scene, id, cx, cz, roofM, zabM) {
  const g = new THREE.Group(); g.position.set(cx, 0, cz); scene.add(g);
  const W = 8, D = 7;
  mk(new THREE.BoxGeometry(W + 1, FLOOR, D + 0.6), M.stoneD, 0, FLOOR / 2, 0, g);                         // 基壇
  mk(new THREE.BoxGeometry(W, 0.05, D), M.tatami, 0, FLOOR + 0.02, 0, g);                                 // 畳
  for (let i = 0; i < 2; i++) mk(new THREE.BoxGeometry(3, 0.16, 0.45), M.stone, 0, 0.08 + i * 0.16, D / 2 + 0.75 - i * 0.4, g); // 石段
  for (const x of [-W / 2, -1.3, 1.3, W / 2]) for (const z of [-D / 2, D / 2]) mk(new THREE.CylinderGeometry(0.16, 0.16, 3.2, 12), M.shu, x, FLOOR + 1.6, z, g);
  mk(new THREE.BoxGeometry(W, 3.0, 0.15), M.woodL, 0, FLOOR + 1.5, -D / 2 + 0.05, g);                     // 奥の壁
  for (const s of [-1, 1]) mk(new THREE.BoxGeometry(0.15, 3.0, D), M.woodL, s * (W / 2 - 0.05), FLOOR + 1.5, 0, g); // 側壁
  for (const x of [-2.6, 0, 2.6]) mk(new THREE.BoxGeometry(2.2, 2.2, 0.05), M.white, x, FLOOR + 1.6, -D / 2 + 0.15, g, false); // 障子
  mk(new THREE.BoxGeometry(W + 0.4, 0.26, D + 0.4), M.shu, 0, FLOOR + 3.25, 0, g);
  for (const s of [-1, 1]) { const r = mk(new THREE.BoxGeometry(W + 2.6, 0.24, D / 2 + 1.6), roofM, 0, FLOOR + 4.15, s * (D / 4 + 0.55), g); r.rotation.x = s * 0.48; }
  mk(new THREE.BoxGeometry(W + 2.7, 0.26, 0.35), M.kuro, 0, FLOOR + 5.0, 0, g);
  // 祭壇：神鏡・榊・灯明
  mk(new THREE.BoxGeometry(2.6, 0.8, 0.8), M.wood, 0, FLOOR + 0.4, -D / 2 + 0.75, g);
  const mir = mk(new THREE.CylinderGeometry(0.42, 0.42, 0.06, 32), M.mirror, 0, FLOOR + 1.35, -D / 2 + 0.75, g); mir.rotation.x = Math.PI / 2;
  mk(new THREE.BoxGeometry(0.5, 0.5, 0.2), M.gold, 0, FLOOR + 0.9, -D / 2 + 0.75, g);
  for (const s of [-1, 1]) {
    mk(new THREE.CylinderGeometry(0.06, 0.08, 0.5, 8), M.white, s * 1.0, FLOOR + 1.05, -D / 2 + 0.75, g);
    for (let k = 0; k < 4; k++) { const l = mk(new THREE.SphereGeometry(0.16, 8, 6), M.sakaki, s * 1.0 + rnd(-0.1, 0.1), FLOOR + 1.35 + k * 0.1, -D / 2 + 0.75, g); l.scale.set(1, 0.6, 0.6); }
    const lamp = mk(new THREE.SphereGeometry(0.09, 10, 8), new THREE.MeshStandardMaterial({ color: 0xffe0a0, emissive: 0xffa040, emissiveIntensity: 3 }), s * 0.6, FLOOR + 0.95, -D / 2 + 0.6, g, false);
    lamp.scale.y = 1.4;
  }
  const inner = new THREE.PointLight(0xffb36b, 8, 11, 1.5); inner.position.set(0, FLOOR + 2.4, 0); g.add(inner);
  // 座布団（3列×4）
  const cushions = [];
  for (let r = 0; r < 3; r++) for (let c = 0; c < 4; c++) {
    const x = -2.25 + c * 1.5, z = -0.6 + r * 1.3;
    mk(new RoundedPlane(0.85, 0.85), zabM, x, FLOOR + 0.07, z, g);
    cushions.push([cx + x, cz + z]);
  }
  // しめ縄
  const rope = mk(new THREE.TorusGeometry(3.4, 0.14, 8, 32, Math.PI), std(0xd8c99a, { roughness: 1 }), 0, FLOOR + 3.0, D / 2 + 0.1, g);
  rope.rotation.z = Math.PI; rope.scale.y = 0.18;
  interiors.push({ id, x0: cx - W / 2 + 0.3, x1: cx + W / 2 - 0.3, z0: cz - D / 2 + 1.3, z1: cz + D / 2 + 0.2, cushions, altar: [cx, cz - D / 2 + 1.4] });
  return g;
}
function RoundedPlane(w, d) { return new THREE.BoxGeometry(w, 0.12, d); }

// ------------------------------------------------------------------ 木
function blossomTree(scene, x, z, col, small = false) {
  const g = new THREE.Group(); g.position.set(x, 0, z); scene.add(g);
  const h = small ? rnd(1.6, 2.2) : rnd(2.4, 3.2);
  mk(new THREE.CylinderGeometry(0.1, 0.18, h, 7), std(0x3b2a22), 0, h / 2, 0, g);
  const m = std(col, { roughness: 0.9, flatShading: true, emissive: col, emissiveIntensity: 0.08 });
  for (let i = 0; i < (small ? 4 : 6); i++) { const s = mk(new THREE.IcosahedronGeometry(rnd(small ? 0.5 : 0.7, small ? 0.8 : 1.15), 0), m, rnd(-0.8, 0.8), h + rnd(-0.3, 0.8), rnd(-0.8, 0.8), g); s.rotation.set(rnd(0, 3), rnd(0, 3), 0); }
}

// ------------------------------------------------------------------ 撫で牛（合格の社）
function nadeUshi(scene, x, z) {
  const g = new THREE.Group(); g.position.set(x, 0, z); g.rotation.y = -0.4; scene.add(g);
  mk(new THREE.BoxGeometry(1.8, 0.5, 1.0), M.stoneD, 0, 0.25, 0, g);
  const body = mk(new THREE.CapsuleGeometry(0.38, 0.9, 6, 12), M.bronze, 0, 0.85, 0, g); body.rotation.z = Math.PI / 2;
  const head = mk(new THREE.SphereGeometry(0.3, 14, 10), M.bronze, 0.75, 0.95, 0, g); head.scale.set(1.1, 0.9, 0.9);
  for (const s of [-1, 1]) { const horn = mk(new THREE.ConeGeometry(0.05, 0.25, 8), M.bronze, 0.8, 1.22, s * 0.18, g); horn.rotation.z = -0.5; }
  mk(new THREE.TorusGeometry(0.18, 0.04, 6, 16), M.shu, 0.55, 0.9, 0, g).rotation.y = Math.PI / 2;           // 赤いよだれかけ
  return g;
}

// ------------------------------------------------------------------ 縁結びの「赤い糸」の結び木（縁結びの社）
function enTree(scene, x, z) {
  const g = new THREE.Group(); g.position.set(x, 0, z); scene.add(g);
  mk(new THREE.CylinderGeometry(0.45, 0.6, 3.4, 10), std(0x4a3426), 0, 1.7, 0, g);
  const rope = mk(new THREE.TorusGeometry(0.55, 0.08, 8, 24), std(0xd8c99a), 0, 1.6, 0, g); rope.rotation.x = Math.PI / 2;
  const m = std(0xf2a7c3, { roughness: 0.9, flatShading: true, emissive: 0xf2a7c3, emissiveIntensity: 0.1 });
  for (let i = 0; i < 8; i++) mk(new THREE.IcosahedronGeometry(rnd(1, 1.6), 0), m, rnd(-1.4, 1.4), 3.4 + rnd(0, 1.2), rnd(-1.4, 1.4), g);
  for (let i = 0; i < 14; i++) { const t = mk(new THREE.CylinderGeometry(0.012, 0.012, rnd(0.5, 1.2), 4), std(0xd61f3a, { emissive: 0x700010, emissiveIntensity: 0.5 }), rnd(-1.2, 1.2), 2.6 + rnd(0, 0.6), rnd(-1.2, 1.2), g, false); }
  return g;
}

// ------------------------------------------------------------------ 参道（中央 ↔ 東西）
function path(scene, x0, x1, z) {
  for (let x = x0; x0 < x1 ? x <= x1 : x >= x1; x += x0 < x1 ? 1.15 : -1.15) {
    const s = mk(new THREE.BoxGeometry(1.0, 0.1, rnd(2.4, 2.8)), M.stone, x, 0.05, z + rnd(-0.06, 0.06), scene); s.rotation.y = rnd(-0.03, 0.03);
  }
}

export function buildWorld(scene, { toro, chochin, torii }) {
  // 東西の広場
  for (const [x] of [[-32], [32]]) { const c = mk(new THREE.PlaneGeometry(22, 18), M.gravel, x, 0.012, -11, scene); c.rotation.x = -Math.PI / 2; c.castShadow = false; }
  path(scene, -15.5, -21, -6.5); path(scene, 15.5, 21, -6.5);
  const walk = [];
  // 縁結びの社（西）
  hall(scene, "enmusubi", ...HALL_POS.enmusubi, M.roofP, M.zab);
  for (const [x, z] of [[-24, -4], [-40, -4], [-23, -13], [-41, -13], [-26, 0.5], [-38, 0.5]]) blossomTree(scene, x, z, 0xf5b7cf);
  const en = enTree(scene, -26.5, -7);
  toro(-28.5, -3.5); toro(-35.5, -3.5);
  // 合格の社（東）
  hall(scene, "gokaku", ...HALL_POS.gokaku, M.roofB, M.zabB);
  for (const [x, z] of [[24, -4], [40, -4], [23, -13], [41, -13], [26, 0.5], [38, 0.5]]) blossomTree(scene, x, z, Math.random() < 0.5 ? 0xffffff : 0xe78aa8, true);
  const ushi = nadeUshi(scene, 27, -7);
  toro(28.5, -3.5); toro(35.5, -3.5);
  return { en, ushi, walk };
}

// ------------------------------------------------------------------ 善行：落ち葉の山
export class LeafPiles {
  constructor(scene) { this.scene = scene; this.piles = []; this.spots = [[-9, -1], [9, 0], [-11, -14], [11, -14], [-4, 31], [4, 30.5], [-30, -2], [-34, 1], [30, -2], [34, 1], [0, -2.5], [-12, -6], [12, -6]]; this.geo = new THREE.IcosahedronGeometry(0.22, 0); }
  spawn() {
    const free = this.spots.filter(([x, z]) => !this.piles.some((p) => p.x === x && p.z === z));
    if (!free.length || this.piles.length >= 7) return;
    const [x, z] = free[Math.floor(Math.random() * free.length)];
    const g = new THREE.Group(); g.position.set(x + rnd(-0.4, 0.4), 0, z + rnd(-0.4, 0.4)); g.userData.leafpile = true;
    for (let i = 0; i < 16; i++) { const l = mk(this.geo, Math.random() < 0.6 ? M.leaf : M.leafY, rnd(-0.55, 0.55), rnd(0.03, 0.22), rnd(-0.45, 0.45), g, false); l.scale.y = 0.35; l.rotation.set(rnd(0, 3), rnd(0, 3), 0); }
    this.scene.add(g); this.piles.push({ g, x, z });
  }
  remove(g) { const i = this.piles.findIndex((p) => p.g === g); if (i >= 0) { this.scene.remove(g); this.piles.splice(i, 1); } }
  get objects() { return this.piles.map((p) => p.g); }
}

export const floorY = (x, z) => (interiors.some((r) => x > r.x0 && x < r.x1 && z > r.z0 && z < r.z1) ? FLOOR + 0.04 : 0);
export const zoneOf = (x) => (x < -17 ? "enmusubi" : x > 17 ? "gokaku" : "tosen");
