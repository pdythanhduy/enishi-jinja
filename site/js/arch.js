// 建築：反りのある屋根、本殿、楼門、五重塔、太鼓橋、玉垣、鳥居、灯籠…（すべてプログラムで組み立てる）
import * as THREE from "three";

const std = (color, o = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.75, ...o });
export const MAT = {
  shu: std(0xd23a26, { roughness: 0.5 }), shuD: std(0xa82a1c, { roughness: 0.55 }), kuro: std(0x1c1a19, { roughness: 0.7 }),
  wood: std(0x6b4428), woodD: std(0x4a2e1c), woodL: std(0x9a6a3e), white: std(0xf3efe6, { roughness: 0.85 }), shoji: std(0xf7f1df, { emissive: 0xffd9a0, emissiveIntensity: 0.0 }),
  copper: std(0x3f7a68, { roughness: 0.55, metalness: 0.25 }), copperD: std(0x2d5a4c, { roughness: 0.6, metalness: 0.2 }), hinoki: std(0x5a3a2a, { roughness: 0.85 }),
  gold: std(0xe3b54a, { metalness: 0.9, roughness: 0.28 }), stone: std(0x8e8a82, { roughness: 0.95 }), stoneD: std(0x6c6861, { roughness: 0.95 }), stoneL: std(0xa7a299, { roughness: 0.95 }),
  rope: std(0xd8c99a, { roughness: 1 }), paperW: std(0xffffff, { roughness: 0.9 }), tatami: std(0xb3ad76, { roughness: 0.95 }),
  water: new THREE.MeshStandardMaterial({ color: 0x2f5e7a, roughness: 0.08, metalness: 0.35, transparent: true, opacity: 0.92 }),
};
// 夜に灯る素材（環境から明るさを変える）
export const LIGHT_SPOTS = [];   // {obj, y, int, dist, color}：実際の光源は app 側のプールで近いものだけ点ける
export function lightSpot(obj, y, int, dist, color = 0xffa04a) { LIGHT_SPOTS.push({ obj, y, int, dist, color }); }
export function lampMat(color = 0xfff0d0, emissive = 0xffa040, base = 3) { const m = std(color, { emissive, emissiveIntensity: base, roughness: 0.9 }); m.userData.base = base; return m; }

export const box = (p, w, h, d, m, x, y, z, sh = true) => { const o = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m); o.position.set(x, y, z); if (sh) o.castShadow = o.receiveShadow = true; p.add(o); return o; };
export const cyl = (p, r1, r2, h, m, x, y, z, seg = 12, sh = true) => { const o = new THREE.Mesh(new THREE.CylinderGeometry(r1, r2, h, seg), m); o.position.set(x, y, z); if (sh) o.castShadow = o.receiveShadow = true; p.add(o); return o; };

