// 建築：反りのある屋根、本殿、楼門、五重塔、太鼓橋、玉垣、鳥居、灯籠…（すべてプログラムで組み立てる）
import * as THREE from "three";

const std = (color, o = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.75, ...o });
export const MAT = {
  shu: std(0xd23a26, { roughness: 0.5 }), shuD: std(0xa82a1c, { roughness: 0.55 }), kuro: std(0x1c1a19, { roughness: 0.7 }),
  wood: std(0x6b4428), woodD: std(0x4a2e1c), woodL: std(0x9a6a3e), white: std(0xf3efe6, { roughness: 0.85 }), shoji: std(0xf7f1df, { emissive: 0xffd9a0, emissiveIntensity: 0.0 }),
  copper: std(0x3f7a68, { roughness: 0.55, metalness: 0.25 }), copperD: std(0x2d5a4c, { roughness: 0.6, metalness: 0.2 }), hinoki: std(0x5a3a2a, { roughness: 0.85 }),
  gold: std(0xe3b54a, { metalness: 0.9, roughness: 0.28 }), stone: std(0xcfc9bf, { roughness: 0.95 }), stoneD: std(0xa39e95, { roughness: 0.95 }), stoneL: std(0xe2ddd3, { roughness: 0.95 }),
  rope: std(0xd8c99a, { roughness: 1 }), paperW: std(0xffffff, { roughness: 0.9 }), tatami: std(0xb3ad76, { roughness: 0.95 }),
  water: new THREE.MeshStandardMaterial({ color: 0x2f5e7a, roughness: 0.08, metalness: 0.35, transparent: true, opacity: 0.92 }),
};
// 夜に灯る素材（環境から明るさを変える）
export const LIGHT_SPOTS = [];   // {obj, y, int, dist, color}：実際の光源は app 側のプールで近いものだけ点ける
export function lightSpot(obj, y, int, dist, color = 0xffa04a) { LIGHT_SPOTS.push({ obj, y, int, dist, color }); }
const LAMP_CACHE = new Map();
// 同じ色の提灯は素材を共有（まとめて描ける）。消灯させる灯籠には使わない
export function sharedLamp(color, emissive, base, env) {
  const k = `${color}|${emissive}|${base}`;
  if (!LAMP_CACHE.has(k)) LAMP_CACHE.set(k, lampMat(color, emissive, base));
  const m = LAMP_CACHE.get(k); env && env.registerLamp(m, null);      // Set なので何度登録しても一つ
  return m;
}
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
      if (w > 12) for (const r of [-1, 1]) { const c = box(g, 0.12, 1.1, 0.12, MAT.gold, s * (w / 2 - 0.15), h + 0.55, r * 0.16); c.rotation.x = r * 0.42; }
    }
    for (let i = -2; i <= 2; i++) cyl(g, 0.11, 0.11, 0.7, MAT.gold, i * (w / 6), h + 0.38, 0, 10).rotation.x = Math.PI / 2;   // 鰹木
  }
  if (gable) for (const s of [-1, 1]) {    // 破風（妻の金の縁取り）
    const tri = new THREE.Shape(); tri.moveTo(-half * 0.92, 0); tri.lineTo(0, h * 0.92); tri.lineTo(half * 0.92, 0); tri.closePath();
    const tg = new THREE.ShapeGeometry(tri); const tm = new THREE.Mesh(tg, MAT.white); tm.rotation.y = s * Math.PI / 2; tm.position.set(s * (w / 2 - 0.25), 0.02, 0); g.add(tm);
    // 破風板：妻の斜めの縁に沿わせる（棟 (0,h) から 軒 (±half, lift) まで）
    const pts = top.map(([zz, yy]) => new THREE.Vector3(s * (w / 2 + 0.03), yy - thick * 0.45, zz));
    const bg = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 40, 0.09, 6, false), MAT.gold); g.add(bg);
  }
  return g;
}

// ------------------------------------------------------------------ 鳥居
export function torii(parent, { x = 0, z = 0, y = 0, s = 1, ry = 0, gaku = "", mat = MAT.shu, top = MAT.kuro }) {   // top：笠木の素材（石の鳥居は石）
  const g = new THREE.Group(); g.position.set(x, y, z); g.rotation.y = ry; g.scale.setScalar(s); parent.add(g); g.userData.static = true;
  const w = 3.6, h = 4.2;
  for (const xx of [-w / 2, w / 2]) { cyl(g, 0.17, 0.21, h, mat, xx, h / 2, 0, 16); cyl(g, 0.25, 0.25, 0.4, MAT.kuro, xx, 0.2, 0, 16); }
  box(g, w + 0.9, 0.22, 0.26, mat, 0, h - 0.7, 0);                          // 貫
  box(g, w + 1.4, 0.2, 0.34, mat, 0, h - 0.12, 0);                          // 島木
  const kasagi = new THREE.Shape();                                        // 反った笠木
  const L = (w + 2.0) / 2; kasagi.moveTo(-L, 0.25); kasagi.quadraticCurveTo(0, -0.05, L, 0.25); kasagi.lineTo(L, 0.55); kasagi.quadraticCurveTo(0, 0.22, -L, 0.55); kasagi.closePath();
  const kg = new THREE.ExtrudeGeometry(kasagi, { depth: 0.46, bevelEnabled: false }); kg.translate(0, 0, -0.23);
  const km = new THREE.Mesh(kg, top); km.position.y = h - 0.05; km.castShadow = true; g.add(km);
  if (gaku !== null) { box(g, 0.14, 0.7, 0.14, mat, 0, h - 0.4, 0); const gk = box(g, 0.75, 0.95, 0.08, MAT.kuro, 0, h - 0.42, 0.16); gk.userData.gaku = gaku; }
  return g;
}

// ------------------------------------------------------------------ 石灯籠
export function toro(parent, x, z, y = 0, env, scale = 1) {
  const g = new THREE.Group(); g.position.set(x, y, z); g.scale.setScalar(scale); parent.add(g); g.userData.static = true;
  cyl(g, 0.45, 0.55, 0.28, MAT.stoneD, 0, 0.14, 0, 6); cyl(g, 0.14, 0.17, 1.05, MAT.stone, 0, 0.8, 0, 12);
  cyl(g, 0.44, 0.3, 0.2, MAT.stone, 0, 1.42, 0, 6); box(g, 0.52, 0.44, 0.52, MAT.stone, 0, 1.73, 0);
  const fm = lampMat(0xffe2a8, 0xffa040, 2.4); box(g, 0.32, 0.27, 0.54, fm, 0, 1.73, 0, false); box(g, 0.54, 0.27, 0.32, fm, 0, 1.73, 0, false);
  const cap = new THREE.Mesh(new THREE.ConeGeometry(0.62, 0.42, 6), MAT.stoneD); cap.position.y = 2.15; cap.castShadow = true; g.add(cap);
  cyl(g, 0.1, 0.1, 0.16, MAT.stone, 0, 2.42, 0, 10);
  lightSpot(g, 1.73 * scale, 5, 9);
  env && env.registerLamp(fm, null);
  g.userData.lamp = fm;
  return g;
}
// 提灯
export function chochin(parent, x, y, z, env, s = 1, col = 0xfff3d6, base = 1.8) {
  const g = new THREE.Group(); g.position.set(x, y, z); g.scale.setScalar(s); parent.add(g);
  const m = sharedLamp(col, 0xff9a3a, base, env);
  const b = new THREE.Mesh(new THREE.SphereGeometry(0.32, 16, 12), m); b.scale.y = 1.35; g.add(b);
  cyl(g, 0.21, 0.21, 0.08, MAT.kuro, 0, 0.45, 0, 12, false); cyl(g, 0.21, 0.21, 0.08, MAT.kuro, 0, -0.45, 0, 12, false);
  return g;
}

// ------------------------------------------------------------------ 本殿（大きな拝殿＋本殿、向拝、金の飾り）
export function honden(parent, env, { x = 0, z = 0, s = 1 } = {}) {
  const g = new THREE.Group(); g.position.set(x, 0, z); g.scale.setScalar(s); parent.add(g); g.userData.static = true;
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
  const { mir: mirror, setDoors } = hondenInterior(g, env, W, D, F);
  hondenGlory(g, env, W, D, F);
  return { group: g, floorY: (F + 0.3) * s, front: z + (D / 2 + 1) * s, mirror, setDoors };
}

// 唐破風：中央が盛り上がり両端が反る波形の破風（黒い板・銅の屋根・金の縁・懸魚）
export function karahafu(g, { hw, yb, zf, h = 1.3, depth = 2.6, roofMat = MAT.copper }) {
  const prof = (x) => { const u = Math.min(1, Math.abs(x) / hw); return h * Math.pow(1 - u * u, 1.6) + h * 0.46 * Math.pow(u, 5); };
  const band = (th) => { const sh = new THREE.Shape(), N = 36; for (let i = 0; i <= N; i++) { const x = -hw + (2 * hw * i) / N; i ? sh.lineTo(x, prof(x) + th) : sh.moveTo(x, prof(x) + th); }
    for (let i = N; i >= 0; i--) { const x = -hw + (2 * hw * i) / N; sh.lineTo(x, prof(x) - th); } sh.closePath(); return sh; };
  const t = hw * 0.05;
  const board = new THREE.Mesh(new THREE.ExtrudeGeometry(band(t), { depth: t * 0.9, bevelEnabled: false }), MAT.kuro); board.position.set(0, yb, zf - t * 0.9); board.castShadow = true; g.add(board);
  const slab = new THREE.Mesh(new THREE.ExtrudeGeometry(band(t * 0.4), { depth, bevelEnabled: false }), roofMat); slab.position.set(0, yb + t * 1.2, zf - depth - 0.1); slab.castShadow = true; g.add(slab);
  const edge = []; for (let i = 0; i <= 36; i++) { const x = -hw + (2 * hw * i) / 36; edge.push(new THREE.Vector3(x, yb + prof(x) + t * 1.05, zf + 0.01)); }
  g.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(edge), 48, t * 0.2, 5, false), MAT.gold));
  const gg = new THREE.Group(); gg.position.set(0, yb + h * 0.8, zf + 0.03); gg.scale.setScalar(hw / 4.9); g.add(gg);
  for (let k = 0; k < 6; k++) { const a = (k / 6) * Math.PI * 2, p = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.16, 0.05, 16), MAT.gold); p.rotation.x = Math.PI / 2; p.position.set(Math.cos(a) * 0.22, Math.sin(a) * 0.22 - 0.25, 0); gg.add(p); }
  const core = new THREE.Mesh(new THREE.SphereGeometry(0.14, 12, 10), MAT.gold); core.position.y = -0.25; gg.add(core);
}
const GOLD_RING = new THREE.TorusGeometry(1, 0.15, 6, 20);
export function goldRings(g, cols, ys, r = 0.2) { for (const [cx, cz] of cols) for (const yy of ys) { const m = new THREE.Mesh(GOLD_RING, MAT.gold); m.scale.setScalar(r * 1.1); m.rotation.x = Math.PI / 2; m.position.set(cx, yy, cz); g.add(m); } }