// ------------------------------------------------------------------ 反りのある屋根（切妻を曲線で）
// w: 幅（x）、d: 奥行き（z）、h: 高さ、lift: 軒の反り上がり
export function roof(parent, { w, d, h, lift = 0.35, thick = 0.22, mat = MAT.copper, under = MAT.woodD, y = 0, x = 0, z = 0, gable = true, ridgeGold = true }) {
  const g = new THREE.Group(); g.position.set(x, y, z); parent.add(g);
  const half = d / 2;
  const shape = new THREE.Shape();
  // 断面（z-y平面）：軒先→棟→反対の軒先。凹んだ曲線で「反り」
  const N = 14, top = [], bot = [];
  for (let i = 0; i <= N; i++) {
    const t = i / N, zz = -half + t * d, u = Math.abs(zz) / half;     // u: 0=棟, 1=軒
    const yy = h * (1 - Math.pow(u, 0.62)) + lift * Math.pow(u, 6);  // 反り
    top.push([zz, yy]); bot.push([zz, yy - thick * (1 - 0.3 * u)]);
  }
  shape.moveTo(top[0][0], top[0][1]); top.forEach(([a, b]) => shape.lineTo(a, b));
  [...bot].reverse().forEach(([a, b]) => shape.lineTo(a, b)); shape.closePath();
  const geo = new THREE.ExtrudeGeometry(shape, { depth: w, bevelEnabled: false, curveSegments: 1 });
  geo.translate(0, 0, -w / 2); geo.rotateY(Math.PI / 2);
  const m = new THREE.Mesh(geo, mat); m.castShadow = m.receiveShadow = true; g.add(m);
  // 軒裏（垂木の色）
  const ug = new THREE.ExtrudeGeometry(shape, { depth: w - 0.3, bevelEnabled: false }); ug.translate(0, -0.04, -(w - 0.3) / 2); ug.rotateY(Math.PI / 2);
  const um = new THREE.Mesh(ug, under); um.scale.set(1, 0.985, 0.995); g.add(um);
  // 棟と金の飾り
  box(g, w + 0.2, 0.32, 0.42, MAT.kuro, 0, h + 0.1, 0);
  if (ridgeGold) {
    for (const s of [-1, 1]) {      // 千木（交差する飾り）
      for (const r of [-1, 1]) { const c = box(g, 0.12, 1.3, 0.12, MAT.gold, s * (w / 2 - 0.1), h + 0.6, r * 0.18); c.rotation.x = r * 0.5; }
    }
    for (let i = -2; i <= 2; i++) cyl(g, 0.11, 0.11, 0.7, MAT.gold, i * (w / 6), h + 0.38, 0, 10).rotation.x = Math.PI / 2;   // 鰹木
  }
  if (gable) for (const s of [-1, 1]) {    // 破風（妻の金の縁取り）
    const tri = new THREE.Shape(); tri.moveTo(-half * 0.92, 0); tri.lineTo(0, h * 0.92); tri.lineTo(half * 0.92, 0); tri.closePath();
    const tg = new THREE.ShapeGeometry(tri); const tm = new THREE.Mesh(tg, MAT.white); tm.rotation.y = s * Math.PI / 2; tm.position.set(s * (w / 2 - 0.25), 0.02, 0); g.add(tm);
    for (const r of [-1, 1]) { const b = box(g, 0.08, 0.14, half * 1.15, MAT.gold, s * (w / 2 - 0.2), h * 0.52, r * half * 0.48, false); b.rotation.x = r * -0.62; }
  }
  return g;
}

// ------------------------------------------------------------------ 鳥居
export function torii(parent, { x = 0, z = 0, y = 0, s = 1, ry = 0, gaku = "", mat = MAT.shu }) {
  const g = new THREE.Group(); g.position.set(x, y, z); g.rotation.y = ry; g.scale.setScalar(s); parent.add(g);
  const w = 3.6, h = 4.2;
  for (const xx of [-w / 2, w / 2]) { cyl(g, 0.17, 0.21, h, mat, xx, h / 2, 0, 16); cyl(g, 0.25, 0.25, 0.4, MAT.kuro, xx, 0.2, 0, 16); }
  box(g, w + 0.9, 0.22, 0.26, mat, 0, h - 0.7, 0);                          // 貫
  box(g, w + 1.4, 0.2, 0.34, mat, 0, h - 0.12, 0);                          // 島木
  const kasagi = new THREE.Shape();                                        // 反った笠木
  const L = (w + 2.0) / 2; kasagi.moveTo(-L, 0.25); kasagi.quadraticCurveTo(0, -0.05, L, 0.25); kasagi.lineTo(L, 0.55); kasagi.quadraticCurveTo(0, 0.22, -L, 0.55); kasagi.closePath();
  const kg = new THREE.ExtrudeGeometry(kasagi, { depth: 0.46, bevelEnabled: false }); kg.translate(0, 0, -0.23);
  const km = new THREE.Mesh(kg, MAT.kuro); km.position.y = h - 0.05; km.castShadow = true; g.add(km);
  if (gaku !== null) { box(g, 0.14, 0.7, 0.14, mat, 0, h - 0.4, 0); const gk = box(g, 0.75, 0.95, 0.08, MAT.kuro, 0, h - 0.42, 0.16); gk.userData.gaku = gaku; }
  return g;
}