// 本殿の華やかさ：唐破風・蟇股の彫刻・飾り金具
let KAERU = null;
function hondenGlory(g, env, W, D, F) {
  // 唐破風：向拝の正面に、中央が盛り上がり両端が反る波形の破風
  const hw = 4.9, prof = (x) => { const u = Math.min(1, Math.abs(x) / hw); return 1.3 * Math.pow(1 - u * u, 1.6) + 0.6 * Math.pow(u, 5); };
  const band = (th) => { const sh = new THREE.Shape(), N = 40; for (let i = 0; i <= N; i++) { const x = -hw + (2 * hw * i) / N; i ? sh.lineTo(x, prof(x) + th) : sh.moveTo(x, prof(x) + th); }
    for (let i = N; i >= 0; i--) { const x = -hw + (2 * hw * i) / N; sh.lineTo(x, prof(x) - th); } sh.closePath(); return sh; };
  const zf = D / 2 + 4.62, yb = F + 4.55;
  const board = new THREE.Mesh(new THREE.ExtrudeGeometry(band(0.24), { depth: 0.22, bevelEnabled: false, curveSegments: 1 }), MAT.kuro); board.position.set(0, yb, zf - 0.22); board.castShadow = true; g.add(board);
  const slab = new THREE.Mesh(new THREE.ExtrudeGeometry(band(0.1), { depth: 2.6, bevelEnabled: false, curveSegments: 1 }), MAT.copper); slab.position.set(0, yb + 0.28, zf - 2.75); slab.castShadow = true; g.add(slab);
  const edge = []; for (let i = 0; i <= 40; i++) { const x = -hw + (2 * hw * i) / 40; edge.push(new THREE.Vector3(x, yb + prof(x) + 0.26, zf + 0.01)); }
  g.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(edge), 60, 0.05, 6, false), MAT.gold));
  // 懸魚（中央の金の飾り）
  const gegyo = new THREE.Group(); gegyo.position.set(0, yb + 1.05, zf + 0.04); g.add(gegyo);
  const petal = new THREE.CylinderGeometry(0.16, 0.16, 0.05, 16);
  for (let k = 0; k < 6; k++) { const a = (k / 6) * Math.PI * 2, p = new THREE.Mesh(petal, MAT.gold); p.rotation.x = Math.PI / 2; p.position.set(Math.cos(a) * 0.22, Math.sin(a) * 0.22 - 0.25, 0); gegyo.add(p); }
  const core = new THREE.Mesh(new THREE.SphereGeometry(0.14, 12, 10), MAT.gold); core.position.y = -0.25; gegyo.add(core);
  // 蟇股（極彩色の彫刻）：正面の柱の間と向拝に
  if (!KAERU) {
    const c = document.createElement("canvas"); c.width = 256; c.height = 128; const x = c.getContext("2d");
    x.fillStyle = "#1d2a3a"; x.fillRect(0, 0, 256, 128);
    x.strokeStyle = "#e3b54a"; x.lineWidth = 8; x.beginPath(); x.moveTo(8, 120); x.quadraticCurveTo(128, -30, 248, 120); x.stroke();
    const leaf = (lx, ly, r, rot) => { x.save(); x.translate(lx, ly); x.rotate(rot); x.fillStyle = "#3f8a4a"; x.beginPath(); x.ellipse(0, 0, r * 1.6, r * 0.6, 0, 0, 7); x.fill(); x.restore(); };
    for (const [lx, ly, r, rt] of [[70, 92, 16, -0.5], [186, 92, 16, 0.5], [96, 108, 13, -0.2], [160, 108, 13, 0.2], [52, 70, 12, -0.9], [204, 70, 12, 0.9]]) leaf(lx, ly, r, rt);
    for (let k = 0; k < 10; k++) { const a = (k / 10) * Math.PI * 2; x.fillStyle = k % 2 ? "#e85a6a" : "#d23a4a"; x.beginPath(); x.ellipse(128 + Math.cos(a) * 18, 76 + Math.sin(a) * 14, 18, 11, a, 0, 7); x.fill(); }
    x.fillStyle = "#f6d36b"; x.beginPath(); x.arc(128, 76, 11, 0, 7); x.fill();
    for (const [bx, col] of [[40, "#f3a6b8"], [216, "#8ac6e8"]]) { x.fillStyle = col; for (let k = 0; k < 6; k++) { const a = (k / 6) * Math.PI * 2; x.beginPath(); x.arc(bx + Math.cos(a) * 8, 46 + Math.sin(a) * 8, 7, 0, 7); x.fill(); } x.fillStyle = "#f6d36b"; x.beginPath(); x.arc(bx, 46, 5, 0, 7); x.fill(); }
    x.strokeStyle = "#e3b54a"; x.lineWidth = 6; x.strokeRect(3, 3, 250, 122);
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; KAERU = new THREE.MeshStandardMaterial({ map: t, roughness: 0.55, metalness: 0.12 });
  }
  for (const cx of [-7, -4, 0, 4, 7]) { const p = new THREE.Mesh(new THREE.PlaneGeometry(cx === 0 ? 2.6 : 1.9, 0.62), KAERU); p.position.set(cx, F + 4.63, D / 2 + 0.13); g.add(p); }
  { const p = new THREE.Mesh(new THREE.PlaneGeometry(2.8, 0.7), KAERU); p.position.set(0, F + 4.0, D / 2 + 2.77); g.add(p); }
  // 飾り金具：柱の頭と足に金の輪
  const ring = new THREE.TorusGeometry(0.33, 0.05, 6, 20);
  const cols = [-8.6, -5.4, -2.6, 2.6, 5.4, 8.6];
  for (const cx of cols) for (const cz of [-D / 2 + 0.4, D / 2 - 0.4]) for (const yy of [F + 4.75, F + 0.55]) { const r = new THREE.Mesh(ring, MAT.gold); r.rotation.x = Math.PI / 2; r.position.set(cx, yy, cz); g.add(r); }
  for (const cx of [-3.4, 3.4]) for (const yy of [F + 4.05, F + 0.55]) { const r = new THREE.Mesh(ring, MAT.gold); r.rotation.x = Math.PI / 2; r.position.set(cx, yy, D / 2 + 2.6); g.add(r); }
}