// ------------------------------------------------------------------ 石灯籠
export function toro(parent, x, z, y = 0, env, scale = 1) {
  const g = new THREE.Group(); g.position.set(x, y, z); g.scale.setScalar(scale); parent.add(g);
  cyl(g, 0.45, 0.55, 0.28, MAT.stoneD, 0, 0.14, 0, 6); cyl(g, 0.14, 0.17, 1.05, MAT.stone, 0, 0.8, 0, 12);
  cyl(g, 0.44, 0.3, 0.2, MAT.stone, 0, 1.42, 0, 6); box(g, 0.52, 0.44, 0.52, MAT.stone, 0, 1.73, 0);
  const fm = lampMat(0xffe2a8, 0xffa040, 3.2); box(g, 0.32, 0.27, 0.54, fm, 0, 1.73, 0, false); box(g, 0.54, 0.27, 0.32, fm, 0, 1.73, 0, false);
  const cap = new THREE.Mesh(new THREE.ConeGeometry(0.62, 0.42, 6), MAT.stoneD); cap.position.y = 2.15; cap.castShadow = true; g.add(cap);
  cyl(g, 0.1, 0.1, 0.16, MAT.stone, 0, 2.42, 0, 10);
  lightSpot(g, 1.73 * scale, 5, 9);
  env && env.registerLamp(fm, null);
  g.userData = { lamp: fm };
  return g;
}
// 提灯
export function chochin(parent, x, y, z, env, s = 1, col = 0xfff3d6) {
  const g = new THREE.Group(); g.position.set(x, y, z); g.scale.setScalar(s); parent.add(g);
  const m = lampMat(col, 0xff9a3a, 2.6);
  const b = new THREE.Mesh(new THREE.SphereGeometry(0.32, 16, 12), m); b.scale.y = 1.35; g.add(b);
  cyl(g, 0.21, 0.21, 0.08, MAT.kuro, 0, 0.45, 0, 12, false); cyl(g, 0.21, 0.21, 0.08, MAT.kuro, 0, -0.45, 0, 12, false);
  env && env.registerLamp(m, null);
  return g;
}

// ------------------------------------------------------------------ 本殿（大きな拝殿＋本殿、向拝、金の飾り）
export function honden(parent, env, { x = 0, z = 0 } = {}) {
  const g = new THREE.Group(); g.position.set(x, 0, z); parent.add(g);
  const W = 18, D = 12, F = 1.4;                                   // 幅・奥行き・床の高さ
  box(g, W + 2, F, D + 2, MAT.stoneD, 0, F / 2, 0);                 // 基壇
  box(g, W + 2.4, 0.15, D + 2.4, MAT.stoneL, 0, F + 0.05, 0);
  for (let i = 0; i < 7; i++) box(g, 7.4, 0.2, 0.5, MAT.stoneL, 0, 0.1 + i * 0.2, D / 2 + 1 + (6 - i) * 0.42);   // 正面の大階段
  box(g, W, 0.2, D, MAT.wood, 0, F + 0.2, 0);                      // 縁側の床
  // 柱（朱）
  const cols = [-8.6, -5.4, -2.6, 2.6, 5.4, 8.6];
  for (const cx of cols) for (const cz of [-D / 2 + 0.4, D / 2 - 0.4]) cyl(g, 0.3, 0.3, 4.8, MAT.shu, cx, F + 2.6, cz, 16);
  for (const cz of [-2, 2]) for (const cx of [-8.6, 8.6]) cyl(g, 0.3, 0.3, 4.8, MAT.shu, cx, F + 2.6, cz, 16);
  // 壁と蔀戸（白と朱）・内部の明かり
  box(g, W - 0.6, 4.6, 0.2, MAT.white, 0, F + 2.6, -D / 2 + 0.5);
  for (const s of [-1, 1]) box(g, 0.2, 4.6, D - 1, MAT.white, s * (W / 2 - 0.5), F + 2.6, 0);
  for (const cx of [-4, 0, 4]) { const sh = box(g, 3.2, 2.8, 0.1, MAT.shoji, cx, F + 2.0, -D / 2 + 0.62, false); sh.material = MAT.shoji; }
  // 欄間・頭貫（金の線）
  box(g, W + 0.2, 0.36, D + 0.2, MAT.shuD, 0, F + 5.15, 0);
  for (const zz of [-D / 2 - 0.12, D / 2 + 0.12]) box(g, W + 0.2, 0.1, 0.06, MAT.gold, 0, F + 5.05, zz, false);
  // 高欄（縁の手すり）
  for (const s of [-1, 1]) box(g, 0.12, 0.6, D, MAT.shu, s * (W / 2 + 0.6), F + 0.6, 0);
  box(g, (W - 7.4) / 2, 0.6, 0.12, MAT.shu, -(W / 2 - (W - 7.4) / 4 + 0.6) + 0.6, F + 0.6, D / 2 + 0.6);
  box(g, (W - 7.4) / 2, 0.6, 0.12, MAT.shu, (W / 2 - (W - 7.4) / 4 + 0.6) - 0.6, F + 0.6, D / 2 + 0.6);
  // 大屋根（二重）
  roof(g, { w: W + 5, d: D + 5, h: 4.2, lift: 0.7, y: F + 5.3, mat: MAT.copper });
  roof(g, { w: W - 4, d: D - 3, h: 3.0, lift: 0.5, y: F + 8.6, mat: MAT.copper });
  // 向拝（正面に張り出す屋根）
  for (const cx of [-3.4, 3.4]) cyl(g, 0.26, 0.26, 4.2, MAT.shu, cx, F + 2.3, D / 2 + 2.6, 16);
  roof(g, { w: 9, d: 4.6, h: 1.6, lift: 0.5, y: F + 4.4, z: D / 2 + 2.3, mat: MAT.copper, ridgeGold: false });
  box(g, 7.6, 0.3, 0.3, MAT.shuD, 0, F + 4.45, D / 2 + 2.6);
  box(g, 1.6, 1.1, 0.1, MAT.kuro, 0, F + 4.0, D / 2 + 2.78);      // 扁額
  // しめ縄と紙垂・大提灯
  const rope = new THREE.Mesh(new THREE.TorusGeometry(3.2, 0.26, 10, 40, Math.PI), MAT.rope); rope.rotation.z = Math.PI; rope.scale.y = 0.16; rope.position.set(0, F + 4.0, D / 2 + 2.85); g.add(rope);
  for (const xx of [-2.2, -0.8, 0.8, 2.2]) box(g, 0.24, 0.62, 0.02, MAT.paperW, xx, F + 3.45, D / 2 + 2.9, false);
  chochin(g, -5.2, F + 3.7, D / 2 + 1.6, env, 1.6); chochin(g, 5.2, F + 3.7, D / 2 + 1.6, env, 1.6);
  for (let i = -3; i <= 3; i++) if (i) chochin(g, i * 2.4, F + 4.7, D / 2 + 0.2, env, 0.75, 0xffe7b0);
  lightSpot(g, F + 3, 12, 18, 0xffb06a);
  return { group: g, floorY: F + 0.3, front: z + D / 2 + 1 };
}