// 本殿の内陣：御簾・神鏡・御幣・鏡餅・榊・大太鼓・釣灯籠
function hondenInterior(g, env, W, D, F) {
  const y0 = F + 0.3, zb = -D / 2 + 1.0;
  // 格天井の天井画と、奥の壁の老松
  const ceil = new THREE.Mesh(new THREE.PlaneGeometry(W - 1, D - 1), artMat("tenjo", [3, 2])); ceil.rotation.x = Math.PI / 2; ceil.position.set(0, F + 4.93, 0); g.add(ceil);
  const pine = new THREE.Mesh(new THREE.PlaneGeometry(13.8, 4.55), artMat("matsu")); pine.position.set(0, F + 2.6, -D / 2 + 0.7); g.add(pine);
  // 内陣の壇（二段）と金の縁
  box(g, W - 5, 0.45, 2.6, MAT.woodD, 0, y0 + 0.22, zb + 0.9);
  box(g, W - 8, 0.45, 1.6, MAT.wood, 0, y0 + 0.67, zb + 0.5);
  for (const [w, yy, zz] of [[W - 5, y0 + 0.46, zb + 2.2], [W - 8, y0 + 0.91, zb + 1.3]]) box(g, w, 0.06, 0.06, MAT.gold, 0, yy, zz, false);
  // 神鏡（台つき）
  const mirM = new THREE.MeshStandardMaterial({ color: 0xf2f5fa, metalness: 1, roughness: 0.06 });
  box(g, 0.5, 0.9, 0.3, MAT.kuro, 0, y0 + 1.35, zb + 0.4);
  const mir = cyl(g, 0.75, 0.75, 0.08, mirM, 0, y0 + 2.4, zb + 0.4, 40); mir.rotation.x = Math.PI / 2;
  const rim = new THREE.Mesh(new THREE.TorusGeometry(0.78, 0.06, 8, 40), MAT.gold); rim.position.set(0, y0 + 2.4, zb + 0.44); g.add(rim);
  // 御幣（金の紙垂）
  for (const s of [-1, 1]) {
    cyl(g, 0.04, 0.04, 2.0, MAT.woodL, s * 1.6, y0 + 1.9, zb + 0.5, 6);
    for (let k = 0; k < 4; k++) { const p = box(g, 0.22, 0.34, 0.02, k % 2 ? MAT.paperW : MAT.gold, s * 1.6 + (k % 2 ? 0.12 : -0.12), y0 + 2.75 - k * 0.3, zb + 0.5, false); p.rotation.z = (k % 2 ? 1 : -1) * 0.25; }
  }
  // 榊（左右）
  const sakM = std(0x2c5a2c, { roughness: 0.8 });
  for (const s of [-1, 1]) {
    cyl(g, 0.12, 0.1, 0.5, MAT.white, s * 2.7, y0 + 1.15, zb + 0.6, 10);
    for (let k = 0; k < 7; k++) { const l = new THREE.Mesh(new THREE.IcosahedronGeometry(0.2, 0), sakM); l.scale.set(1, 0.55, 0.7); l.position.set(s * 2.7 + Math.sin(k * 2.3) * 0.2, y0 + 1.5 + k * 0.13, zb + 0.6 + Math.cos(k * 1.7) * 0.12); g.add(l); }
  }
  // 三方に鏡餅・お神酒
  const mochiM = std(0xfbf8f0, { roughness: 0.7 }), daiM = std(0xff8a1e, { roughness: 0.6 });
  for (const s of [-1, 1]) {
    const cx = s * 3.9; box(g, 0.7, 0.35, 0.7, MAT.woodL, cx, y0 + 0.62, zb + 1.7);
    const m1 = new THREE.Mesh(new THREE.SphereGeometry(0.3, 16, 10), mochiM); m1.scale.y = 0.5; m1.position.set(cx, y0 + 0.92, zb + 1.7); g.add(m1);
    const m2 = new THREE.Mesh(new THREE.SphereGeometry(0.22, 16, 10), mochiM); m2.scale.y = 0.55; m2.position.set(cx, y0 + 1.08, zb + 1.7); g.add(m2);
    const dd = new THREE.Mesh(new THREE.SphereGeometry(0.1, 10, 8), daiM); dd.position.set(cx, y0 + 1.22, zb + 1.7); g.add(dd);
    for (const dz of [-0.25, 0.25]) cyl(g, 0.08, 0.1, 0.36, MAT.white, s * 4.9, y0 + 0.62, zb + 1.7 + dz, 10);
  }
  // 御簾（すだれ）と紫の房
  const misuM = misuMat(6);
  const misu = new THREE.Mesh(new THREE.PlaneGeometry(W - 6, 1.4), misuM); misu.position.set(0, F + 4.0, zb + 2.3); g.add(misu);
  box(g, W - 5.6, 0.14, 0.14, MAT.kuro, 0, F + 4.75, zb + 2.3, false);
  const fusaM = std(0x6a2a8a, { roughness: 0.8 });
  for (const s of [-1, 0, 1]) { const f = cyl(g, 0.02, 0.12, 0.7, fusaM, s * 3.2, F + 3.0, zb + 2.36, 8, false); }
  // 御扉：奥の本殿へ通じる黒漆の折戸（金の飾り）。祈祷の祝詞の前に開き、奥から光があふれる（開扉・閉扉）
  const zd = -D / 2 + 0.78, yc = y0 + 2.6;
  const doors = new THREE.Group(); doors.userData.live = true; g.add(doors);   // 動くので freeze しない
  const gc = document.createElement("canvas"); gc.width = gc.height = 128; const gx = gc.getContext("2d");
  const rg0 = gx.createRadialGradient(64, 70, 4, 64, 70, 80); rg0.addColorStop(0, "#fff4d6"); rg0.addColorStop(0.35, "#ffd98a"); rg0.addColorStop(0.75, "#e8a850"); rg0.addColorStop(1, "#8a5420");
  gx.fillStyle = rg0; gx.fillRect(0, 0, 128, 128);
  const glowT = new THREE.CanvasTexture(gc); glowT.colorSpace = THREE.SRGBColorSpace;
  const glow = new THREE.Mesh(new THREE.PlaneGeometry(3.3, 3.3), new THREE.MeshBasicMaterial({ map: glowT, transparent: true, opacity: 0, depthWrite: false, toneMapped: false, fog: false }));
  glow.material.color.setRGB(2.2, 1.9, 1.45); glow.position.set(0, yc, zd - 0.035); glow.visible = false; glow.renderOrder = 3; doors.add(glow);
  const sc = document.createElement("canvas"); sc.width = 64; sc.height = 64; const sx2 = sc.getContext("2d");
  const rg1 = sx2.createRadialGradient(32, 32, 0, 32, 32, 32); rg1.addColorStop(0, "rgba(255,226,160,1)"); rg1.addColorStop(1, "rgba(255,200,120,0)"); sx2.fillStyle = rg1; sx2.fillRect(0, 0, 64, 64);
  const spill = new THREE.Mesh(new THREE.PlaneGeometry(7, 6), new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(sc), transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false, fog: false }));
  spill.position.set(0, yc, zd + 0.25); spill.visible = false; doors.add(spill);
  const leaves = [], ringG = new THREE.TorusGeometry(0.1, 0.022, 6, 16);
  const panel = (p, s, edge) => {
    box(p, 0.85, 3.4, 0.1, MAT.kuro, -s * 0.425, 0, 0);
    for (const yy of [-1.2, 0, 1.2]) box(p, 0.72, 0.1, 0.02, MAT.gold, -s * 0.425, yy, 0.06, false);
    if (edge) { box(p, 0.04, 3.3, 0.02, MAT.gold, -s * 0.83, 0, 0.06, false); const rg = new THREE.Mesh(ringG, MAT.gold); rg.position.set(-s * 0.62, -0.2, 0.08); p.add(rg); }
  };
  for (const s of [-1, 1]) {
    const outer = new THREE.Group(); outer.position.set(s * 1.7, yc, zd); doors.add(outer); panel(outer, s, false);
    const inner = new THREE.Group(); inner.position.set(-s * 0.85, 0, 0); outer.add(inner); panel(inner, s, true);
    leaves.push({ s, outer, inner });
  }
  // k: 0 閉じる → 1 開く。外の戸が奥へ、内の戸が折り返す（奥行き 0.8 に収まる）
  const setDoors = (k) => {
    const a = k * 1.2;
    for (const l of leaves) { l.outer.rotation.y = -l.s * a; l.inner.rotation.y = l.s * 2 * a; }
    glow.material.opacity = Math.min(1, k * 1.6); glow.visible = k > 0.005;
    spill.material.opacity = k * 0.55; spill.visible = k > 0.005;
  };
  // 神饌：三方に米・酒・塩・水・魚・野菜・果物
  const sanbo = (x, z, item) => { box(g, 0.5, 0.05, 0.5, MAT.woodL, x, y0 + 0.75, z); box(g, 0.34, 0.25, 0.34, MAT.woodL, x, y0 + 0.6, z); item(x, y0 + 0.78, z); };
  const white = std(0xfbfaf4, { roughness: 0.6 }), fishM = std(0xc8835a, { roughness: 0.5, metalness: 0.2 });
  const items = [
    (x, y, z) => { const m = new THREE.Mesh(new THREE.SphereGeometry(0.17, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2), white); m.position.set(x, y, z); g.add(m); },                       // 米
    (x, y, z) => { for (const d of [-0.1, 0.1]) cyl(g, 0.055, 0.075, 0.3, white, x + d, y + 0.15, z, 10, false); },                                                                       // 御神酒
    (x, y, z) => { const m = new THREE.Mesh(new THREE.ConeGeometry(0.13, 0.22, 12), white); m.position.set(x, y + 0.11, z); g.add(m); },                                             // 塩
    (x, y, z) => { cyl(g, 0.1, 0.08, 0.12, white, x, y + 0.06, z, 12, false); },                                                                                                     // 水
    (x, y, z) => { const m = new THREE.Mesh(new THREE.SphereGeometry(0.1, 10, 8), fishM); m.scale.set(2.2, 0.6, 0.8); m.position.set(x, y + 0.06, z); g.add(m); },                    // 魚
    (x, y, z) => { for (let k = 0; k < 3; k++) { const m = new THREE.Mesh(new THREE.SphereGeometry(0.07, 8, 6), std(0x4f8a3a)); m.scale.set(0.8, 1.6, 0.8); m.position.set(x - 0.08 + k * 0.08, y + 0.1, z); g.add(m); } },   // 野菜
    (x, y, z) => { for (let k = 0; k < 4; k++) { const m = new THREE.Mesh(new THREE.SphereGeometry(0.07, 10, 8), std(k % 2 ? 0xe07a2a : 0xc8281e, { roughness: 0.4 })); m.position.set(x - 0.06 + (k % 2) * 0.12, y + 0.07 + Math.floor(k / 2) * 0.1, z); g.add(m); } },   // 果物
  ];
  items.forEach((it, i) => sanbo(-2.4 + i * 0.8, zb + 1.85, it));
  // 真榊：五色の絹と、鏡・剣・玉
  const silk = [0x2c6db3, 0xf6d36b, 0xd9412b, 0xf4f1ea, 0x6a2a8a];
  for (const s of [-1, 1]) {
    const sx = s * 5.9, sz = zb + 2.6;
    box(g, 0.6, 0.18, 0.6, MAT.kuro, sx, y0 + 0.09, sz); cyl(g, 0.04, 0.05, 3.0, MAT.woodL, sx, y0 + 1.6, sz, 8);
    for (let k = 0; k < 8; k++) { const l = new THREE.Mesh(new THREE.IcosahedronGeometry(0.22, 0), std(0x2c5a2c)); l.scale.set(1, 0.55, 0.7); l.position.set(sx + Math.sin(k * 2.1) * 0.25, y0 + 3.0 + (k % 3) * 0.12, sz + Math.cos(k * 1.7) * 0.2); g.add(l); }
    silk.forEach((c, k) => { const b = new THREE.Mesh(new THREE.PlaneGeometry(0.12, 1.7), std(c, { side: THREE.DoubleSide, roughness: 0.6 })); b.position.set(sx - 0.24 + k * 0.12, y0 + 2.05, sz + 0.06); g.add(b); });
    if (s > 0) { const mr = cyl(g, 0.2, 0.2, 0.03, std(0xf2f5fa, { metalness: 1, roughness: 0.06 }), sx, y0 + 2.75, sz + 0.1, 20, false); mr.rotation.x = Math.PI / 2; }
    else { box(g, 0.05, 0.75, 0.02, std(0xdfe4ea, { metalness: 1, roughness: 0.15 }), sx, y0 + 2.4, sz + 0.1, false); box(g, 0.18, 0.04, 0.04, MAT.gold, sx, y0 + 2.0, sz + 0.1, false); }
    const jewel = new THREE.Mesh(new THREE.TorusGeometry(0.06, 0.03, 6, 12, Math.PI * 1.4), std(0x3f9a6a, { roughness: 0.3 })); jewel.position.set(sx, y0 + 1.25, sz + 0.12); g.add(jewel);
  }
  // 雪洞（ぼんぼり）：参道の両脇に
  for (const sx of [-2.4, 2.4]) for (const zz of [0.2, 3.4]) {
    cyl(g, 0.03, 0.05, 1.1, MAT.kuro, sx, y0 + 0.55, zz, 6, false); box(g, 0.34, 0.03, 0.34, MAT.kuro, sx, y0 + 0.02, zz, false);
    cyl(g, 0.17, 0.14, 0.42, sharedLamp(0xfff4dc, 0xffb050, 2.2, env), sx, y0 + 1.3, zz, 6, false);
    cyl(g, 0.19, 0.19, 0.03, MAT.shu, sx, y0 + 1.52, zz, 6, false);
  }
  // 結界：参拝者はここまで（祭壇の手前の低い柵としめ縄）
  for (const s of [-1, 1]) {
    const x0 = s * 1.6, x1 = s * (W / 2 - 1.2), cxm = (x0 + x1) / 2, len = Math.abs(x1 - x0), zz = -2.05;
    box(g, len, 0.07, 0.07, MAT.kuro, cxm, y0 + 0.42, zz); box(g, len, 0.05, 0.05, MAT.kuro, cxm, y0 + 0.18, zz, false);
    for (let k = 0; k <= 5; k++) cyl(g, 0.045, 0.05, 0.48, MAT.kuro, x0 + (x1 - x0) * (k / 5), y0 + 0.24, zz, 6, false);
    const r = cyl(g, 0.03, 0.03, len, MAT.rope, cxm, y0 + 0.5, zz + 0.02, 6, false); r.rotation.z = Math.PI / 2;
    for (let k = 0; k < 4; k++) box(g, 0.1, 0.22, 0.01, MAT.paperW, x0 + (x1 - x0) * ((k + 0.5) / 4), y0 + 0.36, zz + 0.04, false);
  }
  // 大太鼓（左手）
  const drumG = new THREE.Group(); drumG.position.set(-7.5, y0, -3.3); g.add(drumG);
  for (const s of [-1, 1]) { box(drumG, 0.12, 1.4, 0.12, MAT.woodD, s * 0.75, 0.7, 0); }
  box(drumG, 1.7, 0.12, 0.3, MAT.woodD, 0, 0.15, 0);
  const body = cyl(drumG, 0.62, 0.62, 0.9, std(0x7a3a1c, { roughness: 0.5 }), 0, 1.3, 0, 24); body.rotation.z = Math.PI / 2;
  for (const s of [-1, 1]) { const hd = cyl(drumG, 0.6, 0.6, 0.02, std(0xe9dcc0, { roughness: 0.8 }), s * 0.46, 1.3, 0, 24, false); hd.rotation.z = Math.PI / 2;
    const tm = new THREE.Mesh(new THREE.CircleGeometry(0.28, 3), std(0x1a1a1a)); tm.position.set(s * 0.475, 1.3, 0); tm.rotation.y = s * Math.PI / 2; drumG.add(tm); }
  drumG.rotation.y = 0.9;
  // 釣灯籠（青銅）：向拝の両脇の軒に
  for (const cx of [-7, -4.2, 4.2, 7]) tsuriDoro(g, cx, F + 4.75, D / 2 - 0.1);
  lightSpot(g, F + 2.5, 6, 10, 0xffc27a);
  return { mir, setDoors };
}

// 襖絵・天井画（AI で描いた絵。img/gen/）：金箔が少し光るように
const ART = new Map();
export function artMat(name, rep = [1, 1]) {
  const k = name + rep.join("x");
  if (!ART.has(k)) {
    const t = new THREE.TextureLoader().load(`img/gen/${name}.jpg`); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8;
    if (rep[0] !== 1 || rep[1] !== 1) { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(rep[0], rep[1]); }
    ART.set(k, new THREE.MeshStandardMaterial({ map: t, roughness: 0.55, metalness: 0.18 }));
  }
  return ART.get(k);
}
// 御簾の素材（すだれ＋紫の帯）
function misuMat(rep) {
  const cv = document.createElement("canvas"); cv.width = 64; cv.height = 128; const x = cv.getContext("2d");
  for (let yy = 0; yy < 128; yy += 4) { x.fillStyle = `rgba(${150 + Math.random() * 30},${115 + Math.random() * 20},60,0.9)`; x.fillRect(0, yy, 64, 3); }
  x.fillStyle = "rgba(90,40,110,.95)"; for (const yy of [30, 90]) x.fillRect(0, yy, 64, 4);
  const tx = new THREE.CanvasTexture(cv); tx.colorSpace = THREE.SRGBColorSpace; tx.wrapS = THREE.RepeatWrapping; tx.repeat.set(rep, 1);
  return new THREE.MeshStandardMaterial({ map: tx, transparent: true, opacity: 0.88, roughness: 0.9, side: THREE.DoubleSide });
}
// 釣灯籠（青銅）
const BRONZE = std(0x6f6a3a, { metalness: 0.7, roughness: 0.45 });
function tsuriDoro(g, cx, y, z, s = 1) {
  const tg = new THREE.Group(); tg.position.set(cx, y, z); tg.scale.setScalar(s); g.add(tg);
  cyl(tg, 0.015, 0.015, 0.5, BRONZE, 0, -0.2, 0, 4, false);
  const cap = new THREE.Mesh(new THREE.ConeGeometry(0.34, 0.25, 6), BRONZE); cap.position.y = -0.55; tg.add(cap);
  cyl(tg, 0.2, 0.2, 0.42, sharedLamp(0xfff0c8, 0xffa040, 2.0), 0, -0.88, 0, 6, false);
  cyl(tg, 0.24, 0.16, 0.1, BRONZE, 0, -1.14, 0, 6, false);
  for (let k = 0; k < 6; k++) { const a = (k / 6) * Math.PI * 2; box(tg, 0.03, 0.44, 0.03, BRONZE, Math.cos(a) * 0.21, -0.88, Math.sin(a) * 0.21, false); }
  return tg;
}
// 縦書きの掛け軸（壁に掛ける。rotY で向き）
export function kakejiku(g, text, x, y, z, rotY, accent = "#b8321e") {
  const cv = document.createElement("canvas"); cv.width = 128; cv.height = 320; const c = cv.getContext("2d");
  c.fillStyle = "#3a5a4a"; c.fillRect(0, 0, 128, 320);                       // 表装
  c.fillStyle = "#f4ecd8"; c.fillRect(14, 34, 100, 252);                      // 本紙
  c.fillStyle = "#1a1612"; c.font = `bold 50px "Hiragino Mincho ProN","Yu Mincho","Noto Serif JP",serif`; c.textAlign = "center"; c.textBaseline = "top";
  [...text].forEach((ch, i) => c.fillText(ch, 64, 46 + i * 58));
  c.fillStyle = accent; c.fillRect(80, 258, 18, 18);                          // 落款
  const tx = new THREE.CanvasTexture(cv); tx.colorSpace = THREE.SRGBColorSpace; tx.anisotropy = 4;
  const sg = new THREE.Group(); sg.position.set(x, y, z); sg.rotation.y = rotY; g.add(sg);
  sg.add(new THREE.Mesh(new THREE.PlaneGeometry(0.62, 1.55), new THREE.MeshStandardMaterial({ map: tx, roughness: 0.9 })));
  for (const dy of [0.79, -0.79]) { const r = cyl(sg, 0.03, 0.03, 0.72, dy > 0 ? MAT.woodD : MAT.kuro, 0, dy, 0.02, 6, false); r.rotation.z = Math.PI / 2; }
  return sg;
}
// 絵馬掛け（壁ぞい・InstancedMesh）。side: 壁が +x なら 1、-x なら -1
function emaWall(g, x, z0, z1, y, side, colors) {
  const rows = 3, per = Math.floor((z1 - z0) / 0.36), n = rows * per;
  for (let r = 0; r < rows; r++) box(g, 0.05, 0.05, z1 - z0 + 0.2, MAT.woodD, x - side * 0.05, y + 0.15 - r * 0.38, (z0 + z1) / 2, false);
  const sh = new THREE.Shape(); sh.moveTo(-0.15, -0.1); sh.lineTo(0.15, -0.1); sh.lineTo(0.15, 0.06); sh.lineTo(0, 0.13); sh.lineTo(-0.15, 0.06); sh.closePath();
  const geo = new THREE.ExtrudeGeometry(sh, { depth: 0.02, bevelEnabled: false });
  const im = new THREE.InstancedMesh(geo, std(0xffffff, { roughness: 0.85 }), n), o = new THREE.Object3D(), col = new THREE.Color();
  let i = 0;
  for (let r = 0; r < rows; r++) for (let k = 0; k < per; k++) {
    o.position.set(x - side * 0.1, y - r * 0.38 + (Math.random() - 0.5) * 0.02, z0 + 0.18 + k * 0.36 + (Math.random() - 0.5) * 0.05);
    o.rotation.set(0, -side * Math.PI / 2, (Math.random() - 0.5) * 0.2); o.updateMatrix(); im.setMatrixAt(i, o.matrix);
    im.setColorAt(i++, col.set(Math.random() < 0.65 ? 0xe9cf9e : colors[Math.floor(Math.random() * colors.length)]));
  }
  im.castShadow = true; g.add(im); return im;
}

// ------------------------------------------------------------------ 小さな社（縁結び・合格）— 中に入れる
export function smallHall(parent, env, { x, z, W = 13, D = 10, F = 0.6, roofMat = MAT.copper, zabMat, theme, crest = 0xffffff }) {
  const g = new THREE.Group(); g.position.set(x, 0, z); parent.add(g); g.userData.static = true;
  const fz = D / 2;                                                                  // 正面の柱の線
  // 基壇・正面の階段（三段）
  box(g, W + 1.2, F, D + 1.2, MAT.stoneD, 0, F / 2, 0);
  box(g, W + 1.5, 0.12, D + 1.5, MAT.stoneL, 0, 0.06, 0);
  for (let i = 0; i < 3; i++) box(g, 4.4, F / 3, 0.45, MAT.stoneL, 0, (F / 3) * (i + 0.5), fz + 1.25 - i * 0.42);
  box(g, W, 0.06, D, MAT.tatami, 0, F + 0.03, 0);
  box(g, W + 0.6, 0.1, 0.9, MAT.wood, 0, F + 0.02, fz + 0.15);                    // 縁側
  // 柱・壁・障子
  const colX = [-W / 2, -W / 4, -2.2, 2.2, W / 4, W / 2];
  for (const cx of colX) for (const cz of [-fz, fz]) cyl(g, 0.22, 0.22, 4.6, MAT.shu, cx, F + 2.3, cz, 14);   // 柱を高く（堂々と）
  for (const cz of [-fz / 3, fz / 3]) for (const s of [-1, 1]) cyl(g, 0.22, 0.22, 4.6, MAT.shu, s * W / 2, F + 2.3, cz, 14);
  // 欄間：壁の上に、透かし彫りの帯（四面）
  { const rm = KAERU || MAT.woodL; const fr = new THREE.Mesh(new THREE.PlaneGeometry(W - 0.4, 0.9), rm); fr.position.set(0, F + 3.95, fz + 0.02); g.add(fr);
    const bk = new THREE.Mesh(new THREE.PlaneGeometry(W - 0.4, 0.9), rm); bk.position.set(0, F + 3.95, -fz + 0.15); g.add(bk);
    for (const s of [-1, 1]) { const sd = new THREE.Mesh(new THREE.PlaneGeometry(D - 0.4, 0.9), rm); sd.position.set(s * (W / 2 - 0.02), F + 3.95, 0); sd.rotation.y = s * Math.PI / 2; g.add(sd); }
    box(g, W + 0.3, 0.16, D + 0.3, MAT.shuD, 0, F + 3.45, 0); }
  box(g, W, 3.4, 0.16, MAT.woodL, 0, F + 1.7, -fz + 0.05);
  for (const s of [-1, 1]) box(g, 0.16, 3.4, D, MAT.woodL, s * (W / 2 - 0.05), F + 1.7, 0);
  for (const cx of [-4.2, -1.4, 1.4, 4.2]) box(g, 2.4, 2.4, 0.05, MAT.shoji, cx, F + 1.7, -fz + 0.16, false);
  for (const s of [-1, 1]) for (const cz of [-2.2, 2.2]) box(g, 0.05, 2.2, 2.2, MAT.shoji, s * (W / 2 - 0.16), F + 1.7, cz, false);
  // 頭貫・欄間（金の線）
  box(g, W + 0.5, 0.32, D + 0.5, MAT.shuD, 0, F + 4.7, 0);
  for (const zz of [-fz - 0.27, fz + 0.27]) box(g, W + 0.5, 0.07, 0.04, MAT.gold, 0, F + 4.62, zz, false);
  // 高欄（正面の左右）
  for (const s of [-1, 1]) {
    const cx = s * (2.2 + (W / 2 - 2.2) / 2), w = W / 2 - 2.2;
    box(g, w, 0.08, 0.1, MAT.shu, cx, F + 0.75, fz + 0.55); box(g, w, 0.06, 0.08, MAT.shu, cx, F + 0.4, fz + 0.55, false);
    for (let k = 0; k <= 4; k++) cyl(g, 0.05, 0.05, 0.75, MAT.shu, s * (2.2 + (w * k) / 4), F + 0.38, fz + 0.55, 6, false);
    box(g, 0.08, 0.75, 0.9, MAT.shu, s * W / 2, F + 0.38, fz + 0.15, false);
  }
  // 幕（紫地に白い紋）：正面の梁から
  const cv = document.createElement("canvas"); cv.width = 512; cv.height = 64; const c2 = cv.getContext("2d");
  c2.fillStyle = "#4a2a6a"; c2.fillRect(0, 0, 512, 64);
  for (let i = 0; i < 4; i++) { const cx = 64 + i * 128; c2.fillStyle = "#" + crest.toString(16).padStart(6, "0"); c2.beginPath(); c2.arc(cx, 32, 20, 0, Math.PI * 2); c2.fill(); c2.fillStyle = "#4a2a6a"; c2.beginPath(); c2.arc(cx, 32, 12, 0, Math.PI * 2); c2.fill(); c2.fillStyle = "#" + crest.toString(16).padStart(6, "0"); c2.beginPath(); c2.arc(cx, 32, 6, 0, Math.PI * 2); c2.fill(); }
  const mt = new THREE.CanvasTexture(cv); mt.colorSpace = THREE.SRGBColorSpace;
  const maku = new THREE.Mesh(new THREE.PlaneGeometry(W, 0.55), new THREE.MeshStandardMaterial({ map: mt, roughness: 0.9, side: THREE.DoubleSide }));
  maku.position.set(0, F + 3.2, fz + 0.3); g.add(maku);
  // 大屋根
  roof(g, { w: W + 3.2, d: D + 3.8, h: 3.6, lift: 0.6, y: F + 4.85, mat: roofMat });
  // 向拝（正面に張り出す屋根と二本の柱）
  for (const s of [-1, 1]) cyl(g, 0.2, 0.2, 3.3, MAT.shu, s * 2.2, F / 2 + 1.5, fz + 2.6, 14);
  box(g, 5.0, 0.26, 0.3, MAT.shuD, 0, F + 3.15, fz + 2.6);
  roof(g, { w: 6.2, d: 3.4, h: 1.0, lift: 0.4, y: F + 3.25, z: fz + 2.2, mat: roofMat, ridgeGold: false });
  box(g, 1.1, 0.75, 0.08, MAT.kuro, 0, F + 2.8, fz + 2.78);                       // 扁額
  karahafu(g, { hw: 3.1, yb: F + 3.3, zf: fz + 3.95, h: 0.95, depth: 1.6, roofMat });
  goldRings(g, [-W / 2, -W / 4, -2.2, 2.2, W / 4, W / 2].map((cx) => [cx, fz]), [F + 0.35, F + 3.4, F + 4.45]);
  goldRings(g, [[-2.2, fz + 2.6], [2.2, fz + 2.6]], [F / 2 + 0.3, F + 2.95]);
  // しめ縄と紙垂
  const rope = new THREE.Mesh(new THREE.TorusGeometry(2.1, 0.13, 8, 32, Math.PI), MAT.rope); rope.rotation.z = Math.PI; rope.scale.y = 0.18; rope.position.set(0, F + 3.0, fz + 2.75); g.add(rope);
  for (const xx of [-1.3, -0.45, 0.45, 1.3]) box(g, 0.18, 0.46, 0.02, MAT.paperW, xx, F + 2.5, fz + 2.8, false);
  // 祭壇：二段の壇・神鏡・榊・灯明
  const ab = -fz + 0.9;
  box(g, 4.2, 0.5, 1.4, MAT.woodD, 0, F + 0.25, ab + 0.2);
  box(g, 3.0, 0.5, 0.9, MAT.wood, 0, F + 0.75, ab);
  box(g, 4.2, 0.05, 0.05, MAT.gold, 0, F + 0.5, ab + 0.9, false);
  const mir = cyl(g, 0.42, 0.42, 0.06, new THREE.MeshStandardMaterial({ color: 0xe8eef5, metalness: 1, roughness: 0.08 }), 0, F + 1.62, ab + 0.5, 32); mir.rotation.x = Math.PI / 2;   // 御神殿の扉の前に神鏡
  const rim = new THREE.Mesh(new THREE.TorusGeometry(0.45, 0.04, 8, 32), MAT.gold); rim.position.set(0, F + 1.62, ab + 0.54); g.add(rim);
  box(g, 0.3, 0.5, 0.2, MAT.kuro, 0, F + 1.38, ab + 0.45);
  const sakM = std(0x2f5a2e);
  for (const s of [-1, 1]) { cyl(g, 0.06, 0.08, 0.5, MAT.white, s * 1.45, F + 1.38, ab + 0.4, 8);
    for (let k = 0; k < 5; k++) { const l = new THREE.Mesh(new THREE.SphereGeometry(0.17, 8, 6), sakM); l.scale.set(1, 0.6, 0.6); l.position.set(s * 1.45, F + 1.68 + k * 0.1, ab + 0.4); g.add(l); }
    for (const dx of [0.3, 0.55]) { cyl(g, 0.05, 0.06, 0.2, MAT.kuro, s * (1.5 + dx), F + 0.6, ab + 0.65, 8, false); cyl(g, 0.03, 0.03, 0.08, lampMat(0xfff4d8, 0xffb050, 3), s * (1.5 + dx), F + 0.74, ab + 0.65, 6, false); }
  }
  lightSpot(g, F + 2.6, 10, 14, 0xffb36b);
  hallShrine(g, env, W, D, F, ab);
  // 座布団 4列×5
  const cushions = [];
  for (let r = 0; r < 4; r++) for (let c = 0; c < 5; c++) { const cx = -3.6 + c * 1.8, cz = -1.6 + r * 1.45; box(g, 0.85, 0.12, 0.85, zabMat, cx, F + 0.1, cz); cushions.push([x + cx, z + cz]); }
  for (const s of [-1, 1]) chochin(g, s * 3.6, F + 2.6, fz + 1.4, env, 0.95);
  smallHallInterior(g, theme, W, D, F);
  return { group: g, cushions, altar: [x, z - fz + 1.6] };
}