// ------------------------------------------------------------------ 小さな社（縁結び・合格）— 中に入れる
export function smallHall(parent, env, { x, z, roofMat = MAT.copper, zabMat }) {
  const g = new THREE.Group(); g.position.set(x, 0, z); parent.add(g);
  const W = 10, D = 7, F = 0.45;
  box(g, W + 1, F, D + 1, MAT.stoneD, 0, F / 2, 0);
  for (let i = 0; i < 2; i++) box(g, 3.4, 0.22, 0.5, MAT.stoneL, 0, 0.11 + i * 0.22, D / 2 + 0.9 - i * 0.45);
  box(g, W, 0.06, D, MAT.tatami, 0, F + 0.03, 0);
  for (const cx of [-W / 2, -1.6, 1.6, W / 2]) for (const cz of [-D / 2, D / 2]) cyl(g, 0.17, 0.17, 3.4, MAT.shu, cx, F + 1.7, cz, 12);
  box(g, W, 3.2, 0.16, MAT.woodL, 0, F + 1.6, -D / 2 + 0.05);
  for (const s of [-1, 1]) box(g, 0.16, 3.2, D, MAT.woodL, s * (W / 2 - 0.05), F + 1.6, 0);
  for (const cx of [-3, 0, 3]) box(g, 2.4, 2.3, 0.05, MAT.shoji, cx, F + 1.6, -D / 2 + 0.16, false);
  box(g, W + 0.4, 0.28, D + 0.4, MAT.shuD, 0, F + 3.45, 0);
  roof(g, { w: W + 3, d: D + 3.4, h: 2.6, lift: 0.45, y: F + 3.6, mat: roofMat });
  // 祭壇：神鏡・榊・灯明
  box(g, 2.8, 0.85, 0.8, MAT.wood, 0, F + 0.43, -D / 2 + 0.8);
  const mir = cyl(g, 0.45, 0.45, 0.06, new THREE.MeshStandardMaterial({ color: 0xe8eef5, metalness: 1, roughness: 0.08 }), 0, F + 1.4, -D / 2 + 0.8, 32); mir.rotation.x = Math.PI / 2;
  for (const s of [-1, 1]) { cyl(g, 0.06, 0.08, 0.5, MAT.white, s * 1.05, F + 1.1, -D / 2 + 0.8, 8);
    for (let k = 0; k < 4; k++) { const l = new THREE.Mesh(new THREE.SphereGeometry(0.17, 8, 6), std(0x2f5a2e)); l.scale.set(1, 0.6, 0.6); l.position.set(s * 1.05, F + 1.4 + k * 0.1, -D / 2 + 0.8); g.add(l); } }
  lightSpot(g, F + 2.4, 9, 12, 0xffb36b);
  // 座布団 3列×4
  const cushions = [];
  for (let r = 0; r < 3; r++) for (let c = 0; c < 4; c++) { const cx = -2.7 + c * 1.8, cz = -0.5 + r * 1.35; box(g, 0.85, 0.12, 0.85, zabMat, cx, F + 0.1, cz); cushions.push([x + cx, z + cz]); }
  const rope = new THREE.Mesh(new THREE.TorusGeometry(3.6, 0.15, 8, 32, Math.PI), MAT.rope); rope.rotation.z = Math.PI; rope.scale.y = 0.16; rope.position.set(0, F + 3.2, D / 2 + 0.1); g.add(rope);
  chochin(g, -4, F + 2.7, D / 2 + 0.5, env, 0.9); chochin(g, 4, F + 2.7, D / 2 + 0.5, env, 0.9);
  return { group: g, cushions, floor: { x0: x - W / 2 + 0.3, x1: x + W / 2 - 0.3, z0: z - D / 2 + 1.2, z1: z + D / 2 + 0.3, y: F + 0.06 }, altar: [x, z - D / 2 + 1.5] };
}

// ------------------------------------------------------------------ 楼門（二階建ての門）
export function romon(parent, env, { x = 0, z = 0 } = {}) {
  const g = new THREE.Group(); g.position.set(x, 0, z); parent.add(g);
  const W = 12, D = 4;
  box(g, W + 0.6, 0.4, D + 0.6, MAT.stoneD, 0, 0.2, 0);
  for (const cx of [-5.6, -2, 2, 5.6]) for (const cz of [-D / 2 + 0.3, D / 2 - 0.3]) cyl(g, 0.3, 0.3, 5, MAT.shu, cx, 2.9, cz, 16);
  for (const s of [-1, 1]) box(g, 3.2, 4.2, 0.2, MAT.white, s * 3.8, 2.5, 0);                // 左右の間（随身の間）
  box(g, W + 0.2, 0.4, D + 0.2, MAT.shuD, 0, 5.4, 0);
  roof(g, { w: W + 3, d: D + 3.4, h: 1.4, lift: 0.45, y: 5.55, mat: MAT.copper, gable: false, ridgeGold: false });   // 一階の屋根（腰屋根）
  // 二階：高欄と柱
  box(g, W - 1.4, 0.25, D, MAT.wood, 0, 7.15, 0);
  for (const s of [-1, 1]) box(g, W - 1, 0.5, 0.1, MAT.shu, 0, 7.55, s * (D / 2 + 0.05));
  for (const cx of [-4.8, -1.6, 1.6, 4.8]) for (const cz of [-D / 2 + 0.4, D / 2 - 0.4]) cyl(g, 0.24, 0.24, 2.8, MAT.shu, cx, 8.6, cz, 12);
  box(g, W - 1.6, 2.4, 0.15, MAT.white, 0, 8.5, 0);
  box(g, W - 1.2, 0.3, D + 0.1, MAT.shuD, 0, 10.05, 0);
  roof(g, { w: W + 2.6, d: D + 4, h: 2.6, lift: 0.6, y: 10.2, mat: MAT.copper });
  box(g, 1.4, 1.0, 0.1, MAT.kuro, 0, 8.8, D / 2 + 0.12);                                     // 扁額
  chochin(g, 0, 4.4, D / 2 + 0.3, env, 1.8);                                                 // 大提灯
  for (const s of [-1, 1]) chochin(g, s * 3.8, 4.6, D / 2 + 0.4, env, 0.9);
  return g;
}

// ------------------------------------------------------------------ 五重塔
export function pagoda(parent, env, { x, z, y = 0 }) {
  const g = new THREE.Group(); g.position.set(x, y, z); parent.add(g);
  box(g, 7.5, 0.8, 7.5, MAT.stoneD, 0, 0.4, 0);
  let yy = 0.8, w = 5.6;
  for (let i = 0; i < 5; i++) {
    const h = i === 0 ? 3.2 : 2.3;
    box(g, w, h, w, MAT.shuD, 0, yy + h / 2, 0);
    for (const s of [-1, 1]) for (const t of [-1, 1]) cyl(g, 0.12, 0.12, h, MAT.shu, s * (w / 2), yy + h / 2, t * (w / 2), 8);
    box(g, w * 0.5, h * 0.55, 0.06, MAT.white, 0, yy + h * 0.45, w / 2 + 0.02, false);
    yy += h;
    roof(g, { w: w + 3.0, d: w + 3.0, h: 0.9, lift: 0.55, y: yy - 0.1, mat: MAT.hinoki, gable: false, ridgeGold: false });
    const r2 = roof(g, { w: w + 3.0, d: w + 3.0, h: 0.9, lift: 0.55, y: yy - 0.1, mat: MAT.hinoki, gable: false, ridgeGold: false }); r2.rotation.y = Math.PI / 2;
    yy += 0.7; w *= 0.84;
  }
  cyl(g, 0.12, 0.16, 6, MAT.gold, 0, yy + 3, 0, 10);                                     // 相輪
  for (let i = 0; i < 9; i++) cyl(g, 0.45 - i * 0.02, 0.45 - i * 0.02, 0.08, MAT.gold, 0, yy + 0.9 + i * 0.5, 0, 16);
  const top = new THREE.Mesh(new THREE.SphereGeometry(0.3, 12, 10), MAT.gold); top.position.y = yy + 6.2; g.add(top);
  for (let i = 0; i < 4; i++) chochin(g, (i % 2 ? 1 : -1) * 3.3, 3.2, (i < 2 ? 1 : -1) * 3.3, env, 0.8);
  return g;
}

// ------------------------------------------------------------------ 太鼓橋
export function taikobashi(parent, { x0, x1, z, w }) {
  const g = new THREE.Group(); parent.add(g);
  const L = x1 - x0, N = 26;
  for (let i = 0; i < N; i++) {
    const t = (i + 0.5) / N, xx = x0 + t * L, yy = Math.sin(t * Math.PI) * 1.9, slope = Math.cos(t * Math.PI) * Math.PI * 1.9 / L;
    const p = box(g, L / N + 0.03, 0.14, w, MAT.woodL, xx, yy, z); p.rotation.z = Math.atan(slope);
  }
  for (const s of [-1, 1]) {
    const pts = []; for (let i = 0; i <= 30; i++) { const t = i / 30; pts.push(new THREE.Vector3(x0 + t * L, Math.sin(t * Math.PI) * 1.9 + 0.75, z + s * (w / 2))); }
    const rail = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 40, 0.06, 6, false), MAT.shu); rail.castShadow = true; g.add(rail);
    for (let i = 0; i <= 8; i++) { const t = i / 8, yy = Math.sin(t * Math.PI) * 1.9; cyl(g, 0.07, 0.07, 0.8, MAT.shu, x0 + t * L, yy + 0.38, z + s * (w / 2), 8);
      const k = new THREE.Mesh(new THREE.SphereGeometry(0.1, 10, 8), MAT.gold); k.position.set(x0 + t * L, yy + 0.85, z + s * (w / 2)); g.add(k); }
  }
  for (const xx of [x0 + 0.3, x1 - 0.3]) for (const s of [-1, 1]) cyl(g, 0.12, 0.14, 1.4, MAT.shu, xx, -0.4, z + s * (w / 2 - 0.1), 8);
  return g;
}