// 小さな社の内装：共通（御簾・御幣・釣灯籠・絵馬掛け）＋社ごとの飾り
// 社の中の御神殿：祭壇の奥、一段高い壇に小さな流造の社（黒漆の扉に金の金具・御簾）。
// 両脇に狛犬、雪洞、三方の神饌、五色幕、太鼓。がらんとした広間に「お祀りしている」場所をつくる
function hallShrine(g, env, W, D, F, ab) {
  const zb = -D / 2;
  box(g, 5.4, 0.35, 1.5, MAT.kuro, 0, F + 0.95, zb + 0.75); box(g, 5.6, 0.05, 1.6, MAT.gold, 0, F + 1.13, zb + 0.75, false);   // 内陣の壇
  const sg = new THREE.Group(); sg.position.set(0, F + 1.15, zb + 0.75); g.add(sg);                                 // 御神殿
  box(sg, 1.7, 0.18, 1.1, MAT.woodD, 0, 0.09, 0);
  for (const sx of [-0.7, 0.7]) for (const sz of [-0.4, 0.4]) cyl(sg, 0.05, 0.05, 1.05, MAT.shu, sx, 0.7, sz, 8);
  box(sg, 1.3, 0.95, 0.06, MAT.kuro, 0, 0.66, 0.42); box(sg, 0.03, 0.9, 0.02, MAT.gold, 0, 0.66, 0.46, false);
  for (const s of [-1, 1]) for (const yy of [0.35, 0.66, 0.97]) box(sg, 0.5, 0.04, 0.02, MAT.gold, s * 0.33, yy, 0.46, false);
  const ms = new THREE.Mesh(new THREE.PlaneGeometry(1.3, 0.3), misuMat(2)); ms.position.set(0, 1.08, 0.47); sg.add(ms);
  roof(sg, { w: 2.1, d: 1.9, h: 0.7, lift: 0.22, y: 1.22, z: 0.12, mat: MAT.copper, ridgeGold: true });
  for (const s of [-1, 1]) { const ch = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.42, 0.05), MAT.gold); ch.position.set(s * 0.35, 2.05, 0.12); ch.rotation.z = s * 0.5; sg.add(ch); }   // 千木
  // 狛犬（祭壇の左右）：台座にすわる獅子
  const stone = std(0xd8d2c6, { roughness: 0.9 });
  for (const s of [-1, 1]) {
    const k = new THREE.Group(); k.position.set(s * 2.35, F, ab + 1.25); k.rotation.y = -s * 0.35; g.add(k);
    box(k, 0.6, 0.5, 0.6, MAT.stoneD, 0, 0.25, 0);
    const b = new THREE.Mesh(new THREE.SphereGeometry(0.25, 12, 10), stone); b.scale.set(0.9, 1.15, 1.1); b.position.set(0, 0.78, -0.02); k.add(b);
    const h = new THREE.Mesh(new THREE.SphereGeometry(0.2, 12, 10), stone); h.position.set(0, 1.12, 0.12); k.add(h);
    const mane = new THREE.Mesh(new THREE.TorusGeometry(0.17, 0.07, 6, 14), stone); mane.position.set(0, 1.1, 0.06); k.add(mane);
    for (const e of [-1, 1]) { const ey = new THREE.Mesh(new THREE.SphereGeometry(0.03, 6, 6), std(0x2a2622)); ey.position.set(e * 0.08, 1.16, 0.3); k.add(ey); }
    const mo = new THREE.Mesh(new THREE.BoxGeometry(0.14, s > 0 ? 0.06 : 0.02, 0.04), std(0x7a3a2a)); mo.position.set(0, 1.04, 0.31); k.add(mo);   // 阿（口を開く）・吽（閉じる）
    for (const fx of [-0.1, 0.1]) { const l = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.06, 0.3, 6), stone); l.position.set(fx, 0.62, 0.17); k.add(l); }
  }
  // 雪洞（灯りの立つ台）と三方の神饌
  const lampM = sharedLamp(0xfff2d6, 0xffb060, 2.2, env);
  for (const s of [-1, 1]) {
    cyl(g, 0.04, 0.05, 1.1, MAT.kuro, s * 3.2, F + 0.55, ab + 0.6, 8);
    const sh = cyl(g, 0.17, 0.14, 0.42, lampM, s * 3.2, F + 1.3, ab + 0.6, 10, false);
    box(g, 0.42, 0.04, 0.42, MAT.woodL, s * 1.6, F + 1.05, ab + 0.15); box(g, 0.26, 0.2, 0.26, MAT.woodL, s * 1.6, F + 0.93, ab + 0.15);
    const fr = new THREE.Mesh(new THREE.SphereGeometry(0.09, 10, 8), std(s > 0 ? 0xe07a2a : 0xc8281e)); fr.position.set(s * 1.6, F + 1.15, ab + 0.15); g.add(fr);
  }
  // 五色幕（左右の壁）
  const cols = [0x2c6db3, 0xd9412b, 0xf6d36b, 0xfbfaf4, 0x6a2a8a];
  for (const s of [-1, 1]) for (let k = 0; k < 5; k++) { const p = new THREE.Mesh(new THREE.PlaneGeometry(0.42, 2.4), std(cols[k], { side: THREE.DoubleSide, roughness: 0.9 }));
    p.position.set(s * (W / 2 - 0.2), F + 2.0, zb + 1.4 + k * 0.44); p.rotation.y = s * Math.PI / 2; g.add(p); }
  // 太鼓（右手前）
  const td = new THREE.Group(); td.position.set(W / 2 - 1.3, F, D / 2 - 1.4); td.rotation.y = -0.6; g.add(td);
  for (const s of [-1, 1]) box(td, 0.08, 1.0, 0.08, MAT.woodD, s * 0.48, 0.5, 0);
  const tb = cyl(td, 0.42, 0.42, 0.6, std(0x7a3a1c, { roughness: 0.5 }), 0, 1.0, 0, 20); tb.rotation.z = Math.PI / 2;
  for (const s of [-1, 1]) { const hd = cyl(td, 0.4, 0.4, 0.02, std(0xe9dcc0), s * 0.31, 1.0, 0, 20, false); hd.rotation.z = Math.PI / 2; }
}

function smallHallInterior(g, theme, W, D, F) {
  const zb = -D / 2, xw = W / 2 - 0.13;
  // 奥の壁の襖絵（縁結び：鶴と桜／合格：梅に月）
  if (theme) { const art = new THREE.Mesh(new THREE.PlaneGeometry(10.3, 3.4), artMat(theme === "en" ? "tsuru" : "ume")); art.position.set(0, F + 1.72, zb + 0.2); g.add(art); }
  // 御簾（祭壇の上）
  const misu = new THREE.Mesh(new THREE.PlaneGeometry(5.0, 0.5), misuMat(5)); misu.position.set(0, F + 2.95, zb + 1.9); g.add(misu);
  box(g, 5.3, 0.1, 0.1, MAT.kuro, 0, F + 3.22, zb + 1.9, false);
  // 御幣（祭壇の両端）
  for (const s of [-1, 1]) {
    cyl(g, 0.03, 0.03, 1.1, MAT.woodL, s * 1.95, F + 1.7, zb + 1.2, 6, false);
    for (let k = 0; k < 4; k++) { const p = box(g, 0.15, 0.24, 0.02, k % 2 ? MAT.paperW : MAT.gold, s * 1.95 + (k % 2 ? 0.08 : -0.08), F + 2.18 - k * 0.2, zb + 1.2, false); p.rotation.z = (k % 2 ? 1 : -1) * 0.25; }
  }
  // 釣灯籠（正面の軒）
  for (const cx of [-W / 4, W / 4]) tsuriDoro(g, cx, F + 3.5, D / 2 - 0.05, 0.8);
  if (theme === "en") {
    // 赤い糸：天井を渡る三本の糸
    const threadM = std(0xd61f3a, { emissive: 0x900018, emissiveIntensity: 0.7, roughness: 0.6 });
    for (const [zz, sag] of [[-2.0, 0.35], [0.5, 0.5], [3.0, 0.3]]) {
      const pts = []; for (let i = 0; i <= 20; i++) { const t = i / 20; pts.push(new THREE.Vector3(-xw + t * 2 * xw, F + 3.3 - Math.sin(t * Math.PI) * sag, zz + Math.sin(t * 9) * 0.06)); }
      g.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 40, 0.015, 4, false), threadM));
    }
    // 猪目（ハート）の板：祭壇の上
    const hs = new THREE.Shape(); hs.moveTo(0, -0.22); hs.bezierCurveTo(-0.3, 0, -0.26, 0.24, 0, 0.12); hs.bezierCurveTo(0.26, 0.24, 0.3, 0, 0, -0.22);
    box(g, 0.9, 0.62, 0.06, MAT.woodL, 0, F + 2.4, zb + 0.32);
    const heart = new THREE.Mesh(new THREE.ExtrudeGeometry(hs, { depth: 0.03, bevelEnabled: false }), std(0xd8436a, { emissive: 0x5a0a20, emissiveIntensity: 0.4 }));
    heart.position.set(0, F + 2.4, zb + 0.36); g.add(heart);
    // 千羽鶴（右の奥）
    const craneG = new THREE.OctahedronGeometry(0.06, 0), cols = [0xe64a6a, 0xf3a6b8, 0xf6d36b, 0x8ac6e8, 0xb48ae0, 0xffffff, 0x6fc28a];
    for (let k = 0; k < 7; k++) {
      const cx = xw - 1.8 + (k % 4) * 0.28, cz = zb + 0.45 + Math.floor(k / 4) * 0.3;
      cyl(g, 0.004, 0.004, 1.6, MAT.paperW, cx, F + 2.35, cz, 3, false);
      const m = std(cols[k], { roughness: 0.8 });
      for (let j = 0; j < 12; j++) { const c = new THREE.Mesh(craneG, m); c.scale.set(1.4, 0.6, 1); c.rotation.y = j * 0.7; c.position.set(cx, F + 3.05 - j * 0.12, cz); g.add(c); }
      cyl(g, 0.01, 0.05, 0.18, m, cx, F + 1.48, cz, 6, false);
    }
    // 夫婦石（左の奥）としめ縄
    const stM = std(0x8a857c, { roughness: 0.95, flatShading: true });
    for (const [cx, r] of [[-xw + 1.6, 0.42], [-xw + 2.4, 0.34]]) { const st = new THREE.Mesh(new THREE.IcosahedronGeometry(r, 1), stM); st.scale.y = 1.3; st.position.set(cx, F + r * 1.2, zb + 0.8); st.castShadow = true; g.add(st); }
    const sm = cyl(g, 0.04, 0.04, 0.95, MAT.rope, -xw + 2.0, F + 0.75, zb + 0.8, 8, false); sm.rotation.z = Math.PI / 2;
    for (const xx of [-xw + 1.85, -xw + 2.15]) box(g, 0.08, 0.2, 0.01, MAT.paperW, xx, F + 0.6, zb + 0.85, false);
    // 桃色の絵馬（左右の壁）
    for (const s of [-1, 1]) emaWall(g, s * xw, -2.2, 3.6, F + 1.9, s, [0xf3a6b8, 0xe64a6a, 0xffd6e0]);
  } else if (theme === "go") {
    // 掛け軸（左右の壁）
    kakejiku(g, "合格祈願", -xw + 0.03, F + 1.95, -2.6, Math.PI / 2);
    kakejiku(g, "学業成就", xw - 0.03, F + 1.95, -2.6, -Math.PI / 2, "#2c4a8a");
    // 撫で牛（左の奥）：頭だけ金色に光る＝みんなに撫でられた跡
    const ox = std(0x2a2622, { metalness: 0.55, roughness: 0.4 }), nade = std(0x8a6a3a, { metalness: 0.85, roughness: 0.25 });
    const cow = new THREE.Group(); cow.position.set(-xw + 1.9, F, zb + 0.95); cow.rotation.y = 0.5; g.add(cow);
    box(cow, 1.4, 0.18, 0.8, MAT.stone, 0, 0.09, 0);
    const bd = new THREE.Mesh(new THREE.SphereGeometry(0.45, 18, 12), ox); bd.scale.set(1.35, 0.7, 0.8); bd.position.set(0, 0.48, 0); cow.add(bd);
    const hd = new THREE.Mesh(new THREE.SphereGeometry(0.22, 14, 10), nade); hd.scale.set(1.2, 0.95, 0.9); hd.position.set(0.62, 0.62, 0.05); cow.add(hd);
    for (const s of [-1, 1]) { const h = new THREE.Mesh(new THREE.ConeGeometry(0.04, 0.2, 6), ox); h.position.set(0.6, 0.82, s * 0.13); h.rotation.x = s * 0.6; cow.add(h); }
    const apron = box(cow, 0.5, 0.02, 0.5, std(0xb8321e, { roughness: 0.8 }), -0.1, 0.83, 0, false); apron.rotation.y = 0.3;
    cow.traverse((o) => o.isMesh && (o.castShadow = true));
    // 文机：硯・筆・梅の一枝（右の奥）
    const dx0 = xw - 1.6, dz0 = zb + 0.75;
    box(g, 1.3, 0.06, 0.6, MAT.woodD, dx0, F + 0.42, dz0);
    for (const [dx, dz] of [[-0.58, -0.24], [0.58, -0.24], [-0.58, 0.24], [0.58, 0.24]]) box(g, 0.05, 0.4, 0.05, MAT.woodD, dx0 + dx, F + 0.2, dz0 + dz);
    box(g, 0.3, 0.04, 0.42, MAT.kuro, dx0 - 0.35, F + 0.47, dz0, false);
    box(g, 0.5, 0.005, 0.36, MAT.paperW, dx0 + 0.15, F + 0.452, dz0 + 0.03, false);
    const fude = cyl(g, 0.015, 0.012, 0.4, MAT.woodL, dx0 + 0.45, F + 0.47, dz0, 6, false); fude.rotation.x = Math.PI / 2;
    cyl(g, 0.07, 0.1, 0.3, MAT.white, dx0 + 0.5, F + 0.6, dz0 - 0.2, 10, false);
    const ume = std(0xf6c6d2, { emissive: 0x401018, emissiveIntensity: 0.3 });
    for (let k = 0; k < 4; k++) {
      const rz = (k - 1.5) * 0.35, bx = dx0 + 0.5;
      const b = cyl(g, 0.012, 0.012, 0.5, MAT.woodD, bx - Math.sin(rz) * 0.25, F + 0.75 + Math.cos(rz) * 0.25, dz0 - 0.2, 4, false); b.rotation.z = rz;
      for (let j = 1; j <= 3; j++) { const f = new THREE.Mesh(new THREE.SphereGeometry(0.035, 6, 4), ume); f.position.set(bx - Math.sin(rz) * j * 0.15, F + 0.75 + Math.cos(rz) * j * 0.15, dz0 - 0.2 + (j % 2 ? 0.03 : -0.03)); g.add(f); }
    }
    // だるま（祭壇の脇の棚）：片目だけ入れてある
    box(g, 1.2, 0.05, 0.4, MAT.woodL, -2.9, F + 0.9, zb + 0.35);
    const red = std(0xc8281e, { roughness: 0.45 }), face = std(0xf6efe2);
    for (const [k, sc] of [[0, 1.2], [1, 1], [2, 0.8]]) {
      const cx = -3.3 + k * 0.4, r = 0.15 * sc, cy = F + 0.925 + r * 1.15;
      const dm = new THREE.Mesh(new THREE.SphereGeometry(r, 14, 10), red); dm.scale.y = 1.15; dm.position.set(cx, cy, zb + 0.35); g.add(dm);
      const fc = new THREE.Mesh(new THREE.CircleGeometry(r * 0.55, 14), face); fc.position.set(cx, cy + r * 0.15, zb + 0.35 + r * 0.97); g.add(fc);
      const eye = new THREE.Mesh(new THREE.CircleGeometry(r * 0.12, 8), MAT.kuro); eye.position.set(cx - r * 0.2, cy + r * 0.28, zb + 0.35 + r * 0.98); g.add(eye);
    }
    // 青い絵馬（壁ぞい）
    for (const s of [-1, 1]) emaWall(g, s * xw, -0.8, 3.6, F + 1.9, s, [0x8ac6e8, 0x2c4a8a, 0xf6d36b]);
  }
}