// ------------------------------------------------------------------ 玉垣（朱の塀・InstancedMesh で軽く）
export function tamagaki(parent, segments, h = 1.3) {
  const posts = [], geo = new THREE.BoxGeometry(0.16, h, 0.16);
  for (const [[ax, az], [bx, bz]] of segments) {
    const L = Math.hypot(bx - ax, bz - az), n = Math.max(1, Math.round(L / 1.2));
    for (let i = 0; i <= n; i++) posts.push([ax + ((bx - ax) * i) / n, az + ((bz - az) * i) / n]);
    const rail = (yy) => { const r = new THREE.Mesh(new THREE.BoxGeometry(L, 0.12, 0.12), MAT.shu); r.position.set((ax + bx) / 2, yy, (az + bz) / 2); r.rotation.y = -Math.atan2(bz - az, bx - ax); r.castShadow = true; parent.add(r); };
    rail(h - 0.1); rail(h * 0.45);
  }
  const inst = new THREE.InstancedMesh(geo, MAT.shu, posts.length); const m = new THREE.Matrix4();
  posts.forEach(([x, z], i) => inst.setMatrixAt(i, m.makeTranslation(x, h / 2, z))); inst.castShadow = true; parent.add(inst);
  return inst;
}

// ------------------------------------------------------------------ 手水舎
export function temizuya(parent, env, { x, z }) {
  const g = new THREE.Group(); g.position.set(x, 0, z); parent.add(g);
  for (const [xx, zz] of [[-1.6, -1.1], [1.6, -1.1], [-1.6, 1.1], [1.6, 1.1]]) cyl(g, 0.15, 0.15, 3, MAT.woodD, xx, 1.5, zz, 10);
  roof(g, { w: 4.6, d: 3.6, h: 1.3, lift: 0.3, y: 3.0, mat: MAT.copper, ridgeGold: false });
  box(g, 2.6, 0.75, 1.3, MAT.stoneL, 0, 0.5, 0);
  box(g, 2.3, 0.06, 1.05, MAT.water, 0, 0.86, 0, false);
  const dragon = cyl(g, 0.09, 0.12, 0.6, MAT.gold, -1.0, 1.15, 0, 10); dragon.rotation.z = -1.1;   // 竜の口（水が出る）
  for (let i = -2; i <= 2; i++) { const h = cyl(g, 0.03, 0.03, 0.7, MAT.woodL, i * 0.36, 0.98, 0.5, 6); h.rotation.x = 1.25; cyl(g, 0.08, 0.08, 0.12, MAT.woodL, i * 0.36, 0.95, 0.85, 10); }
  chochin(g, 0, 2.6, 1.6, env, 0.6);
  return g;
}

// ------------------------------------------------------------------ 授与所（お守り・おみくじ）
export function juyosho(parent, env, { x, z, ry = -Math.PI / 2 }) {
  const g = new THREE.Group(); g.position.set(x, 0, z); g.rotation.y = ry; parent.add(g);
  box(g, 7, 0.3, 4, MAT.stoneD, 0, 0.15, 0);
  for (const xx of [-3.2, 3.2]) for (const zz of [-1.7, 1.7]) cyl(g, 0.14, 0.14, 3, MAT.woodD, xx, 1.6, zz, 10);
  box(g, 6.6, 2.8, 0.15, MAT.woodL, 0, 1.7, -1.7);
  for (const s of [-1, 1]) box(g, 0.15, 2.8, 3.4, MAT.woodL, s * 3.2, 1.7, 0);
  box(g, 6.4, 1.0, 0.6, MAT.wood, 0, 0.8, 1.4);                                              // 授与台
  const cloth = box(g, 6.4, 0.06, 0.62, std(0xc8331f), 0, 1.33, 1.4, false);
  const colors = [0xd8402a, 0x2c5aa0, 0xe8b23a, 0x3d8a4a, 0xd96aa0, 0xffffff];
  for (let i = 0; i < 14; i++) box(g, 0.22, 0.32, 0.04, std(colors[i % colors.length], { emissive: colors[i % colors.length], emissiveIntensity: 0.12 }), -2.8 + i * 0.43, 1.55, 1.3, false); // お守り
  roof(g, { w: 8.4, d: 5.4, h: 1.5, lift: 0.3, y: 3.1, mat: MAT.hinoki, ridgeGold: false });
  chochin(g, -2.4, 2.6, 1.9, env, 0.7); chochin(g, 2.4, 2.6, 1.9, env, 0.7);
  return g;
}