// ------------------------------------------------------------------ 楼門（二階建ての門）
export function romon(parent, env, { x = 0, z = 0, s = 1 } = {}) {
  const g = new THREE.Group(); g.position.set(x, 0, z); g.scale.setScalar(s); parent.add(g); g.userData.static = true;
  const W = 12, D = 4;
  box(g, W + 0.6, 0.4, D + 0.6, MAT.stoneD, 0, 0.2, 0);
  for (const s of [-1, 1]) { box(g, 4.4, 0.27, 0.3, MAT.stoneL, 0, 0.135, s * (D / 2 + 0.45)); box(g, 4.4, 0.13, 0.3, MAT.stoneL, 0, 0.065, s * (D / 2 + 0.75)); }   // 前後の石段
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

// ------------------------------------------------------------------ 回廊：境内を囲む屋根つきの廊下（内側は柱だけ、外側は白壁と連子窓）
let RENJI = null;
export function kairo(parent, env, { cx, cz, len, ry, D = 2.6 }) {
  const g = new THREE.Group(); g.position.set(cx, 0, cz); g.rotation.y = ry; parent.add(g); g.userData.static = true;   // ローカル +z が境内側
  if (!RENJI) {
    const c = document.createElement("canvas"); c.width = 128; c.height = 80; const x = c.getContext("2d");
    x.fillStyle = "#1d2a22"; x.fillRect(0, 0, 128, 80); x.fillStyle = "#4f7a5a"; for (let i = 6; i < 128; i += 12) x.fillRect(i, 4, 6, 72);
    x.strokeStyle = "#2a1d14"; x.lineWidth = 6; x.strokeRect(3, 3, 122, 74);
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; RENJI = new THREE.MeshStandardMaterial({ map: t, roughness: 0.8 });
  }
  box(g, len, 0.32, D, MAT.stoneD, 0, 0.16, 0);
  box(g, len - 0.2, 0.06, D - 0.35, MAT.woodL, 0, 0.35, 0.05);
  const bays = Math.max(2, Math.round(len / 2.4)), step = len / bays;
  for (let i = 0; i <= bays; i++) {
    const xx = -len / 2 + i * step;
    cyl(g, 0.14, 0.14, 3.0, MAT.shu, xx, 1.8, D / 2 - 0.2, 10);
    cyl(g, 0.14, 0.14, 3.0, MAT.shu, xx, 1.8, -D / 2 + 0.2, 10);
  }
  box(g, len, 2.9, 0.14, MAT.white, 0, 1.8, -D / 2 + 0.12);                       // 外側の白壁
  box(g, len, 0.32, 0.12, MAT.shu, 0, 0.5, -D / 2 + 0.2);
  for (let i = 0; i < bays; i++) {                                                     // 連子窓（ひと間ずつ）
    const xx = -len / 2 + (i + 0.5) * step;
    const w = new THREE.Mesh(new THREE.PlaneGeometry(Math.min(1.5, step - 0.6), 0.85), RENJI); w.position.set(xx, 1.95, -D / 2 + 0.2); g.add(w);
    if (i % 2 === 0) chochin(g, xx, 2.75, D / 2 - 0.25, env, 0.5);
  }
  for (const zz of [D / 2 - 0.2, -D / 2 + 0.2]) box(g, len + 0.2, 0.24, 0.24, MAT.shuD, 0, 3.3, zz);
  roof(g, { w: len + 0.8, d: D + 1.8, h: 1.15, lift: 0.28, y: 3.42, mat: MAT.copper, ridgeGold: false });
  return g;
}

// ------------------------------------------------------------------ 舞台（懸造り）：崖にせり出した板張りの舞台。下は格子に組んだ柱が斜面まで伸びる
export function kakezukuri(parent, env, { x0, x1, z0, z1, y, ground }) {
  const g = new THREE.Group(); parent.add(g); g.userData.static = true;
  const w = x1 - x0, d = z1 - z0, cx = (x0 + x1) / 2, cz = (z0 + z1) / 2;
  box(g, w, 0.18, d, MAT.woodL, cx, y - 0.09, cz);                                    // 床板
  const posts = [];
  for (let i = 0; i <= 4; i++) for (let j = 0; j <= 4; j++) {
    const px = x0 + 0.3 + (w - 0.6) * (i / 4), pz = z0 + 0.3 + (d - 0.6) * (j / 4), gy = Math.min(y - 0.2, ground(px, pz));
    const len = y - 0.2 - gy + 0.4; if (len < 0.3) continue;
    cyl(g, 0.17, 0.2, len, MAT.wood, px, gy - 0.4 + len / 2, pz, 8); posts.push([px, pz, gy]);
  }
  // 貫（横木）：段々に
  for (let k = 1; k <= 6; k++) {
    const yy = y - 0.5 - k * 2.2;
    for (let j = 0; j <= 4; j++) { const pz = z0 + 0.3 + (d - 0.6) * (j / 4); if (ground(cx, pz) < yy) box(g, w - 0.4, 0.14, 0.12, MAT.woodD, cx, yy, pz); }
    for (let i = 0; i <= 4; i++) { const px = x0 + 0.3 + (w - 0.6) * (i / 4); if (ground(px, cz) < yy) box(g, 0.12, 0.14, d - 0.4, MAT.woodD, px, yy, cz); }
  }
  // 高欄（三方）
  const rail = (ax, az, bx, bz) => { const L = Math.hypot(bx - ax, bz - az), r = box(g, L, 0.1, 0.1, MAT.shu, (ax + bx) / 2, y + 0.85, (az + bz) / 2); r.rotation.y = -Math.atan2(bz - az, bx - ax);
    const r2 = box(g, L, 0.07, 0.07, MAT.shu, (ax + bx) / 2, y + 0.45, (az + bz) / 2); r2.rotation.y = r.rotation.y;
    const n = Math.round(L / 1.1); for (let k = 0; k <= n; k++) cyl(g, 0.06, 0.06, 0.9, MAT.shu, ax + (bx - ax) * (k / n), y + 0.45, az + (bz - az) * (k / n), 6);
    for (let k = 0; k <= n; k += 2) { const gb = new THREE.Mesh(new THREE.SphereGeometry(0.09, 10, 8), MAT.gold); gb.position.set(ax + (bx - ax) * (k / n), y + 0.98, az + (bz - az) * (k / n)); g.add(gb); } };
  rail(x0, z1, x1, z1); rail(x0, z0 + 1.6, x0, z1); rail(x1, z0 + 1.6, x1, z1);
  // 舞台の四隅に灯籠、正面に扁額の立て札
  for (const [px, pz] of [[x0 + 0.5, z1 - 0.5], [x1 - 0.5, z1 - 0.5]]) chochin(g, px, y + 1.8, pz, env, 0.75);
  return g;
}
// 夫婦杉：しめ縄で結ばれた二本の大杉
export function meotoSugi(parent, { x, z, y }) {
  const g = new THREE.Group(); g.position.set(x, y, z); parent.add(g); g.userData.static = true;
  const bark = new THREE.MeshStandardMaterial({ color: 0x5a3a28, roughness: 1 }), leaf = new THREE.MeshStandardMaterial({ color: 0x1f3d26, roughness: 0.95, flatShading: true });
  for (const s of [-1, 1]) {
    cyl(g, 0.55, 0.85, 16, bark, s * 1.4, 8, 0, 10);
    for (let k = 0; k < 6; k++) { const c = new THREE.Mesh(new THREE.ConeGeometry(3.4 - k * 0.45, 3.2, 8), leaf); c.position.set(s * 1.4, 9 + k * 2.1, 0); c.castShadow = true; g.add(c); }
  }
  const rope = cyl(g, 0.12, 0.12, 2.6, MAT.rope, 0, 3.2, 0.2, 8); rope.rotation.z = Math.PI / 2;
  for (const xx of [-0.6, 0, 0.6]) box(g, 0.2, 0.55, 0.02, MAT.paperW, xx, 2.75, 0.3, false);
  return g;
}

// ------------------------------------------------------------------ 五重塔
export function pagoda(parent, env, { x, z, y = 0, ground = () => -0.8 }) {   // ground(lx, lz)：塔の足もとから見た地面の高さ
  const g = new THREE.Group(); g.position.set(x, y, z); parent.add(g); g.userData.static = true;
  const tile = std(0x3b3e44, { roughness: 0.75 }), green = std(0x3f7a68, { roughness: 0.6 }), wh = MAT.white;
  // 基壇（二段）と正面の石段、まわりの苔
  box(g, 8.8, 3.45, 8.8, MAT.stoneD, 0, -1.28, 0); box(g, 7.8, 0.4, 7.8, MAT.stone, 0, 0.65, 0);   // 基壇（斜面に負けないよう地中まで）
  // 正面の石段：基壇の上から、斜面の地面まで一段ずつ。段は地中まで埋めて、浮かないように。両脇に袖石
  { const top = 0.85, rise = 0.3, run = 0.27, z0 = 4.4; let i = 0, zi = z0;
    for (; i < 30; i++) { const st = top - (i + 1) * rise; zi = z0 + (i + 0.5) * run; const gy = ground(0, zi); if (st < gy + 0.02) break;
      const bot = Math.min(gy, ground(-1.4, zi), ground(1.4, zi)) - 0.4; box(g, 2.8, st - bot, run + 0.02, MAT.stoneL, 0, (st + bot) / 2, zi); }
    const zEnd = z0 + i * run, gEnd = Math.min(ground(-1.6, zEnd), ground(1.6, zEnd)) - 0.4;
    for (const sx of [-1.6, 1.6]) { const n = Math.max(1, i); for (let k = 0; k < n; k++) { const zk = z0 + (k + 0.5) * run, tk = top - k * rise + 0.12, bk = Math.min(ground(sx, zk), ground(0, zk)) - 0.4; box(g, 0.4, tk - bk, run + 0.02, MAT.stoneD, sx, (tk + bk) / 2, zk); } }
    if (!i) box(g, 2.8, 0.3, 0.6, MAT.stoneL, 0, top - 0.15, z0 + 0.3); }
  // 連子窓（緑の枠に縦の格子）
  const lat = (() => { const c = document.createElement("canvas"); c.width = 64; c.height = 64; const q = c.getContext("2d"); q.fillStyle = "#2a2622"; q.fillRect(0, 0, 64, 64);
    q.fillStyle = "#3f7a68"; q.fillRect(0, 0, 64, 6); q.fillRect(0, 58, 64, 6); for (let i = 3; i < 64; i += 9) q.fillRect(i, 0, 4, 64);
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return new THREE.MeshStandardMaterial({ map: t, roughness: 0.7 }); })();
  const door = std(0x1c1a19, { roughness: 0.6 });
  let yy = 0.85, w = 5.0;
  const corners = [];
  for (let i = 0; i < 5; i++) {
    const h = i === 0 ? 2.7 : 2.0, half = w / 2;
    box(g, w - 0.3, h, w - 0.3, wh, 0, yy + h / 2, 0);                                                  // 白い壁の芯
    const xs = [-half, -half / 3, half / 3, half];
    for (const [sx, sz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {                                        // 四面：柱・窓・扉
      for (const t of xs) { const px = sz ? t : sx * half, pz = sz ? sz * half : t; cyl(g, 0.11, 0.11, h, MAT.shu, px, yy + h / 2, pz, 8); }
      const ry = sz ? 0 : Math.PI / 2, nx = sx * (half + 0.01), nz = sz * (half + 0.01);
      for (const t of [-half * 2 / 3, half * 2 / 3]) { const p = new THREE.Mesh(new THREE.PlaneGeometry(half * 0.55, h * 0.45), lat); p.position.set(sz ? t : nx, yy + h * 0.55, sz ? nz : t); p.rotation.y = ry + (sx < 0 || sz < 0 ? Math.PI : 0); g.add(p); }
      if (i === 0) { const d = new THREE.Mesh(new THREE.PlaneGeometry(half * 0.55, h * 0.72), door); d.position.set(sz ? 0 : nx * 1.002, yy + h * 0.38, sz ? nz * 1.002 : 0); d.rotation.y = ry + (sx < 0 || sz < 0 ? Math.PI : 0); g.add(d);
        for (const dy of [0.3, 0.55, 0.8]) { const st = new THREE.Mesh(new THREE.PlaneGeometry(half * 0.55, 0.05), MAT.gold); st.position.copy(d.position); st.position.y = yy + h * dy * 0.72 + 0.05; st.rotation.y = d.rotation.y; st.position.x += sz ? 0 : sx * 0.005; st.position.z += sz ? sz * 0.005 : 0; g.add(st); } }
      const nk = box(g, sz ? w + 0.25 : 0.14, 0.16, sz ? 0.14 : w + 0.25, MAT.shu, sz ? 0 : sx * half, yy + h - 0.15, sz ? sz * half : 0);   // 長押
      box(g, sz ? w + 0.25 : 0.14, 0.12, sz ? 0.14 : w + 0.25, MAT.shu, sz ? 0 : sx * half, yy + 0.15, sz ? sz * half : 0);
    }
    // 組物：柱の上に三段の木組みがせり出す
    for (const t of xs) for (const [sx, sz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const px = sz ? t : sx * half, pz = sz ? sz * half : t;
      for (let k = 0; k < 3; k++) box(g, 0.34 + k * 0.1, 0.11, 0.34 + k * 0.1, MAT.woodL, px + sx * k * 0.16, yy + h + 0.06 + k * 0.12, pz + sz * k * 0.16, false); }
    if (i > 0) {                                                                                           // 高欄（縁）
      box(g, w + 0.9, 0.08, w + 0.9, MAT.wood, 0, yy + 0.05, 0);
      for (const [sx, sz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const r = (w + 0.9) / 2;
        box(g, sz ? w + 0.9 : 0.06, 0.06, sz ? 0.06 : w + 0.9, MAT.shu, sz ? 0 : sx * r, yy + 0.45, sz ? sz * r : 0, false);
        for (let k = -3; k <= 3; k++) cyl(g, 0.03, 0.03, 0.42, MAT.shu, sz ? (k / 3) * r : sx * r, yy + 0.25, sz ? sz * r : (k / 3) * r, 5, false); }
    }
    yy += h;
    const ew = w + 2.8;
    roof(g, { w: ew, d: ew, h: 0.75, lift: 0.7, y: yy + 0.35, mat: tile, gable: false, ridgeGold: false });
    const r2 = roof(g, { w: ew, d: ew, h: 0.75, lift: 0.7, y: yy + 0.35, mat: tile, gable: false, ridgeGold: false }); r2.rotation.y = Math.PI / 2;
    for (const [sx, sz] of [[1, 1], [1, -1], [-1, 1], [-1, -1]]) corners.push([sx * ew * 0.5, yy + 0.35 + 0.45, sz * ew * 0.5]);
    yy += 0.9; w *= 0.85;
  }
  // 相輪：露盤・伏鉢・請花・九輪・水煙・竜車・宝珠
  box(g, 1.3, 0.35, 1.3, tile, 0, yy + 0.1, 0);
  const fb = new THREE.Mesh(new THREE.SphereGeometry(0.5, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2), MAT.gold); fb.position.y = yy + 0.28; g.add(fb);
  cyl(g, 0.07, 0.09, 5.4, MAT.gold, 0, yy + 3.0, 0, 10);
  for (let i = 0; i < 9; i++) { const r = new THREE.Mesh(new THREE.TorusGeometry(0.48 - i * 0.025, 0.05, 6, 20), MAT.gold); r.rotation.x = Math.PI / 2; r.position.y = yy + 1.0 + i * 0.42; g.add(r); }
  for (let k = 0; k < 4; k++) { const sh = new THREE.Shape(); sh.moveTo(0, 0); sh.quadraticCurveTo(0.45, 0.3, 0.3, 0.8); sh.quadraticCurveTo(0.12, 0.55, 0, 0.9); sh.quadraticCurveTo(-0.12, 0.55, -0.3, 0.8); sh.quadraticCurveTo(-0.45, 0.3, 0, 0);
    const fl = new THREE.Mesh(new THREE.ShapeGeometry(sh), new THREE.MeshStandardMaterial({ color: 0xe3b54a, metalness: 0.85, roughness: 0.3, side: THREE.DoubleSide })); fl.position.y = yy + 4.85; fl.rotation.y = (k * Math.PI) / 4; g.add(fl); }   // 水煙
  const ryu = new THREE.Mesh(new THREE.SphereGeometry(0.16, 10, 8), MAT.gold); ryu.position.y = yy + 5.9; g.add(ryu);
  const hoju = new THREE.Mesh(new THREE.SphereGeometry(0.2, 12, 10), MAT.gold); hoju.scale.y = 1.25; hoju.position.y = yy + 6.25; g.add(hoju);
  // 初層の軒の提灯
  for (const [sx, sz] of [[1, 1], [-1, 1]]) chochin(g, sx * 1.6, 3.15, 2.9, env, 0.7);
  // 風鐸：各層の四隅にさがる青銅の鈴（風でゆれる）
  const fu = new THREE.Group(); fu.position.copy(g.position); parent.add(fu);
  const bronze = std(0x4f5a42, { metalness: 0.6, roughness: 0.45 });
  const bells = corners.map(([cx, cy, cz]) => { const b = new THREE.Group(); b.position.set(cx, cy, cz); fu.add(b);
    const m = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.12, 0.26, 8), bronze); m.position.y = -0.2; b.add(m);
    const ch = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.16, 0.01), bronze); ch.position.y = -0.42; b.add(ch); return b; });
  g.userData.tick = (t) => bells.forEach((b, i) => { b.rotation.z = Math.sin(t * 1.4 + i) * 0.12; b.rotation.x = Math.cos(t * 1.1 + i * 2) * 0.08; });
  return g;
}

// ------------------------------------------------------------------ 鐘楼（梵鐘と撞木）
export function shoro(parent, env, { x, z, y = 0, ry = 0 }) {
  const g = new THREE.Group(); g.position.set(x, y, z); g.rotation.y = ry; parent.add(g); g.userData.static = true;
  box(g, 3.2, 2.5, 3.2, MAT.stoneD, 0, -0.75, 0); box(g, 2.8, 0.15, 2.8, MAT.stone, 0, 0.55, 0);
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) { const p = cyl(g, 0.12, 0.14, 3.3, MAT.woodD, sx * 1.1, 2.25, sz * 1.1, 10); p.rotation.z = -sx * 0.04; p.rotation.x = sz * 0.04; }
  for (const sz of [-1, 1]) box(g, 2.6, 0.16, 0.16, MAT.woodD, 0, 3.75, sz * 1.1); for (const sx of [-1, 1]) box(g, 0.16, 0.16, 2.6, MAT.woodD, sx * 1.1, 3.75, 0);
  box(g, 0.2, 0.2, 2.5, MAT.wood, 0, 3.6, 0);
  roof(g, { w: 4.2, d: 4.2, h: 1.4, lift: 0.45, y: 3.85, mat: std(0x3b3e44, { roughness: 0.75 }), ridgeGold: false });
  const bell = new THREE.Group(); bell.position.set(0, 3.5, 0); parent.add(bell); bell.userData.live = true;   // 動く（揺れる）
  const prof = []; for (let i = 0; i <= 10; i++) { const t = i / 10; prof.push(new THREE.Vector2(0.5 + 0.08 * Math.pow(t, 3) - 0.05 * Math.sin(t * Math.PI), -t * 1.5)); }
  const bronze = std(0x3e4a3a, { metalness: 0.65, roughness: 0.4 });
  const body = new THREE.Mesh(new THREE.LatheGeometry(prof, 28), bronze); body.position.y = -0.1; body.material.side = THREE.DoubleSide; bell.add(body);
  const cap = new THREE.Mesh(new THREE.SphereGeometry(0.5, 20, 10, 0, Math.PI * 2, 0, Math.PI / 2), bronze); cap.position.y = -0.1; bell.add(cap);
  const loop = new THREE.Mesh(new THREE.TorusGeometry(0.14, 0.05, 6, 14), bronze); loop.position.y = 0.42; bell.add(loop);
  for (let k = 0; k < 4; k++) { const band = new THREE.Mesh(new THREE.TorusGeometry(0.53, 0.02, 4, 28), bronze); band.rotation.x = Math.PI / 2; band.position.y = -0.4 - k * 0.32; bell.add(band); }
  for (let k = 0; k < 2; k++) { const a = k * Math.PI; const zb = new THREE.Mesh(new THREE.CircleGeometry(0.1, 12), std(0x2e3a2c, { metalness: 0.6 })); zb.position.set(Math.sin(a) * 0.55, -1.05, Math.cos(a) * 0.55); zb.rotation.y = a; bell.add(zb); }   // 撞座
  // 撞木（しゅもく）：綱で吊った丸太。手前（+z）から突く
  const log = new THREE.Group(); log.position.set(0, 2.55, 1.35); parent.add(log);
  const lm = cyl(log, 0.12, 0.12, 1.6, std(0xa98a5a, { roughness: 0.8 }), 0, 0, 0, 10); lm.rotation.x = Math.PI / 2;
  for (const dz of [-0.5, 0.5]) { const r = cyl(log, 0.012, 0.012, 1.0, MAT.rope, 0, 0.5, dz, 4); }
  const toWorld = (o) => { o.position.applyEuler(g.rotation); o.position.add(g.position); o.rotation.y = ry; };
  toWorld(bell); toWorld(log);
  return { group: g, bell, log };
}