// ------------------------------------------------------------------ 御神木（大きな楠）
export function shinboku(parent, { x, z }, leafMat) {
  const g = new THREE.Group(); g.position.set(x, 0, z); parent.add(g);
  const trunk = cyl(g, 0.9, 1.5, 6.5, std(0x4a3426, { roughness: 1 }), 0, 3.25, 0, 14);
  for (let i = 0; i < 5; i++) { const r = cyl(g, 0.18, 0.4, 2.2, std(0x4a3426), Math.cos(i * 1.3) * 1.4, 0.4, Math.sin(i * 1.3) * 1.4, 8); r.rotation.set(Math.sin(i) * 0.9, 0, Math.cos(i * 1.3) * 0.9); }   // 根
  const rope = new THREE.Mesh(new THREE.TorusGeometry(1.32, 0.16, 10, 28), MAT.rope); rope.rotation.x = Math.PI / 2; rope.position.y = 2.6; g.add(rope);
  for (let i = 0; i < 6; i++) { const a = (i / 6) * Math.PI * 2; box(g, 0.24, 0.55, 0.02, MAT.paperW, Math.cos(a) * 1.36, 2.2, Math.sin(a) * 1.36, false).rotation.y = -a + Math.PI / 2; }
  for (let i = 0; i < 14; i++) { const s = new THREE.Mesh(new THREE.IcosahedronGeometry(1.6 + Math.random() * 1.6, 1), leafMat); s.position.set((Math.random() - 0.5) * 7, 6.5 + Math.random() * 3.5, (Math.random() - 0.5) * 7); s.castShadow = true; g.add(s); }
  // 柵
  const fence = [];
  for (let i = 0; i < 16; i++) { const a = (i / 16) * Math.PI * 2; cyl(g, 0.06, 0.06, 0.8, MAT.woodD, Math.cos(a) * 2.6, 0.4, Math.sin(a) * 2.6, 6); }
  const fr = new THREE.Mesh(new THREE.TorusGeometry(2.6, 0.04, 6, 40), MAT.woodD); fr.rotation.x = Math.PI / 2; fr.position.y = 0.75; g.add(fr);
  return g;
}

// ------------------------------------------------------------------ 奥の院（山頂の小さな社）
export function okunoin(parent, env, { x, z, y }) {
  const g = new THREE.Group(); g.position.set(x, y, z); parent.add(g);
  box(g, 6, 0.5, 4.5, MAT.stoneD, 0, 0.25, 0);
  for (const xx of [-2.6, 2.6]) for (const zz of [-1.9, 1.9]) cyl(g, 0.14, 0.14, 2.8, MAT.shu, xx, 1.9, zz, 10);
  box(g, 5.6, 2.6, 0.12, MAT.woodL, 0, 1.8, -1.9);
  for (const s of [-1, 1]) box(g, 0.12, 2.6, 3.8, MAT.woodL, s * 2.75, 1.8, 0);
  roof(g, { w: 7.6, d: 6.2, h: 2, lift: 0.4, y: 3.3, mat: MAT.copperD });
  const mir = cyl(g, 0.35, 0.35, 0.05, new THREE.MeshStandardMaterial({ color: 0xe8eef5, metalness: 1, roughness: 0.08 }), 0, 1.6, -1.7, 28); mir.rotation.x = Math.PI / 2;
  chochin(g, -2.2, 2.4, 2.4, env, 0.7, 0xdde8ff); chochin(g, 2.2, 2.4, 2.4, env, 0.7, 0xdde8ff);
  return g;
}