// ------------------------------------------------------------------ 太鼓橋
export function taikobashi(parent, { x0, x1, z, w }) {
  const g = new THREE.Group(); parent.add(g); g.userData.static = true;
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
    const rail = (yy) => { const r = new THREE.Mesh(new THREE.BoxGeometry(L, 0.12, 0.12), MAT.shu); r.position.set((ax + bx) / 2, yy, (az + bz) / 2); r.rotation.y = -Math.atan2(bz - az, bx - ax); r.castShadow = true; r.userData.static = true; parent.add(r); };
    rail(h - 0.1); rail(h * 0.45);
  }
  const inst = new THREE.InstancedMesh(geo, MAT.shu, posts.length); const m = new THREE.Matrix4();
  posts.forEach(([x, z], i) => inst.setMatrixAt(i, m.makeTranslation(x, h / 2, z))); inst.castShadow = true; parent.add(inst);
  return inst;
}

// ------------------------------------------------------------------ 手水舎
export function temizuya(parent, env, { x, z }) {
  const g = new THREE.Group(); g.position.set(x, 0, z); parent.add(g); g.userData.static = true;
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
  const g = new THREE.Group(); g.position.set(x, 0, z); g.rotation.y = ry; parent.add(g); g.userData.static = true;
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
  const g = new THREE.Group(); g.position.set(x, 0, z); parent.add(g); g.userData.static = true;
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
export function okunoin(parent, env, { x, z, y, s = 1 }) {
  const g = new THREE.Group(); g.position.set(x, y, z); g.scale.setScalar(s); parent.add(g); g.userData.static = true;
  const F = 0.55;
  // 三段の石の基壇と正面の石段
  box(g, 7.0, 0.22, 5.6, MAT.stoneD, 0, 0.11, -0.1); box(g, 6.5, 0.2, 5.1, MAT.stone, 0, 0.32, -0.1); box(g, 6.0, 0.14, 4.6, MAT.stoneL, 0, 0.48, -0.1);
  for (let i = 0; i < 3; i++) box(g, 2.4, F / 3, 0.36, MAT.stoneL, 0, (F / 3) * (i + 0.5), 2.85 - i * 0.3);
  box(g, 5.6, 0.06, 3.9, MAT.woodL, 0, F + 0.03, -0.1);
  // 柱（朱）と金の輪
  const ring = new THREE.TorusGeometry(0.19, 0.035, 6, 18);
  for (const xx of [-2.6, -0.95, 0.95, 2.6]) for (const zz of [-1.95, 1.75]) {
    if (zz < 0 && Math.abs(xx) < 2) continue;
    cyl(g, 0.15, 0.15, 2.8, MAT.shu, xx, F + 1.4, zz, 12);
    for (const yy of [F + 0.25, F + 2.6]) { const r = new THREE.Mesh(ring, MAT.gold); r.rotation.x = Math.PI / 2; r.position.set(xx, yy, zz); g.add(r); }
  }
  // 奥の壁：金箔に月と白狐（内側）、外は白壁。左右の壁
  box(g, 5.6, 2.75, 0.14, MAT.white, 0, F + 1.38, -2.02);
  const art = new THREE.Mesh(new THREE.PlaneGeometry(5.1, 2.5), artMat("tsukikumo")); art.position.set(0, F + 1.35, -1.94); g.add(art);
  for (const sx of [-1, 1]) { box(g, 0.14, 2.75, 3.75, MAT.white, sx * 2.72, F + 1.38, -0.1); box(g, 0.16, 0.12, 3.75, MAT.gold, sx * 2.74, F + 2.72, -0.1, false); box(g, 0.16, 0.5, 3.75, MAT.kuro, sx * 2.74, F + 0.25, -0.1, false); }
  for (const sx of [-1, 1]) { const side = new THREE.Mesh(new THREE.PlaneGeometry(3.6, 1.6), artMat("tsukikumo")); side.position.set(sx * 2.64, F + 1.6, -0.1); side.rotation.y = -sx * Math.PI / 2; g.add(side); }
  // 開いた御扉（黒漆に金具）
  for (const sx of [-1, 1]) {
    const leaf = new THREE.Group(); leaf.position.set(sx * 0.93, F, 1.75); leaf.rotation.y = sx * 1.25; g.add(leaf);
    box(leaf, 0.86, 2.3, 0.07, MAT.kuro, -sx * 0.43, 1.15, 0);
    for (const yy of [0.35, 1.15, 1.95]) box(leaf, 0.8, 0.07, 0.02, MAT.gold, -sx * 0.43, yy, 0.045, false);
  }
  box(g, 5.8, 0.26, 4.2, MAT.shuD, 0, F + 2.86, -0.1);
  if (KAERU) for (const cx of [-1.8, 0, 1.8]) { const pnl = new THREE.Mesh(new THREE.PlaneGeometry(cx ? 1.3 : 1.6, 0.42), KAERU); pnl.position.set(cx, F + 2.5, 1.9); g.add(pnl); }
  // 祭壇：金の壇、後光をもつ大きな神鏡、御幣、榊、灯明
  box(g, 2.6, 0.5, 0.9, std(0x8a6a2a, { metalness: 0.7, roughness: 0.35 }), 0, F + 0.25, -1.3);
  box(g, 1.8, 0.45, 0.6, MAT.gold, 0, F + 0.72, -1.4);
  const mirM = new THREE.MeshStandardMaterial({ color: 0xf2f5fa, metalness: 1, roughness: 0.05, emissive: 0xfff0d0, emissiveIntensity: 0.25 });
  const mir = cyl(g, 0.42, 0.42, 0.05, mirM, 0, F + 1.6, -1.45, 40); mir.rotation.x = Math.PI / 2;
  const halo = new THREE.Group(); halo.position.set(0, F + 1.6, -1.5); g.add(halo);
  for (let k = 0; k < 24; k++) { const a = (k / 24) * Math.PI * 2, ray = box(halo, 0.035, k % 2 ? 0.34 : 0.5, 0.02, MAT.gold, Math.cos(a) * 0.62, Math.sin(a) * 0.62, 0, false); ray.rotation.z = a - Math.PI / 2; }
  const rim = new THREE.Mesh(new THREE.TorusGeometry(0.45, 0.05, 8, 40), MAT.gold); rim.position.set(0, F + 1.6, -1.43); g.add(rim);
  for (const sx of [-1, 1]) {
    cyl(g, 0.025, 0.025, 1.0, MAT.woodL, sx * 0.85, F + 1.45, -1.25, 6, false);
    for (let k = 0; k < 4; k++) { const pp = box(g, 0.13, 0.22, 0.02, k % 2 ? MAT.paperW : MAT.gold, sx * 0.85 + (k % 2 ? 0.07 : -0.07), F + 1.85 - k * 0.18, -1.25, false); pp.rotation.z = (k % 2 ? 1 : -1) * 0.25; }
    cyl(g, 0.07, 0.09, 0.3, MAT.white, sx * 1.15, F + 1.1, -1.3, 8);
    for (let k = 0; k < 5; k++) { const l = new THREE.Mesh(new THREE.IcosahedronGeometry(0.13, 0), std(0x2c5a2c)); l.scale.set(1, 0.55, 0.7); l.position.set(sx * 1.15 + Math.sin(k) * 0.1, F + 1.35 + k * 0.08, -1.3); g.add(l); }
    for (const dz of [-0.85, -0.6]) { cyl(g, 0.04, 0.06, 0.4, MAT.kuro, sx * 1.6, F + 0.2, dz, 8, false); cyl(g, 0.025, 0.025, 0.08, sharedLamp(0xfff4d8, 0xffb050, 3, env), sx * 1.6, F + 0.45, dz, 6, false); }
  }
  // 屋根：銅板に金の棟、千木・鰹木、正面の小さな唐破風
  roof(g, { w: 7.8, d: 6.6, h: 2.4, lift: 0.55, y: F + 2.98, z: -0.1, mat: MAT.copper });
  const hw = 1.9, prof = (xx) => { const u = Math.min(1, Math.abs(xx) / hw); return 0.75 * Math.pow(1 - u * u, 1.6) + 0.35 * Math.pow(u, 5); };
  const band = (th) => { const sh = new THREE.Shape(); for (let i = 0; i <= 30; i++) { const xx = -hw + (2 * hw * i) / 30; i ? sh.lineTo(xx, prof(xx) + th) : sh.moveTo(xx, prof(xx) + th); } for (let i = 30; i >= 0; i--) { const xx = -hw + (2 * hw * i) / 30; sh.lineTo(xx, prof(xx) - th); } sh.closePath(); return sh; };
  const kb = new THREE.Mesh(new THREE.ExtrudeGeometry(band(0.14), { depth: 0.14, bevelEnabled: false }), MAT.kuro); kb.position.set(0, F + 2.95, 3.0); g.add(kb);
  const ks = new THREE.Mesh(new THREE.ExtrudeGeometry(band(0.06), { depth: 1.4, bevelEnabled: false }), MAT.copper); ks.position.set(0, F + 3.12, 1.65); g.add(ks);
  const edge = []; for (let i = 0; i <= 30; i++) { const xx = -hw + (2 * hw * i) / 30; edge.push(new THREE.Vector3(xx, F + 2.95 + prof(xx) + 0.15, 3.15)); }
  g.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(edge), 40, 0.03, 5, false), MAT.gold));
  for (const sx of [-1, 1]) { cyl(g, 0.12, 0.12, 2.6, MAT.shu, sx * 1.6, F + 1.3, 2.9, 10); }
  // 透塀：朱の格子の塀（正面は開く）
  const lat = (() => { const c = document.createElement("canvas"); c.width = 128; c.height = 64; const q = c.getContext("2d"); q.fillStyle = "rgba(0,0,0,0)"; q.clearRect(0, 0, 128, 64);
    q.strokeStyle = "#c8321e"; q.lineWidth = 5; for (let i = 0; i <= 128; i += 16) { q.beginPath(); q.moveTo(i, 0); q.lineTo(i, 64); q.stroke(); } for (let j = 4; j <= 64; j += 20) { q.beginPath(); q.moveTo(0, j); q.lineTo(128, j); q.stroke(); }
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.wrapS = THREE.RepeatWrapping; return new THREE.MeshStandardMaterial({ map: t, transparent: true, alphaTest: 0.4, side: THREE.DoubleSide, roughness: 0.6 }); })();
  const fence = (ax, az, bx, bz) => { const L = Math.hypot(bx - ax, bz - az), m = lat.clone(); m.map = lat.map.clone(); m.map.needsUpdate = true; m.map.repeat.set(L / 1.2, 1);
    const p = new THREE.Mesh(new THREE.PlaneGeometry(L, 0.8), m); p.position.set((ax + bx) / 2, 0.98, (az + bz) / 2); p.rotation.y = -Math.atan2(bz - az, bx - ax); g.add(p);
    const top = box(g, L, 0.08, 0.1, MAT.shu, (ax + bx) / 2, 1.42, (az + bz) / 2); top.rotation.y = p.rotation.y;
    for (let k = 0; k <= Math.round(L / 1.2); k++) cyl(g, 0.05, 0.05, 1.0, MAT.shu, ax + (bx - ax) * (k / Math.round(L / 1.2)), 1.0, az + (bz - az) * (k / Math.round(L / 1.2)), 6, false); };
  fence(-3.4, -2.75, 3.4, -2.75); fence(-3.4, -2.75, -3.4, 2.1); fence(3.4, -2.75, 3.4, 2.1); fence(-3.4, 2.1, -1.4, 2.1); fence(1.4, 2.1, 3.4, 2.1);
  for (const sx of [-1, 1]) tsuriDoro(g, sx * 1.6, F + 2.9, 2.75, 0.75);
  lightSpot(g, F + 1.6, 8, 10, 0xffd08a);
  return g;
}
